package com.crochet.ai.userservice.controller;

import lombok.extern.slf4j.Slf4j;

import com.crochet.ai.userservice.dto.*;
import com.crochet.ai.userservice.service.UserService;
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

    @PostMapping("/sync")
    public ResponseEntity<UserResponse> syncUser(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestHeader(value = "X-User-Name", required = false) String displayName,
            @RequestHeader(value = "X-User-Avatar", required = false) String avatarUrl) {
        log.info("Syncing user from gateway headers. userId: '{}', email: '{}'", userId, email);
        return ResponseEntity.ok(userService.syncUser(userId, email, displayName, avatarUrl));
    }

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(@RequestHeader("X-User-Id") String userId) {
        log.info("Retrieving profile for userId from header: {}", userId);
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(@RequestHeader("X-User-Id") String userId,
            @RequestBody UserSignUpRequest request) {
        log.info("Updating profile details for userId from header: {}", userId);
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PutMapping("/profile/password")
    public ResponseEntity<Void> changePassword(@RequestHeader("X-User-Id") String userId,
            @RequestBody PasswordUpdateRequest request) {
        log.info("Initiating password update for userId from header: {}", userId);
        userService.changePassword(userId, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/profile/membership")
    public ResponseEntity<UserResponse> updateMembership(@RequestHeader("X-User-Id") String userId,
            @RequestBody MembershipUpdateRequest request) {
        log.info("Updating membership level to '{}' for userId from header: {}", request.getMembershipStatus(), userId);
        return ResponseEntity.ok(userService.updateMembership(userId, request));
    }

    @PutMapping("/profile/deactivate")
    public ResponseEntity<Void> deactivateUser(@RequestHeader("X-User-Id") String userId) {
        log.warn("Deactivating user account (setting is_active to false) for userId: {}", userId);
        userService.deleteUser(userId); // This triggers @SoftDelete setting is_active = false
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/profile")
    public ResponseEntity<Void> deleteUser(@RequestHeader("X-User-Id") String userId) {
        log.warn("Deleting user account for userId from header: {}", userId);
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }
}
