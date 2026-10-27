package com.crochet.ai.userservice.service;

import com.crochet.ai.userservice.dto.*;
import com.crochet.ai.userservice.entity.User;
import com.crochet.ai.userservice.enums.MembershipStatus;
import com.crochet.ai.userservice.exception.*;
import com.crochet.ai.userservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crochet.ai.userservice.entity.AuditLog;
import com.crochet.ai.userservice.repository.AuditLogRepository;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import lombok.extern.slf4j.Slf4j;
import java.util.Optional;
import java.util.UUID;

import com.crochet.ai.userservice.enums.AuditAction;
import com.crochet.ai.userservice.enums.ResourceType;
import com.crochet.ai.userservice.security.InternalTokenProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final RestTemplate restTemplate;
    private final InternalTokenProvider tokenProvider;
    private final String crochetServiceUrl;
    private final String crochetDeleteEndpoint;
    private final String aiServiceUrl;
    private final String aiDeleteEndpoint;

    @Autowired
    public UserService(
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            RestTemplate restTemplate,
            InternalTokenProvider tokenProvider,
            @Value("${crochet-service.url:http://crochet-service:8082}") String crochetServiceUrl,
            @Value("${crochet-service.delete-user-endpoint:/api/v1/projects/user}") String crochetDeleteEndpoint,
            @Value("${ai-service.url:http://ai-service:8083}") String aiServiceUrl,
            @Value("${ai-service.delete-user-endpoint:/api/v1/chats/user}") String aiDeleteEndpoint) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.restTemplate = restTemplate;
        this.tokenProvider = tokenProvider;
        this.crochetServiceUrl = crochetServiceUrl;
        this.crochetDeleteEndpoint = crochetDeleteEndpoint;
        this.aiServiceUrl = aiServiceUrl;
        this.aiDeleteEndpoint = aiDeleteEndpoint;
    }

    @Transactional
    public UserResponse syncUser(String userIdStr, String email, String displayName, String profilePicture) {
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new BadRequestException("User ID is required for synchronization");
        }

        UUID userId;
        try {
            userId = UUID.fromString(userIdStr);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid User ID format: " + userIdStr);
        }

        // Reactivate the user if they are deactivated.
        if (userRepository.existsByUserIdIncludeDeactivated(userId)) {
            userRepository.reactivateUser(userId);
        } else if (email != null && !email.isBlank() && userRepository.existsByEmailIncludeDeactivated(email)) {
            userRepository.reactivateUserByEmail(email);
        }

        Optional<User> existingUserOpt = userRepository.findByUserId(userId);
        if (existingUserOpt.isPresent()) {
            User user = existingUserOpt.get();
            boolean modified = false;
            if (displayName != null && !displayName.isBlank() && !displayName.equals(user.getDisplayName())) {
                user.setDisplayName(displayName);
                modified = true;
            }
            if (profilePicture != null && !profilePicture.isBlank()
                    && !profilePicture.equals(user.getProfilePicture())) {
                user.setProfilePicture(profilePicture);
                modified = true;
                    }
            if (email != null && !email.isBlank() && !email.equals(user.getEmail())) {
                user.setEmail(email);
                modified = true;
            }
            if (modified) {
                user = userRepository.save(user);
            }
            return mapToResponse(user);
        }

        // If not found by userId, check if email matches to link accounts
        if (email != null && !email.isBlank()) {
            Optional<User> existingEmailOpt = userRepository.findByEmail(email);
            if (existingEmailOpt.isPresent()) {
                User user = existingEmailOpt.get();
                user.setUserId(userId);
                if (displayName != null && !displayName.isBlank()) {
                    user.setDisplayName(displayName);
                }
                if (profilePicture != null && !profilePicture.isBlank()) {
                    user.setProfilePicture(profilePicture);
                }
                user = userRepository.save(user);
                return mapToResponse(user);
            }
        }

        // Otherwise create new user
        User user = User.builder()
                .userId(userId)
                .displayName(displayName != null && !displayName.isBlank() ? displayName : "Crafter")
                .email(email != null && !email.isBlank() ? email : "")
                .profilePicture(profilePicture != null && !profilePicture.isBlank() ? profilePicture : "")
                .membershipStatus(MembershipStatus.FREE)
                .membershipActive(false)
                .crochetTerminology("US")
                .build();

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    public UserResponse getProfile(String userId) {
        UUID uuid = UUID.fromString(userId);
        User user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));
        return mapToResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(String userId, UserSignUpRequest updateRequest) {
        UUID uuid = UUID.fromString(userId);
        User user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));

        if (updateRequest.getDisplayName() != null) {
            user.setDisplayName(updateRequest.getDisplayName());
        }
        if (updateRequest.getEmail() != null) {
            user.setEmail(updateRequest.getEmail());
        }
        if (updateRequest.getProfilePicture() != null) {
            validateProfilePicture(updateRequest.getProfilePicture());
            user.setProfilePicture(updateRequest.getProfilePicture());
        }
        if (updateRequest.getCrochetTerminology() != null) {
            user.setCrochetTerminology(updateRequest.getCrochetTerminology());
        }

        User updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }

    private void validateProfilePicture(String base64Data) {
        if (base64Data == null || base64Data.isBlank()) {
            return;
        }
        // If it's a web URL (e.g. from initial OAuth sync), bypass base64 validation
        if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
            return;
        }
        String base64Content = base64Data;
        if (base64Data.contains(",")) {
            base64Content = base64Data.substring(base64Data.indexOf(",") + 1);
        }
        try {
            byte[] decodedBytes = java.util.Base64.getDecoder().decode(base64Content.trim());
            long maxBytes = 2 * 1024 * 1024; // 2MB
            if (decodedBytes.length > maxBytes) {
                throw new BadRequestException("Profile picture size exceeds the maximum allowed limit of 2MB.");
            }
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid profile picture format. Must be a valid Base64 image data string.");
        }
    }

    @Transactional
    public UserResponse updateMembership(String userId, MembershipUpdateRequest request) {
        UUID uuid = UUID.fromString(userId);
        User user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));

        user.setMembershipStatus(request.getMembershipStatus());
        user.setMembershipActive(request.isActive());

        User updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }

    @Transactional
    public void deleteUser(String userId, String firebaseUid, String authTimeStr) {
        UUID uuid = UUID.fromString(userId);
        User user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));

        // Generate HMAC internal handoff token to securely invoke other microservices
        String internalHandoffToken = tokenProvider.createToken(userId, user.getEmail(), firebaseUid);
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);
        headers.set("X-Forwarded-Identity", internalHandoffToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // 1. Cascade delete all user projects, categories, photos in crochet-service
        try {
            String crochetDeleteUrl = crochetServiceUrl + crochetDeleteEndpoint + "/" + userId;
            log.info("Cascading delete to crochet-service: {}", crochetDeleteUrl);
            restTemplate.exchange(crochetDeleteUrl, HttpMethod.DELETE, entity, Void.class);
        } catch (Exception e) {
            log.error("Failed to cascade delete user data in crochet-service for userId {}: {}", userId, e.getMessage());
            throw new ConflictException("Unable to delete project data: Storage service is temporarily unavailable. No data was deleted. Please try again shortly.");
        }

        // 2. Cascade delete all user AI chat sessions and rate limits in ai-service
        try {
            String aiDeleteUrl = aiServiceUrl + aiDeleteEndpoint + "/" + userId;
            log.info("Cascading delete to ai-service: {}", aiDeleteUrl);
            restTemplate.exchange(aiDeleteUrl, HttpMethod.DELETE, entity, Void.class);
        } catch (Exception e) {
            log.error("Failed to cascade delete user data in ai-service for userId {}: {}", userId, e.getMessage());
            throw new ConflictException("Unable to delete chat history: AI service is temporarily unavailable. No data was deleted. Please try again shortly.");
        }

        // 3. Record ACCOUNT_DELETED in audit_logs before deleting user
        try {
            AuditLog auditLog = AuditLog.builder()
                    .userId(uuid)
                    .action(AuditAction.ACCOUNT_DELETED.name())
                    .resourceType(ResourceType.USER.name())
                    .resourceId(userId)
                    .status("SUCCESS")
                    .details("{\"reason\":\"User requested self-deletion\",\"email\":\"" + user.getEmail() + "\"}")
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            auditLogRepository.save(auditLog);
            log.info("Recorded ACCOUNT_DELETED in audit_logs for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to write audit log for user deletion: {}", e.getMessage());
        }

        // 4. Delete user record from database
        userRepository.delete(user);
        log.info("Deleted user row from PostgreSQL for user: {}", userId);

        // 5. Delete user from Firebase Auth via Admin SDK if firebaseUid provided
        if (firebaseUid != null && !firebaseUid.isBlank()) {
            try {
                FirebaseAuth.getInstance().deleteUser(firebaseUid);
                log.info("Deleted Firebase user account for uid: {}", firebaseUid);
            } catch (Exception e) {
                log.error("Failed to delete user from Firebase Auth for uid {}: {}", firebaseUid, e.getMessage());
            }
        }
    }

    @Transactional
    public void recordAuditEvent(com.crochet.ai.userservice.dto.AuditLogEventRequest request) {
        if (request == null || request.userId() == null || request.action() == null) {
            log.warn("Ignoring invalid audit log event request");
            return;
        }

        AuditLog auditLog = AuditLog.builder()
                .userId(request.userId())
                .action(request.action().name())
                .resourceType(request.resourceType() != null ? request.resourceType().name() : null)
                .resourceId(request.resourceId())
                .status(request.status() != null && !request.status().isBlank() ? request.status() : "SUCCESS")
                .details(request.details())
                .timestamp(java.time.LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.debug("Successfully recorded audit event {} for user {}", request.action(), request.userId());
    }

    private UserResponse mapToResponse(User user) {
        return new UserResponse(
                user.getUserId().toString(),
                user.getDisplayName(),
                user.getEmail(),
                user.getProfilePicture(),
                user.getMembershipStatus(),
                user.isMembershipActive(),
                user.getCrochetTerminology(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    @Transactional
    public void changePassword(String userIdStr, String firebaseUid, String authTimeStr, String newPassword) {
        if (firebaseUid == null || firebaseUid.isBlank()) {
            throw new BadRequestException("Firebase UID is required for this operation.");
        }

        // Enforce recent-login re-authentication check (5 minutes = 300 seconds)
        if (authTimeStr == null || authTimeStr.isBlank()) {
            throw new UnauthorizedException("Re-authentication required: Session verification missing. Please log in again.");
        }
        try {
            long authTimeSeconds = Long.parseLong(authTimeStr);
            long currentTimeSeconds = java.time.Instant.now().getEpochSecond();
            long maxAgeSeconds = 300; // 5 minutes
            if (currentTimeSeconds - authTimeSeconds > maxAgeSeconds) {
                log.warn("Password change blocked for user {}: token auth_time was {} seconds ago (max allowed: {})",
                        userIdStr, currentTimeSeconds - authTimeSeconds, maxAgeSeconds);
                throw new UnauthorizedException("Re-authentication required: Recent login required to change password. Please log in again.");
            }
        } catch (NumberFormatException e) {
            throw new UnauthorizedException("Re-authentication required: Invalid session authentication timestamp.");
        }

        UUID userId;
        try {
            userId = UUID.fromString(userIdStr);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid User ID format: " + userIdStr);
        }

        try {
            // 1. Update Firebase Password
            UserRecord.UpdateRequest updateRequest = new UserRecord.UpdateRequest(firebaseUid)
                    .setPassword(newPassword);
            FirebaseAuth.getInstance().updateUser(updateRequest);

            // 2. Revoke active device refresh tokens
            FirebaseAuth.getInstance().revokeRefreshTokens(firebaseUid);

            // 3. Write Audit Log entry
            AuditLog auditLog = AuditLog.builder()
                    .userId(userId)
                    .action(AuditAction.ACCOUNT_PASSWORD_CHANGED.name())
                    .resourceType(ResourceType.AUTH.name())
                    .resourceId(userIdStr)
                    .status("SUCCESS")
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            auditLogRepository.save(auditLog);

            log.info("Successfully updated password, revoked refresh tokens, and logged audit event for user {}", userIdStr);

        } catch (com.google.firebase.auth.FirebaseAuthException e) {
            log.error("Firebase Auth operation failed for user {}: {}", userIdStr, e.getMessage());
            throw new ConflictException("Could not update your password. Please try again.");
        }
    }
}
