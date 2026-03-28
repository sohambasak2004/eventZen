package com.eventzen.auth.controller;

import java.util.Arrays;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eventzen.auth.dto.AuthResponse;
import com.eventzen.auth.dto.ChangePasswordRequest;
import com.eventzen.auth.dto.LoginRequest;
import com.eventzen.auth.dto.RegisterRequest;
import com.eventzen.auth.dto.RegisterResponse;
import com.eventzen.auth.dto.UserResponse;
import com.eventzen.auth.service.AuthService;
import com.eventzen.auth.service.JwtService;
import com.eventzen.auth.service.UserService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService  jwtService;
    private final UserService userService;

    // POST /api/v1/auth/register
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(authService.register(request));
    }

    // POST /api/v1/auth/login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request, response));
    }

    // POST /api/v1/auth/refresh
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawToken = extractRefreshCookie(request);
        return ResponseEntity.ok(authService.refresh(rawToken, response));
    }

    // POST /api/v1/auth/change-password
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                                              Authentication auth,
                                                              HttpServletResponse response) {
        String userId = (String) auth.getPrincipal();
        authService.changePassword(userId, request, response);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    // POST /api/v1/auth/logout
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(Authentication auth, HttpServletResponse response) {
        String userId = auth != null ? (String) auth.getPrincipal() : null;
        authService.logout(userId, response);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // GET /api/v1/auth/me
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    // GET /api/v1/auth/.well-known/jwks.json
    @GetMapping("/.well-known/jwks.json")
    public ResponseEntity<Map<String, Object>> jwks() {
        String publicKeyBase64 = jwtService.getPublicKeyBase64();
        return ResponseEntity.ok(Map.of(
            "keys", new Object[]{
                Map.of(
                    "kty", "RSA",
                    "use", "sig",
                    "alg", "RS256",
                    "kid", "eventzen-rs256-key",
                    "x5c", new String[]{ publicKeyBase64 }
                )
            }
        ));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private String extractRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
            .filter(c -> "refresh_token".equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }
}
