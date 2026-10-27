/**
 * Archive Export Utility
 * Handles full project data hydration and ZIP archive packaging.
 * Clean, reusable service module for self-service exports and backups.
 */
import JSZip from 'jszip';
import { exportProjectToPdf, sanitizeFilename } from './pdfExport';
import { Project, User, Category, ProjectStatus, JournalLog } from '../types';

export interface ArchiveExportOptions {
  projects: Project[];
  categories: Category[];
  currentUser: User;
  token: string | null;
  onProgress?: (status: string) => void;
}

/**
 * Hydrates all sub-resources (logs, yarns, hooks, patterns, photos) for a project.
 */
export async function fetchFullProjectDetails(
  projectId: string,
  token: string | null
): Promise<{
  projectDetails: Partial<Project>;
  logs: JournalLog[];
}> {
  if (!token) {
    return { projectDetails: {}, logs: [] };
  }

  const fetchWithAuth = async (url: string) => {
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  const [logsData, yarnsData, hooksData, patternsData, photosData] = await Promise.all([
    fetchWithAuth(`/api/v1/projects/${projectId}/logs?page=0&size=1000`),
    fetchWithAuth(`/api/v1/projects/${projectId}/yarns`),
    fetchWithAuth(`/api/v1/projects/${projectId}/hooks`),
    fetchWithAuth(`/api/v1/projects/${projectId}/patterns`),
    fetchWithAuth(`/api/v1/projects/${projectId}/photos`)
  ]);

  return {
    projectDetails: {
      yarns: Array.isArray(yarnsData) ? yarnsData : [],
      hooks: Array.isArray(hooksData) ? hooksData : [],
      patterns: Array.isArray(patternsData) ? patternsData : [],
      photos: Array.isArray(photosData) ? photosData : []
    },
    logs: logsData?.content || (Array.isArray(logsData) ? logsData : [])
  };
}

/**
 * Generates a complete ZIP archive with individual project PDFs and account summary.
 */
export async function generateAccountArchiveZip({
  projects,
  categories,
  currentUser,
  token,
  onProgress
}: ArchiveExportOptions): Promise<Blob> {
  const zip = new JSZip();
  const projectsFolder = zip.folder('Projects');
  const categoryMap = new Map(categories.map(c => [c.categoryId, c.name]));

  // 1. Generate full PDF for each project
  for (let i = 0; i < projects.length; i++) {
    const proj = projects[i];
    onProgress?.(`Fetching project details ${i + 1} of ${projects.length}: ${proj.title}...`);

    try {
      const { projectDetails, logs } = await fetchFullProjectDetails(proj.projectId, token);

      const projectWithDetails: Project = {
        ...proj,
        yarns: projectDetails.yarns?.length ? projectDetails.yarns : (proj.yarns || []),
        hooks: projectDetails.hooks?.length ? projectDetails.hooks : (proj.hooks || []),
        patterns: projectDetails.patterns?.length ? projectDetails.patterns : (proj.patterns || []),
        photos: projectDetails.photos?.length ? projectDetails.photos : (proj.photos || [])
      };

      const catName = categoryMap.get(proj.categoryId) || 'General';
      const coverPhoto = projectWithDetails.photos?.find(p => p.isCover)?.photoBase64 || null;
      const allPhotos = (projectWithDetails.photos || []).map(p => p.photoBase64);

      onProgress?.(`Generating PDF ${i + 1} of ${projects.length}: ${proj.title}...`);
      const pdfBytes = await exportProjectToPdf(
        projectWithDetails,
        logs,
        catName,
        coverPhoto,
        allPhotos,
        false
      );

      // Preserve complete user project title including emojis, only removing OS-forbidden filename chars
      const cleanTitle = sanitizeFilename(proj.title) || `Project_${i + 1}`;

      projectsFolder?.file(`${cleanTitle}.pdf`, pdfBytes);
    } catch (pdfErr) {
      console.warn(`Failed to export project ${proj.title}:`, pdfErr);
    }
  }

  // 2. Add structured account summary
  onProgress?.('Generating account summary metadata...');
  const inProgressCount = projects.filter(p => p.status === ProjectStatus.InProgress).length;
  const completedCount = projects.filter(p => p.status === ProjectStatus.Completed).length;
  const onHoldCount = projects.filter(p => p.status === ProjectStatus.OnHold).length;
  const archivedCount = projects.filter(p => p.isArchive).length;

  const summary = {
    appName: 'My Yarn Diary',
    exportDate: new Date().toISOString(),
    account: {
      userId: currentUser.userId,
      displayName: currentUser.displayName,
      email: currentUser.email,
      crochetTerminology: currentUser.crochetTerminology || 'US',
      accountCreatedAt: currentUser.createdAt
    },
    projectStatistics: {
      totalProjects: projects.length,
      inProgress: inProgressCount,
      completed: completedCount,
      onHold: onHoldCount,
      archived: archivedCount
    }
  };

  zip.file('account_summary.json', JSON.stringify(summary, null, 2));

  // 3. Compress and return Blob
  onProgress?.('Compressing archive...');
  return await zip.generateAsync({ type: 'blob' });
}
