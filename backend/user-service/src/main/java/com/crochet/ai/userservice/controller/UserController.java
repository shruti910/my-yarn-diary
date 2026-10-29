package com.crochet.ai.userservice.controller;

import lombok.extern.slf4j.Slf4j;

import com.crochet.ai.userservice.dto.*;
import com.crochet.ai.userservice.service.UserService;
import com.crochet.ai.userservice.exception.ForbiddenException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<UserResponse> syncUser(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestHeader(value = "X-User-Name", required = false) String displayName,
            @RequestHeader(value = "X-User-Profile-Picture", required = false) String profilePicture) {
        String decodedEmail = decodeHeader(email);
        String decodedDisplayName = decodeHeader(displayName);
        String decodedProfilePicture = decodeHeader(profilePicture);
        log.info("Syncing user from gateway headers. userId: '{}', email: '{}', displayName: '{}'", userId,
                decodedEmail, decodedDisplayName);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(userService.syncUser(userId, decodedEmail, decodedDisplayName, decodedProfilePicture));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getProfile(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @PathVariable("id") String userId) {
        log.info("Retrieving profile for userId: {} (authenticated: {})", userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateProfile(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @PathVariable("id") String userId,
            @RequestBody @jakarta.validation.Valid UserProfileUpdateRequest request) {
        log.info("Updating profile details for userId: {} (authenticated: {})", userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PutMapping("/{id}/membership")
    public ResponseEntity<UserResponse> updateMembership(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @PathVariable("id") String userId,
            @RequestBody @jakarta.validation.Valid MembershipUpdateRequest request) {
        log.info("Updating membership level to '{}' for userId: {} (authenticated: {})", request.getMembershipStatus(),
                userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        return ResponseEntity.ok(userService.updateMembership(userId, request));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivateUser(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @PathVariable("id") String userId) {
        log.warn("Deactivating user account for userId: {} (authenticated: {})", userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        userService.deactivateUser(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @RequestHeader(value = "X-Firebase-Uid", required = false) String firebaseUid,
            @RequestHeader(value = "X-Auth-Time", required = false) String authTime,
            @PathVariable("id") String userId) {
        log.warn("Deleting user account for userId: {} (authenticated: {})", userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        userService.deleteUser(userId, firebaseUid, authTime);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/audit-events")
    public ResponseEntity<Void> recordAuditEvent(
            @RequestHeader(value = "X-Forwarded-Identity", required = false) String forwardedIdentity,
            @RequestBody @jakarta.validation.Valid com.crochet.ai.userservice.dto.AuditLogEventRequest request) {
        userService.recordAuditEvent(request);
        return ResponseEntity.status(org.springframework.http.HttpStatus.ACCEPTED).build();
    }

    @PutMapping({ "/profile/change-password", "/{id}/password" })
    public ResponseEntity<Void> changePassword(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @RequestHeader("X-Firebase-Uid") String firebaseUid,
            @RequestHeader("X-Auth-Time") String authTime,
            @RequestBody @jakarta.validation.Valid ChangePasswordRequest request) {
        log.info("Request to change password for user ID: {} (firebase UID: {})", authenticatedUserId, firebaseUid);
        userService.changePassword(authenticatedUserId, firebaseUid, authTime, request.getNewPassword());
        return ResponseEntity.ok().build();
    }

    private void validateUserOwnership(String authenticatedUserId, String targetUserId) {
        if (authenticatedUserId == null || !authenticatedUserId.equalsIgnoreCase(targetUserId)) {
            throw new ForbiddenException("Access denied: You are not authorized to view or modify this profile.");
        }
    }

    private String decodeHeader(String val) {
        if (val == null || val.isBlank())
            return null;
        try {
            return java.net.URLDecoder.decode(val, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return val;
        }
    }
}
