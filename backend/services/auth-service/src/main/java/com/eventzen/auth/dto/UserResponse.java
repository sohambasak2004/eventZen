package com.eventzen.auth.dto;

import com.eventzen.auth.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private String userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private boolean isActive;
    private LocalDateTime createdAt;
    private Set<String> roles;
    private boolean emailVerified;
    private String provider;

    public static UserResponse from(User user) {
        return UserResponse.builder()
            .userId(user.getUserId())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .email(user.getEmail())
            .phone(user.getPhone())
            .isActive(user.isActive())
            .createdAt(user.getCreatedAt())
            .roles(user.getRoleNames())
            .emailVerified(user.isEmailVerified())
            .provider(user.getProvider())
            .build();
    }
}
