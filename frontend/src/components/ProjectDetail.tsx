/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronUp, ChevronDown, Trash2, Camera, NotebookPen, Save, FolderOpen, Calendar, Heart, Copy, Archive, Star, FolderUp, ClipboardList, PackageOpen, Play, Pause, CircleCheckBig, Clock, CirclePause, Route, ReceiptText, FileText, Plus, Minus } from 'lucide-react';
import { Project, JournalLog, Category, ProjectStatus, Yarn, Hook } from '../types';
import { useDialog } from './DialogProvider';
import { YarnManager } from './YarnManager';
import { HookManager } from './HookManager';
import { PatternViewer } from './PatternViewer';

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
  return /^[ \p{L}\p{N}\-_()#.]+$/u.test(str) && /[\p{L}\p{N}]/u.test(str);
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
  const [textEntry, setTextEntry] = useState('');
  const [logImage, setLogImage] = useState<string | null>(null);
  const [logImageMime, setLogImageMime] = useState('');
  const [logImageBase64, setLogImageBase64] = useState<string | null>(null);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const { showAlert, showConfirm } = useDialog();

  // Edit fields
  const [title, setTitle] = useState(project.title);
  const [yarns, setYarns] = useState<Yarn[]>(project.yarns || []);
  const [hooks, setHooks] = useState<Hook[]>(project.hooks || []);
  const [status, setStatus] = useState(project.status);
  const [notes, setNotes] = useState(project.notes || '');
  const [targetCategoryId, setTargetCategoryId] = useState(project.categoryId);
  const [startDate, setStartDate] = useState(project.startDate || '');
  const [endDate, setEndDate] = useState(project.endDate || '');
  const [productPhotos, setProductPhotos] = useState<string[]>(project.productPhotos || []);
  const [thumbnailIndex, setThumbnailIndex] = useState(project.thumbnailIndex || 0);
  const [careInstructions, setCareInstructions] = useState(project.careInstructions || '');
  const [totalTime, setTotalTime] = useState(project.totalTime || '');
  const [isSaved, setIsSaved] = useState(true);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Unsaved modal, lightbox & camera states
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'product' | 'log' | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [activeTab, setActiveTab] = useState<'journal' | 'pattern'>('journal');

  const isDateRangeInvalid = !!(startDate && endDate && startDate > endDate);

  useEffect(() => {
    setTitle(project.title);
    setYarns(project.yarns || []);
    setHooks(project.hooks || []);
    setStatus(project.status);
    setNotes(project.notes || '');
    setTargetCategoryId(project.categoryId);
    setStartDate(project.startDate || '');
    setEndDate(project.endDate || '');
    setProductPhotos(project.productPhotos || []);
    setCareInstructions(project.careInstructions || '');
    setTotalTime(project.totalTime || '');
    setThumbnailIndex(project.thumbnailIndex || 0);
    setIsSaved(true);
  }, [
    project.projectId,
    project.title,
    project.startDate,
    project.endDate,
    project.careInstructions,
    project.totalTime,
    project.thumbnailIndex,
    project.productPhotos?.join(',')
  ]);

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
        let errMsg = `Network API HTTP error ${response.status}: ${response.statusText || 'Response Error'}`;
        try {
          const errData = await response.json();
          if (errData && errData.message) {
            errMsg = errData.message;
          }
        } catch (_) { }
        console.group('%c[Network API Error Interceptor]', 'color: #ef4444; font-weight: bold;');
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
      console.error(`%c[Pipeline Fetch Failure] unable to resolve: ${url}`, 'color: #f97316; font-weight: bold;', err);
      throw err;
    }
  };

  const loadLogs = async () => {
    try {
      const data = await fetchWithToken(`/api/v1/projects/${project.projectId}/logs`);
      if (data) {
        const sorted = (data as JournalLog[]).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        setLogs(sorted);
      }
    } catch (err) {
      console.error('Failed to load journal progression logs:', err);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadLogs();
  }, [project.projectId, token]);

  const handleFieldChange = () => {
    setIsSaved(false);
  };

  const handleSaveFields = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const capitalized = capitalizeWords(trimmed);
    if (!isValidName(capitalized)) {
      await showAlert('Project name can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, and brackets.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateProject({
        title: capitalized,
        yarns,
        hooks,
        status,
        notes,
        categoryId: targetCategoryId,
        startDate,
        endDate,
        careInstructions,
        totalTime,
        productPhotos,
        thumbnailIndex
      });
      setTitle(capitalized);
      setIsSaved(true);
    } catch (err) {
      // Caught by global toast system
    } finally {
      setIsSubmitting(false);
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
        setProductPhotos(prev => {
          const updated = [...prev, ...validResults];
          setIsSaved(false);
          return updated;
        });
        if (status !== ProjectStatus.Completed) {
          const confirmed = await showConfirm('Do you want to move this project to the "Completed" stage?');
          if (confirmed) {
            setStatus(ProjectStatus.Completed);
            setIsSaved(false);
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

  const removeProductPhoto = (index: number) => {
    setProductPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      setIsSaved(false);
      if (thumbnailIndex === index) {
        setThumbnailIndex(0);
      } else if (thumbnailIndex > index) {
        setThumbnailIndex(thumbnailIndex - 1);
      }
      return updated;
    });
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
        setLogImageBase64(null);
      }
    } catch (err) {
      console.error('Failed to append progress log:', err);
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    const confirmed = await showConfirm('Are you sure you want to discard this journal entry?');
    if (!confirmed) return;
    try {
      await fetchWithToken(`/api/v1/logs/${logId}`, { method: 'DELETE' });
      setLogs(prev => prev.filter(l => l.logId !== logId));
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

  const captureSnap = () => {
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
          showAlert("You have already uploaded the maximum limit of 6 photos.");
        } else {
          setProductPhotos(prev => {
            const updated = [...prev, capturedBase64];
            setIsSaved(false);
            return updated;
          });
          if (status !== ProjectStatus.Completed) {
            showConfirm('Do you want to move this project to the "Completed" stage?').then(confirmed => {
              if (confirmed) {
                setStatus(ProjectStatus.Completed);
                setIsSaved(false);
              }
            });
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
    <div id="project-journal-board" className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

      {/* Top action header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E8E2D9] pb-6 bg-white p-5 rounded-3xl warm-shadow">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackCheck}
            className="p-2.5 rounded-xl bg-white border border-[#E8E2D9] hover:bg-[#F9F6F2] text-[#7C7167] transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 cursor-pointer" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#F28482] bg-[#F28482]/10 border border-[#F28482]/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                {activeCategory?.name || 'My Projects'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <h2 className="text-xl md:text-2xl font-extrabold font-serif text-[#2D231B] leading-tight">{project.title}</h2>
              <button
                onClick={() => onToggleFavorite(project.projectId)}
                className={`p-1 px-1.5 bg-white border rounded-lg shrink-0 cursor-pointer transition-colors ${project.isFavorite
                  ? 'text-[#F28482] border-rose-100 hover:bg-rose-50/50'
                  : 'text-[#A89F94] hover:text-rose-500 border-[#E8E2D9] hover:bg-rose-50/50'
                  }`}
                title={project.isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
              >
                <Heart
                  className="w-4 h-4 transition-colors"
                  fill={project.isFavorite ? '#F28482' : 'none'}
                  color={project.isFavorite ? '#F28482' : 'currentColor'}
                />
              </button>

              <button
                onClick={handleDuplicate}
                className="p-1 px-1.5 bg-white hover:bg-stone-50 text-[#A89F94] hover:text-[#84A59D] border border-[#E8E2D9] hover:border-[#84A59D]/30 rounded-lg shrink-0 cursor-pointer transition-colors"
                title="Duplicate Project"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={handleArchive}
                className={`p-1 px-1.5 bg-white border rounded-lg shrink-0 cursor-pointer transition-colors ${project.isArchive
                  ? 'text-[#84A59D] border-emerald-100 hover:bg-emerald-50/50'
                  : 'text-[#A89F94] hover:text-amber-600 border-[#E8E2D9] hover:bg-amber-50/50'
                  }`}
                title={project.isArchive ? 'Unarchive Project' : 'Archive Project'}
              >
                <Archive
                  className="w-4 h-4 transition-colors"
                  fill={project.isArchive ? '#84A59D' : 'none'}
                  color={project.isArchive ? '#84A59D' : 'currentColor'}
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
                className="p-1 px-1.5 bg-white hover:bg-red-50 text-[#A89F94] hover:text-red-500 border border-[#E8E2D9] hover:border-red-100 rounded-lg shrink-0 cursor-pointer transition-colors"
                title="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Change status controls */}
        <div className="flex items-center gap-3.5 w-full md:w-auto relative">
          <div className="relative">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="px-3.5 py-2.5 bg-white border border-[#E8E2D9] rounded-xl text-xs font-bold text-[#2D231B] focus:outline-none focus:ring-1 focus:ring-[#F28482] focus:border-[#F28482] disabled:opacity-60 flex items-center gap-2 cursor-pointer min-w-[140px] justify-between transition-all"
            >
              <span className="flex items-center gap-1.5">
                {status === ProjectStatus.Planning && <ClipboardList className="w-3.5 h-3.5 text-[#D9A05B]" />}
                {status === ProjectStatus.InProgress && <Route className="w-3.5 h-3.5 text-[#F28482]" />}
                {status === ProjectStatus.Completed && <CircleCheckBig className="w-3.5 h-3.5 text-[#84A59D]" />}
                {status === ProjectStatus.OnHold && <CirclePause className="w-3.5 h-3.5 text-[#A89F94]" />}
                {status}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#A89F94] transition-transform duration-200" style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {isStatusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsStatusDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-full min-w-[140px] bg-white border border-[#E8E2D9] rounded-xl shadow-lg z-40 overflow-hidden animate-fade-in py-1">
                  <button
                    type="button"
                    onClick={() => { setStatus(ProjectStatus.Planning); handleFieldChange(); setIsStatusDropdownOpen(false); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#2D231B] hover:bg-[#FDFCFB] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-[#D9A05B]" />
                    <span>Planning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatus(ProjectStatus.InProgress); handleFieldChange(); setIsStatusDropdownOpen(false); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#2D231B] hover:bg-[#FDFCFB] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Route className="w-3.5 h-3.5 text-[#F28482]" />
                    <span>In Progress</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatus(ProjectStatus.Completed); handleFieldChange(); setIsStatusDropdownOpen(false); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#2D231B] hover:bg-[#FDFCFB] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CircleCheckBig className="w-3.5 h-3.5 text-[#84A59D]" />
                    <span>Completed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatus(ProjectStatus.OnHold); handleFieldChange(); setIsStatusDropdownOpen(false); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#2D231B] hover:bg-[#FDFCFB] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CirclePause className="w-3.5 h-3.5 text-[#A89F94]" />
                    <span>On Hold</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleSaveFields}
            disabled={isSaved || isSubmitting || isDateRangeInvalid}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all ${isSaved
              ? 'bg-[#F9F6F2] text-[#A89F94] border border-[#E8E2D9] cursor-not-allowed'
              : 'bg-[#84A59D] hover:bg-[#84A59D]/85 text-white shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60'
              }`}
          >
            {isSubmitting ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Saving...' : (isSaved ? 'All Saved' : 'Save Project')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left column: Sheet Specs & Tap increment counter */}
        <div className="lg:col-span-4 space-y-6">

          {/* TAP COUNTERS COMPONENT */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] warm-shadow-lg text-center space-y-4">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#F28482] block font-mono">Row Tracker</span>

            <div className="flex items-center justify-center gap-5 py-2">
              {/* Symmetrical Decrease Row Button */}
              <button
                onClick={() => incrementRow(-1)}
                disabled={project.rowCount === 0 || isSubmitting}
                className="w-12 h-12 rounded-full bg-[#F28482] hover:bg-[#F28482]/90 active:scale-95 text-white transition-all flex items-center justify-center shadow-md cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                title="Decrease row count"
              >
                <Minus className="w-5 h-5" />
              </button>

              {/* Central Display Circle */}
              <div
                className="w-36 h-36 rounded-full bg-radial from-white to-[#F28482]/15 border-8 border-white warm-shadow-lg flex flex-col items-center justify-center text-[#2D231B]"
              >
                <span className="text-4xl font-extrabold font-serif leading-none">{project.rowCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#7C7167] mt-1.5 opacity-80">Row</span>
              </div>

              {/* Symmetrical Increase Row Button */}
              <button
                onClick={() => incrementRow(1)}
                disabled={isSubmitting}
                className="w-12 h-12 rounded-full bg-[#F28482] hover:bg-[#F28482]/90 active:scale-95 text-white transition-all flex items-center justify-center shadow-md cursor-pointer disabled:opacity-70 disabled:pointer-events-none"
                title="Increase row count"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => incrementRow(5)}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-[#FDFCFB] border border-[#E8E2D9] text-[10px] font-bold text-[#F28482] rounded-xl hover:bg-[#F28482]/5 disabled:opacity-60"
              >
                +5 Rows
              </button>
              <button
                onClick={() => incrementRow(10)}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-[#FDFCFB] border border-[#E8E2D9] text-[10px] font-bold text-[#F28482] rounded-xl hover:bg-[#F28482]/5 disabled:opacity-60"
              >
                +10 Rows
              </button>
              <button
                onClick={async () => {
                  const confirmed = await showConfirm('Reset row counter to zero?');
                  if (confirmed) onUpdateProject({ rowCount: 0 });
                }}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-white border border-[#E8E2D9] text-[10px] font-bold text-[#A89F94] rounded-xl hover:bg-red-55 hover:text-red-600 hover:border-red-100 disabled:opacity-60"
              >
                Reset Zero
              </button>
            </div>
          </div>

          {/* PROJECT INFO FORM SPECIFICATIONS */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] warm-shadow space-y-4 animate-fade-in">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#A89F94] pb-1 border-b border-[#FDFCFB] flex items-center gap-1.5"><ReceiptText className="w-3.5 h-3.5" /> Details</span>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Project Name</label>
                <input
                  type="text"
                  value={title}
                  disabled={isSubmitting}
                  onChange={(e) => { setTitle(e.target.value); handleFieldChange(); }}
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-2.5 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Journal Category / List</label>
                <select
                  value={targetCategoryId}
                  disabled={isSubmitting}
                  onChange={(e) => { setTargetCategoryId(e.target.value); handleFieldChange(); }}
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-2.5 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold disabled:opacity-60"
                >
                  {categories.filter(cat => {
                    const norm = cat.name.trim().toLowerCase();
                    return norm !== 'favourites ❤️' && norm !== 'favourites';
                  }).map((cat) => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-[#FDFCFB]">
                <YarnManager
                  yarns={yarns}
                  onChange={(newYarns) => { setYarns(newYarns); handleFieldChange(); }}
                  disabled={isSubmitting}
                />
              </div>

              <div className="pt-4 border-t border-[#FDFCFB]">
                <HookManager
                  hooks={hooks}
                  onChange={(newHooks) => { setHooks(newHooks); handleFieldChange(); }}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block"> Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  disabled={isSubmitting}
                  placeholder="e.g. Increase 6 stitches on the ears in round 5..."
                  onChange={(e) => { setNotes(e.target.value); handleFieldChange(); }}
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-2.5 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold resize-none disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Care Instructions</label>
                <textarea
                  rows={2}
                  value={careInstructions}
                  disabled={isSubmitting}
                  placeholder="e.g. Hand wash cold, lay flat to dry..."
                  onChange={(e) => { setCareInstructions(e.target.value); handleFieldChange(); }}
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-2.5 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold resize-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* PROJECT TIMELINE */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] warm-shadow-lg space-y-4 animate-fade-in">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#A89F94] block pb-1 border-b border-[#FDFCFB] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#F28482]" /> Project Duration
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Date Started</label>
                <input
                  type="date"
                  value={startDate}
                  disabled={isSubmitting}
                  onChange={(e) => { setStartDate(e.target.value); handleFieldChange(); }}
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-2.5 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Date Ended</label>
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
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-2.5 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold disabled:opacity-60"
                />
              </div>
            </div>
            {isDateRangeInvalid && (
              <p className="text-[10px] text-red-500 font-semibold mt-1 animate-fade-in">Start date cannot be after end date.</p>
            )}
            <div className="space-y-1 mt-4">
              <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Total Time Taken</label>
              <input
                type="text"
                value={totalTime}
                disabled={isSubmitting}
                placeholder="e.g. 5 days, 12 hours"
                onChange={(e) => { setTotalTime(e.target.value); handleFieldChange(); }}
                className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-2.5 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold disabled:opacity-60"
              />
            </div>
          </div>

          {/* END PRODUCT GALLERY */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] warm-shadow-lg space-y-4 animate-fade-in">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#A89F94] block pb-1 border-b border-[#FDFCFB] flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-[#84A59D]" /> End product Gallery</span>
              <span className="text-[9px] text-[#A89F94] font-mono font-normal">({productPhotos.length}/6)</span>
            </span>

            {productPhotos.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-[#E8E2D9] rounded-2xl bg-[#FDFCFB]">
                <p className="text-[11px] text-[#A89F94] font-semibold">Upload photos of your completed item to display in your gallery!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {productPhotos.map((photo, i) => (
                  <div key={i} className="relative aspect-square group rounded-xl overflow-hidden border border-[#E8E2D9] bg-[#FDFCFB]">
                    <img
                      src={photo}
                      alt={`Finished product showcase ${i + 1}`}
                      onClick={() => setLightboxImage(photo)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                    />

                    {productPhotos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailIndex(i);
                          setIsSaved(false);
                        }}
                        className={`absolute bottom-1 left-1 p-1 rounded-lg text-[9px] font-extrabold transition-all flex items-center gap-0.5 shadow-xs cursor-pointer ${thumbnailIndex === i
                          ? 'bg-[#84A59D] text-white'
                          : 'bg-white/95 text-[#7C7167] hover:bg-white'
                          }`}
                        title="Use as cover"
                      >
                        <Star className="w-3 h-3" fill={thumbnailIndex === i ? 'white' : 'transparent'} />
                        Use as cover
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeProductPhoto(i)}
                      disabled={isUploadingPhoto || isSubmitting}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold transition-all opacity-0 group-hover:opacity-100 cursor-pointer disabled:opacity-40"
                      title="Remove Photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
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
                  className={`py-2 bg-[#FDFCFB] hover:bg-[#84A59D]/10 border border-[#E8E2D9] hover:border-[#84A59D] text-[#7C7167] hover:text-[#84A59D] rounded-xl text-xs font-bold block text-center transition-colors ${isUploadingPhoto || isSubmitting ? 'opacity-55 pointer-events-none' : 'cursor-pointer'
                    }`}
                >
                  {isUploadingPhoto ? (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="animate-spin h-3.5 w-3.5 text-[#84A59D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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
                  className="py-2 bg-[#FDFCFB] hover:bg-[#F28482]/10 border border-[#E8E2D9] hover:border-[#F28482] text-[#7C7167] hover:text-[#F28482] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
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
          <div className="flex border-b border-[#E8E2D9] gap-2 pb-1 bg-white p-3 rounded-2xl warm-shadow">
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                activeTab === 'journal'
                  ? 'bg-[#F28482] text-white shadow-xs'
                  : 'bg-white text-[#7C7167] hover:bg-[#F9F6F2] border border-transparent'
              }`}
            >
              <NotebookPen className="w-3.5 h-3.5" />
              Progress Journal
            </button>
            
            <button
              onClick={() => setActiveTab('pattern')}
              className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                activeTab === 'pattern'
                  ? 'bg-[#F28482] text-white shadow-xs'
                  : 'bg-white text-[#7C7167] hover:bg-[#F9F6F2] border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Crochet Pattern
              {project.patterns && project.patterns.length > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'pattern' ? 'bg-white text-[#F28482]' : 'bg-[#F28482]/10 text-[#F28482]'
                }`}>
                  {project.patterns.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'journal' ? (
            <>
              {/* PROGRESS WRITING LOGGER BOX */}
              <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] warm-shadow-lg">
                <h3 className="font-serif font-extrabold text-[#2D231B] text-sm flex items-center gap-2">
                  <NotebookPen className="w-4 h-4 text-[#F28482]" /> Log Today's Progress..
                </h3>

                <form onSubmit={handleAddLog} className="space-y-4 mt-4">
                  <div className="relative">
                    <textarea
                      value={textEntry}
                      placeholder="Adjusted round 12 to make the pattern smaller, used standard single loop Terminology..."
                      onChange={(e) => setTextEntry(e.target.value)}
                      required
                      rows={3}
                      className={`w-full p-4 bg-[#FDFCFB] border rounded-2xl text-xs focus:outline-none placeholder-[#A89F94] font-semibold text-[#2D231B] resize-none ${textEntry.length > 1000
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-[#E8E2D9] focus:ring-1 focus:ring-[#F28482] focus:border-[#F28482]'
                        }`}
                    />
                    <div className="flex justify-between items-center px-1 mt-1 text-[10px] font-semibold">
                      {textEntry.length > 1000 ? (
                        <span className="text-red-500">Warning: Log entry exceeds character limit of 1000.</span>
                      ) : (
                        <span className="text-[#7C7167]">Max 1000 characters</span>
                      )}
                      <span className={textEntry.length > 1000 ? 'text-red-500 font-bold' : 'text-[#7C7167]'}>
                        {textEntry.length} / 1000
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                          className="px-3.5 py-2 bg-white border border-[#E8E2D9] hover:border-[#F28482] text-[#7C7167] rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#F28482]" />
                          Upload Image
                        </label>
                        <button
                          type="button"
                          onClick={() => startCamera('log')}
                          className="px-3.5 py-2 bg-white border border-[#E8E2D9] hover:border-[#F28482] text-[#7C7167] rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#F28482]" />
                          Take Snap
                        </button>
                      </div>

                      {logImage && (
                        <div className="relative animate-scale-up">
                          <img src={logImage} className="w-10 h-10 rounded-lg object-cover border border-[#E8E2D9]" alt="Attached Snapshot" />
                          <button
                            type="button"
                            onClick={() => { setLogImage(null); setLogImageBase64(null); }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingLog || !textEntry.trim() || textEntry.length > 1000}
                      className="px-5 py-2 bg-[#F28482] hover:bg-[#F28482]/85 text-white font-bold rounded-xl text-xs tracking-wide cursor-pointer disabled:opacity-40 shadow-md transform hover:-translate-y-0.5"
                    >
                      Add Entry
                    </button>
                  </div>
                </form>
              </div>

              {/* SNAPSHOT PHOTO JOURNAL HISTORY TIMELINE */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#A89F94] block px-1">Journal entries</span>

                {logs.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E2D9] warm-shadow">
                    <p className="text-xs text-[#A89F94] font-semibold">No progress logs filed yet. Document row milestones and attach snaps to build a gorgeous pattern project history.</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {logs.map((log) => (
                      <div
                        key={log.logId}
                        className="bg-white rounded-3xl p-5 border border-[#E8E2D9] warm-shadow hover:border-[#84A59D]/30 transition-all flex flex-col md:flex-row gap-5 items-start justify-between"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-[9px] font-mono font-bold text-[#A89F94] bg-[#F9F6F2] border border-[#E8E2D9] px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#84A59D]" />
                              {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {log.rowCountSnapshot !== undefined && (
                              <span className="text-[9px] font-extrabold text-[#F28482] bg-[#F28482]/10 border border-[#F28482]/20 px-2 py-0.5 rounded-md">Row {log.rowCountSnapshot} Milestone</span>
                            )}
                          </div>
                          <p className="text-xs text-[#2D231B] whitespace-pre-wrap leading-relaxed font-semibold">{log.textEntry}</p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 justify-between w-full md:w-auto self-end md:self-stretch">
                          {log.imageBase64 && (
                            <div className="relative group">
                              <img
                                src={log.imageBase64}
                                alt="Log snapshot snapshot"
                                onClick={() => setLightboxImage(log.imageBase64)}
                                className="w-20 h-20 rounded-xl object-cover border border-[#E8E2D9] shadow-xs cursor-pointer hover:scale-105 transition-transform"
                              />
                            </div>
                          )}

                          <button
                            onClick={() => handleDeleteLog(log.logId)}
                            className="p-2 text-[#A89F94] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete log"
                          >
                            <Trash2 className="w-4 h-4 cursor-pointer" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
          <div className="bg-white rounded-[2rem] border border-[#E8E2D9] max-w-sm w-full p-6 space-y-5 shadow-2xl relative animate-scale-up">
            <h4 className="font-serif font-extrabold text-[#2D231B] text-base leading-snug">Unsaved Changes ⚠️</h4>
            <p className="text-xs text-[#7C7167] font-semibold leading-relaxed">
              You have unsaved changes in this project. Would you like to save them before leaving?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveAndLeave}
                className="w-full py-2.5 bg-[#84A59D] hover:bg-[#84A59D]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer text-center font-sans"
              >
                Save and Leave
              </button>
              <button
                type="button"
                onClick={handleDiscardAndLeave}
                className="w-full py-2.5 bg-white hover:bg-rose-50 text-[#F28482] border border-[#F28482]/20 hover:border-[#F28482] rounded-xl text-xs font-bold transition-all cursor-pointer text-center font-sans"
              >
                Discard Changes and Leave
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="w-full py-2 bg-[#FDFCFB] hover:bg-[#F9F6F2] text-[#7C7167] border border-[#E8E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer text-center font-sans"
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
          <div className="bg-white rounded-[2rem] border border-[#E8E2D9] max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col animate-scale-up">
            <div className="p-5 border-b border-[#E8E2D9] flex justify-between items-center bg-[#FDFCFB]">
              <h4 className="font-serif font-extrabold text-[#2D231B] text-base leading-snug flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#F28482]" /> Take Snap
              </h4>
              <button
                type="button"
                onClick={stopCamera}
                className="text-xs font-bold text-[#7C7167] hover:text-[#2D231B] cursor-pointer"
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

            <div className="p-6 bg-[#FDFCFB] border-t border-[#E8E2D9] flex justify-center items-center">
              <button
                type="button"
                onClick={captureSnap}
                className="w-16 h-16 rounded-full border-4 border-white bg-[#F28482] hover:bg-[#F28482]/95 active:scale-95 shadow-md transition-all flex items-center justify-center text-white cursor-pointer"
                title="Shutter Button"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX OVERLAY */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full text-xl flex items-center justify-center font-bold transition-colors cursor-pointer"
            title="Close image"
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Enlarged preview"
            className="max-w-full max-h-full object-contain rounded-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
