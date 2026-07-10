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

@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    @Autowired
    public UserService(UserRepository userRepository, AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
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

        // Reactivate user if they are deactivated
        if (userRepository.existsByUserIdIncludeDeactivated(userId)) {
            userRepository.reactivateUser(userId);
        } else if (email != null && !email.isBlank() && userRepository.existsByEmailIncludeDeactivated(email)) {
            userRepository.reactivateUserByEmail(email);
        }

        // Reactivate user if they are deactivated
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

        user.setDisplayName(updateRequest.getDisplayName());
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

    @Transactional
    public UserResponse patchProfile(String userId, UserPatchRequest patchRequest) {
        UUID uuid = UUID.fromString(userId);
        User user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));

        if (patchRequest.getDisplayName() != null) {
            user.setDisplayName(patchRequest.getDisplayName());
        }
        if (patchRequest.getEmail() != null) {
            user.setEmail(patchRequest.getEmail());
        }
        if (patchRequest.getProfilePicture() != null) {
            user.setProfilePicture(patchRequest.getProfilePicture());
        }
        if (patchRequest.getCrochetTerminology() != null) {
            user.setCrochetTerminology(patchRequest.getCrochetTerminology());
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
    public void deleteUser(String userId) {
        UUID uuid = UUID.fromString(userId);
        User user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));
        userRepository.delete(user);
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
    public void changePassword(String userIdStr, String firebaseUid, String newPassword) {
        if (firebaseUid == null || firebaseUid.isBlank()) {
            throw new BadRequestException("Firebase UID is required for this operation.");
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
                    .action("PASSWORD_CHANGE")
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            auditLogRepository.save(auditLog);

            log.info("Successfully updated password, revoked refresh tokens, and logged audit event for user {}", userIdStr);

        } catch (com.google.firebase.auth.FirebaseAuthException e) {
            log.error("Firebase Auth operation failed for user {}: {}", userIdStr, e.getMessage());
            throw new ConflictException("Firebase Auth modification failed: " + e.getMessage());
        }
    }
}
