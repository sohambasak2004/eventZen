package com.eventzen.auth.service;

import com.eventzen.auth.entity.User;
import com.eventzen.auth.exception.TokenExpiredException;
import com.eventzen.auth.util.KeyUtils;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.PublicKey;
import java.util.*;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final KeyUtils keyUtils;

    @Value("${app.jwt.access-token-expiry-ms:900000}")
    private long accessTokenExpiryMs;

    /**
     * Generate a signed RS256 JWT access token for the given user.
     */
    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessTokenExpiryMs);
        return Jwts.builder()
            .subject(user.getUserId())
            .claim("email", user.getEmail())
            .claim("roles", new ArrayList<>(user.getRoleNames()))
            .claim("firstName", user.getFirstName())
            .claim("lastName", user.getLastName())
            .issuedAt(now)
            .expiration(expiry)
            .signWith(keyUtils.getPrivateKey(), Jwts.SIG.RS256)
            .compact();
    }

    /**
     * Validate a JWT and return its Claims.
     */
    public Claims validateAndGetClaims(String token) {
        try {
            return Jwts.parser()
                .verifyWith((java.security.interfaces.RSAPublicKey) keyUtils.getPublicKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException ex) {
            throw new TokenExpiredException("Access token has expired");
        } catch (JwtException ex) {
            throw new TokenExpiredException("Invalid token: " + ex.getMessage());
        }
    }

    /**
     * Extract the user ID (subject) from a token without full validation (used only after validateAndGetClaims).
     */
    public String extractUserId(String token) {
        return validateAndGetClaims(token).getSubject();
    }

    /**
     * Return the public key as a base64-encoded X.509 DER byte array (for JWKS).
     */
    public String getPublicKeyBase64() {
        return Base64.getEncoder().encodeToString(keyUtils.getPublicKey().getEncoded());
    }

    public long getAccessTokenExpiryMs() {
        return accessTokenExpiryMs;
    }
}
