/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronUp, ChevronDown, Trash2, Camera, NotebookPen, Save, FolderOpen, Calendar, Heart, Copy, Archive, Star, FolderUp, ClipboardList, PackageOpen, Play, Pause, CircleCheckBig, Clock, CirclePause, Route, ReceiptText, FileText, Download, Plus, Minus, Spool, PenTool, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { Project, JournalLog, Category, ProjectStatus, Yarn, Hook } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { useDialog } from './DialogProvider';
import { YarnManager, YarnManagerHandle } from './YarnManager';
import { HookManager, HookManagerHandle } from './HookManager';
import { PatternViewer } from './PatternViewer';
import { YarnSpinner } from './YarnSpinner';
import { exportProjectToPdf } from '../lib/pdfExport';
import { useAutosave } from '../hooks/useAutosave';

const capitalizeWords = (str: string): string => {
 if (!str) return '';
 return str
 .trim()
 .split(/\s+/)
 .map(word => {
 const match = word.match(/\p{L}/u);
 if (match && match.index !== undefined) {
 const index = match.index;
 return word.slice(0, index) + word[index].toUpperCase() + word.slice(index + 1);
 }
 return word.charAt(0).toUpperCase() + word.slice(1);
 })
 .join(' ');
};

const isValidName = (str: string): boolean => {
 return /^[ \p{L}\p{N}\-_()#.\p{Emoji}\p{Extended_Pictographic}\p{M}\p{Cf}]+$/u.test(str) && /[\p{L}\p{N}\p{Emoji}\p{Extended_Pictographic}]/u.test(str);
};


interface ProjectDetailProps {
 project: Project;
 categories: Category[];
 token: string;
 onBack: () => void;
 onUpdateProject: (updates: Partial<Project>) => Promise<any>;
 onUpdateProjectState: (updatedProject: Project) => void;
 onToggleFavorite: (projectId: string) => void;
 onDeleteProject: (projectId: string) => void;
 onDuplicateProject: (projectId: string) => void;
 onArchiveProject: (projectId: string) => void;
 user?: any;
 onUpdateCrochetTerminology?: (pref: 'US' | 'UK') => Promise<void>;
}

export function ProjectDetail({
 project,
 categories,
 token,
 onBack,
 onUpdateProject,
 onUpdateProjectState,
 onToggleFavorite,
 onDeleteProject,
 onDuplicateProject,
 onArchiveProject,
 user,
 onUpdateCrochetTerminology
}: ProjectDetailProps) {
 const [logs, setLogs] = useState<JournalLog[]>([]);
 const [logsPage, setLogsPage] = useState(0);
 const [logsPageSize, setLogsPageSize] = useState(5);
 const [logsTotalPages, setLogsTotalPages] = useState(0);
 const [logsTotalElements, setLogsTotalElements] = useState(0);
  const [textEntry, setTextEntry] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogText, setEditingLogText] = useState<string>('');
 const [logImage, setLogImage] = useState<string | null>(null);
 const [logImageMime, setLogImageMime] = useState('');
 const [logImageBase64, setLogImageBase64] = useState<string | null>(null);

  // LocalStorage draft for the in-progress journal entry (text + attached photo),
  // so nothing is lost if the tab is closed before clicking "Add Entry".
  useEffect(() => {
    if (!project?.projectId) return;
    const savedDraft = localStorage.getItem(`journal_draft_${project.projectId}`);
    if (savedDraft && !textEntry) {
      setTextEntry(savedDraft);
    }
    const savedPhoto = localStorage.getItem(`journal_draft_photo_${project.projectId}`);
    if (savedPhoto && !logImage) {
      try {
        const p = JSON.parse(savedPhoto);
        if (p.logImage) setLogImage(p.logImage);
        if (p.logImageMime) setLogImageMime(p.logImageMime);
        if (p.logImageBase64) setLogImageBase64(p.logImageBase64);
      } catch (e) {
        console.error('Failed to restore journal photo draft:', e);
      }
    }
  }, [project?.projectId]);

  useEffect(() => {
    if (!project?.projectId) return;
    if (textEntry) {
      localStorage.setItem(`journal_draft_${project.projectId}`, textEntry);
    } else {
      localStorage.removeItem(`journal_draft_${project.projectId}`);
    }
  }, [textEntry, project?.projectId]);

  useEffect(() => {
    if (!project?.projectId) return;
    const key = `journal_draft_photo_${project.projectId}`;
    if (logImage) {
      try {
        localStorage.setItem(key, JSON.stringify({ logImage, logImageMime, logImageBase64 }));
      } catch (e) {
        console.error('Failed to persist journal photo draft:', e);
      }
    } else {
      localStorage.removeItem(key);
    }
  }, [logImage, logImageMime, logImageBase64, project?.projectId]);

  // Debounced autosave while editing an existing journal entry (no save-on-blur).
  const logEditAutosave = useAutosave<{ logId: string; text: string }>(async ({ logId, text }) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const res = await fetchWithToken(`/api/v1/logs/${logId}`, {
      method: 'PUT',
      body: JSON.stringify({ textEntry: trimmed })
    });
    if (res) {
      setLogs(prev => prev.map(l => (l.logId === logId ? { ...l, textEntry: trimmed } : l)));
    }
  });
 const [submittingLog, setSubmittingLog] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const { showAlert, showConfirm, showToast } = useDialog();

 // Edit fields
 const [title, setTitle] = useState(project.title);
 const [yarns, setYarns] = useState<Yarn[]>(project.yarns || []);
 const [hooks, setHooks] = useState<Hook[]>(project.hooks || []);
 const [status, setStatus] = useState(project.status);
 const [notes, setNotes] = useState(project.notes || '');
 const [targetCategoryId, setTargetCategoryId] = useState(project.categoryId);
 const [startDate, setStartDate] = useState(project.startDate || '');
 const [endDate, setEndDate] = useState(project.endDate || '');
 const [productPhotos, setProductPhotos] = useState<string[]>((project.photos || []).map(p => p.photoBase64));
 const initialCoverPhotoId = project.photos?.find(p => p.isCover)?.id;
 const [coverPhoto, setCoverPhoto] = useState<string | null>(initialCoverPhotoId ? String(initialCoverPhotoId) : null);
 const [careInstructions, setCareInstructions] = useState(project.careInstructions || '');
 const [totalTime, setTotalTime] = useState(project.totalTime || '');
 const [isSaved, setIsSaved] = useState(true);
 const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

 // Unsaved modal, lightbox & camera states
 const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Keyboard navigation for Lightbox image slider
  useEffect(() => {
    if (!lightboxImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const idx = productPhotos.indexOf(lightboxImage);
      if (idx === -1) return;
      if (e.key === 'ArrowRight') {
        const nextIdx = (idx + 1) % productPhotos.length;
        setLightboxImage(productPhotos[nextIdx]);
      } else if (e.key === 'ArrowLeft') {
        const prevIdx = (idx - 1 + productPhotos.length) % productPhotos.length;
        setLightboxImage(productPhotos[prevIdx]);
      } else if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, productPhotos]);
 const [isCameraActive, setIsCameraActive] = useState(false);
 const [cameraTarget, setCameraTarget] = useState<'product' | 'log' | null>(null);
 const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
 const videoRef = React.useRef<HTMLVideoElement | null>(null);
 const autoSaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
 const lastFetchedLogsRef = React.useRef<{ projectId: string; page: number; size: number } | null>(null);
 const [activeTab, setActiveTab] = useState<'journal' | 'pattern'>('journal');
 const [isYarnsOpen, setIsYarnsOpen] = useState(false);
 const [isHooksOpen, setIsHooksOpen] = useState(false);
 const yarnManagerRef = useRef<YarnManagerHandle>(null);
 const hookManagerRef = useRef<HookManagerHandle>(null);
 const [pendingYarnAdd, setPendingYarnAdd] = useState(false);
 const [pendingHookAdd, setPendingHookAdd] = useState(false);

 // Add a yarn/hook, opening the section first (the manager only mounts when open,
 // so a queued add fires once it's available).
 const addYarn = () => {
   if (yarnManagerRef.current) yarnManagerRef.current.add();
   else { setIsYarnsOpen(true); setPendingYarnAdd(true); }
 };
 const addHook = () => {
   if (hookManagerRef.current) hookManagerRef.current.add();
   else { setIsHooksOpen(true); setPendingHookAdd(true); }
 };
 useEffect(() => {
   if (isYarnsOpen && pendingYarnAdd && yarnManagerRef.current) {
     yarnManagerRef.current.add();
     setPendingYarnAdd(false);
   }
 }, [isYarnsOpen, pendingYarnAdd]);
 useEffect(() => {
   if (isHooksOpen && pendingHookAdd && hookManagerRef.current) {
     hookManagerRef.current.add();
     setPendingHookAdd(false);
   }
 }, [isHooksOpen, pendingHookAdd]);

 const isDateRangeInvalid = !!(startDate && endDate && startDate > endDate);

 useEffect(() => {
 setTitle(project.title);
 setStatus(project.status);
 setNotes(project.notes || '');
 setTargetCategoryId(project.categoryId);
 setStartDate(project.startDate || '');
 setEndDate(project.endDate || '');
 setProductPhotos((project.photos || []).map(p => p.photoBase64));
 setCareInstructions(project.careInstructions || '');
 setTotalTime(project.totalTime || '');
 const coverId = project.photos?.find(p => p.isCover)?.id;
 setCoverPhoto(coverId ? String(coverId) : null);
 setIsSaved(true);
 }, [
 project.projectId,
 project.title,
 project.startDate,
 project.endDate,
 project.careInstructions,
 project.totalTime,
 project.photos?.map(p => `${p.id}:${p.isCover}`).join(','),
 project.photos?.map(p => p.photoBase64).join(',')
 ]);

 // Yarn/hook counts are owned by their managers (authoritative fetch from their
 // dedicated endpoints) and reported up via onYarnsChange/onHooksChange. We only
 // re-seed the badge state when switching to a different project, so a stale
 // yarns/hooks array on a projects PUT response can't clobber the count.
 useEffect(() => {
 setYarns(project.yarns || []);
 setHooks(project.hooks || []);
 }, [project.projectId]);

 const fetchWithToken = async (url: string, options: RequestInit = {}) => {
 if (!token) throw new Error('No authentication token available');
 const headers = {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json',
 ...(options.headers || {})
 };
 try {
 const response = await fetch(url, { ...options, headers });
 if (!response.ok) {
 if (response.status === 401) {
 window.dispatchEvent(new Event('unauthorized'));
 }
 let rawMsg = '';
 try {
 const errData = await response.json();
 if (errData && errData.message) {
 rawMsg = errData.message;
 }
 } catch (_) { }

 let errMsg = '';
 if (response.status >= 500) {
 errMsg = 'An unexpected server error occurred. Please try again later.';
 } else if (response.status === 400) {
 if (rawMsg && (rawMsg.toLowerCase().includes('must be') || rawMsg.toLowerCase().includes('required') || rawMsg.toLowerCase().includes('already exists') || rawMsg.toLowerCase().includes('invalid name') || rawMsg.toLowerCase().includes('either the size'))) {
 errMsg = rawMsg;
 } else {
 errMsg = 'Invalid request. Please check your inputs and try again.';
 }
 } else if (response.status === 403) {
 errMsg = 'You do not have permission to perform this action.';
 } else if (response.status === 404) {
 errMsg = 'The requested item could not be found.';
 } else if (response.status === 409) {
 errMsg = 'This item already exists.';
 } else {
 errMsg = 'Something went wrong. Please check your connection and try again.';
 }

 console.group('%c[Network API Error Interceptor]', 'color: var(--error-default); font-weight: bold;');
 console.error(`[URI]: ${url}`);
 console.error(`[Status Code]: ${response.status} (${response.statusText || 'Status Unknown'})`);
 console.error(`[Method]: ${options.method || 'GET'}`);
 console.groupEnd();
 throw new Error(errMsg);
 }
 if (response.status === 204) {
 return true;
 }
 return await response.json();
 } catch (err) {
 console.error(`%c[Pipeline Fetch Failure] unable to resolve: ${url}`, 'color: var(--warning-default); font-weight: bold;', err);
 throw err;
 }
 };

 const loadLogs = async (targetPage = logsPage, targetSize = logsPageSize, forceReload = false) => {
 if (
 !forceReload &&
 lastFetchedLogsRef.current &&
 lastFetchedLogsRef.current.projectId === project.projectId &&
 lastFetchedLogsRef.current.page === targetPage &&
 lastFetchedLogsRef.current.size === targetSize
 ) {
 return;
 }
 lastFetchedLogsRef.current = { projectId: project.projectId, page: targetPage, size: targetSize };
 try {
 const data = await fetchWithToken(`/api/v1/projects/${project.projectId}/logs?page=${targetPage}&size=${targetSize}&sort=createdAt,desc`);
 if (data && data.content) {
 setLogs(data.content);
 setLogsTotalPages(data.totalPages);
 setLogsTotalElements(data.totalElements);
 setLogsPage(data.number);
 setLogsPageSize(data.size);
 }
 } catch (err) {
 console.error('Failed to load journal progression logs:', err);
 }
 };

 const fetchPhotos = async () => {
 try {
 const photosData = await fetchWithToken(`/api/v1/projects/${project.projectId}/photos`);
 if (photosData) {
 onUpdateProjectState({
 ...project,
 photos: photosData
 });
 setProductPhotos(photosData.map((p: any) => p.photoBase64));
 const coverId = photosData.find(p => p.isCover)?.id;
 setCoverPhoto(coverId ? String(coverId) : null);
 }
 } catch (err) {
 console.error('Failed to fetch photos:', err);
 }
 };

 useEffect(() => {
 if (!token || project.isNewProject) return;
 loadLogs(logsPage, logsPageSize);
 }, [project.projectId, token, logsPage, logsPageSize, project.isNewProject]);

 useEffect(() => {
 if (!token || project.isNewProject) return;
 if (project.photos !== undefined) {
 setProductPhotos(project.photos.map(p => p.photoBase64));
 const coverId = project.photos.find(p => p.isCover)?.id;
 setCoverPhoto(coverId ? String(coverId) : null);
 } else {
 fetchPhotos();
 }
 }, [project.projectId, token, project.isNewProject, project.photos]);

 const handleFieldChange = () => {
 setIsSaved(false);
 };

 useEffect(() => {
 if (isSaved) {
 if (autoSaveTimeoutRef.current) {
 clearTimeout(autoSaveTimeoutRef.current);
 autoSaveTimeoutRef.current = null;
 }
 return;
 }

 if (autoSaveTimeoutRef.current) {
 clearTimeout(autoSaveTimeoutRef.current);
 }

 autoSaveTimeoutRef.current = setTimeout(async () => {
 const trimmed = title.trim();
 if (!trimmed) return;

 const capitalized = capitalizeWords(trimmed);
 if (!isValidName(capitalized)) return;

 const invalidHook = hooks.find(h => {
 const hasMm = h.sizeMm !== undefined && h.sizeMm !== null && !isNaN(h.sizeMm);
 const hasUs = h.sizeUs && h.sizeUs.trim() !== '';
 if (!hasMm && !hasUs) return true;
 if (hasMm && h.sizeMm <= 0) return true;
 return false;
 });
 if (invalidHook) return;

 setIsSubmitting(true);
 try {
 await onUpdateProject({
 title: capitalized,
 status,
 notes,
 categoryId: targetCategoryId,
 startDate,
 endDate,
 careInstructions,
 totalTime
 });
 setTitle(capitalized);
 setIsSaved(true);
 } catch (err) {
 console.error('Auto-save failed:', err);
 } finally {
 setIsSubmitting(false);
 }
 }, 1500);

 return () => {
 if (autoSaveTimeoutRef.current) {
 clearTimeout(autoSaveTimeoutRef.current);
 }
 };
 }, [
 isSaved,
 title,
 yarns,
 hooks,
 status,
 notes,
 targetCategoryId,
 startDate,
 endDate,
 careInstructions,
 totalTime,
 productPhotos,
 coverPhoto,
 onUpdateProject
 ]);

 useEffect(() => {
 const handleBeforeUnload = (e: BeforeUnloadEvent) => {
 if (!isSaved) {
 e.preventDefault();
 e.returnValue = '';
 }
 };
 window.addEventListener('beforeunload', handleBeforeUnload);
 return () => {
 window.removeEventListener('beforeunload', handleBeforeUnload);
 };
 }, [isSaved]);

 const handleSaveFields = async () => {
 const trimmed = title.trim();
 if (!trimmed) return;

 const capitalized = capitalizeWords(trimmed);
 if (!isValidName(capitalized)) {
 await showAlert('Project name can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, parentheses, and emojis.');
 return;
 }

 const invalidHook = hooks.find(h => {
 const hasMm = h.sizeMm !== undefined && h.sizeMm !== null && !isNaN(h.sizeMm);
 const hasUs = h.sizeUs && h.sizeUs.trim() !== '';
 if (!hasMm && !hasUs) return true;
 if (hasMm && h.sizeMm <= 0) return true;
 return false;
 });

 if (invalidHook) {
 await showAlert('For each hook, please enter either the size in mm (greater than 0), the US size, or both.');
 return;
 }

 setIsSubmitting(true);
 try {
 await onUpdateProject({
 title: capitalized,
 status,
 notes,
 categoryId: targetCategoryId,
 startDate,
 endDate,
 careInstructions,
 totalTime,
 yarns,
 hooks
 });
 setTitle(capitalized);
 setIsSaved(true);
 } catch (err) {
 // Caught by global toast system
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const activeCategory = categories.find(c => c.categoryId === targetCategoryId || c.categoryId === project.categoryId);
      await exportProjectToPdf(
        {
          ...project,
          title,
          yarns,
          hooks,
          status,
          notes,
          startDate,
          endDate,
          careInstructions,
          totalTime
        },
        logs,
        activeCategory?.name || 'General',
        coverPhoto,
        productPhotos
      );
    } catch (err) {
 console.error('Failed to export PDF:', err);
 await showAlert('An error occurred while generating the PDF. Please try again.', 'Export Failed');
 } finally {
 setIsExporting(false);
 }
 };

 const handleProductPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (!e.target.files || e.target.files.length === 0) return;

 const filesArray = Array.from(e.target.files);
 const maxPhotos = 6;
 const currentCount = productPhotos.length;
 const remainingSlots = maxPhotos - currentCount;

 if (remainingSlots <= 0) {
 await showAlert("You have already uploaded the maximum limit of 6 photos.");
 return;
 }

 let filesToProcess = filesArray;
 if (filesArray.length > remainingSlots) {
 await showAlert(`You can only upload up to 6 photos in total. Only the first ${remainingSlots} selected photos will be uploaded.`);
 filesToProcess = filesArray.slice(0, remainingSlots);
 }

 // Check size limit: 2MB per photo
 const maxBytes = 2 * 1024 * 1024;
 const oversizedFile = filesToProcess.find(f => f.size > maxBytes);
 if (oversizedFile) {
 await showAlert(`Photo "${oversizedFile.name}" exceeds the maximum allowed limit of 2MB.`, 'File Too Large');
 return;
 }

 setIsUploadingPhoto(true);

 const processFile = (file: File): Promise<string> => {
 return new Promise((resolve) => {
 const reader = new FileReader();
 reader.onload = () => {
 const base64Str = reader.result as string;

 // Compress image using client-side HTML5 Canvas before writing to Firestore
 const img = new Image();
 img.src = base64Str;
 img.onload = () => {
 const maxWidth = 800;
 const maxHeight = 800;
 let width = img.width;
 let height = img.height;

 if (width > height) {
 if (width > maxWidth) {
 height = Math.round((height * maxWidth) / width);
 width = maxWidth;
 }
 } else {
 if (height > maxHeight) {
 width = Math.round((width * maxHeight) / height);
 height = maxHeight;
 }
 }

 const canvas = document.createElement('canvas');
 canvas.width = width;
 canvas.height = height;

 const ctx = canvas.getContext('2d');
 if (ctx) {
 ctx.drawImage(img, 0, 0, width, height);
 const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
 resolve(compressedBase64);
 } else {
 resolve(base64Str);
 }
 };
 img.onerror = () => {
 resolve(base64Str);
 };
 };
 reader.onerror = () => {
 resolve('');
 };
 reader.readAsDataURL(file);
 });
 };

 try {
 const results = await Promise.all(filesToProcess.map(file => processFile(file)));
 const validResults = results.filter(res => res !== '');
 if (validResults.length > 0) {

 for (const res of validResults) {
 await fetchWithToken(`/api/v1/projects/${project.projectId}/photos`, {
 method: 'POST',
 body: res
 });
 }

 const photosData = await fetchWithToken(`/api/v1/projects/${project.projectId}/photos`);
 if (photosData) {
 onUpdateProjectState({
 ...project,
 photos: photosData
 });
 setProductPhotos(photosData.map((p: any) => p.photoBase64));
 }

 if (status !== ProjectStatus.Completed) {
 const confirmed = await showConfirm('Do you want to move this project to the "Completed" stage?');
 if (confirmed) {
 setStatus(ProjectStatus.Completed);
 onUpdateProject({ status: ProjectStatus.Completed });
 }
 }
 }
 } catch (err) {
 console.error("Failed to process uploaded photos:", err);
 } finally {
 setIsUploadingPhoto(false);
 e.target.value = '';
 }
 };

 const removeProductPhoto = async (index: number) => {
 const confirmed = await showConfirm('Are you sure you want to remove this photo from your gallery?');
 if (!confirmed) return;

 const photoBase64 = productPhotos[index];
 const photoObj = project.photos?.find(p => p.photoBase64 === photoBase64);

 if (photoObj) {
 try {
 await fetchWithToken(`/api/v1/photos/${photoObj.id}`, { method: 'DELETE' });
 const photosData = await fetchWithToken(`/api/v1/projects/${project.projectId}/photos`);
 if (photosData) {
 onUpdateProjectState({
 ...project,
 photos: photosData
 });
 setProductPhotos(photosData.map((p: any) => p.photoBase64));
 }

 if (coverPhoto === String(photoObj.id) || coverPhoto === photoBase64) {
 setCoverPhoto(null);
 }
 } catch (err) {
 console.error('Failed to delete photo:', err);
 }
 } else {
 setProductPhotos(prev => prev.filter((_, i) => i !== index));
 if (coverPhoto === photoBase64) {
 setCoverPhoto(null);
 }
 }
 };

 const incrementRow = async (amount: number) => {
 try {
 const newCount = Math.max(0, project.rowCount + amount);
 let nextStatus = project.status;
 if (project.status === ProjectStatus.Planning && amount > 0) {
 const confirmed = await showConfirm('Do you want to move this project to the "In Progress" stage?');
 if (confirmed) {
 nextStatus = ProjectStatus.InProgress;
 setStatus(ProjectStatus.InProgress);
 }
 }
 onUpdateProject({ rowCount: newCount, status: nextStatus });
 } catch (err) {
 console.error('Row counter increment error:', err);
 }
 };

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 const file = e.target.files[0];
 const maxBytes = 2 * 1024 * 1024;
 if (file.size > maxBytes) {
 await showAlert('Photo exceeds the maximum allowed limit of 2MB.', 'File Too Large');
 return;
 }
 setLogImageMime(file.type);
 const reader = new FileReader();
 reader.onload = () => {
 const base64Str = reader.result as string;

 // Compress image using client-side HTML5 Canvas before writing to Firestore
 const img = new Image();
 img.src = base64Str;
 img.onload = () => {
 const maxWidth = 800;
 const maxHeight = 800;
 let width = img.width;
 let height = img.height;

 if (width > height) {
 if (width > maxWidth) {
 height = Math.round((height * maxWidth) / width);
 width = maxWidth;
 }
 } else {
 if (height > maxHeight) {
 width = Math.round((width * maxHeight) / height);
 height = maxHeight;
 }
 }

 const canvas = document.createElement('canvas');
 canvas.width = width;
 canvas.height = height;

 const ctx = canvas.getContext('2d');
 if (ctx) {
 ctx.drawImage(img, 0, 0, width, height);
 const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
 setLogImage(compressedBase64);
 setLogImageBase64(compressedBase64.split(',')[1]);
 } else {
 setLogImage(base64Str);
 setLogImageBase64(base64Str.split(',')[1]);
 }
 };
 img.onerror = () => {
 setLogImage(base64Str);
 setLogImageBase64(base64Str.split(',')[1]);
 };
 };
 reader.readAsDataURL(file);
 }
 };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textEntry.trim()) return;

    setSubmittingLog(true);

    try {
      const payload = {
        textEntry: textEntry.trim(),
        imageBase64: logImage || '',
        rowCountSnapshot: project.rowCount || 0
      };

      const res = await fetchWithToken(`/api/v1/projects/${project.projectId}/logs`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res) {
        setLogs(prev => [res as JournalLog, ...prev]);
        setTextEntry('');
        setLogImage(null);
        setLogImageMime('');
        setLogImageBase64(null);
        localStorage.removeItem(`journal_draft_${project.projectId}`);
        localStorage.removeItem(`journal_draft_photo_${project.projectId}`);
        showToast('Saving...', 'success');
        loadLogs(0, logsPageSize, true);
      }
    } catch (err) {
      console.error('Failed to append progress log:', err);
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleUpdateLog = async (logId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const res = await fetchWithToken(`/api/v1/logs/${logId}`, {
        method: 'PUT',
        body: JSON.stringify({ textEntry: trimmed })
      });
      if (res) {
        setLogs(prev => prev.map(l => l.logId === logId ? { ...l, textEntry: trimmed } : l));
        showToast('Saving...', 'success');
        setEditingLogId(null);
      }
    } catch (err) {
      console.error('Failed to update journal log:', err);
      showToast('Failed to save journal entry.', 'error');
    }
  };

 const handleDeleteLog = async (logId: string) => {
 const confirmed = await showConfirm('Are you sure you want to discard this journal entry?');
 if (!confirmed) return;
 try {
 await fetchWithToken(`/api/v1/logs/${logId}`, { method: 'DELETE' });
 setLogs(prev => prev.filter(l => l.logId !== logId));
 loadLogs(0, logsPageSize, true);
 } catch (err) {
 console.error('Failed to delete log entry:', err);
 }
 };

 const startCamera = async (target: 'product' | 'log') => {
 try {
 setCameraTarget(target);
 setIsCameraActive(true);
 const stream = await navigator.mediaDevices.getUserMedia({
 video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 768 } }
 });
 setCameraStream(stream);
 setTimeout(() => {
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 videoRef.current.play().catch(err => console.error("Error playing video stream:", err));
 }
 }, 150);
 } catch (err) {
 console.error("Camera access failed:", err);
 await showAlert("Unable to access camera. Please check camera permissions in your browser.");
 setIsCameraActive(false);
 setCameraTarget(null);
 }
 };

 const stopCamera = () => {
 if (cameraStream) {
 cameraStream.getTracks().forEach(track => track.stop());
 setCameraStream(null);
 }
 setIsCameraActive(false);
 setCameraTarget(null);
 };

 const captureSnap = async () => {
 if (!videoRef.current || !cameraStream) return;

 const video = videoRef.current;
 const canvas = document.createElement('canvas');
 canvas.width = video.videoWidth || 640;
 canvas.height = video.videoHeight || 480;

 const ctx = canvas.getContext('2d');
 if (ctx) {
 ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
 const capturedBase64 = canvas.toDataURL('image/jpeg', 0.7);

 if (cameraTarget === 'product') {
 if (productPhotos.length >= 6) {
 await showAlert("You have already uploaded the maximum limit of 6 photos.");
 } else {
 setIsUploadingPhoto(true);
 try {
 await fetchWithToken(`/api/v1/projects/${project.projectId}/photos`, {
 method: 'POST',
 body: capturedBase64
 });

 const photosData = await fetchWithToken(`/api/v1/projects/${project.projectId}/photos`);
 if (photosData) {
 onUpdateProjectState({
 ...project,
 photos: photosData
 });
 setProductPhotos(photosData.map((p: any) => p.photoBase64));
 }

 if (status !== ProjectStatus.Completed) {
 const confirmed = await showConfirm('Do you want to move this project to the "Completed" stage?');
 if (confirmed) {
 setStatus(ProjectStatus.Completed);
 onUpdateProject({ status: ProjectStatus.Completed });
 }
 }
 } catch (err) {
 console.error("Failed to process captured photo:", err);
 } finally {
 setIsUploadingPhoto(false);
 }
 }
 } else if (cameraTarget === 'log') {
 setLogImage(capturedBase64);
 setLogImageBase64(capturedBase64.split(',')[1]);
 }
 }

 stopCamera();
 };

 const handleDuplicate = async () => {
 const confirmed = await showConfirm('Are you sure you want to duplicate this project?');
 if (confirmed) {
 onDuplicateProject(project.projectId);
 }
 };

 const handleArchive = async () => {
 const action = project.isArchive ? 'unarchive' : 'archive';
 const confirmed = await showConfirm(`Are you sure you want to ${action} this project?`);
 if (confirmed) {
 onArchiveProject(project.projectId);
 }
 };

 const handleSaveAndLeave = async () => {
 await handleSaveFields();
 setShowUnsavedModal(false);
 onBack();
 };

 const handleDiscardAndLeave = () => {
 setShowUnsavedModal(false);
 onBack();
 };

 const handleBackCheck = () => {
 if (!isSaved) {
 setShowUnsavedModal(true);
 } else {
 onBack();
 }
 };

 const activeCategory = categories.find(c => c.categoryId === project.categoryId);

 return (
 <div id="project-journal-board" className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">

 {/* Top action header */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4 border-b border-subtle pb-4 lg:pb-6 bg-white p-3 lg:p-5 rounded-2xl lg:rounded-3xl warm-shadow">
 <div className="flex items-center justify-between w-full lg:w-auto">
 <div className="flex items-center gap-2 lg:gap-4">
 <button
 onClick={handleBackCheck}
 className="p-1.5 lg:p-2.5 rounded-xl bg-white border border-subtle hover:bg-page text-muted transition-colors shadow-xs cursor-pointer"
 >
 <ArrowLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4 cursor-pointer" />
 </button>
 <div>
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-bold text-brand bg-brand/10 border border-brand/20 px-1.5 lg:px-2 py-0.5 rounded-md flex items-center gap-1">
 <FolderOpen className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
 {activeCategory?.name || 'My Projects'}
 </span>
 </div>
 <div className="flex items-center gap-2 lg:gap-3 mt-0.5 lg:mt-1.5">
 <h2 className="text-base lg:text-2xl font-extrabold font-serif text-heading leading-tight truncate max-w-[120px] sm:max-w-xs">{project.title}</h2>
 </div>
 </div>
 </div>

 {/* Mobile Action Buttons */}
 <div className="flex lg:hidden items-center gap-1 shrink-0">
 <button
 onClick={() => onToggleFavorite(project.projectId)}
 className={`p-1 bg-white border rounded-lg cursor-pointer transition-colors ${project.isFavorite
 ? 'text-brand border-rose-100'
 : 'text-muted border-subtle'
 }`}
 >
 <Heart className="w-3.5 h-3.5" fill={project.isFavorite ? 'var(--color-brand)' : 'none'} color={project.isFavorite ? 'var(--color-brand)' : 'currentColor'} />
 </button>
 <button onClick={handleDuplicate} className="p-1 bg-white text-muted border border-subtle rounded-lg cursor-pointer">
 <Copy className="w-3.5 h-3.5" />
 </button>
 <button onClick={handleExportPdf} disabled={isExporting} className="p-1 bg-white text-muted border border-subtle rounded-lg cursor-pointer flex items-center justify-center">
 {isExporting ? (
 <YarnSpinner className="h-3.5 w-3.5 text-accent" />
 ) : <Download className="w-3.5 h-3.5" />}
 </button>
 <button onClick={handleArchive} className={`p-1 bg-white border rounded-lg cursor-pointer transition-colors ${project.isArchive ? 'text-accent border-emerald-100' : 'text-muted border-subtle'}`}>
 <Archive className="w-3.5 h-3.5" fill={project.isArchive ? 'var(--color-accent)' : 'none'} color={project.isArchive ? 'var(--color-accent)' : 'currentColor'} />
 </button>
 <button onClick={async () => { const confirmed = await showConfirm('Are you sure you want to delete this project?'); if (confirmed) { onDeleteProject(project.projectId); onBack(); } }} className="p-1 bg-white text-muted border border-subtle rounded-lg cursor-pointer">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>

 <div className="flex items-center gap-2 lg:gap-3 w-full lg:w-auto justify-between lg:justify-end relative">
 {/* Desktop Action Buttons */}
 <div className="hidden lg:flex items-center gap-2 shrink-0">
 <button
 onClick={() => onToggleFavorite(project.projectId)}
 className={`p-1 px-1.5 bg-white border rounded-lg shrink-0 cursor-pointer transition-colors ${project.isFavorite
 ? 'text-brand border-rose-100 hover:bg-rose-50/50'
 : 'text-muted hover:text-rose-500 border-subtle hover:bg-rose-50/50'
 }`}
 title={project.isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
 >
 <Heart
 className="w-4 h-4 transition-colors"
 fill={project.isFavorite ? 'var(--color-brand)' : 'none'}
 color={project.isFavorite ? 'var(--color-brand)' : 'currentColor'}
 />
 </button>

 <button
 onClick={handleDuplicate}
 className="p-1 px-1.5 bg-white hover:bg-stone-50 text-muted hover:text-accent border border-subtle hover:border-accent/30 rounded-lg shrink-0 cursor-pointer transition-colors"
 title="Duplicate Project"
 >
 <Copy className="w-4 h-4" />
 </button>

 <button
 type="button"
 onClick={handleExportPdf}
 disabled={isExporting}
 className="p-1 px-1.5 bg-white hover:bg-page text-muted hover:text-accent border border-subtle hover:border-accent/30 rounded-lg shrink-0 cursor-pointer transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
 title="Export PDF"
 >
 {isExporting ? (
 <YarnSpinner className="h-4 w-4 text-accent" />
 ) : (
 <Download className="w-4 h-4" />
 )}
 </button>

 <button
 onClick={handleArchive}
 className={`p-1 px-1.5 bg-white border rounded-lg shrink-0 cursor-pointer transition-colors ${project.isArchive
 ? 'text-accent border-emerald-100 hover:bg-emerald-50/50'
 : 'text-muted hover:text-amber-600 border-subtle hover:bg-amber-50/50'
 }`}
 title={project.isArchive ? 'Unarchive Project' : 'Archive Project'}
 >
 <Archive
 className="w-4 h-4 transition-colors"
 fill={project.isArchive ? 'var(--color-accent)' : 'none'}
 color={project.isArchive ? 'var(--color-accent)' : 'currentColor'}
 />
 </button>

 <button
 onClick={async () => {
 const confirmed = await showConfirm('Are you sure you want to delete this project?');
 if (confirmed) {
 onDeleteProject(project.projectId);
 onBack();
 }
 }}
 className="p-1 px-1.5 bg-white hover:bg-red-50 text-muted hover:text-red-500 border border-subtle hover:border-red-100 rounded-lg shrink-0 cursor-pointer transition-colors"
 title="Delete project"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>

 {/* Change status controls */}
 <div className="flex items-center gap-2 lg:gap-3 w-full lg:w-auto">
 <div className="relative flex-1 lg:flex-none">
 <button
 type="button"
 disabled={isSubmitting}
 onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
 className="px-3 lg:px-4 py-1.5 lg:py-2 bg-white border-2 border-subtle hover:border-brand hover:bg-page/50 rounded-xl text-[11px] lg:text-xs font-bold text-heading focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand disabled:opacity-60 flex items-center gap-2 cursor-pointer min-w-[120px] lg:min-w-[140px] justify-between transition-all w-full"
 >
 <span className="flex items-center gap-1.5">
 {status === ProjectStatus.Planning && <ClipboardList className="w-3 lg:w-3.5 h-3 lg:h-3.5 text-warning" />}
 {status === ProjectStatus.InProgress && <Route className="w-3 lg:w-3.5 h-3 lg:h-3.5 text-brand" />}
 {status === ProjectStatus.Completed && <CircleCheckBig className="w-3 lg:w-3.5 h-3 lg:h-3.5 text-accent" />}
 {status === ProjectStatus.OnHold && <CirclePause className="w-3 lg:w-3.5 h-3 lg:h-3.5 text-muted" />}
 {status}
 </span>
 <ChevronDown className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-muted transition-transform duration-200" style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none' }} />
 </button>

 {isStatusDropdownOpen && (
 <>
 <div
 className="fixed inset-0 z-30"
 onClick={() => setIsStatusDropdownOpen(false)}
 />
 <div className="absolute left-0 mt-1.5 w-full min-w-[140px] bg-white border border-subtle rounded-xl shadow-lg z-40 overflow-hidden animate-fade-in py-1">
 <button
 type="button"
 onClick={() => { setStatus(ProjectStatus.Planning); handleFieldChange(); setIsStatusDropdownOpen(false); }}
 className="w-full px-3.5 py-2 text-left text-xs font-bold text-heading hover:bg-surface flex items-center gap-2 transition-colors cursor-pointer"
 >
 <ClipboardList className="w-3.5 h-3.5 text-warning" />
 <span>Planning</span>
 </button>
 <button
 type="button"
 onClick={() => { setStatus(ProjectStatus.InProgress); handleFieldChange(); setIsStatusDropdownOpen(false); }}
 className="w-full px-3.5 py-2 text-left text-xs font-bold text-heading hover:bg-surface flex items-center gap-2 transition-colors cursor-pointer"
 >
 <Route className="w-3.5 h-3.5 text-brand" />
 <span>In Progress</span>
 </button>
 <button
 type="button"
 onClick={() => { setStatus(ProjectStatus.Completed); handleFieldChange(); setIsStatusDropdownOpen(false); }}
 className="w-full px-3.5 py-2 text-left text-xs font-bold text-heading hover:bg-surface flex items-center gap-2 transition-colors cursor-pointer"
 >
 <CircleCheckBig className="w-3.5 h-3.5 text-accent" />
 <span>Completed</span>
 </button>
 <button
 type="button"
 onClick={() => { setStatus(ProjectStatus.OnHold); handleFieldChange(); setIsStatusDropdownOpen(false); }}
 className="w-full px-3.5 py-2 text-left text-xs font-bold text-heading hover:bg-surface flex items-center gap-2 transition-colors cursor-pointer"
 >
 <CirclePause className="w-3.5 h-3.5 text-muted" />
 <span>On Hold</span>
 </button>
 </div>
 </>
 )}
 </div>

 <button
 onClick={handleSaveFields}
 disabled={isSaved || isSubmitting || isDateRangeInvalid}
 className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl font-bold text-[11px] lg:text-xs flex items-center gap-1.5 lg:gap-2 shadow-xs transition-all ${isSaved
 ? 'bg-page text-muted border border-subtle cursor-not-allowed'
 : 'bg-accent hover:bg-accent/85 text-white shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60'
 }`}
 >
 {isSubmitting ? (
 <YarnSpinner className="h-3 lg:h-4 w-3 lg:w-4" onBrand />
 ) : (
 <Save className="w-3 lg:w-4 h-3 lg:h-4" />
 )}
 <span>{isSubmitting ? 'Saving...' : (isSaved ? 'All Saved' : 'Save Project')}</span>
 </button>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

 {/* Left column: Sheet Specs & Tap increment counter */}
 <div className="lg:col-span-4 space-y-6">

 {/* TAP COUNTERS COMPONENT */}
 <div className="fabric-card p-4 sm:p-5 text-center space-y-3">
 <span className="text-xs uppercase font-extrabold tracking-widest text-brand block">Row Tracker</span>

 <div className="flex items-center justify-center gap-4 sm:gap-6 py-3">
 {/* Symmetrical Decrease Row Button */}
 <button
 onClick={() => incrementRow(-1)}
 disabled={project.rowCount === 0 || isSubmitting}
 className="sewing-button w-11 h-11 rounded-full text-white transition-transform duration-200 active:scale-95 flex items-center justify-center shadow-lg cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
 title="Decrease row count"
 >
 <Minus className="w-5 h-5" />
 </button>

 {/* Massive Tap to Count Button */}
 <button
 onClick={() => incrementRow(1)}
 disabled={isSubmitting}
 className="sewing-button w-32 h-32 flex flex-col items-center justify-center rounded-full text-white transform transition-transform duration-200 shadow-lg cursor-pointer shrink-0"
 title="Tap to increase row count"
 >
 <span className="text-4xl sm:text-5xl font-black tabular-nums tracking-tighter drop-shadow-sm leading-none pt-2">{project.rowCount}</span>
 <span className="text-[11px] font-bold uppercase tracking-widest mt-1.5 opacity-90">Tap to Count</span>
 </button>

 {/* Symmetrical Increase Row Button */}
 <button
 onClick={() => incrementRow(1)}
 disabled={isSubmitting}
 className="sewing-button four-hole-button w-11 h-11 rounded-full text-white transition-transform duration-200 active:scale-95 flex items-center justify-center shadow-lg cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0"
 >
 <Plus className="w-5 h-5" />
 </button>
 </div>

 {/* Quick offset buttons */}
 <div className="flex gap-2 w-full justify-center mt-1.5">
 <button
 onClick={() => incrementRow(5)}
 disabled={isSubmitting}
 className="flex-1 py-1.5 bg-surface border border-subtle text-[11px] font-extrabold text-brand rounded-xl hover:bg-brand/5 transition-colors cursor-pointer"
 >
 +5 Rows
 </button>
 <button
 onClick={() => incrementRow(10)}
 disabled={isSubmitting}
 className="flex-1 py-1.5 bg-surface border border-subtle text-[11px] font-extrabold text-brand rounded-xl hover:bg-brand/5 transition-colors cursor-pointer"
 >
 +10 Rows
 </button>
 <button
 onClick={async () => {
 const confirmed = await showConfirm('Reset row counter to zero?');
 if (confirmed) onUpdateProject({ rowCount: 0 });
 }}
 disabled={isSubmitting}
 className="px-4 py-1 bg-transparent border-none text-[11px] font-bold text-muted underline hover:text-brand disabled:opacity-60 cursor-pointer mt-1"
 >
 Reset to Zero
 </button>
 </div>
 </div>

 {/* PROJECT INFO FORM SPECIFICATIONS */}
 <div className="fabric-card p-4 space-y-3 animate-fade-in">
 <span className="text-[11px] uppercase font-extrabold tracking-widest text-brand pb-1 border-b border-subtle flex items-center gap-1.5"><ReceiptText className="w-3.5 h-3.5" /> Details</span>

 <div className="space-y-3">
 <div className="space-y-1">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Project Name</label>
 <input
 type="text"
 value={title}
 disabled={isSubmitting}
 onChange={(e) => { setTitle(e.target.value); handleFieldChange(); }}
 className="w-full bg-surface border border-subtle text-xs p-2.5 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold disabled:opacity-60"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Journal Category / List</label>
 <CustomDropdown
 value={targetCategoryId}
 disabled={isSubmitting}
 onChange={(val) => { setTargetCategoryId(val); handleFieldChange(); }}
 options={categories.filter(cat => cat.name !== 'Favourites ❤️').map(cat => ({
 value: cat.categoryId,
 label: cat.name
 }))}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block"> Notes</label>
 <textarea
 rows={2}
 value={notes}
 disabled={isSubmitting}
 placeholder="e.g. Increase 6 stitches on the ears in round 5..."
 onChange={(e) => { setNotes(e.target.value); handleFieldChange(); }}
 className="w-full bg-surface border border-subtle text-xs p-2.5 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold resize-none disabled:opacity-60"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Care Instructions</label>
 <textarea
 rows={2}
 value={careInstructions}
 disabled={isSubmitting}
 placeholder="e.g. Hand wash cold, lay flat to dry..."
 onChange={(e) => { setCareInstructions(e.target.value); handleFieldChange(); }}
 className="w-full bg-surface border border-subtle text-xs p-2.5 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold resize-none disabled:opacity-60"
 />
 </div>
 </div>
 </div>

 {/* PROJECT TIMELINE */}
 <div className="bg-white rounded-2xl p-4 border border-subtle warm-shadow-lg space-y-3 animate-fade-in">
 <span className="text-[11px] uppercase font-extrabold tracking-widest text-brand pb-1 border-b border-subtle flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5 text-brand" /> Project Duration
 </span>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1 min-w-0">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Date Started</label>
 <input
 type="date"
 value={startDate}
 disabled={isSubmitting}
 onChange={(e) => { setStartDate(e.target.value); handleFieldChange(); }}
 className="w-full bg-surface border border-subtle text-xs p-2 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold disabled:opacity-60"
 />
 </div>
 <div className="space-y-1 min-w-0">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Date Ended</label>
 <input
 type="date"
 value={endDate}
 disabled={isSubmitting}
 onChange={async (e) => {
 const val = e.target.value;
 setEndDate(val);
 handleFieldChange();
 if (val && status !== ProjectStatus.Completed) {
 const confirmed = await showConfirm('Do you want to move this project to the "Completed" stage?');
 if (confirmed) {
 setStatus(ProjectStatus.Completed);
 }
 }
 }}
 className="w-full bg-surface border border-subtle text-xs p-2 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold disabled:opacity-60"
 />
 </div>
 </div>
 {isDateRangeInvalid && (
 <p className="text-[11px] text-red-500 font-semibold mt-1 animate-fade-in">Start date cannot be after end date.</p>
 )}
 <div className="space-y-1 mt-3">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Total Time Taken</label>
 <input
 type="text"
 value={totalTime}
 disabled={isSubmitting}
 placeholder="e.g. 5 days, 12 hours"
 onChange={(e) => { setTotalTime(e.target.value); handleFieldChange(); }}
 className="w-full bg-surface border border-subtle text-xs p-2 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold disabled:opacity-60"
 />
 </div>
 </div>

 {/* YARNS SPECIFICATIONS */}
 <div className="bg-white rounded-2xl p-4 border border-subtle warm-shadow-lg space-y-3 animate-fade-in">
 <div className="w-full flex items-center justify-between gap-2">
 <button
 onClick={() => setIsYarnsOpen(!isYarnsOpen)}
 className="flex-1 flex items-center text-left focus:outline-none cursor-pointer"
 >
 <span className="text-[11px] uppercase font-extrabold tracking-widest text-brand flex items-center gap-1.5">
 <Spool className="w-3.5 h-3.5 text-brand" /> Yarns Used
 {yarns.length > 0 && (
 <span className="text-[11px] px-1.5 py-0.5 rounded-full font-extrabold bg-brand/10 text-brand ml-1">
 {yarns.length}
 </span>
 )}
 </span>
 </button>
 <div className="flex items-center gap-1.5 shrink-0">
 <button
 type="button"
 onClick={addYarn}
 disabled={isSubmitting}
 className="px-2.5 py-1 bg-brand hover:bg-brand/90 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
 title="Add yarn"
 >
 <Plus className="w-3 h-3" /> Add
 </button>
 <button
 type="button"
 onClick={() => setIsYarnsOpen(!isYarnsOpen)}
 className="p-1 rounded-lg hover:bg-brand/10 focus:outline-none cursor-pointer"
 title={isYarnsOpen ? 'Collapse' : 'Expand'}
 >
 <ChevronDown className={`w-4 h-4 text-brand transition-transform duration-300 ${isYarnsOpen ? 'rotate-180' : ''}`} />
 </button>
 </div>
 </div>
 {isYarnsOpen && (
 <div className="pt-2 animate-fade-in">
 <YarnManager
 ref={yarnManagerRef}
 projectId={project.projectId}
 initialYarns={project.yarns}
 isNewProject={project.isNewProject}
 fetchWithToken={fetchWithToken}
 disabled={isSubmitting}
 hideAddButton
 onYarnsChange={(updated) => setYarns(updated)}
 />
 </div>
 )}
 </div>

 {/* HOOKS SPECIFICATIONS */}
 <div className="bg-white rounded-2xl p-4 border border-subtle warm-shadow-lg space-y-3 animate-fade-in">
 <div className="w-full flex items-center justify-between gap-2">
 <button
 onClick={() => setIsHooksOpen(!isHooksOpen)}
 className="flex-1 flex items-center text-left focus:outline-none cursor-pointer"
 >
 <span className="text-[11px] uppercase font-extrabold tracking-widest text-brand flex items-center gap-1.5">
 <PenTool className="w-3.5 h-3.5 text-brand" /> Hooks Used
 {hooks.length > 0 && (
 <span className="text-[11px] px-1.5 py-0.5 rounded-full font-extrabold bg-brand/10 text-brand ml-1">
 {hooks.length}
 </span>
 )}
 </span>
 </button>
 <div className="flex items-center gap-1.5 shrink-0">
 <button
 type="button"
 onClick={addHook}
 disabled={isSubmitting}
 className="px-2.5 py-1 bg-brand hover:bg-brand/90 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
 title="Add hook"
 >
 <Plus className="w-3 h-3" /> Add
 </button>
 <button
 type="button"
 onClick={() => setIsHooksOpen(!isHooksOpen)}
 className="p-1 rounded-lg hover:bg-brand/10 focus:outline-none cursor-pointer"
 title={isHooksOpen ? 'Collapse' : 'Expand'}
 >
 <ChevronDown className={`w-4 h-4 text-brand transition-transform duration-300 ${isHooksOpen ? 'rotate-180' : ''}`} />
 </button>
 </div>
 </div>
 {isHooksOpen && (
 <div className="pt-2 animate-fade-in">
 <HookManager
 ref={hookManagerRef}
 projectId={project.projectId}
 initialHooks={project.hooks}
 isNewProject={project.isNewProject}
 fetchWithToken={fetchWithToken}
 disabled={isSubmitting}
 hideAddButton
 onHooksChange={(updated) => setHooks(updated)}
 />
 </div>
 )}
 </div>

 {/* END PRODUCT GALLERY */}
 <div className="bg-white rounded-2xl p-4 border border-subtle warm-shadow-lg space-y-3 animate-fade-in">
 <span className="text-[11px] uppercase font-extrabold tracking-widest text-brand block pb-1 border-b border-subtle flex items-center justify-between">
 <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-brand" /> End product Gallery</span>
 <span className="text-[11px] text-muted font-normal">({productPhotos.length}/6)</span>
 </span>

 {productPhotos.length === 0 ? (
 <div className="text-center p-6 border border-subtle rounded-2xl bg-surface">
 <p className="text-[11px] text-muted font-semibold">Upload photos of your completed item to display in your gallery!</p>
 </div>
 ) : (
 <div className="grid grid-cols-3 gap-2">
 {productPhotos.map((photo, i) => {
 const matchedPhoto = project.photos?.find(p => p.photoBase64 === photo);
 const isCover = matchedPhoto
 ? (coverPhoto === String(matchedPhoto.id) || (coverPhoto === null && matchedPhoto.isCover))
 : (coverPhoto === photo);

 return (
 <div key={i} className="relative aspect-square group rounded-xl overflow-hidden border border-subtle bg-surface">
 <img
 src={photo}
 alt={`Finished product showcase ${i + 1}`}
 onClick={() => setLightboxImage(photo)}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
 />
 {isCover && (
 <div
 className="absolute top-1.5 right-1.5 bg-accent text-white p-1 rounded-full shadow-md z-10 animate-scale-up"
 title="Cover Photo"
 >
 <Star className="w-3 h-3 fill-white" />
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}

 {productPhotos.length < 6 && (
 <div className="grid grid-cols-2 gap-2">
 <input
 type="file"
 id="product-photo-upload"
 accept="image/*"
 multiple
 disabled={isUploadingPhoto || isSubmitting}
 onChange={handleProductPhotoUpload}
 className="hidden"
 />
 <label
 htmlFor="product-photo-upload"
 className={`py-2 bg-surface hover:bg-accent/10 border border-subtle hover:border-accent text-muted hover:text-accent rounded-xl text-xs font-bold block text-center transition-colors ${isUploadingPhoto || isSubmitting ? 'opacity-55 pointer-events-none' : 'cursor-pointer'
 }`}
 >
 {isUploadingPhoto ? (
 <span className="flex items-center justify-center gap-1">
 <YarnSpinner className="h-3.5 w-3.5 text-accent" />
 Loading...
 </span>
 ) : (
 <span className="flex items-center justify-center gap-1.5"><FolderUp className="w-3.5 h-3.5" /> Upload Photo</span>
 )}
 </label>

 <button
 type="button"
 disabled={isUploadingPhoto || isSubmitting}
 onClick={() => startCamera('product')}
 className="py-2 bg-surface hover:bg-brand/10 border border-subtle hover:border-brand text-muted hover:text-brand rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
 >
 <Camera className="w-3.5 h-3.5" />
 Take Snap
 </button>
 </div>
 )}
 </div>

 </div>

 {/* Right column: Dynamic Journal Logs and Snaps photo archives */}
 <div className="lg:col-span-8 space-y-6">

 {/* Tab Switcher Headers */}
 <div className="flex border-b border-subtle gap-1.5 sm:gap-2 pb-1 bg-white p-1.5 sm:p-3 rounded-2xl warm-shadow">
 <button
 onClick={() => setActiveTab('journal')}
 className={`flex-1 md:flex-initial px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${activeTab === 'journal'
 ? 'bg-brand text-white shadow-xs'
 : 'bg-white text-muted hover:bg-page border border-transparent'
 }`}
 >
 <NotebookPen className="w-3.5 h-3.5" />
 Progress Journal
 </button>

 <button
 onClick={() => setActiveTab('pattern')}
 className={`flex-1 md:flex-initial px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${activeTab === 'pattern'
 ? 'bg-brand text-white shadow-xs'
 : 'bg-white text-muted hover:bg-page border border-transparent'
 }`}
 >
 <FileText className="w-3.5 h-3.5" />
 Crochet Pattern
 {project.patterns && project.patterns.length > 0 && (
 <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-extrabold ${activeTab === 'pattern' ? 'bg-white text-brand' : 'bg-brand/10 text-brand'
 }`}>
 {project.patterns.length}
 </span>
 )}
 </button>
 </div>

 {activeTab === 'journal' ? (
 <>
 {/* PROGRESS WRITING LOGGER BOX */}
 <div className="bg-white rounded-2xl p-3 sm:p-5 border border-subtle warm-shadow-lg">
 <h3 className="font-serif font-extrabold text-brand text-sm flex items-center gap-2">
 <NotebookPen className="w-4 h-4 text-brand" /> Log Today's Progress..
 </h3>

 <form onSubmit={handleAddLog} className="space-y-3 mt-3">
 <div className="relative">
 <textarea
 value={textEntry}
 placeholder="Adjusted round 12 to make the pattern smaller, used standard single loop Terminology..."
 onChange={(e) => setTextEntry(e.target.value)}
 required
 rows={3}
 className={`w-full p-3 bg-surface border rounded-xl text-xs focus:outline-none placeholder-muted font-semibold text-heading resize-none ${textEntry.length > 1000
 ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
 : 'border-subtle focus:ring-1 focus:ring-brand focus:border-brand'
 }`}
 />
 <div className="flex justify-between items-center px-1 mt-1 text-[11px] font-semibold">
 {textEntry.length > 1000 ? (
 <span className="text-red-500">Warning: Log entry exceeds character limit of 1000.</span>
 ) : (
 <span className="text-muted">Max 1000 characters</span>
 )}
 <span className={textEntry.length > 1000 ? 'text-red-500 font-bold' : 'text-muted'}>
 {textEntry.length} / 1000
 </span>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
 {/* Photo attachment selector */}
 <div className="flex items-center gap-2.5">
 <input
 type="file"
 id="log-photo-file"
 accept="image/*"
 onChange={handleImageUpload}
 className="hidden"
 />
 <div className="flex gap-2">
 <label
 htmlFor="log-photo-file"
 className="px-3 py-1.5 bg-white border border-subtle hover:border-brand text-muted rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
 >
 <Camera className="w-3.5 h-3.5 text-brand" />
 Upload Image
 </label>
 <button
 type="button"
 onClick={() => startCamera('log')}
 className="px-3 py-1.5 bg-white border border-subtle hover:border-brand text-muted rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
 >
 <Camera className="w-3.5 h-3.5 text-brand" />
 Take Snap
 </button>
 </div>

 {logImage && (
 <div className="relative animate-scale-up">
 <img src={logImage} className="w-10 h-10 rounded-lg object-cover border border-subtle" alt="Attached Snapshot" />
 <button
 type="button"
 onClick={() => { setLogImage(null); setLogImageBase64(null); }}
 className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[11px] flex items-center justify-center font-bold"
 >
 ×
 </button>
 </div>
 )}
 </div>

 <button
 type="submit"
 disabled={submittingLog || !textEntry.trim() || textEntry.length > 1000}
 className="px-4 py-1.5 bg-brand hover:bg-brand/85 text-white font-bold rounded-xl text-xs tracking-wide cursor-pointer disabled:opacity-40 shadow-md transform hover:-translate-y-0.5"
 >
 Add Entry
 </button>
 </div>
 </form>
 </div>

 {/* SNAPSHOT PHOTO JOURNAL HISTORY TIMELINE */}
 <div className="space-y-3">
 <span className="text-[11px] uppercase font-bold tracking-widest text-brand block px-1">Journal entries</span>

 {logs.length === 0 ? (
 <div className="p-6 text-center bg-white rounded-2xl border border-subtle warm-shadow">
 <p className="text-xs text-muted font-semibold">No progress logs filed yet. Document row milestones and attach snaps to build a gorgeous pattern project history.</p>
 </div>
 ) : (
 <>
 <div className="space-y-3 animate-fade-in">
 {logs.map((log) => (
 <div
 key={log.logId}
 className="bg-white rounded-2xl p-4 border border-subtle warm-shadow hover:border-accent/30 transition-all flex flex-col md:flex-row gap-4 items-start justify-between"
 >
 <div className="space-y-1.5 flex-1 w-full">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-[11px] font-bold text-muted bg-page border border-subtle px-2 py-0.5 rounded-md flex items-center gap-1">
 <Calendar className="w-3 h-3 text-accent" />
 {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 {log.rowCountSnapshot !== undefined && (
 <span className="text-[11px] font-extrabold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md">Row {log.rowCountSnapshot} Milestone</span>
 )}
 </div>

 {editingLogId === log.logId ? (
 <div className="space-y-2 pt-1 w-full">
 <textarea
 value={editingLogText}
 onChange={(e) => {
 setEditingLogText(e.target.value);
 logEditAutosave.schedule({ logId: log.logId, text: e.target.value });
 }}
 rows={3}
 className="w-full p-2.5 bg-surface border border-brand rounded-xl text-xs font-semibold text-heading focus:outline-none"
 />
 <div className="flex justify-end gap-2">
 <button
 type="button"
 onClick={() => handleUpdateLog(log.logId, editingLogText)}
 className="px-3 py-1 bg-brand text-white text-[11px] font-extrabold rounded-lg hover:bg-brand/90 cursor-pointer"
 >
 Save Log
 </button>
 <button
 type="button"
 onClick={() => setEditingLogId(null)}
 className="px-3 py-1 bg-white border border-subtle text-muted text-[11px] font-bold rounded-lg hover:bg-page cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </div>
 ) : (
 <p className="text-xs text-heading whitespace-pre-wrap leading-relaxed font-semibold">{log.textEntry}</p>
 )}
 </div>

 <div className="flex items-center gap-2 shrink-0 justify-between w-full md:w-auto self-end md:self-stretch">
 {log.imageBase64 && (
 <div className="relative group">
 <img
 src={log.imageBase64}
 alt="Log snapshot"
 onClick={() => setLightboxImage(log.imageBase64)}
 className="w-20 h-20 rounded-xl object-cover border border-subtle shadow-xs cursor-pointer hover:scale-105 transition-transform"
 />
 </div>
 )}

 <div className="flex items-center gap-1">
 {editingLogId !== log.logId && (
 <button
 onClick={() => {
 setEditingLogId(log.logId);
 setEditingLogText(log.textEntry);
 }}
 className="p-2 text-muted hover:text-brand hover:bg-brand/10 rounded-xl transition-colors cursor-pointer"
 title="Edit log entry"
 >
 <Pencil className="w-4 h-4 cursor-pointer" />
 </button>
 )}
 <button
 onClick={() => handleDeleteLog(log.logId)}
 className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
 title="Delete log"
 >
 <Trash2 className="w-4 h-4 cursor-pointer" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Logs Pagination Controls */}
 {logsTotalPages > 1 && (
 <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-subtle rounded-2xl p-4">
 <span className="text-xs text-muted font-semibold">
 Showing <span className="font-extrabold text-heading">{logsPage * logsPageSize + 1}</span> to{' '}
 <span className="font-extrabold text-heading">
 {Math.min((logsPage + 1) * logsPageSize, logsTotalElements)}
 </span>{' '}
 of <span className="font-extrabold text-heading">{logsTotalElements}</span> entries
 </span>

 <div className="flex items-center gap-1">
 <button
 disabled={logsPage === 0}
 onClick={() => setLogsPage(logsPage - 1)}
 className="p-1.5 px-2.5 border border-subtle rounded-lg text-muted hover:text-heading hover:bg-page disabled:opacity-40 disabled:hover:bg-transparent transition-all text-xs font-bold cursor-pointer"
 >
 Prev
 </button>

 {Array.from({ length: logsTotalPages }, (_, i) => (
 <button
 key={i}
 onClick={() => setLogsPage(i)}
 className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${logsPage === i
 ? 'bg-brand text-white'
 : 'border border-subtle text-muted hover:text-heading hover:bg-page'
 }`}
 >
 {i + 1}
 </button>
 ))}

 <button
 disabled={logsPage === logsTotalPages - 1}
 onClick={() => setLogsPage(logsPage + 1)}
 className="p-1.5 px-2.5 border border-subtle rounded-lg text-muted hover:text-heading hover:bg-page disabled:opacity-40 disabled:hover:bg-transparent transition-all text-xs font-bold cursor-pointer"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 </>
 ) : (
 <PatternViewer
 project={project}
 token={token}
 onUpdateProject={onUpdateProject}
 onUpdateProjectState={onUpdateProjectState}
 />
 )}

 </div>

 </div>

 {/* UNSAVED CHANGES WARNING MODAL */}
 {showUnsavedModal && (
 <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none animate-fade-in">
 <div className="bg-white rounded-[2rem] border border-subtle max-w-sm w-full p-6 space-y-5 shadow-2xl relative animate-scale-up">
 <h4 className="font-serif font-extrabold text-heading text-base leading-snug">Unsaved Changes ⚠️</h4>
 <p className="text-xs text-muted font-semibold leading-relaxed">
 You have unsaved changes in this project. Would you like to save them before leaving?
 </p>
 <div className="flex flex-col gap-2 pt-2">
 <button
 type="button"
 onClick={handleSaveAndLeave}
 className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer text-center font-sans"
 >
 Save and Leave
 </button>
 <button
 type="button"
 onClick={handleDiscardAndLeave}
 className="w-full py-2.5 bg-white hover:bg-rose-50 text-brand border border-brand/20 hover:border-brand rounded-xl text-xs font-bold transition-all cursor-pointer text-center font-sans"
 >
 Discard Changes and Leave
 </button>
 <button
 type="button"
 onClick={() => setShowUnsavedModal(false)}
 className="w-full py-2 bg-surface hover:bg-page text-muted border border-subtle rounded-xl text-xs font-bold transition-all cursor-pointer text-center font-sans"
 >
 Cancel (Keep Editing)
 </button>
 </div>
 </div>
 </div>
 )}

 {/* CAMERA CAPTURE OVERLAY */}
 {isCameraActive && (
 <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
 <div className="bg-white rounded-[2rem] border border-subtle max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col animate-scale-up">
 <div className="p-5 border-b border-subtle flex justify-between items-center bg-surface">
 <h4 className="font-serif font-extrabold text-heading text-base leading-snug flex items-center gap-2">
 <Camera className="w-4 h-4 text-brand" /> Take Snap
 </h4>
 <button
 type="button"
 onClick={stopCamera}
 className="text-xs font-bold text-muted hover:text-heading cursor-pointer"
 >
 Cancel
 </button>
 </div>

 <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
 <video
 ref={videoRef}
 className="w-full h-full object-cover"
 playsInline
 muted
 />
 </div>

 <div className="p-6 bg-surface border-t border-subtle flex justify-center items-center">
 <button
 type="button"
 onClick={captureSnap}
 className="w-16 h-16 rounded-full border-4 border-white bg-brand hover:bg-brand/95 active:scale-95 shadow-md transition-all flex items-center justify-center text-white cursor-pointer"
 title="Shutter Button"
 >
 <Camera className="w-6 h-6" />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* LIGHTBOX OVERLAY WITH GALLERY SLIDER */}
 {lightboxImage && (() => {
        const currentIndex = productPhotos.indexOf(lightboxImage);
        const totalPhotos = productPhotos.length;
        const matchedPhoto = project.photos?.find(p => p.photoBase64 === lightboxImage);
        const isCover = matchedPhoto
          ? (coverPhoto === String(matchedPhoto.id) || (coverPhoto === null && matchedPhoto.isCover))
          : (coverPhoto === lightboxImage);

        const goToNext = () => {
          if (totalPhotos <= 1 || currentIndex === -1) return;
          const nextIdx = (currentIndex + 1) % totalPhotos;
          setLightboxImage(productPhotos[nextIdx]);
        };

        const goToPrev = () => {
          if (totalPhotos <= 1 || currentIndex === -1) return;
          const prevIdx = (currentIndex - 1 + totalPhotos) % totalPhotos;
          setLightboxImage(productPhotos[prevIdx]);
        };

        const handleTouchStart = (e: React.TouchEvent) => {
          setTouchStartX(e.touches[0].clientX);
        };

        const handleTouchEnd = (e: React.TouchEvent) => {
          if (touchStartX === null) return;
          const touchEndX = e.changedTouches[0].clientX;
          const diffX = touchStartX - touchEndX;
          if (Math.abs(diffX) > 40) {
            if (diffX > 0) {
              goToNext();
            } else {
              goToPrev();
            }
          }
          setTouchStartX(null);
        };

        return (
          <div
            className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in select-none"
            onClick={() => setLightboxImage(null)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top Bar: Counter & Controls */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
              <span className="text-white/80 text-xs font-extrabold bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                Photo {currentIndex !== -1 ? currentIndex + 1 : 1} of {totalPhotos}
              </span>

              <div className="flex items-center gap-2">
                {matchedPhoto && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const newCoverState = !isCover;
                        await fetchWithToken(`/api/v1/projects/${project.projectId}/photos`, {
                          method: 'PUT',
                          body: JSON.stringify({ id: matchedPhoto.id, isCover: newCoverState })
                        });
                        await fetchPhotos();
                        showToast(newCoverState ? 'Set as cover photo!' : 'Removed cover photo', 'success');
                      } catch (err) {
                        console.error('Failed to update cover photo:', err);
                        showToast('Failed to update cover photo state.', 'error');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg cursor-pointer ${
                      isCover
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                    }`}
                    title={isCover ? 'Remove as cover photo' : 'Set as cover photo'}
                  >
                    <Star className="w-3.5 h-3.5" fill={isCover ? 'white' : 'transparent'} />
                    {isCover ? 'Remove Cover' : 'Set as Cover'}
                  </button>
                )}

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (currentIndex !== -1) {
                      setLightboxImage(null);
                      await removeProductPhoto(currentIndex);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg"
                  title="Delete this photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Photo
                </button>

                <button
                  onClick={() => setLightboxImage(null)}
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full text-xl flex items-center justify-center font-bold transition-colors cursor-pointer"
                  title="Close image"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Slider Navigation Arrows */}
            {totalPhotos > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer z-20 active:scale-95"
                  title="Previous Photo (Left Arrow)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer z-20 active:scale-95"
                  title="Next Photo (Right Arrow)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Main Image Display */}
            <img
              key={lightboxImage}
              src={lightboxImage}
              alt="Enlarged gallery preview"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl animate-scale-up shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      })()}
 </div>
 );
}
