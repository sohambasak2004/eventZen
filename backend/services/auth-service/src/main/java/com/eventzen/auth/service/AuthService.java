package com.eventzen.auth.service;

import com.eventzen.auth.dto.AuthResponse;
import com.eventzen.auth.dto.ChangePasswordRequest;
import com.eventzen.auth.dto.LoginRequest;
import com.eventzen.auth.dto.RegisterRequest;
import com.eventzen.auth.dto.RegisterResponse;
import com.eventzen.auth.dto.UserResponse;
import com.eventzen.auth.entity.RefreshToken;
import com.eventzen.auth.entity.Role;
import com.eventzen.auth.entity.User;
import com.eventzen.auth.entity.UserRole;
import com.eventzen.auth.exception.DuplicateEmailException;
import com.eventzen.auth.exception.InvalidCredentialsException;
import com.eventzen.auth.exception.TokenExpiredException;
import com.eventzen.auth.repository.RefreshTokenRepository;
import com.eventzen.auth.repository.RoleRepository;
import com.eventzen.auth.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.jwt.refresh-token-expiry-ms:604800000}")
    private long refreshTokenExpiryMs;

    // -------------------------------------------------------------------------
    // Register
    // -------------------------------------------------------------------------

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException(email);
        }

        Role customerRole = roleRepository.findByRoleName("CUSTOMER")
            .orElseThrow(() -> new IllegalStateException("CUSTOMER role not found. Run DataInitializer first."));

        User user = User.builder()
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .email(email)
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .phone(request.getPhone())
            .emailVerified(true)
            .provider("LOCAL")
            .build();

        UserRole userRole = UserRole.builder().user(user).role(customerRole).build();
        user.getUserRoles().add(userRole);
        userRepository.save(user);

        log.info("New user registered: {}", user.getEmail());
        return RegisterResponse.builder()
            .message("Registration successful. Please sign in.")
            .email(user.getEmail())
            .build();
    }

    // -------------------------------------------------------------------------
    // Login
    // -------------------------------------------------------------------------

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
            .orElseThrow(InvalidCredentialsException::new);

        if (!user.isActive()) {
            throw new InvalidCredentialsException("Account is deactivated");
        }
        if (user.getPasswordHash() == null) {
            throw new InvalidCredentialsException("This account cannot sign in with a password.");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        refreshTokenRepository.deleteAllByUser(user);
        log.info("User logged in: {}", user.getEmail());
        return buildAuthResponse(user, response);
    }

    // -------------------------------------------------------------------------
    // Refresh / Logout
    // -------------------------------------------------------------------------

    @Transactional
    public AuthResponse refresh(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new TokenExpiredException("Refresh token is missing");
        }

        RefreshToken token = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
            .orElseThrow(() -> new TokenExpiredException("Refresh token not found or already used"));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new TokenExpiredException("Refresh token has expired");
        }

        User user = token.getUser();
        refreshTokenRepository.delete(token); // rotate refresh tokens
        return buildAuthResponse(user, response);
    }

    @Transactional
    public void logout(String userId, HttpServletResponse response) {
        if (userId != null) {
            userRepository.findById(userId).ifPresent(refreshTokenRepository::deleteAllByUser);
        }
        clearRefreshCookie(response);
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request, HttpServletResponse response) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new InvalidCredentialsException("User account not found"));

        if (!user.isActive()) {
            throw new InvalidCredentialsException("Account is deactivated");
        }
        if (user.getPasswordHash() == null) {
            throw new InvalidCredentialsException("This account cannot sign in with a password.");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("New password must be different from the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.deleteAllByUser(user);
        clearRefreshCookie(response);
        log.info("Password changed for user {}", user.getEmail());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private AuthResponse buildAuthResponse(User user, HttpServletResponse response) {
        String accessToken = jwtService.generateAccessToken(user);

        String rawRefreshToken = UUID.randomUUID().toString();
        RefreshToken refreshToken = RefreshToken.builder()
            .tokenHash(hashToken(rawRefreshToken))
            .user(user)
            .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiryMs / 1000))
            .build();
        refreshTokenRepository.save(refreshToken);

        Cookie cookie = new Cookie("refresh_token", rawRefreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // set true in production (HTTPS only)
        cookie.setPath("/api/v1/auth/refresh");
        cookie.setMaxAge((int) (refreshTokenExpiryMs / 1000));
        response.addCookie(cookie);

        return AuthResponse.of(accessToken, jwtService.getAccessTokenExpiryMs(), UserResponse.from(user));
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refresh_token", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/api/v1/auth/refresh");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private String hashToken(String raw) {
        try {
            var md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            var sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
