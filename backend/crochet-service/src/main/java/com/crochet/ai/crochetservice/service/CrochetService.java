package com.crochet.ai.crochetservice.service;

import com.crochet.ai.crochetservice.dto.*;
import com.crochet.ai.crochetservice.entity.*;
import com.crochet.ai.crochetservice.exception.*;
import com.crochet.ai.crochetservice.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CrochetService {

    private final CategoryRepository categoryRepository;
    private final ProjectRepository projectRepository;
    private final JournalLogRepository journalLogRepository;
    private final PatternRepository patternRepository;
    private final YarnRepository yarnRepository;
    private final HookRepository hookRepository;
    private final PhotoRepository photoRepository;

    @Autowired
    public CrochetService(CategoryRepository categoryRepository,
                          ProjectRepository projectRepository,
                          JournalLogRepository journalLogRepository,
                          PatternRepository patternRepository,
                          YarnRepository yarnRepository,
                          HookRepository hookRepository,
                          PhotoRepository photoRepository) {
        this.categoryRepository = categoryRepository;
        this.projectRepository = projectRepository;
        this.journalLogRepository = journalLogRepository;
        this.patternRepository = patternRepository;
        this.yarnRepository = yarnRepository;
        this.hookRepository = hookRepository;
        this.photoRepository = photoRepository;
    }

    // --- DIRECTORIES / CATEGORIES ---
    public List<CategoryResponse> getCategories(String userId) {
        UUID userUuid = UUID.fromString(userId);
        List<Category> categories = categoryRepository.findByUserId(userUuid);
        
        boolean hasDefault = false;
        boolean hasFavourites = false;
        for (Category cat : categories) {
            String norm = cat.getName().trim().toLowerCase();
            if (norm.equals("default")) {
                hasDefault = true;
            } else if (norm.equals("favourites ❤️") || norm.equals("favourites")) {
                hasFavourites = true;
            }
        }
        
        boolean updated = false;
        if (!hasDefault) {
            Category defaultCat = Category.builder()
                    .categoryId(UUID.randomUUID())
                    .userId(userUuid)
                    .name("Default")
                    .build();
            categoryRepository.save(defaultCat);
            updated = true;
        }
        
        if (!hasFavourites) {
            Category favCat = Category.builder()
                    .categoryId(UUID.randomUUID())
                    .userId(userUuid)
                    .name("Favourites ❤️")
                    .build();
            categoryRepository.save(favCat);
            updated = true;
        }
        
        if (updated) {
            categories = categoryRepository.findByUserId(userUuid);
        }
        
        return categories.stream().map(this::mapToCategoryResponse).collect(Collectors.toList());
    }

    @Transactional
    public CategoryResponse createCategory(String userId, CategoryRequest request) {
        UUID userUuid = UUID.fromString(userId);
        
        // Validation check for duplicates
        List<Category> existing = categoryRepository.findByUserId(userUuid);
        for (Category cat : existing) {
            if (cat.getName().equalsIgnoreCase(request.getName())) {
                throw new ConflictException("Category name already exists: " + request.getName());
            }
        }
        
        Category category = Category.builder()
                .categoryId(UUID.randomUUID())
                .userId(userUuid)
                .name(request.getName())
                .build();
        
        return mapToCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse updateCategory(String userId, String categoryId, CategoryRequest request) {
        UUID userUuid = UUID.fromString(userId);
        UUID categoryUuid = UUID.fromString(categoryId);
        Category category = categoryRepository.findByCategoryId(categoryUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
        
        if (!category.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        
        String normName = category.getName().trim().toLowerCase();
        if (normName.equals("default") || normName.equals("favourites ❤️") || normName.equals("favourites")) {
            throw new BadRequestException("System categories 'Default' and 'Favourites' cannot be renamed.");
        }
        
        // Duplicate check
        List<Category> existing = categoryRepository.findByUserId(userUuid);
        for (Category cat : existing) {
            if (!cat.getCategoryId().equals(categoryUuid) && cat.getName().equalsIgnoreCase(request.getName())) {
                throw new ConflictException("Another category already has this name: " + request.getName());
            }
        }
        
        category.setName(request.getName());
        return mapToCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(String userId, String categoryId) {
        UUID userUuid = UUID.fromString(userId);
        UUID categoryUuid = UUID.fromString(categoryId);
        Category category = categoryRepository.findByCategoryId(categoryUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
        
        if (!category.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        
        String normName = category.getName().trim().toLowerCase();
        if (normName.equals("default") || normName.equals("favourites ❤️") || normName.equals("favourites")) {
            throw new BadRequestException("System categories 'Default' and 'Favourites' cannot be deleted.");
        }

        // Delete cascaded subprojects and logs
        List<Project> projectsInCategory = projectRepository.findByUserIdAndCategoryId(userUuid, categoryUuid);
        for (Project project : projectsInCategory) {
            journalLogRepository.deleteByProjectId(project.getProjectId());
        }
        
        projectRepository.deleteByCategoryId(categoryUuid);
        categoryRepository.delete(category);
    }

    // --- TRACKED PROJECTS ---
    public Page<ProjectSummaryResponse> getProjects(
            String userId, 
            String categoryId, 
            Boolean favorite, 
            Boolean archive, 
            String statusStr, 
            String search, 
            Pageable pageable) {
        UUID userUuid = UUID.fromString(userId);
        boolean isArchive = Boolean.TRUE.equals(archive);
        
        UUID categoryUuid = null;
        Boolean isFavorite = favorite;

        // If category is "Favourites ❤️" or "Favourites", handle it
        if (categoryId != null && !categoryId.equalsIgnoreCase("all") && !categoryId.equalsIgnoreCase("archived")) {
            try {
                UUID parsedCategoryUuid = UUID.fromString(categoryId);
                Optional<Category> categoryOpt = categoryRepository.findByCategoryId(parsedCategoryUuid);
                if (categoryOpt.isPresent()) {
                    Category category = categoryOpt.get();
                    if (!category.getUserId().equals(userUuid)) {
                        throw new ForbiddenException("Forbidden access attempt");
                    }
                    String normName = category.getName().trim().toLowerCase();
                    if (normName.equals("favourites ❤️") || normName.equals("favourites")) {
                        isFavorite = true;
                    } else {
                        categoryUuid = parsedCategoryUuid;
                    }
                }
            } catch (IllegalArgumentException e) {
                // Ignore, treat as no category filter
            }
        }

        ProjectStatus status = null;
        if (statusStr != null && !statusStr.isBlank() && !statusStr.equalsIgnoreCase("all")) {
            status = ProjectStatus.fromValue(statusStr);
        }

        String searchPattern = null;
        if (search != null && !search.isBlank()) {
            searchPattern = search.trim();
        }

        Page<Project> projectsPage = projectRepository.findProjectsForUser(
                userUuid, 
                categoryUuid, 
                isFavorite, 
                isArchive, 
                status, 
                searchPattern, 
                pageable);

        return projectsPage.map(this::mapToSummaryResponse);
    }

    private ProjectSummaryResponse mapToSummaryResponse(Project project) {
        List<String> productPhotos = new ArrayList<>();
        if (project.getPhotoEntities() != null && !project.getPhotoEntities().isEmpty()) {
            Photo cover = null;
            for (Photo p : project.getPhotoEntities()) {
                if (p.isCover()) {
                    cover = p;
                    break;
                }
            }
            if (cover != null) {
                productPhotos.add(cover.getPhotoBase64());
            } else {
                productPhotos.add(project.getPhotoEntities().get(0).getPhotoBase64());
            }
        }
        return new ProjectSummaryResponse(
                project.getProjectId(),
                project.getUserId(),
                project.getCategoryId(),
                project.getTitle(),
                project.getStatus(),
                project.getRowCount(),
                project.getNotes(),
                project.getCareInstructions(),
                project.getTotalTime(),
                project.getStartDate(),
                project.getEndDate(),
                project.isFavorite(),
                project.isArchive(),
                productPhotos,
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }

    public Project getProjectDetails(String userId, String projectId) {
        UUID projectUuid = UUID.fromString(projectId);
        UUID userUuid = UUID.fromString(userId);
        Project project = projectRepository.findByProjectId(projectUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Crochet project not found: " + projectId));
        if (!project.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        return project;
    }

    public ProjectResponse getProjectDetailsResponse(String userId, String projectId) {
        return mapToProjectResponse(getProjectDetails(userId, projectId));
    }

    @Transactional
    public ProjectResponse createProject(String userId, ProjectRequest request) {
        validateProjectDates(request);
        UUID userUuid = UUID.fromString(userId);
        UUID categoryUuid = UUID.fromString(request.getCategoryId());
        
        Category category = categoryRepository.findByCategoryId(categoryUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Category directory not found: " + request.getCategoryId()));
        
        if (!category.getUserId().equals(userUuid)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        
        String checkName = category.getName().trim().toLowerCase();
        if (checkName.equals("favourites ❤️") || checkName.equals("favourites")) {
            throw new BadRequestException("Projects cannot be created directly inside the Favourites category.");
        }
        
        // Duplicate check
        List<Project> existing = projectRepository.findByUserIdAndCategoryId(userUuid, categoryUuid);
        for (Project proj : existing) {
            if (proj.getTitle().equalsIgnoreCase(request.getTitle())) {
                throw new ConflictException("Project with title '" + request.getTitle() + "' already exists in this category.");
            }
        }
        
        Project project = Project.builder()
                .projectId(UUID.randomUUID())
                .userId(userUuid)
                .category(category)
                .categoryId(categoryUuid)
                .title(request.getTitle())
                .status(request.getStatus() != null ? request.getStatus() : ProjectStatus.IN_PROGRESS)
                .rowCount(request.getRowCount())
                .notes(request.getNotes() != null ? request.getNotes() : "")
                .careInstructions(request.getCareInstructions() != null ? request.getCareInstructions() : "")
                .totalTime(request.getTotalTime() != null ? request.getTotalTime() : "")
                .startDate(request.getStartDate() != null ? request.getStartDate() : "")
                .endDate(request.getEndDate() != null ? request.getEndDate() : "")
                .isFavorite(false)
                .isArchive(request.getIsArchive() != null ? request.getIsArchive() : false)
                .build();
        
        project = projectRepository.save(project);

        if (request.getYarns() != null) {
            List<Yarn> yarns = new ArrayList<>();
            for (YarnRequest yr : request.getYarns()) {
                yarns.add(Yarn.builder()
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
            project.setYarnEntities(yarns);
        }

        if (request.getHooks() != null) {
            List<Hook> hooks = new ArrayList<>();
            for (HookRequest hr : request.getHooks()) {
                if ((hr.sizeMm() == null || hr.sizeMm() <= 0) && (hr.sizeUs() == null || hr.sizeUs().isBlank())) {
                    throw new BadRequestException("Hook size (mm) or Hook size (US) is required.");
                }
                if (hr.sizeMm() != null && hr.sizeMm() <= 0) {
                    throw new BadRequestException("Hook size (mm) must be a positive number.");
                }
                hooks.add(Hook.builder()
                        .project(project)
                        .sizeMm(hr.sizeMm())
                        .sizeUs(hr.sizeUs())
                        .material(hr.material())
                        .brand(hr.brand())
                        .build());
            }
            project.setHookEntities(hooks);
        }

        if (request.getProductPhotos() != null) {
            project.setProductPhotos(request.getProductPhotos());
            syncCoverPhotoPreference(project, request.getCoverPhoto());
        }

        return mapToProjectResponse(projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse updateProject(String userId, String projectId, ProjectRequest request) {
        validateProjectDates(request);
        Project project = getProjectDetails(userId, projectId);
 
        UUID categoryUuid = UUID.fromString(request.getCategoryId());
        if (!project.getCategoryId().equals(categoryUuid)) {
            Category category = categoryRepository.findByCategoryId(categoryUuid)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.getCategoryId()));
            if (!category.getUserId().equals(UUID.fromString(userId))) {
                throw new ForbiddenException("Forbidden access attempt");
            }
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
                project.getYarnEntities().add(Yarn.builder()
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
                if ((hr.sizeMm() == null || hr.sizeMm() <= 0) && (hr.sizeUs() == null || hr.sizeUs().isBlank())) {
                    throw new BadRequestException("Hook size (mm) or Hook size (US) is required.");
                }
                if (hr.sizeMm() != null && hr.sizeMm() <= 0) {
                    throw new BadRequestException("Hook size (mm) must be a positive number.");
                }
                project.getHookEntities().add(Hook.builder()
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
        syncCoverPhotoPreference(project, request.getCoverPhoto());
 
        if (request.getPatterns() != null) {
            List<Pattern> currentPatterns = project.getPatternEntities();
            List<Pattern> updatedPatterns = new ArrayList<>();
            
            for (ProjectPatternRequest pr : request.getPatterns()) {
                if (pr.patternId() != null && !pr.patternId().isBlank()) {
                    UUID patternUuid = UUID.fromString(pr.patternId());
                    Optional<Pattern> existing = currentPatterns.stream()
                            .filter(p -> p.getPatternId().equals(patternUuid))
                            .findFirst();
                    if (existing.isPresent()) {
                        Pattern ext = existing.get();
                        ext.setPatternType(pr.patternType());
                        ext.setPatternContent(pr.patternContent());
                        ext.setFileName(pr.fileName());
                        updatedPatterns.add(ext);
                    } else {
                        updatedPatterns.add(Pattern.builder()
                                .project(project)
                                .patternId(patternUuid)
                                .patternType(pr.patternType())
                                .patternContent(pr.patternContent())
                                .fileName(pr.fileName())
                                .build());
                    }
                } else {
                    updatedPatterns.add(Pattern.builder()
                            .project(project)
                            .patternId(UUID.randomUUID())
                            .patternType(pr.patternType())
                            .patternContent(pr.patternContent())
                            .fileName(pr.fileName())
                            .build());
                }
            }
            
            project.getPatternEntities().clear();
            project.getPatternEntities().addAll(updatedPatterns);
        }
 
        return mapToProjectResponse(projectRepository.save(project));
    }



    @Transactional
    public ProjectResponse patchProject(String userId, String projectId, ProjectPatchRequest request) {
        Project project = getProjectDetails(userId, projectId);
        
        // Date validation
        String start = request.getStartDate() != null ? request.getStartDate() : project.getStartDate();
        String end = request.getEndDate() != null ? request.getEndDate() : project.getEndDate();
        if (start != null && end != null && !start.isBlank() && !end.isBlank()) {
            if (start.compareTo(end) > 0) {
                throw new BadRequestException("Start date cannot be after end date");
            }
        }

        if (request.getCategoryId() != null) {
            UUID categoryUuid = UUID.fromString(request.getCategoryId());
            if (!project.getCategoryId().equals(categoryUuid)) {
                Category category = categoryRepository.findByCategoryId(categoryUuid)
                        .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.getCategoryId()));
                if (!category.getUserId().equals(UUID.fromString(userId))) {
                    throw new ForbiddenException("Forbidden access attempt");
                }
                String checkName = category.getName().trim().toLowerCase();
                if (checkName.equals("favourites ❤️") || checkName.equals("favourites")) {
                    throw new BadRequestException("Projects cannot be moved directly into the Favourites category.");
                }
                project.setCategory(category);
                project.setCategoryId(categoryUuid);
            }
        }

        if (request.getTitle() != null) {
            project.setTitle(request.getTitle());
        }

        if (request.getYarns() != null) {
            project.getYarnEntities().clear();
            for (YarnRequest yr : request.getYarns()) {
                project.getYarnEntities().add(Yarn.builder()
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
                if ((hr.sizeMm() == null || hr.sizeMm() <= 0) && (hr.sizeUs() == null || hr.sizeUs().isBlank())) {
                    throw new BadRequestException("Hook size (mm) or Hook size (US) is required.");
                }
                if (hr.sizeMm() != null && hr.sizeMm() <= 0) {
                    throw new BadRequestException("Hook size (mm) must be a positive number.");
                }
                project.getHookEntities().add(Hook.builder()
                        .project(project)
                        .sizeMm(hr.sizeMm())
                        .sizeUs(hr.sizeUs())
                        .material(hr.material())
                        .brand(hr.brand())
                        .build());
            }
        }

        if (request.getStatus() != null) {
            project.setStatus(request.getStatus());
        }

        if (request.getRowCount() != null) {
            project.setRowCount(request.getRowCount());
        }

        if (request.getNotes() != null) {
            project.setNotes(request.getNotes());
        }

        if (request.getCareInstructions() != null) {
            project.setCareInstructions(request.getCareInstructions());
        }

        if (request.getTotalTime() != null) {
            project.setTotalTime(request.getTotalTime());
        }

        if (request.getStartDate() != null) {
            project.setStartDate(request.getStartDate());
        }

        if (request.getEndDate() != null) {
            project.setEndDate(request.getEndDate());
        }

        if (request.getProductPhotos() != null) {
            project.setProductPhotos(request.getProductPhotos());
        }

        if (request.getIsArchive() != null) {
            project.setArchive(request.getIsArchive());
        }

        if (request.getProductPhotos() != null || request.getCoverPhoto() != null) {
            syncCoverPhotoPreference(project, request.getCoverPhoto());
        }

        if (request.getIsFavorite() != null) {
            project.setFavorite(request.getIsFavorite());
        }

        return mapToProjectResponse(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(String userId, String projectId) {
        Project project = getProjectDetails(userId, projectId);
        journalLogRepository.deleteByProjectId(project.getProjectId());
        projectRepository.delete(project);
    }

    @Transactional
    public ProjectResponse toggleFavoriteProject(String userId, String projectId) {
        Project project = getProjectDetails(userId, projectId);
        project.setFavorite(!project.isFavorite());
        return mapToProjectResponse(projectRepository.save(project));
    }

    public List<ProjectSummaryResponse> getFavoriteProjects(String userId) {
        UUID userUuid = UUID.fromString(userId);
        return projectRepository.findByUserIdAndIsFavoriteTrue(userUuid)
                .stream()
                .map(this::mapToSummaryResponse)
                .collect(Collectors.toList());
    }

    // --- PROGRESS JOURNAL LOGS ---
    public Page<JournalLogResponse> getJournalLogs(String userId, String projectId, Pageable pageable) {
        Project project = getProjectDetails(userId, projectId);
        UUID userUuid = UUID.fromString(userId);
        return journalLogRepository.findByUserIdAndProjectId(userUuid, project.getProjectId(), pageable)
                .map(this::mapToJournalLogResponse);
    }

    @Transactional
    public JournalLogResponse createJournalLog(String userId, String projectId, JournalLogRequest request) {
        Project project = getProjectDetails(userId, projectId);

        JournalLog log = JournalLog.builder()
                .logId(UUID.randomUUID())
                .project(project)
                .projectId(project.getProjectId())
                .userId(UUID.fromString(userId))
                .textEntry(request.getTextEntry())
                .imageBase64(request.getImageBase64())
                .rowCountSnapshot(request.getRowCountSnapshot() != null ? request.getRowCountSnapshot() : project.getRowCount())
                .createdAt(LocalDateTime.now())
                .build();

        return mapToJournalLogResponse(journalLogRepository.save(log));
    }

    public JournalLogResponse getJournalLogDetails(String userId, String logId) {
        return mapToJournalLogResponse(getValidatedJournalLog(userId, logId));
    }

    @Transactional
    public JournalLogResponse updateJournalLog(String userId, String logId, JournalLogRequest request) {
        JournalLog log = getValidatedJournalLog(userId, logId);

        if (request.getTextEntry() != null) {
            log.setTextEntry(request.getTextEntry());
        }
        if (request.getImageBase64() != null) {
            log.setImageBase64(request.getImageBase64());
        }
        if (request.getRowCountSnapshot() != null) {
            log.setRowCountSnapshot(request.getRowCountSnapshot());
        }

        return mapToJournalLogResponse(journalLogRepository.save(log));
    }

    @Transactional
    public void deleteJournalLog(String userId, String logId) {
        JournalLog log = getValidatedJournalLog(userId, logId);
        journalLogRepository.delete(log);
    }

    // --- HUB GALLERY ---
    public List<GalleryItemResponse> getUserMediaGallery(String userId) {
        UUID userUuid = UUID.fromString(userId);
        List<Project> projects = projectRepository.findByUserId(userUuid);
        List<GalleryItemResponse> gallery = new ArrayList<>();

        for (Project proj : projects) {
            if (proj.getPhotoEntities() != null) {
                for (Photo photo : proj.getPhotoEntities()) {
                    gallery.add(new GalleryItemResponse(
                            "photo-" + photo.getId(),
                            photo.getPhotoBase64(),
                            "endProduct",
                            proj.getTitle(),
                            proj.getProjectId().toString(),
                            photo.getCreatedAt().toString(),
                            "End Product Photo"
                    ));
                }
            }

            List<JournalLog> logs = journalLogRepository.findByProjectId(proj.getProjectId());
            for (JournalLog log : logs) {
                if (log.getImageBase64() != null && !log.getImageBase64().isBlank()) {
                    gallery.add(new GalleryItemResponse(
                            "log-" + log.getLogId().toString(),
                            log.getImageBase64(),
                            "journal",
                            proj.getTitle(),
                            proj.getProjectId().toString(),
                            log.getCreatedAt().toString(),
                            log.getTextEntry()
                    ));
                }
            }
        }

        return gallery;
    }

    // --- PROJECT PATTERNS ---
    @Transactional
    public ProjectResponse addProjectPattern(String userId, String projectId, ProjectPatternRequest request) {
        Project project = getProjectDetails(userId, projectId);

        Pattern pattern = Pattern.builder()
                .patternId(UUID.randomUUID())
                .project(project)
                .patternType(request.patternType())
                .patternContent(request.patternContent())
                .fileName(request.fileName())
                .createdAt(LocalDateTime.now())
                .build();

        project.getPatternEntities().add(pattern);
        projectRepository.save(project);
        return mapToProjectResponse(getProjectDetails(userId, projectId));
    }

    // Validators to check project context & ownership and prevent orphans
    private Yarn getValidatedYarn(String userId, Long yarnId) {
        Yarn yarn = yarnRepository.findById(yarnId)
                .orElseThrow(() -> new ResourceNotFoundException("Yarn not found with ID: " + yarnId));
        Project project = yarn.getProject();
        if (project == null) {
            throw new BadRequestException("Yarn is not linked to any project");
        }
        if (!project.getUserId().toString().equalsIgnoreCase(userId)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        return yarn;
    }

    private Hook getValidatedHook(String userId, Long hookId) {
        Hook hook = hookRepository.findById(hookId)
                .orElseThrow(() -> new ResourceNotFoundException("Hook not found with ID: " + hookId));
        Project project = hook.getProject();
        if (project == null) {
            throw new BadRequestException("Hook is not linked to any project");
        }
        if (!project.getUserId().toString().equalsIgnoreCase(userId)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        return hook;
    }

    private Photo getValidatedPhoto(String userId, Long photoId) {
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with ID: " + photoId));
        Project project = photo.getProject();
        if (project == null) {
            throw new BadRequestException("Photo is not linked to any project");
        }
        if (!project.getUserId().toString().equalsIgnoreCase(userId)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        return photo;
    }

    private JournalLog getValidatedJournalLog(String userId, String logId) {
        UUID logUuid = UUID.fromString(logId);
        JournalLog log = journalLogRepository.findByLogId(logUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Journal logging record not found: " + logId));
        if (!log.getUserId().toString().equalsIgnoreCase(userId)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        if (log.getProject() == null) {
            throw new BadRequestException("Journal log is not linked to any project");
        }
        return log;
    }

    private Pattern getValidatedPattern(String userId, String patternId) {
        UUID patternUuid = UUID.fromString(patternId);
        Pattern pattern = patternRepository.findByPatternId(patternUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Pattern not found: " + patternId));
        Project project = pattern.getProject();
        if (project == null) {
            throw new BadRequestException("Pattern is not linked to any project");
        }
        if (!project.getUserId().toString().equalsIgnoreCase(userId)) {
            throw new ForbiddenException("Forbidden access attempt");
        }
        return pattern;
    }

    @Transactional
    public ProjectResponse updateProjectPattern(String userId, String patternId, ProjectPatternRequest request) {
        Pattern pattern = getValidatedPattern(userId, patternId);
        pattern.setFileName(request.fileName());
        if (request.patternContent() != null) {
            pattern.setPatternContent(request.patternContent());
        }
        if (request.patternType() != null) {
            pattern.setPatternType(request.patternType());
        }
        patternRepository.save(pattern);
        return mapToProjectResponse(pattern.getProject());
    }

    @Transactional
    public ProjectResponse deleteProjectPattern(String userId, String patternId) {
        Pattern pattern = getValidatedPattern(userId, patternId);
        Project project = pattern.getProject();
        project.getPatternEntities().remove(pattern);
        projectRepository.save(project);
        patternRepository.delete(pattern);
        return mapToProjectResponse(project);
    }

    // --- SUB-RESOURCES CRUD (Yarns, Hooks, Photos) ---

    // Yarns CRUD
    public List<YarnResponse> getYarns(String userId, String projectId) {
        Project project = getProjectDetails(userId, projectId);
        return project.getYarnEntities().stream().map(this::mapToYarnResponse).collect(Collectors.toList());
    }

    @Transactional
    public YarnResponse addYarn(String userId, String projectId, YarnRequest request) {
        Project project = getProjectDetails(userId, projectId);
        Yarn yarn = Yarn.builder()
                .project(project)
                .brand(request.brand())
                .lineName(request.lineName())
                .colorway(request.colorway())
                .dyeLot(request.dyeLot())
                .weight(request.weight())
                .fiberContent(request.fiberContent())
                .quantityUsed(request.quantityUsed())
                .unit(request.unit() != null ? request.unit() : "meters")
                .build();
        return mapToYarnResponse(yarnRepository.save(yarn));
    }

    public YarnResponse getYarnDetails(String userId, Long yarnId) {
        return mapToYarnResponse(getValidatedYarn(userId, yarnId));
    }

    @Transactional
    public YarnResponse updateYarn(String userId, Long yarnId, YarnRequest request) {
        Yarn yarn = getValidatedYarn(userId, yarnId);
        yarn.setBrand(request.brand());
        yarn.setLineName(request.lineName());
        yarn.setColorway(request.colorway());
        yarn.setDyeLot(request.dyeLot());
        yarn.setWeight(request.weight());
        yarn.setFiberContent(request.fiberContent());
        yarn.setQuantityUsed(request.quantityUsed());
        yarn.setUnit(request.unit() != null ? request.unit() : "meters");
        return mapToYarnResponse(yarnRepository.save(yarn));
    }

    @Transactional
    public YarnResponse patchYarn(String userId, Long yarnId, YarnRequest request) {
        Yarn yarn = getValidatedYarn(userId, yarnId);
        if (request.brand() != null) yarn.setBrand(request.brand());
        if (request.lineName() != null) yarn.setLineName(request.lineName());
        if (request.colorway() != null) yarn.setColorway(request.colorway());
        if (request.dyeLot() != null) yarn.setDyeLot(request.dyeLot());
        if (request.weight() != null) yarn.setWeight(request.weight());
        if (request.fiberContent() != null) yarn.setFiberContent(request.fiberContent());
        if (request.quantityUsed() != null) yarn.setQuantityUsed(request.quantityUsed());
        if (request.unit() != null) yarn.setUnit(request.unit());
        return mapToYarnResponse(yarnRepository.save(yarn));
    }

    @Transactional
    public void deleteYarn(String userId, Long yarnId) {
        Yarn yarn = getValidatedYarn(userId, yarnId);
        Project project = yarn.getProject();
        project.getYarnEntities().remove(yarn);
        projectRepository.save(project);
        yarnRepository.delete(yarn);
    }

    // Hooks CRUD
    public List<HookResponse> getHooks(String userId, String projectId) {
        Project project = getProjectDetails(userId, projectId);
        return project.getHookEntities().stream().map(this::mapToHookResponse).collect(Collectors.toList());
    }

    @Transactional
    public HookResponse addHook(String userId, String projectId, HookRequest request) {
        Project project = getProjectDetails(userId, projectId);
        Hook hook = Hook.builder()
                .project(project)
                .sizeMm(request.sizeMm())
                .sizeUs(request.sizeUs())
                .material(request.material())
                .brand(request.brand())
                .build();
        return mapToHookResponse(hookRepository.save(hook));
    }

    public HookResponse getHookDetails(String userId, Long hookId) {
        return mapToHookResponse(getValidatedHook(userId, hookId));
    }

    @Transactional
    public HookResponse updateHook(String userId, Long hookId, HookRequest request) {
        Hook hook = getValidatedHook(userId, hookId);
        hook.setSizeMm(request.sizeMm());
        hook.setSizeUs(request.sizeUs());
        hook.setMaterial(request.material());
        hook.setBrand(request.brand());
        return mapToHookResponse(hookRepository.save(hook));
    }

    @Transactional
    public HookResponse patchHook(String userId, Long hookId, HookRequest request) {
        Hook hook = getValidatedHook(userId, hookId);
        if (request.sizeMm() != null) hook.setSizeMm(request.sizeMm());
        if (request.sizeUs() != null) hook.setSizeUs(request.sizeUs());
        if (request.material() != null) hook.setMaterial(request.material());
        if (request.brand() != null) hook.setBrand(request.brand());
        return mapToHookResponse(hookRepository.save(hook));
    }

    @Transactional
    public void deleteHook(String userId, Long hookId) {
        Hook hook = getValidatedHook(userId, hookId);
        Project project = hook.getProject();
        project.getHookEntities().remove(hook);
        projectRepository.save(project);
        hookRepository.delete(hook);
    }

    // Photos CRUD
    public List<PhotoResponse> getPhotos(String userId, String projectId) {
        Project project = getProjectDetails(userId, projectId);
        return project.getPhotoEntities().stream().map(this::mapToPhotoResponse).collect(Collectors.toList());
    }

    @Transactional
    public PhotoResponse addPhoto(String userId, String projectId, String photoBase64) {
        Project project = getProjectDetails(userId, projectId);
        Photo photo = Photo.builder()
                .project(project)
                .photoBase64(photoBase64)
                .createdAt(LocalDateTime.now())
                .build();
        return mapToPhotoResponse(photoRepository.save(photo));
    }

    public PhotoResponse getPhotoDetails(String userId, Long photoId) {
        return mapToPhotoResponse(getValidatedPhoto(userId, photoId));
    }

    @Transactional
    public void deletePhoto(String userId, Long photoId) {
        Photo photo = getValidatedPhoto(userId, photoId);
        Project project = photo.getProject();
        project.getPhotoEntities().remove(photo);
        syncCoverPhotoPreference(project, null);
        projectRepository.save(project);
        photoRepository.delete(photo);
    }

    // Helper validation
    private void validateProjectDates(ProjectRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null
                && !request.getStartDate().isBlank() && !request.getEndDate().isBlank()) {
            if (request.getStartDate().compareTo(request.getEndDate()) > 0) {
                throw new BadRequestException("Start date cannot be after end date");
            }
        }
    }

    private void syncCoverPhotoPreference(Project project, String coverPhotoVal) {
        if (project.getPhotoEntities() == null || project.getPhotoEntities().isEmpty()) {
            return;
        }

        // If there's only one photo, it MUST be the cover
        if (project.getPhotoEntities().size() == 1) {
            project.getPhotoEntities().get(0).setCover(true);
            return;
        }

        Photo matchedPhoto = null;

        // Try to match coverPhotoVal
        if (coverPhotoVal != null && !coverPhotoVal.isBlank()) {
            // First, try matching by ID (Long)
            try {
                Long photoId = Long.parseLong(coverPhotoVal);
                matchedPhoto = project.getPhotoEntities().stream()
                        .filter(p -> p.getId() != null && p.getId().equals(photoId))
                        .findFirst()
                        .orElse(null);
            } catch (NumberFormatException e) {
                // Not a Long ID
            }

            // Second, try matching by base64 content
            if (matchedPhoto == null) {
                matchedPhoto = project.getPhotoEntities().stream()
                        .filter(p -> coverPhotoVal.equals(p.getPhotoBase64()))
                        .findFirst()
                        .orElse(null);
            }
        }

        // If a matched photo was found, mark it as cover and unmark all others
        if (matchedPhoto != null) {
            for (Photo p : project.getPhotoEntities()) {
                p.setCover(p == matchedPhoto);
            }
        } else {
            // If no match was found (or coverPhotoVal is null), ensure EXACTLY one photo is the cover
            Photo currentCover = null;
            for (Photo p : project.getPhotoEntities()) {
                if (p.isCover()) {
                    if (currentCover == null) {
                        currentCover = p;
                    } else {
                        // Multiple covers marked: clean up
                        p.setCover(false);
                    }
                }
            }

            if (currentCover == null) {
                // No cover marked: default to the first photo
                project.getPhotoEntities().get(0).setCover(true);
            }
        }
    }

    @Transactional
    public ProjectResponse duplicateProject(String userId, String projectId) {
        Project original = getProjectDetails(userId, projectId);

        Project duplicate = Project.builder()
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
                .build();

        // Copy photos and clone isCover flag
        List<Photo> photos = new ArrayList<>();
        if (original.getPhotoEntities() != null) {
            for (Photo photo : original.getPhotoEntities()) {
                Photo duplicatedPhoto = Photo.builder()
                        .project(duplicate)
                        .photoBase64(photo.getPhotoBase64())
                        .isCover(photo.isCover())
                        .createdAt(LocalDateTime.now())
                        .build();
                photos.add(duplicatedPhoto);
            }
        }
        duplicate.setPhotoEntities(photos);

        List<Yarn> yarns = new ArrayList<>();
        if (original.getYarnEntities() != null) {
            for (Yarn yarn : original.getYarnEntities()) {
                yarns.add(Yarn.builder()
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

        List<Hook> hooks = new ArrayList<>();
        if (original.getHookEntities() != null) {
            for (Hook hook : original.getHookEntities()) {
                hooks.add(Hook.builder()
                        .project(duplicate)
                        .sizeMm(hook.getSizeMm())
                        .sizeUs(hook.getSizeUs())
                        .material(hook.getMaterial())
                        .brand(hook.getBrand())
                        .build());
            }
        }
        duplicate.setHookEntities(hooks);

        List<Pattern> patterns = new ArrayList<>();
        if (original.getPatternEntities() != null) {
            for (Pattern pattern : original.getPatternEntities()) {
                patterns.add(Pattern.builder()
                        .project(duplicate)
                        .patternId(UUID.randomUUID())
                        .patternType(pattern.getPatternType())
                        .patternContent(pattern.getPatternContent())
                        .fileName(pattern.getFileName())
                        .build());
            }
        }
        duplicate.setPatternEntities(patterns);

        // Save duplicate project (cascades saving photos and assigning IDs)
        duplicate = projectRepository.save(duplicate);

        return mapToProjectResponse(duplicate);
    }

    @Transactional
    public ProjectResponse toggleArchiveProject(String userId, String projectId) {
        Project project = getProjectDetails(userId, projectId);
        project.setArchive(!project.isArchive());
        return mapToProjectResponse(projectRepository.save(project));
    }

    private CategoryResponse mapToCategoryResponse(Category category) {
        return new CategoryResponse(category.getCategoryId(), category.getName());
    }

    private YarnResponse mapToYarnResponse(Yarn yarn) {
        return new YarnResponse(
            yarn.getId(),
            yarn.getBrand() != null ? yarn.getBrand() : "",
            yarn.getLineName() != null ? yarn.getLineName() : "",
            yarn.getColorway() != null ? yarn.getColorway() : "",
            yarn.getDyeLot() != null ? yarn.getDyeLot() : "",
            yarn.getWeight() != null ? yarn.getWeight() : "",
            yarn.getFiberContent() != null ? yarn.getFiberContent() : "",
            yarn.getQuantityUsed(),
            yarn.getUnit() != null ? yarn.getUnit() : "meters"
        );
    }

    private HookResponse mapToHookResponse(Hook hook) {
        return new HookResponse(
            hook.getId(),
            hook.getSizeMm(),
            hook.getSizeUs() != null ? hook.getSizeUs() : "",
            hook.getMaterial() != null ? hook.getMaterial() : "",
            hook.getBrand() != null ? hook.getBrand() : ""
        );
    }

    private PhotoResponse mapToPhotoResponse(Photo photo) {
        return new PhotoResponse(
            photo.getId(),
            photo.getPhotoBase64(),
            photo.isCover(),
            photo.getCreatedAt()
        );
    }

    private JournalLogResponse mapToJournalLogResponse(JournalLog log) {
        return new JournalLogResponse(
            log.getLogId(),
            log.getProjectId(),
            log.getUserId(),
            log.getTextEntry(),
            log.getImageBase64(),
            log.getRowCountSnapshot(),
            log.getCreatedAt()
        );
    }

    private PatternResponse mapToPatternResponse(Pattern pattern) {
        return new PatternResponse(
            pattern.getPatternId(),
            pattern.getProject() != null ? pattern.getProject().getProjectId() : null,
            pattern.getPatternType(),
            pattern.getPatternContent(),
            pattern.getFileName(),
            pattern.getCreatedAt()
        );
    }

    private ProjectResponse mapToProjectResponse(Project project) {
        return new ProjectResponse(
            project.getProjectId(),
            project.getUserId(),
            project.getCategoryId(),
            project.getTitle(),
            project.getStatus(),
            project.getRowCount(),
            project.getNotes(),
            project.getCareInstructions(),
            project.getTotalTime(),
            project.getStartDate(),
            project.getEndDate(),
            project.isFavorite(),
            project.isArchive(),
            project.getYarnEntities().stream().map(this::mapToYarnResponse).collect(Collectors.toList()),
            project.getHookEntities().stream().map(this::mapToHookResponse).collect(Collectors.toList()),
            project.getPhotoEntities().stream().map(this::mapToPhotoResponse).collect(Collectors.toList()),
            project.getPatternEntities().stream().map(this::mapToPatternResponse).collect(Collectors.toList()),
            project.getProductPhotos(),
            project.getCreatedAt(),
            project.getUpdatedAt()
        );
    }
}
