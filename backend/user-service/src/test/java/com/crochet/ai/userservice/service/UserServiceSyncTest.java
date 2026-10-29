package com.crochet.ai.userservice.service;

import com.crochet.ai.userservice.dto.UserResponse;
import com.crochet.ai.userservice.entity.User;
import com.crochet.ai.userservice.repository.AuditLogRepository;
import com.crochet.ai.userservice.repository.UserRepository;
import com.crochet.ai.userservice.security.InternalTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceSyncTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private InternalTokenProvider tokenProvider;

    private UserService userService;

    private final UUID testUserId = UUID.fromString("655105df-63fd-3b4a-9efd-73ad43378bea");

    @BeforeEach
    void setUp() {
        userService = new UserService(
                userRepository,
                auditLogRepository,
                restTemplate,
                tokenProvider,
                "http://crochet-service:8082",
                "/api/v1/projects/user",
                "http://ai-service:8083",
                "/api/v1/chats/user"
        );
    }

    @Test
    @DisplayName("Syncing an active user keeps user active without unnecessary updates")
    void shouldKeepActiveUserActiveOnSync() {
        User activeUser = User.builder()
                .userId(testUserId)
                .email("crafter@example.com")
                .displayName("Crafter")
                .active(true)
                .build();

        when(userRepository.findByUserId(testUserId)).thenReturn(Optional.of(activeUser));

        UserResponse response = userService.syncUser(testUserId.toString(), "crafter@example.com", "Crafter", null);

        assertNotNull(response);
        assertTrue(activeUser.isActive());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Syncing a deactivated user explicitly reactivates them and saves entity")
    void shouldReactivateDeactivatedUserOnSync() {
        User deactivatedUser = User.builder()
                .userId(testUserId)
                .email("returning@example.com")
                .displayName("Returning Crafter")
                .active(false)
                .build();

        when(userRepository.findByUserId(testUserId)).thenReturn(Optional.of(deactivatedUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse response = userService.syncUser(testUserId.toString(), "returning@example.com", "Returning Crafter", null);

        assertNotNull(response);
        assertTrue(deactivatedUser.isActive());
        verify(userRepository, times(1)).save(deactivatedUser);
    }

    @Test
    @DisplayName("Syncing a new user creates user with active=true by default")
    void shouldCreateNewUserWithActiveTrueByDefault() {
        when(userRepository.findByUserId(testUserId)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse response = userService.syncUser(testUserId.toString(), "new@example.com", "New Crafter", null);

        assertNotNull(response);
        verify(userRepository).save(argThat(User::isActive));
    }
}
