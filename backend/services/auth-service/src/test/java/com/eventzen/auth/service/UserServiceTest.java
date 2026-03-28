package com.eventzen.auth.service;

import com.eventzen.auth.dto.UpdateUserRequest;
import com.eventzen.auth.dto.UserResponse;
import com.eventzen.auth.entity.User;
import com.eventzen.auth.exception.DuplicateEmailException;
import com.eventzen.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
            .userId("user-123")
            .firstName("Ava")
            .lastName("Stone")
            .email("ava@example.com")
            .phone("1234567890")
            .isActive(true)
            .build();
    }

    @Test
    void updateUserPersistsNormalizedEmailWhenItChanges() {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setEmail("  New.Email@Example.COM  ");

        when(userRepository.findById("user-123")).thenReturn(Optional.of(user));
        when(userRepository.existsByEmailIgnoreCase("new.email@example.com")).thenReturn(false);

        UserResponse response = userService.updateUser("user-123", request, "user-123", false);

        verify(userRepository).save(userCaptor.capture());
        assertEquals("new.email@example.com", userCaptor.getValue().getEmail());
        assertEquals("new.email@example.com", response.getEmail());
    }

    @Test
    void updateUserRejectsDuplicateEmailIgnoringCase() {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setEmail("Taken@Example.com");

        when(userRepository.findById("user-123")).thenReturn(Optional.of(user));
        when(userRepository.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);

        assertThrows(
            DuplicateEmailException.class,
            () -> userService.updateUser("user-123", request, "user-123", false)
        );

        verify(userRepository, never()).save(user);
    }

    @Test
    void updateUserDoesNotCheckDuplicatesWhenEmailOnlyChangesByCaseOrWhitespace() {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setEmail("  AVA@EXAMPLE.COM ");

        when(userRepository.findById("user-123")).thenReturn(Optional.of(user));

        UserResponse response = userService.updateUser("user-123", request, "user-123", false);

        verify(userRepository).save(userCaptor.capture());
        assertEquals("ava@example.com", userCaptor.getValue().getEmail());
        assertEquals("ava@example.com", response.getEmail());
        verify(userRepository, never()).existsByEmailIgnoreCase("ava@example.com");
    }
}
