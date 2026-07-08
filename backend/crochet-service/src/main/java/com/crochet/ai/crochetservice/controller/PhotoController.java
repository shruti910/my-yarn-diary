package com.crochet.ai.crochetservice.controller;

import com.crochet.ai.crochetservice.dto.*;
import com.crochet.ai.crochetservice.service.CrochetService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@CrossOrigin(origins = "*")
public class PhotoController {

    private final CrochetService crochetService;

    @Autowired
    public PhotoController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    @GetMapping("/api/v1/projects/{projectId}/photos")
    public ResponseEntity<List<PhotoResponse>> getPhotos(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId) {
        log.info("Fetching all photos for projectId: {} and user: {}", projectId, userId);
        return ResponseEntity.ok(crochetService.getPhotos(userId, projectId));
    }

    @PostMapping("/api/v1/projects/{projectId}/photos")
    public ResponseEntity<PhotoResponse> addPhoto(@RequestHeader("X-User-Id") String userId,
            @PathVariable String projectId,
            @RequestBody String photoBase64) {
        log.info("Adding new photo to projectId: {} for user: {}", projectId, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.addPhoto(userId, projectId, photoBase64));
    }

    @GetMapping("/api/v1/photos/{photoId}")
    public ResponseEntity<PhotoResponse> getPhotoDetails(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long photoId) {
        log.info("Fetching photo ID: {} for user: {}", photoId, userId);
        return ResponseEntity.ok(crochetService.getPhotoDetails(userId, photoId));
    }

    @DeleteMapping("/api/v1/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@RequestHeader("X-User-Id") String userId,
            @PathVariable Long photoId) {
        log.info("Deleting photo ID: {} for user: {}", photoId, userId);
        crochetService.deletePhoto(userId, photoId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/galleries")
    public ResponseEntity<List<GalleryItemResponse>> getUserMediaGallery(@RequestHeader("X-User-Id") String userId) {
        log.info("Fetching unified media galleries for user: {}", userId);
        return ResponseEntity.ok(crochetService.getUserMediaGallery(userId));
    }
}
