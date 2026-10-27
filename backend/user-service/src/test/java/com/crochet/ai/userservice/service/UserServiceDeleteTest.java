package com.crochet.ai.userservice.service;

import com.crochet.ai.userservice.entity.AuditLog;
import com.crochet.ai.userservice.entity.User;
import com.crochet.ai.userservice.exception.ConflictException;
import com.crochet.ai.userservice.repository.AuditLogRepository;
import com.crochet.ai.userservice.repository.UserRepository;
import com.crochet.ai.userservice.security.InternalTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceDeleteTest {

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
    private User testUser;

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

        testUser = User.builder()
                .userId(testUserId)
                .email("test@example.com")
                .displayName("Test Crafter")
                .build();
    }

    @Test
    @DisplayName("TC-18.4: Downstream crochet-service failure aborts with ConflictException and prevents user deletion")
    void shouldAbortAndNotDeleteWhenCrochetServiceFails() {
        when(userRepository.findByUserId(testUserId)).thenReturn(Optional.of(testUser));
        when(tokenProvider.createToken(anyString(), anyString(), anyString())).thenReturn("mock-token");

        // Simulate crochet-service down / network error
        when(restTemplate.exchange(
                contains("crochet-service"),
                eq(HttpMethod.DELETE),
                any(HttpEntity.class),
                eq(Void.class)
        )).thenThrow(new RestClientException("Connection refused to crochet-service:8082"));

        ConflictException ex = assertThrows(ConflictException.class, () ->
                userService.deleteUser(testUserId.toString(), "fb-uid-123", "123456789")
        );

        assertTrue(ex.getMessage().contains("Storage service is temporarily unavailable"));

        // Crucial invariant: Ensure userRepository.delete was NEVER invoked
        verify(userRepository, never()).delete(any());
        // Ensure auditLog was NOT marked successful prematurely
        verify(auditLogRepository, never()).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("TC-18.4b: Downstream ai-service failure aborts with ConflictException and prevents user deletion")
    void shouldAbortAndNotDeleteWhenAiServiceFails() {
        when(userRepository.findByUserId(testUserId)).thenReturn(Optional.of(testUser));
        when(tokenProvider.createToken(anyString(), anyString(), anyString())).thenReturn("mock-token");

        // Crochet succeeds, but ai-service fails
        when(restTemplate.exchange(
                contains("crochet-service"),
                eq(HttpMethod.DELETE),
                any(HttpEntity.class),
                eq(Void.class)
        )).thenReturn(null);

        when(restTemplate.exchange(
                contains("ai-service"),
                eq(HttpMethod.DELETE),
                any(HttpEntity.class),
                eq(Void.class)
        )).thenThrow(new RestClientException("Connection timeout to ai-service:8083"));

        ConflictException ex = assertThrows(ConflictException.class, () ->
                userService.deleteUser(testUserId.toString(), "fb-uid-123", "123456789")
        );

        assertTrue(ex.getMessage().contains("AI service is temporarily unavailable"));

        verify(userRepository, never()).delete(any());
    }

    @Test
    @DisplayName("TC-18.5: When all services are healthy, cascading delete proceeds and deletes user record")
    void shouldCompleteCascadeDeletionWhenAllServicesHealthy() {
        when(userRepository.findByUserId(testUserId)).thenReturn(Optional.of(testUser));
        when(tokenProvider.createToken(anyString(), anyString(), anyString())).thenReturn("mock-token");

        when(restTemplate.exchange(
                contains("crochet-service"),
                eq(HttpMethod.DELETE),
                any(HttpEntity.class),
                eq(Void.class)
        )).thenReturn(null);

        when(restTemplate.exchange(
                contains("ai-service"),
                eq(HttpMethod.DELETE),
                any(HttpEntity.class),
                eq(Void.class)
        )).thenReturn(null);

        // Execute deletion
        userService.deleteUser(testUserId.toString(), "", "123456789");

        // Verify audit log recorded
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        // Verify user deleted from database
        verify(userRepository, times(1)).delete(testUser);
    }
}
