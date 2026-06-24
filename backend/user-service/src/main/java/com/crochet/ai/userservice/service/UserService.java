package com.crochet.ai.userservice.service;

import com.crochet.ai.userservice.dto.*;
import com.crochet.ai.userservice.entity.UserEntity;
import com.crochet.ai.userservice.entity.MembershipStatus;
import com.crochet.ai.userservice.exception.*;
import com.crochet.ai.userservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponse syncUser(String userIdStr, String email, String displayName, String avatarUrl) {
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new BadRequestException("User ID is required for synchronization");
        }

        UUID userId;
        try {
            userId = UUID.fromString(userIdStr);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid User ID format: " + userIdStr);
        }

        Optional<UserEntity> existingUserOpt = userRepository.findByUserId(userId);
        if (existingUserOpt.isPresent()) {
            UserEntity user = existingUserOpt.get();
            boolean modified = false;
            if (displayName != null && !displayName.isBlank() && !displayName.equals(user.getDisplayName())) {
                user.setDisplayName(displayName);
                modified = true;
            }
            if (avatarUrl != null && !avatarUrl.isBlank() && !avatarUrl.equals(user.getAvatarUrl())) {
                user.setAvatarUrl(avatarUrl);
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
            Optional<UserEntity> existingEmailOpt = userRepository.findByEmail(email);
            if (existingEmailOpt.isPresent()) {
                UserEntity user = existingEmailOpt.get();
                user.setUserId(userId);
                if (displayName != null && !displayName.isBlank()) {
                    user.setDisplayName(displayName);
                }
                if (avatarUrl != null && !avatarUrl.isBlank()) {
                    user.setAvatarUrl(avatarUrl);
                }
                user = userRepository.save(user);
                return mapToResponse(user);
            }
        }

        // Otherwise create new user
        UserEntity user = UserEntity.builder()
                .userId(userId)
                .displayName(displayName != null && !displayName.isBlank() ? displayName : "Crafter")
                .email(email != null && !email.isBlank() ? email : "")
                .passwordHash("firebase_managed")
                .phoneNumber("")
                .avatarUrl(avatarUrl != null && !avatarUrl.isBlank() ? avatarUrl : "")
                .membershipStatus(MembershipStatus.FREE)
                .membershipActive(false)
                .build();

        UserEntity savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    public UserResponse getProfile(String userId) {
        UUID uuid = UUID.fromString(userId);
        UserEntity user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));
        return mapToResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(String userId, UserSignUpRequest updateRequest) {
        UUID uuid = UUID.fromString(userId);
        UserEntity user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));

        user.setDisplayName(updateRequest.getDisplayName());
        if (updateRequest.getPhoneNumber() != null) {
            user.setPhoneNumber(updateRequest.getPhoneNumber());
        }
        if (updateRequest.getAvatarUrl() != null) {
            user.setAvatarUrl(updateRequest.getAvatarUrl());
        }

        UserEntity updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }

    @Transactional
    public void changePassword(String userId, PasswordUpdateRequest request) {
        UUID uuid = UUID.fromString(userId);
        UserEntity user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));

        String currentHash = "sha256_" + request.getCurrentPassword().hashCode();
        if (!user.getPasswordHash().equals(currentHash)) {
            throw new BadRequestException("Current password matches incorrectly");
        }

        user.setPasswordHash("sha256_" + request.getNewPassword().hashCode());
        userRepository.save(user);
    }

    @Transactional
    public UserResponse updateMembership(String userId, MembershipUpdateRequest request) {
        UUID uuid = UUID.fromString(userId);
        UserEntity user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));

        user.setMembershipStatus(request.getMembershipStatus());
        user.setMembershipActive(request.isActive());

        UserEntity updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }

    @Transactional
    public void deleteUser(String userId) {
        UUID uuid = UUID.fromString(userId);
        UserEntity user = userRepository.findByUserId(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found with ID: " + userId));
        userRepository.delete(user);
    }

    private UserResponse mapToResponse(UserEntity user) {
        return UserResponse.builder()
                .userId(user.getUserId().toString())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .avatarUrl(user.getAvatarUrl())
                .membershipStatus(user.getMembershipStatus())
                .membershipActive(user.isMembershipActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
