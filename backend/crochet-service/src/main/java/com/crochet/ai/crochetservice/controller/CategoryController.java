package com.crochet.ai.crochetservice.controller;

import com.crochet.ai.crochetservice.dto.CategoryRequest;
import com.crochet.ai.crochetservice.entity.Category;
import com.crochet.ai.crochetservice.service.CrochetService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/categories")
@CrossOrigin(origins = "*")
public class CategoryController {

    private final CrochetService crochetService;

    @Autowired
    public CategoryController(CrochetService crochetService) {
        this.crochetService = crochetService;
    }

    @GetMapping
    public ResponseEntity<List<Category>> getCategories(@RequestHeader("X-User-Id") String userId) {
        log.info("Fetching all categories for user: {}", userId);
        return ResponseEntity.ok(crochetService.getCategories(userId));
    }

    @PostMapping
    public ResponseEntity<Category> createCategory(@RequestHeader("X-User-Id") String userId,
            @RequestBody CategoryRequest request) {
        log.info("Creating new category: '{}' for user: {}", request.getName(), userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(crochetService.createCategory(userId, request));
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<Category> updateCategory(@RequestHeader("X-User-Id") String userId,
            @PathVariable String categoryId,
            @RequestBody CategoryRequest request) {
        log.info("Updating categoryId: {} for user: {} to new name: '{}'", categoryId, userId, request.getName());
        return ResponseEntity.ok(crochetService.updateCategory(userId, categoryId, request));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteCategory(@RequestHeader("X-User-Id") String userId,
            @PathVariable String categoryId) {
        log.info("Deleting categoryId: {} for user: {}", categoryId, userId);
        crochetService.deleteCategory(userId, categoryId);
        return ResponseEntity.noContent().build();
    }
}
