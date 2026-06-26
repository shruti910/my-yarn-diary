package com.crochet.ai.crochetservice.service;

import com.crochet.ai.crochetservice.dto.*;
import com.crochet.ai.crochetservice.entity.CategoryEntity;
import com.crochet.ai.crochetservice.entity.JournalLogEntity;
import com.crochet.ai.crochetservice.entity.ProjectEntity;
import com.crochet.ai.crochetservice.entity.ProjectPhotoEntity;
import com.crochet.ai.crochetservice.entity.ProjectStatus;
import com.crochet.ai.crochetservice.exception.*;
import com.crochet.ai.crochetservice.repository.CategoryRepository;
import com.crochet.ai.crochetservice.repository.JournalLogRepository;
import com.crochet.ai.crochetservice.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CrochetService {

    private final CategoryRepository categoryRepository;
    private final ProjectRepository projectRepository;
    private final JournalLogRepository journalLogRepository;

    @Autowired
    public CrochetService(CategoryRepository categoryRepository,
                          ProjectRepository projectRepository,
                          JournalLogRepository journalLogRepository) {
        this.categoryRepository = categoryRepository;
        this.projectRepository = projectRepository;
        this.journalLogRepository = journalLogRepository;
    }

    // --- DIRECTORIES / CATEGORIES ---
    public List<CategoryEntity> getCategories(String userId) {
        UUID userUuid = UUID.fromString(userId);
        List<CategoryEntity> categories = categoryRepository.findByUserId(userUuid);
        
        boolean hasDefault = false;
        boolean hasFavourites = false;
        for (CategoryEntity cat : categories) {
            String norm = cat.getName().trim().toLowerCase();
            if (norm.equals("default")) {
                hasDefault = true;
            } else if (norm.equals("favourites ❤️") || norm.equals("favourites")) {
                hasFavourites = true;
            }
        }
        
        boolean updated = false;
        if (!hasDefault) {
            CategoryEntity defaultCat = CategoryEntity.builder()
                    .categoryId(UUID.randomUUID())
                    .userId(userUuid)
                    .name("Default")
                    .createdAt(LocalDateTime.now())
                    .build();
            categoryRepository.save(defaultCat);
            updated = true;
        }
        if (!hasFavourites) {
            CategoryEntity favCat = CategoryEntity.builder()
                    .categoryId(UUID.randomUUID())
                    .userId(userUuid)
                    .name("Favourites ❤️")
                    .createdAt(LocalDateTime.now())
                    .build();
            categoryRepository.save(favCat);
            updated = true;
        }
        
        if (updated) {
            categories = categoryRepository.findByUserId(userUuid);
        }
        return categories;
    }

    @Transactional
    public CategoryEntity createCategory(String userId, CategoryRequest request) {
        CategoryEntity category = CategoryEntity.builder()
                .categoryId(UUID.randomUUID())
                .userId(UUID.fromString(userId))
                .name(request.getName())
                .build();
        return categoryRepository.save(category);
    }

    @Transactional
    public CategoryEntity updateCategory(String userId, String categoryId, CategoryRequest request) {
        UUID categoryUuid = UUID.fromString(categoryId);
        UUID userUuid = UUID.fromString(userId);
        CategoryEntity category = categoryRepository.findByCategoryId(categoryUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Directory folder not found: " + categoryId));
        if (!category.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden update command issued");
        }
        
        String normName = category.getName().trim().toLowerCase();
        if (normName.equals("default") || normName.equals("favourites ❤️") || normName.equals("favourites")) {
            throw new BadRequestException("Default and Favourites ❤️ categories cannot be renamed.");
        }
        
        category.setName(request.getName());
        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(String userId, String categoryId) {
        UUID categoryUuid = UUID.fromString(categoryId);
        UUID userUuid = UUID.fromString(userId);
        CategoryEntity category = categoryRepository.findByCategoryId(categoryUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Directory folder not found: " + categoryId));
        if (!category.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden deletion command issued");
        }
        
        String normName = category.getName().trim().toLowerCase();
        if (normName.equals("default") || normName.equals("favourites ❤️") || normName.equals("favourites")) {
            throw new BadRequestException("Default and Favourites ❤️ categories cannot be deleted.");
        }

        // Delete cascaded subprojects and logs
        List<ProjectEntity> projectsInFolder = projectRepository.findByUserIdAndCategoryId(userUuid, categoryUuid);
        for (ProjectEntity project : projectsInFolder) {
            journalLogRepository.deleteByProjectId(project.getProjectId());
        }
        
        projectRepository.deleteByCategoryId(categoryUuid);
        categoryRepository.delete(category);
    }

    // --- TRACKED PROJECTS ---
    public List<ProjectEntity> getProjects(String userId, String categoryId) {
        UUID userUuid = UUID.fromString(userId);
        
        // If category is "Favourites ❤️", return favorited projects
        if (categoryId != null && !categoryId.equalsIgnoreCase("all")) {
            try {
                UUID categoryUuid = UUID.fromString(categoryId);
                Optional<CategoryEntity> categoryOpt = categoryRepository.findByCategoryId(categoryUuid);
                if (categoryOpt.isPresent()) {
                    String normName = categoryOpt.get().getName().trim().toLowerCase();
                    if (normName.equals("favourites ❤️") || normName.equals("favourites")) {
                        return projectRepository.findByUserIdAndIsFavoriteTrue(userUuid);
                    }
                }
            } catch (IllegalArgumentException e) {
                // If categoryId is not a valid UUID (e.g. dummy id), proceed to normal logic
            }
        }
        
        if (categoryId == null || categoryId.equalsIgnoreCase("all")) {
            return projectRepository.findByUserId(userUuid);
        }
        UUID categoryUuid = UUID.fromString(categoryId);
        return projectRepository.findByUserIdAndCategoryId(userUuid, categoryUuid);
    }

    public ProjectEntity getProjectDetails(String userId, String projectId) {
        UUID projectUuid = UUID.fromString(projectId);
        UUID userUuid = UUID.fromString(userId);
        ProjectEntity project = projectRepository.findByProjectId(projectUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Crochet project not found: " + projectId));
        if (!project.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        return project;
    }

    @Transactional
    public ProjectEntity createProject(String userId, ProjectRequest request) {
        validateProjectDates(request);
        UUID userUuid = UUID.fromString(userId);
        
        final UUID categoryUuid;
        if (request.getCategoryId() == null || request.getCategoryId().isBlank()) {
            CategoryEntity defaultCat = categoryRepository.findByUserId(userUuid).stream()
                    .filter(c -> c.getName().trim().equalsIgnoreCase("default"))
                    .findFirst()
                    .orElseGet(() -> {
                        CategoryEntity newDefault = CategoryEntity.builder()
                                .categoryId(UUID.randomUUID())
                                .userId(userUuid)
                                .name("Default")
                                .createdAt(LocalDateTime.now())
                                .build();
                        return categoryRepository.save(newDefault);
                    });
            categoryUuid = defaultCat.getCategoryId();
        } else {
            categoryUuid = UUID.fromString(request.getCategoryId());
        }

        CategoryEntity category = categoryRepository.findByCategoryId(categoryUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Directory folder not found: " + categoryUuid.toString()));

        String normName = category.getName().trim().toLowerCase();
        if (normName.equals("favourites ❤️") || normName.equals("favourites")) {
            throw new BadRequestException("Projects cannot be created directly inside the Favourites category.");
        }

        ProjectEntity project = ProjectEntity.builder()
                .projectId(UUID.randomUUID())
                .userId(userUuid)
                .category(category)
                .categoryId(categoryUuid)
                .title(request.getTitle())
                .status(request.getStatus() != null ? request.getStatus() : ProjectStatus.IN_PROGRESS)
                .rowCount(0)
                .notes(request.getNotes())
                .careInstructions(request.getCareInstructions())
                .totalTime(request.getTotalTime())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isFavorite(false)
                .isArchive(false)
                .thumbnailIndex(0)
                .build();
        project.setProductPhotos(request.getProductPhotos() != null ? request.getProductPhotos() : new ArrayList<>());

        if (request.getYarns() != null) {
            for (YarnRequest yr : request.getYarns()) {
                project.getYarnEntities().add(com.crochet.ai.crochetservice.entity.ProjectYarnEntity.builder()
                        .project(project)
                        .brand(yr.brand())
                        .lineName(yr.lineName())
                        .colorway(yr.colorway())
                        .dyeLot(yr.dyeLot())
                        .weight(yr.weight())
                        .fiberContent(yr.fiberContent())
                        .quantityUsed(yr.quantityUsed())
                        .unit(yr.unit() != null ? yr.unit() : "meters")
                        .build());
            }
        }
        if (request.getHooks() != null) {
            for (HookRequest hr : request.getHooks()) {
                project.getHookEntities().add(com.crochet.ai.crochetservice.entity.ProjectHookEntity.builder()
                        .project(project)
                        .sizeMm(hr.sizeMm())
                        .sizeUs(hr.sizeUs())
                        .material(hr.material())
                        .brand(hr.brand())
                        .build());
            }
        }

        return projectRepository.save(project);
    }

    @Transactional
    public ProjectEntity updateProject(String userId, String projectId, ProjectRequest request) {
        validateProjectDates(request);
        ProjectEntity project = getProjectDetails(userId, projectId);

        UUID categoryUuid = UUID.fromString(request.getCategoryId());
        if (!project.getCategoryId().equals(categoryUuid)) {
            CategoryEntity category = categoryRepository.findByCategoryId(categoryUuid)
                    .orElseThrow(() -> new ResourceNotFoundException("Directory folder not found: " + request.getCategoryId()));
            String checkName = category.getName().trim().toLowerCase();
            if (checkName.equals("favourites ❤️") || checkName.equals("favourites")) {
                throw new BadRequestException("Projects cannot be moved directly into the Favourites category.");
            }
            project.setCategory(category);
            project.setCategoryId(categoryUuid);
        }

        project.setTitle(request.getTitle());
        
        if (request.getYarns() != null) {
            project.getYarnEntities().clear();
            for (YarnRequest yr : request.getYarns()) {
                project.getYarnEntities().add(com.crochet.ai.crochetservice.entity.ProjectYarnEntity.builder()
                        .project(project)
                        .brand(yr.brand())
                        .lineName(yr.lineName())
                        .colorway(yr.colorway())
                        .dyeLot(yr.dyeLot())
                        .weight(yr.weight())
                        .fiberContent(yr.fiberContent())
                        .quantityUsed(yr.quantityUsed())
                        .unit(yr.unit() != null ? yr.unit() : "meters")
                        .build());
            }
        }
        if (request.getHooks() != null) {
            project.getHookEntities().clear();
            for (HookRequest hr : request.getHooks()) {
                project.getHookEntities().add(com.crochet.ai.crochetservice.entity.ProjectHookEntity.builder()
                        .project(project)
                        .sizeMm(hr.sizeMm())
                        .sizeUs(hr.sizeUs())
                        .material(hr.material())
                        .brand(hr.brand())
                        .build());
            }
        }
        if (request.getStatus() != null) project.setStatus(request.getStatus());
        
        project.setRowCount(request.getRowCount());
        
        if (request.getNotes() != null) project.setNotes(request.getNotes());
        if (request.getCareInstructions() != null) project.setCareInstructions(request.getCareInstructions());
        if (request.getTotalTime() != null) project.setTotalTime(request.getTotalTime());
        if (request.getStartDate() != null) project.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) project.setEndDate(request.getEndDate());
        if (request.getProductPhotos() != null) project.setProductPhotos(request.getProductPhotos());
        if (request.getIsArchive() != null) project.setArchive(request.getIsArchive());
        if (request.getThumbnailIndex() != null) project.setThumbnailIndex(request.getThumbnailIndex());

        return projectRepository.save(project);
    }

    @Transactional
    public void deleteProject(String userId, String projectId) {
        ProjectEntity project = getProjectDetails(userId, projectId);
        journalLogRepository.deleteByProjectId(project.getProjectId());
        projectRepository.delete(project);
    }

    @Transactional
    public ProjectEntity toggleFavoriteProject(String userId, String projectId) {
        UUID userUuid = UUID.fromString(userId);
        UUID projectUuid = UUID.fromString(projectId);
        ProjectEntity project = projectRepository.findByProjectId(projectUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
        if (!project.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        project.setFavorite(!project.isFavorite());
        return projectRepository.save(project);
    }

    public List<ProjectEntity> getFavoriteProjects(String userId) {
        UUID userUuid = UUID.fromString(userId);
        return projectRepository.findByUserIdAndIsFavoriteTrue(userUuid);
    }

    // --- PROGRESS JOURNAL LOGS ---
    public List<JournalLogEntity> getJournalLogs(String userId, String projectId) {
        // Ensure authorization
        ProjectEntity project = getProjectDetails(userId, projectId);
        return journalLogRepository.findByProjectId(project.getProjectId());
    }

    @Transactional
    public JournalLogEntity createJournalLog(String userId, String projectId, JournalLogRequest request) {
        // Validation check
        ProjectEntity project = getProjectDetails(userId, projectId);

        JournalLogEntity log = JournalLogEntity.builder()
                .logId(UUID.randomUUID())
                .project(project)
                .projectId(project.getProjectId())
                .userId(UUID.fromString(userId))
                .textEntry(request.getTextEntry())
                .imageBase64(request.getImageBase64())
                .rowCountSnapshot(request.getRowCountSnapshot() != null ? request.getRowCountSnapshot() : project.getRowCount())
                .createdAt(LocalDateTime.now())
                .build();

        return journalLogRepository.save(log);
    }

    @Transactional
    public JournalLogEntity updateJournalLog(String userId, String logId, JournalLogRequest request) {
        UUID logUuid = UUID.fromString(logId);
        UUID userUuid = UUID.fromString(userId);
        JournalLogEntity log = journalLogRepository.findByLogId(logUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Journal logging record not found: " + logId));
        if (!log.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden update request");
        }

        if (request.getTextEntry() != null) {
            log.setTextEntry(request.getTextEntry());
        }
        if (request.getImageBase64() != null) {
            log.setImageBase64(request.getImageBase64());
        }
        if (request.getRowCountSnapshot() != null) {
            log.setRowCountSnapshot(request.getRowCountSnapshot());
        }

        return journalLogRepository.save(log);
    }

    @Transactional
    public void deleteJournalLog(String userId, String logId) {
        UUID logUuid = UUID.fromString(logId);
        UUID userUuid = UUID.fromString(userId);
        JournalLogEntity log = journalLogRepository.findByLogId(logUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Journal logging record not found: " + logId));
        if (!log.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden deletion request");
        }
        journalLogRepository.delete(log);
    }

    // --- AGGREGATED GALLERY HUB ---
    public List<GalleryItemResponse> getUserMediaGallery(String userId) {
        List<GalleryItemResponse> list = new ArrayList<>();
        UUID userUuid = UUID.fromString(userId);

        // 1. Fetch completed/showcase photos from projects
        List<ProjectEntity> projects = projectRepository.findByUserId(userUuid);
        for (ProjectEntity proj : projects) {
            List<ProjectPhotoEntity> photos = proj.getPhotoEntities();
            if (photos != null) {
                for (int i = 0; i < photos.size(); i++) {
                    ProjectPhotoEntity photo = photos.get(i);
                    if (photo.getPhotoBase64() != null && !photo.getPhotoBase64().isBlank()) {
                        list.add(GalleryItemResponse.builder()
                                .id("endproduct-" + proj.getProjectId().toString() + "-" + i)
                                .src(photo.getPhotoBase64())
                                .type("endProduct")
                                .projectName(proj.getTitle())
                                .projectId(proj.getProjectId().toString())
                                .date(photo.getCreatedAt().toString())
                                .description("Completed crochet project.")
                                .build());
                    }
                }
            }
        }

        // 2. Fetch logging progress update photos from journals
        List<JournalLogEntity> logs = journalLogRepository.findByUserId(userUuid);
        for (JournalLogEntity log : logs) {
            if (log.getImageBase64() != null && !log.getImageBase64().isBlank()) {
                String projName = projects.stream()
                        .filter(p -> p.getProjectId().equals(log.getProjectId()))
                        .map(ProjectEntity::getTitle)
                        .findFirst()
                        .orElse("Unknown Project");

                list.add(GalleryItemResponse.builder()
                        .id("journal-" + log.getLogId().toString())
                        .src(log.getImageBase64())
                        .type("journal")
                        .projectName(projName)
                        .projectId(log.getProjectId().toString())
                        .date(log.getCreatedAt().toString())
                        .description(log.getTextEntry())
                        .build());
            }
        }

        // Sort compiled files by newest date descending
        list.sort((a, b) -> b.getDate().compareTo(a.getDate()));
        return list;
    }

    private void validateProjectDates(ProjectRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null
                && !request.getStartDate().isBlank() && !request.getEndDate().isBlank()) {
            if (request.getStartDate().compareTo(request.getEndDate()) > 0) {
                throw new BadRequestException("Start date cannot be after end date");
            }
        }
    }

    @Transactional
    public ProjectEntity toggleArchiveProject(String userId, String projectId) {
        ProjectEntity project = getProjectDetails(userId, projectId);
        project.setArchive(!project.isArchive());
        return projectRepository.save(project);
    }

    @Transactional
    public ProjectEntity duplicateProject(String userId, String projectId) {
        ProjectEntity original = getProjectDetails(userId, projectId);

        ProjectEntity duplicate = ProjectEntity.builder()
                .projectId(UUID.randomUUID())
                .userId(UUID.fromString(userId))
                .category(original.getCategory())
                .categoryId(original.getCategoryId())
                .title("copy_" + original.getTitle())
                .status(original.getStatus())
                .rowCount(original.getRowCount())
                .notes(original.getNotes())
                .careInstructions(original.getCareInstructions())
                .totalTime(original.getTotalTime())
                .startDate(original.getStartDate())
                .endDate(original.getEndDate())
                .isFavorite(original.isFavorite())
                .isArchive(false)
                .thumbnailIndex(original.getThumbnailIndex())
                .build();

        // Copy photo entities
        List<ProjectPhotoEntity> photos = new ArrayList<>();
        if (original.getPhotoEntities() != null) {
            for (ProjectPhotoEntity photo : original.getPhotoEntities()) {
                photos.add(ProjectPhotoEntity.builder()
                        .project(duplicate)
                        .photoBase64(photo.getPhotoBase64())
                        .createdAt(LocalDateTime.now())
                        .build());
            }
        }
        duplicate.setPhotoEntities(photos);

        List<com.crochet.ai.crochetservice.entity.ProjectYarnEntity> yarns = new ArrayList<>();
        if (original.getYarnEntities() != null) {
            for (com.crochet.ai.crochetservice.entity.ProjectYarnEntity yarn : original.getYarnEntities()) {
                yarns.add(com.crochet.ai.crochetservice.entity.ProjectYarnEntity.builder()
                        .project(duplicate)
                        .brand(yarn.getBrand())
                        .lineName(yarn.getLineName())
                        .colorway(yarn.getColorway())
                        .dyeLot(yarn.getDyeLot())
                        .weight(yarn.getWeight())
                        .fiberContent(yarn.getFiberContent())
                        .quantityUsed(yarn.getQuantityUsed())
                        .unit(yarn.getUnit())
                        .build());
            }
        }
        duplicate.setYarnEntities(yarns);

        List<com.crochet.ai.crochetservice.entity.ProjectHookEntity> hooks = new ArrayList<>();
        if (original.getHookEntities() != null) {
            for (com.crochet.ai.crochetservice.entity.ProjectHookEntity hook : original.getHookEntities()) {
                hooks.add(com.crochet.ai.crochetservice.entity.ProjectHookEntity.builder()
                        .project(duplicate)
                        .sizeMm(hook.getSizeMm())
                        .sizeUs(hook.getSizeUs())
                        .material(hook.getMaterial())
                        .brand(hook.getBrand())
                        .build());
            }
        }
        duplicate.setHookEntities(hooks);
        ProjectEntity savedDuplicate = projectRepository.save(duplicate);

        // Copy journal logs
        List<JournalLogEntity> originalLogs = journalLogRepository.findByProjectId(original.getProjectId());
        if (originalLogs != null) {
            for (JournalLogEntity log : originalLogs) {
                JournalLogEntity duplicateLog = JournalLogEntity.builder()
                        .logId(UUID.randomUUID())
                        .project(savedDuplicate)
                        .projectId(savedDuplicate.getProjectId())
                        .userId(UUID.fromString(userId))
                        .textEntry(log.getTextEntry())
                        .imageBase64(log.getImageBase64())
                        .rowCountSnapshot(log.getRowCountSnapshot())
                        .createdAt(LocalDateTime.now())
                        .build();
                journalLogRepository.save(duplicateLog);
            }
        }

        return savedDuplicate;
    }
}
