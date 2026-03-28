package com.eventzen.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Paths;

@SpringBootApplication
public class AuthServiceApplication {
    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(AuthServiceApplication.class, args);
    }

    private static void loadDotEnv() {
        var envFile = Paths.get(".env").toFile();
        if (!envFile.exists()) return;
        try (var reader = new BufferedReader(new FileReader(envFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int eq = line.indexOf('=');
                if (eq < 1) continue;
                String key = line.substring(0, eq).trim();
                String value = line.substring(eq + 1).trim();
                // Only set if not already defined (OS env vars take priority)
                System.setProperty("env." + key, System.getProperty("env." + key, value));
            }
        } catch (IOException e) {
            System.err.println("[WARN] Could not load .env file: " + e.getMessage());
        }
    }
}
