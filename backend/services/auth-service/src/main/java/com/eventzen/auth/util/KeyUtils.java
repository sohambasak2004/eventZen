package com.eventzen.auth.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.*;
import java.security.spec.*;
import java.util.Base64;

/**
 * Loads or auto-generates the RSA key pair used for RS256 JWT signing.
 *
 * In production, set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables
 * (base64-encoded PKCS#8 private key and X.509 public key PEM bodies without headers).
 * If omitted, a 2048-bit RSA pair is generated at startup (suitable for local dev only).
 */
@Component
public class KeyUtils {

    private static final Path DEFAULT_PRIVATE_KEY_PATH = Path.of("private.pem");
    private static final Path DEFAULT_PUBLIC_KEY_PATH = Path.of("public.pem");

    @Value("${app.jwt.private-key:}")
    private String privateKeyBase64;

    @Value("${app.jwt.public-key:}")
    private String publicKeyBase64;

    private KeyPair keyPair;

    public synchronized KeyPair getKeyPair() {
        if (keyPair != null) return keyPair;
        if (privateKeyBase64 != null && !privateKeyBase64.isBlank()
            && publicKeyBase64 != null && !publicKeyBase64.isBlank()) {
            keyPair = loadFromConfig();
        } else if (Files.exists(DEFAULT_PRIVATE_KEY_PATH) && Files.exists(DEFAULT_PUBLIC_KEY_PATH)) {
            keyPair = loadFromPemFiles();
        } else {
            keyPair = generateKeyPair();
        }
        return keyPair;
    }

    public PrivateKey getPrivateKey() {
        return getKeyPair().getPrivate();
    }

    public PublicKey getPublicKey() {
        return getKeyPair().getPublic();
    }

    private KeyPair loadFromConfig() {
        try {
            byte[] privBytes = Base64.getDecoder().decode(privateKeyBase64.strip());
            byte[] pubBytes  = Base64.getDecoder().decode(publicKeyBase64.strip());
            KeyFactory kf = KeyFactory.getInstance("RSA");
            PrivateKey priv = kf.generatePrivate(new PKCS8EncodedKeySpec(privBytes));
            PublicKey  pub  = kf.generatePublic(new X509EncodedKeySpec(pubBytes));
            return new KeyPair(pub, priv);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load RSA key pair from config", e);
        }
    }

    private KeyPair loadFromPemFiles() {
        try {
            byte[] privBytes = decodePemFile(DEFAULT_PRIVATE_KEY_PATH,
                "-----BEGIN PRIVATE KEY-----",
                "-----END PRIVATE KEY-----");
            byte[] pubBytes = decodePemFile(DEFAULT_PUBLIC_KEY_PATH,
                "-----BEGIN PUBLIC KEY-----",
                "-----END PUBLIC KEY-----");

            KeyFactory kf = KeyFactory.getInstance("RSA");
            PrivateKey priv = kf.generatePrivate(new PKCS8EncodedKeySpec(privBytes));
            PublicKey pub = kf.generatePublic(new X509EncodedKeySpec(pubBytes));
            return new KeyPair(pub, priv);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load RSA key pair from PEM files", e);
        }
    }

    private byte[] decodePemFile(Path path, String beginMarker, String endMarker) throws IOException {
        String pem = Files.readString(path)
            .replace(beginMarker, "")
            .replace(endMarker, "")
            .replaceAll("\\s", "");
        return Base64.getDecoder().decode(pem);
    }

    private KeyPair generateKeyPair() {
        try {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
            gen.initialize(2048, new SecureRandom());
            return gen.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA algorithm not available", e);
        }
    }
}
