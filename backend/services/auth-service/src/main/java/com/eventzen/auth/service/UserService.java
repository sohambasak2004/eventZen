package com.eventzen.auth.service;

import com.eventzen.auth.dto.UpdateUserRequest;
import com.eventzen.auth.dto.UserResponse;
import com.eventzen.auth.entity.User;
import com.eventzen.auth.exception.DuplicateEmailException;
import com.eventzen.auth.exception.InsufficientPermissionsException;
import com.eventzen.auth.exception.UserNotFoundException;
import com.eventzen.auth.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getUserById(String userId) {
        User user = findActiveUser(userId);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateUser(String userId, UpdateUserRequest request, String requesterId, boolean isAdmin) {
        User user = findActiveUser(userId);

        if (!isAdmin && !requesterId.equals(userId)) {
            throw new InsufficientPermissionsException("You can only update your own profile");
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        if (request.getEmail() != null) {
            String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);

            if (normalizedEmail.isEmpty()) {
                throw new IllegalArgumentException("Email address is required");
            }

            if (!normalizedEmail.equals(user.getEmail().trim().toLowerCase(Locale.ROOT))) {
                if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                    throw new DuplicateEmailException(normalizedEmail);
                }
                user.setEmail(normalizedEmail);
            }
        }

        userRepository.save(user);
        log.info("User {} updated by {}", userId, requesterId);
        return UserResponse.from(user);
    }

    private User findActiveUser(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        if (!user.isActive()) {
            throw new UserNotFoundException("User not found: " + userId);
        }
        return user;
    }
}
