package com.eventzen.auth.service;

import com.eventzen.auth.entity.*;
import com.eventzen.auth.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Seeds the database with default roles, permissions, and an admin user on first startup.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataInitializerService implements ApplicationRunner {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@eventzen.com}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@1234}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRolesAndPermissions();
        seedAdminUser();
    }

    private void seedRolesAndPermissions() {
        Role adminRole    = ensureRole("ADMIN",    "Platform administrator with full access");
        Role customerRole = ensureRole("CUSTOMER", "Customer / attendee with self-service access");

        List<String[]> perms = List.of(
            new String[]{"event:read",    "EVENT",    "READ"},
            new String[]{"event:write",   "EVENT",    "WRITE"},
            new String[]{"event:delete",  "EVENT",    "DELETE"},
            new String[]{"venue:read",    "VENUE",    "READ"},
            new String[]{"venue:write",   "VENUE",    "WRITE"},
            new String[]{"user:read",     "USER",     "READ"},
            new String[]{"user:write",    "USER",     "WRITE"},
            new String[]{"user:delete",   "USER",     "DELETE"},
            new String[]{"finance:read",  "FINANCE",  "READ"},
            new String[]{"finance:write", "FINANCE",  "WRITE"},
            new String[]{"ticket:read",   "TICKET",   "READ"},
            new String[]{"ticket:write",  "TICKET",   "WRITE"}
        );

        for (String[] p : perms) {
            ensurePermission(p[0], p[1], p[2]);
        }

        List<Permission> allPerms = permissionRepository.findAll();
        for (Permission perm : allPerms) {
            boolean alreadyGranted = adminRole.getRolePermissions().stream()
                .anyMatch(rp -> rp.getPermission().getPermissionName().equals(perm.getPermissionName()));
            if (!alreadyGranted) {
                RolePermission rp = RolePermission.builder()
                    .role(adminRole)
                    .permission(perm)
                    .build();
                adminRole.getRolePermissions().add(rp);
            }
        }
        roleRepository.save(adminRole);

        List<String> customerPerms = List.of("event:read", "venue:read", "ticket:read", "ticket:write");
        for (String permName : customerPerms) {
            permissionRepository.findAll().stream()
                .filter(p -> p.getPermissionName().equals(permName))
                .findFirst()
                .ifPresent(perm -> {
                    boolean alreadyGranted = customerRole.getRolePermissions().stream()
                        .anyMatch(rp -> rp.getPermission().getPermissionName().equals(perm.getPermissionName()));
                    if (!alreadyGranted) {
                        RolePermission rp = RolePermission.builder()
                            .role(customerRole)
                            .permission(perm)
                            .build();
                        customerRole.getRolePermissions().add(rp);
                    }
                });
        }
        roleRepository.save(customerRole);

        log.info("Roles and permissions seeded successfully");
    }

    private void seedAdminUser() {
        if (userRepository.existsByEmail(adminEmail.toLowerCase())) {
            // Backfill: ensure existing admin has emailVerified=true and provider set
            userRepository.findByEmail(adminEmail.toLowerCase()).ifPresent(admin -> {
                boolean changed = false;
                if (!admin.isEmailVerified()) {
                    admin.setEmailVerified(true);
                    changed = true;
                }
                if (admin.getProvider() == null) {
                    admin.setProvider("LOCAL");
                    changed = true;
                }
                if (changed) userRepository.save(admin);
            });
            log.info("Admin user already exists, skipping full seed");
            return;
        }

        Role adminRole = roleRepository.findByRoleName("ADMIN")
            .orElseThrow(() -> new IllegalStateException("ADMIN role not found"));

        User admin = User.builder()
            .firstName("System")
            .lastName("Admin")
            .email(adminEmail.toLowerCase())
            .passwordHash(passwordEncoder.encode(adminPassword))
            .emailVerified(true)
            .provider("LOCAL")
            .build();

        UserRole userRole = UserRole.builder()
            .user(admin)
            .role(adminRole)
            .build();
        admin.getUserRoles().add(userRole);

        userRepository.save(admin);
        log.info("Default admin user created: {}", adminEmail);
    }

    private Role ensureRole(String name, String description) {
        return roleRepository.findByRoleName(name).orElseGet(() -> {
            Role role = Role.builder().roleName(name).description(description).build();
            return roleRepository.save(role);
        });
    }

    private void ensurePermission(String name, String module, String action) {
        if (!permissionRepository.existsByPermissionName(name)) {
            permissionRepository.save(
                Permission.builder()
                    .permissionName(name)
                    .module(module)
                    .action(action)
                    .build()
            );
        }
    }
}
