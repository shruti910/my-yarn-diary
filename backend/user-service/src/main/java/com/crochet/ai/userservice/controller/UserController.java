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
@CrossOrigin(origins = "*")
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
        log.info("Syncing user from gateway headers. userId: '{}', email: '{}'", userId, email);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(userService.syncUser(userId, email, displayName, profilePicture));
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
            @RequestBody UserSignUpRequest request) {
        log.info("Updating profile details for userId: {} (authenticated: {})", userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserResponse> patchProfile(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @PathVariable("id") String userId,
            @RequestBody UserPatchRequest request) {
        log.info("Patching profile details for userId: {} (authenticated: {})", userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        return ResponseEntity.ok(userService.patchProfile(userId, request));
    }

    @PutMapping("/{id}/membership")
    public ResponseEntity<UserResponse> updateMembership(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @PathVariable("id") String userId,
            @RequestBody MembershipUpdateRequest request) {
        log.info("Updating membership level to '{}' for userId: {} (authenticated: {})", request.getMembershipStatus(), userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        return ResponseEntity.ok(userService.updateMembership(userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @PathVariable("id") String userId) {
        log.warn("Deleting user account for userId: {} (authenticated: {})", userId, authenticatedUserId);
        validateUserOwnership(authenticatedUserId, userId);
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping({"/profile/change-password", "/{id}/password"})
    public ResponseEntity<Void> changePassword(
            @RequestHeader("X-User-Id") String authenticatedUserId,
            @RequestHeader("X-Firebase-Uid") String firebaseUid,
            @RequestBody @jakarta.validation.Valid ChangePasswordRequest request) {
        log.info("Request to change password for user ID: {} (firebase UID: {})", authenticatedUserId, firebaseUid);
        userService.changePassword(authenticatedUserId, firebaseUid, request.getNewPassword());
        return ResponseEntity.ok().build();
    }

    private void validateUserOwnership(String authenticatedUserId, String targetUserId) {
        if (authenticatedUserId == null || !authenticatedUserId.equalsIgnoreCase(targetUserId)) {
            throw new ForbiddenException("Access denied: You are not authorized to view or modify this profile.");
        }
    }
}
