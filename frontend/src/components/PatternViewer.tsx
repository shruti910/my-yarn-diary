import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Image as ImageIcon, Plus, Minus, Maximize2, Minimize2,
  ZoomIn, ZoomOut, RotateCw, Trash2, Upload, FileUp, ClipboardList,
  ChevronLeft, ChevronRight, Edit2, Sliders
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CustomDropdown } from './CustomDropdown';
import { YarnSpinner } from './YarnSpinner';
import { Pattern, Project } from '../types';
import { useDialog } from './DialogProvider';
import { useAutosave } from '../hooks/useAutosave';
import { useClickOutside } from '../hooks/useClickOutside';

// Extend Window interface for PDF.js loading
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

interface PatternViewerProps {
  project: Project;
  token: string;
  onUpdateProject: (updates: Partial<Project>) => Promise<any>;
  onUpdateProjectState: (updatedProject: Project) => void;
}

export function PatternViewer({ project, token, onUpdateProject, onUpdateProjectState }: PatternViewerProps) {
  const { showAlert, showConfirm, showToast } = useDialog();

  const [patterns, setPatterns] = useState<Pattern[]>(project.patterns || []);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  // Upload States
  const [uploadType, setUploadType] = useState<'pdf' | 'image' | 'text' | null>(null);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [imagePatternTitle, setImagePatternTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Title Editing State
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Viewer Controls
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [textSize, setTextSize] = useState(14); // in px

  // Text pattern editing: debounced autosave + click-outside collapse (no blur-save)
  const textDraftKey = `pattern_text_draft_${project.projectId}`;
  const textEditCardRef = useRef<HTMLDivElement>(null);
  const textAutosave = useAutosave<{ title: string; content: string }>(
    ({ title, content }) => putTextPattern(title, content)
  );
  useClickOutside(
    textEditCardRef,
    () => {
      textAutosave.flush();
      setIsEditingText(false);
    },
    isEditingText
  );

  // Persist the in-progress "Write Pattern" draft so it survives a tab close.
  useEffect(() => {
    if (uploadType !== 'text' || isEditingText) return;
    if (textTitle || textContent) {
      localStorage.setItem(textDraftKey, JSON.stringify({ textTitle, textContent }));
    } else {
      localStorage.removeItem(textDraftKey);
    }
  }, [textTitle, textContent, uploadType, isEditingText, textDraftKey]);

  // Open the text create form, restoring any saved draft.
  const openTextCreate = () => {
    try {
      const saved = localStorage.getItem(textDraftKey);
      if (saved) {
        const d = JSON.parse(saved);
        setTextTitle(d.textTitle || '');
        setTextContent(d.textContent || '');
      }
    } catch (e) {
      console.error('Failed to restore pattern draft:', e);
    }
    setUploadType('text');
  };

  // Mobile Vertical Drag-to-Resize for Row Counter Drawer (Mobile Only, 130px to 360px)
  const [mobileHeight, setMobileHeight] = useState<number>(320);
  const isDraggingCounter = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(320);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingCounter.current = true;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    startHeightRef.current = mobileHeight;

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDraggingCounter.current) return;
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = startYRef.current - clientY;
    const newHeight = Math.min(360, Math.max(130, startHeightRef.current + deltaY));
    setMobileHeight(newHeight);
  };

  const handleDragEnd = () => {
    isDraggingCounter.current = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

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

  // PDF Viewer States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Synchronize patterns from project patterns endpoint
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const data = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`);
        if (data) {
          setPatterns(data);
          if (data.length > 0 && !selectedPatternId) {
            setSelectedPatternId(data[0].patternId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch patterns:', err);
      }
    };
    if (project.patterns !== undefined) {
      setPatterns(project.patterns);
      if (project.patterns.length > 0 && !selectedPatternId) {
        setSelectedPatternId(project.patterns[0].patternId);
      }
    } else {
      fetchPatterns();
    }
  }, [project.projectId, project.patterns]);

  // Load PDF.js CDN
  useEffect(() => {
    const activePattern = patterns.find(p => p.patternId === selectedPatternId);
    if (!activePattern || activePattern.patternType !== 'pdf' || window.pdfjsLib) {
      if (window.pdfjsLib) setPdfjsLoaded(true);
      return;
    }

    setPdfLoading(true);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      const pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfjsLoaded(true);
      setPdfLoading(false);
    };
    script.onerror = () => {
      setPdfLoading(false);
      showAlert('Failed to load the PDF viewer engine from the CDN. Please check your internet connection.');
    };
    document.head.appendChild(script);
  }, [selectedPatternId, patterns]);

  // Render PDF Document
  useEffect(() => {
    const activePattern = patterns.find(p => p.patternId === selectedPatternId);
    if (!pdfjsLoaded || !activePattern || activePattern.patternType !== 'pdf') {
      setPdfDoc(null);
      setNumPages(0);
      return;
    }

    const loadPdfDoc = async () => {
      setPdfLoading(true);
      try {
        const base64Data = activePattern.patternContent.split(',')[1] || activePattern.patternContent;
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
      } catch (err) {
        console.error('Error parsing PDF content:', err);
        showAlert('Could not read the PDF pattern file. Please ensure it is a valid PDF document.');
      } finally {
        setPdfLoading(false);
      }
    };

    loadPdfDoc();
  }, [pdfjsLoaded, selectedPatternId, patterns]);

  // Render PDF Canvas Page
  useEffect(() => {
    if (!pdfDoc) return;

    let renderTask: any = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const dpr = window.devicePixelRatio || 1;

        // Base resolution scaling
        const baseViewport = page.getViewport({ scale: 1.0 });

        // Find best-fit scale based on container width
        const containerWidth = containerRef.current?.clientWidth || 600;
        const fitScale = (containerWidth - 24) / baseViewport.width;
        const finalScale = fitScale * zoom;

        // Scale viewport by devicePixelRatio for high-DPI / Retina screens
        const viewport = page.getViewport({ scale: finalScale * dpr, rotation: rotate });

        // Set physical backing dimensions of canvas
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Set logical CSS dimensions of canvas
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('PDF rendering failed:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, zoom, rotate, isFullScreen]);

  // Handle PDF Canvas re-render when window resizes
  useEffect(() => {
    if (!pdfDoc) return;
    const handleResize = () => {
      // Force trigger re-render
      setZoom(prev => prev + 0.0001);
      setTimeout(() => setZoom(prev => prev - 0.0001), 50);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc]);

  // Set numPages for multi-image patterns
  useEffect(() => {
    const activePattern = patterns.find(p => p.patternId === selectedPatternId);
    if (!activePattern || activePattern.patternType !== 'image') return;

    let images: string[] = [];
    try {
      const parsed = JSON.parse(activePattern.patternContent);
      images = Array.isArray(parsed) ? parsed : [activePattern.patternContent];
    } catch {
      images = [activePattern.patternContent];
    }
    setNumPages(images.length);
    setPageNum(1);
  }, [selectedPatternId, patterns]);

  const activePattern = patterns.find(p => p.patternId === selectedPatternId);

  // File Upload Helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    // Check if image upload
    const isImageUpload = uploadType === 'image' || files.some(f => f.type.startsWith('image/'));

    if (isImageUpload) {
      if (files.length > 5) {
        showToast('You can upload a maximum of 5 images per pattern.', 'error');
        return;
      }
      const maxImgBytes = 2 * 1024 * 1024;
      const oversized = files.find(f => f.size > maxImgBytes);
      if (oversized) {
        showToast(`Image "${oversized.name}" exceeds the maximum allowed limit of 2MB.`, 'error');
        return;
      }

      setIsUploading(true);
      try {
        const imagePromises = files.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64Str = reader.result as string;
              const img = new Image();
              img.src = base64Str;
              img.onload = () => {
                const maxWidth = 1400;
                const maxHeight = 1400;
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxHeight) {
                  if (width > height) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                  } else {
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
                  resolve(canvas.toDataURL('image/jpeg', 0.9));
                } else {
                  resolve(base64Str);
                }
              };
              img.onerror = () => resolve(base64Str);
            };
            reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsDataURL(file);
          });
        });

        const imageContents = await Promise.all(imagePromises);
        const finalTitle = imagePatternTitle.trim() || 'Untitled Pattern';

        const res = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`, {
          method: 'POST',
          body: JSON.stringify({
            patternType: 'image',
            patternContent: JSON.stringify(imageContents),
            fileName: finalTitle
          })
        });

        if (res) {
          const nextPatterns = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`);
          if (nextPatterns) {
            setPatterns(nextPatterns);
            const newPat = nextPatterns.find(p => !patterns.some(prev => prev.patternId === p.patternId));
            if (newPat) {
              setSelectedPatternId(newPat.patternId);
            } else if (nextPatterns.length > 0) {
              setSelectedPatternId(nextPatterns[nextPatterns.length - 1].patternId);
            }
          }
          setUploadType(null);
          setImagePatternTitle('');
          showToast('Pattern uploaded successfully!', 'success');
        }
      } catch (err) {
        console.error('Failed to upload pattern images:', err);
        showToast('Failed to upload pattern images.', 'error');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // PDF / Text Single File upload
    const file = files[0];
    const fileType = file.type;
    const isPdf = fileType === 'application/pdf' || file.name.endsWith('.pdf');

    if (isPdf) {
      const maxPdfBytes = 5 * 1024 * 1024;
      if (file.size > maxPdfBytes) {
        showToast('Pattern PDF file size exceeds the maximum allowed limit of 5MB.', 'error');
        return;
      }
    } else {
      const maxBytes = 2 * 1024 * 1024;
      if (file.size > maxBytes) {
        showToast('File size exceeds the maximum allowed limit of 2MB.', 'error');
        return;
      }
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      try {
        const res = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`, {
          method: 'POST',
          body: JSON.stringify({
            patternType: isPdf ? 'pdf' : 'text',
            patternContent: content,
            fileName: file.name
          })
        });
        if (res) {
          const nextPatterns = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`);
          if (nextPatterns) {
            setPatterns(nextPatterns);
            const newPat = nextPatterns.find(p => !patterns.some(prev => prev.patternId === p.patternId));
            if (newPat) {
              setSelectedPatternId(newPat.patternId);
            } else if (nextPatterns.length > 0) {
              setSelectedPatternId(nextPatterns[nextPatterns.length - 1].patternId);
            }
          }
          setUploadType(null);
          showToast('Pattern uploaded successfully!', 'success');
        }
      } catch (err) {
        console.error('Failed to upload pattern file:', err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartRename = (patternId: string) => {
    const target = patterns.find(p => p.patternId === patternId);
    if (!target) return;
    setEditingPatternId(patternId);
    setEditingTitle(target.fileName || 'Untitled Pattern');
  };

  const handleSaveRename = async () => {
    if (!editingPatternId) return;
    const target = patterns.find(p => p.patternId === editingPatternId);
    if (!target) return;
    const trimmedTitle = editingTitle.trim() || 'Untitled Pattern';

    try {
      const res = await fetchWithToken(`/api/v1/patterns/${editingPatternId}`, {
        method: 'PUT',
        body: JSON.stringify({
          patternType: target.patternType,
          patternContent: target.patternContent,
          fileName: trimmedTitle
        })
      });
      if (res) {
        const nextPatterns = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`);
        if (nextPatterns) {
          setPatterns(nextPatterns);
        }
        setEditingPatternId(null);
        showToast('Pattern title updated!', 'success');
      }
    } catch (err) {
      console.error('Failed to rename pattern:', err);
      showToast('Failed to update pattern title.', 'error');
    }
  };

  // Paste Text Pattern Save
  const handleSaveTextPattern = async () => {
    if (!textContent.trim()) return;
    setIsUploading(true);

    try {
      const res = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`, {
        method: 'POST',
        body: JSON.stringify({
          patternType: 'text',
          patternContent: textContent.trim(),
          fileName: textTitle.trim() || 'Untitled Pattern Notes'
        })
      });
      if (res) {
        localStorage.removeItem(textDraftKey);
        const nextPatterns = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`);
        if (nextPatterns) {
          setPatterns(nextPatterns);
          const newPat = nextPatterns.find(p => !patterns.some(prev => prev.patternId === p.patternId));
          if (newPat) {
            setSelectedPatternId(newPat.patternId);
          } else if (nextPatterns.length > 0) {
            setSelectedPatternId(nextPatterns[nextPatterns.length - 1].patternId);
          }
        }
        setTextTitle('');
        setTextContent('');
        setUploadType(null);
        showToast('Saving...', 'success');
      }
    } catch (err) {
      console.error('Failed to save pattern text:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Low-level PUT used by the debounced autosave while editing a text pattern.
  // Does not collapse the editor or clear the form.
  const putTextPattern = async (title: string, content: string) => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent || !selectedPatternId) return;
    try {
      const res = await fetchWithToken(`/api/v1/patterns/${selectedPatternId}`, {
        method: 'PUT',
        body: JSON.stringify({
          patternType: 'text',
          patternContent: trimmedContent,
          fileName: trimmedTitle
        })
      });
      if (res) {
        const nextPatterns = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`);
        if (nextPatterns) setPatterns(nextPatterns);
      }
    } catch (err) {
      console.error('Failed to autosave pattern text:', err);
      throw err;
    }
  };

  const handleUpdateTextPattern = async () => {
    const trimmedTitle = textTitle.trim();
    const trimmedContent = textContent.trim();
    if (!trimmedTitle || !trimmedContent) return;

    try {
      const res = await fetchWithToken(`/api/v1/patterns/${selectedPatternId}`, {
        method: 'PUT',
        body: JSON.stringify({
          patternType: 'text',
          patternContent: trimmedContent,
          fileName: trimmedTitle
        })
      });
      if (res) {
        const nextPatterns = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`);
        if (nextPatterns) {
          setPatterns(nextPatterns);
        }
        setIsEditingText(false);
        setTextTitle('');
        setTextContent('');
        showToast('Saving...', 'success');
      }
    } catch (err) {
      console.error('Failed to update pattern text:', err);
    }
  };

  // Delete Pattern
  const handleDeletePattern = async (patternId: string) => {
    const target = patterns.find(p => p.patternId === patternId);
    if (!target) return;
    const confirmed = await showConfirm(`Are you sure you want to delete the pattern "${target.fileName || 'Untitled'}"?`);
    if (!confirmed) return;

    try {
      const res = await fetchWithToken(`/api/v1/patterns/${patternId}`, {
        method: 'DELETE'
      });
      if (res) {
        const nextPatterns = await fetchWithToken(`/api/v1/projects/${project.projectId}/patterns`);
        if (nextPatterns) {
          setPatterns(nextPatterns);
          if (selectedPatternId === patternId) {
            setSelectedPatternId(nextPatterns.length > 0 ? nextPatterns[0].patternId : '');
          }
        }
        showToast('Pattern deleted successfully!', 'success');
      }
    } catch (err) {
      console.error('Failed to delete pattern:', err);
    }
  };

  // Row Counter Actions
  const updateRowCount = async (amount: number) => {
    try {
      const nextRows = Math.max(0, project.rowCount + amount);
      await onUpdateProject({ rowCount: nextRows });
    } catch (err) {
      console.error('Failed to increment row counter from pattern view:', err);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-subtle warm-shadow-lg overflow-hidden flex flex-col min-h-[420px] md:min-h-[580px]">

      {/* Pattern Selector / Upload Header */}
      <div className="p-4 bg-surface border-b border-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

        {/* Switcher & Titles */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {patterns.length > 0 ? (
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {editingPatternId === selectedPatternId ? (
                <div className="flex items-center gap-1.5 bg-white border border-brand p-1 rounded-xl shadow-xs">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); }}
                    className="text-xs font-bold px-2 py-1 outline-none text-heading min-w-[160px]"
                    placeholder="Pattern title..."
                    autoFocus
                  />
                  <button
                    onClick={handleSaveRename}
                    className="px-2.5 py-1 bg-brand text-white text-[11px] font-bold rounded-lg hover:bg-brand/90 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPatternId(null)}
                    className="px-2 py-1 bg-stone-100 text-muted text-[11px] font-bold rounded-lg hover:bg-stone-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                    <CustomDropdown
                      value={selectedPatternId}
                      onChange={(val) => {
                        setSelectedPatternId(val);
                        setZoom(1);
                        setRotate(0);
                        setIsEditingText(false);
                      }}
                      options={patterns.map(p => ({
                        value: p.patternId,
                        label: p.fileName || 'Untitled Pattern'
                      }))}
                    />
                  </div>

                  <button
                    onClick={() => handleStartRename(selectedPatternId)}
                    className="p-2 text-muted hover:text-brand hover:bg-brand/10 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Rename pattern title"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeletePattern(selectedPatternId)}
                    className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Delete current pattern"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs font-bold text-muted">No patterns uploaded for this project yet.</span>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="flex flex-wrap gap-2 shrink-0 self-end md:self-auto">
          {uploadType === null ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUploadType('pdf')}
                className="px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                Upload PDF
              </button>
              <button
                onClick={() => setUploadType('image')}
                className="px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                Upload Image
              </button>
              <button
                onClick={openTextCreate}
                className="px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Write Pattern
              </button>
            </div>
          ) : (
            <button
              onClick={() => setUploadType(null)}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-muted rounded-xl text-[11px] font-bold cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Main Panel Content (Uploading vs. Viewing) */}
      <div className="flex-1 flex flex-col bg-surface min-h-[320px] md:min-h-[460px] relative" ref={containerRef}>

        {/* 1. UPLOADING FORM VIEW */}
        {uploadType !== null && (
          <div className="flex-1 flex flex-col justify-center items-center p-6 max-w-lg mx-auto w-full text-center space-y-6 animate-fade-in">
            {uploadType === 'pdf' && (
              <>
                <div className="w-16 h-16 rounded-full bg-brand/10 border-2 border-brand flex items-center justify-center text-brand">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-serif font-extrabold text-heading text-base">Upload PDF Crochet Pattern</h4>
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">
                    Drop your pattern PDF here to view it side-by-side with your stitch counter as you crochet!
                  </p>
                </div>
                <input
                  type="file"
                  id="pdf-pattern-uploader"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="pdf-pattern-uploader"
                  className={`px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''
                    }`}
                >
                  {isUploading ? <YarnSpinner className="w-4 h-4" onBrand /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Processing File...' : 'Choose PDF File'}
                </label>
              </>
            )}

            {uploadType === 'image' && (
              <div className="w-full max-w-md space-y-4 text-left animate-scale-up p-4 bg-white border border-subtle rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-extrabold text-heading text-sm">Upload Pattern Image(s)</h4>
                    <p className="text-[11px] text-muted leading-tight">
                      Upload up to 5 images (max 2MB each) for this pattern.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Pattern Title </label>
                  <input
                    type="text"
                    placeholder="e.g. Squirrel Pattern Instructions"
                    value={imagePatternTitle}
                    onChange={(e) => setImagePatternTitle(e.target.value)}
                    className="w-full bg-surface border border-subtle text-xs p-2.5 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold"
                  />
                </div>

                <input
                  type="file"
                  id="image-pattern-uploader"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />

                <label
                  htmlFor="image-pattern-uploader"
                  className={`w-full py-3 bg-accent hover:bg-accent/90 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''
                    }`}
                >
                  {isUploading ? <YarnSpinner className="w-4 h-4" onBrand /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Processing & Saving Images...' : 'Upload Images'}
                </label>
              </div>
            )}

            {uploadType === 'text' && (
              <div className="w-full space-y-4 text-left animate-scale-up">
                <div>
                  <h4 className="font-serif font-extrabold text-heading text-base">Write/Paste Crochet Pattern</h4>
                  <p className="text-[11px] text-muted mt-1">Supports plain text or Markdown styling for gorgeous header tags and list counters.</p>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={textTitle}
                    placeholder="e.g. Sleeves instructions notes"
                    onChange={(e) => setTextTitle(e.target.value)}
                    className="w-full bg-white border border-subtle text-xs p-2.5 rounded-xl text-heading outline-none focus:ring-1 focus:ring-accent font-semibold"
                  />
                  <textarea
                    rows={8}
                    value={textContent}
                    placeholder="Row 1: Ch 12, sc in 2nd ch from hook...&#10;Row 2: Ch 1, turn, sc in ea st across...&#10;[Support Markdown for easy rendering]"
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full bg-white border border-subtle text-xs p-3 rounded-xl text-heading outline-none focus:ring-1 focus:ring-accent resize-none font-medium"
                  />
                </div>

                <button
                  onClick={handleSaveTextPattern}
                  disabled={isUploading || !textContent.trim()}
                  className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isUploading ? <YarnSpinner className="w-3.5 h-3.5" onBrand /> : <Plus className="w-3.5 h-3.5" />}
                  Save Pattern
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. NO PATTERNS UPLOADED EMPTY SCREEN */}
        {uploadType === null && patterns.length === 0 && (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center space-y-4 max-w-sm mx-auto">
            <div className="w-14 h-14 bg-page border border-subtle text-muted rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif font-extrabold text-heading text-sm">Add your project pattern</h4>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Keep the pattern diagram, instruction booklet, or text notes directly in front of you while crocheting in real-time.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => setUploadType('pdf')}
                className="w-full py-2 bg-white hover:bg-stone-50 text-muted border border-subtle text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Upload Pattern PDF
              </button>
              <button
                onClick={() => setUploadType('image')}
                className="w-full py-2 bg-white hover:bg-stone-50 text-muted border border-subtle text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Upload Pattern Image
              </button>
              <button
                onClick={() => setUploadType('text')}
                className="w-full py-2 bg-accent hover:bg-accent/95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Paste Pattern Instructions
              </button>
            </div>
          </div>
        )}

        {/* 3. ACTIVE PATTERN VIEW PANEL */}
        {uploadType === null && activePattern && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">

            {/* Viewer Toolbar */}
            <div className="px-3 md:px-4 py-2 bg-surface border-b border-subtle flex justify-between items-center gap-2 md:gap-4 text-xs font-semibold text-muted min-w-0 max-w-full overflow-x-auto scrollbar-none touch-pan-x shrink-0">

              {/* Type specific toolbar options */}
              <div className="flex items-center gap-3">
                {(activePattern.patternType === 'pdf' || (activePattern.patternType === 'image' && numPages > 1)) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPageNum(prev => Math.max(1, prev - 1))}
                      disabled={pageNum <= 1 || pdfLoading}
                      className="p-1 rounded bg-white border border-subtle hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-bold">
                      Page {pageNum} of {numPages || '?'}
                    </span>
                    <button
                      onClick={() => setPageNum(prev => Math.min(numPages, prev + 1))}
                      disabled={pageNum >= numPages || pdfLoading}
                      className="p-1 rounded bg-white border border-subtle hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activePattern.patternType === 'text' && !isEditingText && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTextSize(prev => Math.max(10, prev - 2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                      title="Smaller Font"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] px-1">{textSize}px</span>
                    <button
                      onClick={() => setTextSize(prev => Math.min(28, prev + 2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                      title="Larger Font"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setTextTitle(activePattern.fileName || '');
                        setTextContent(activePattern.patternContent || '');
                        setIsEditingText(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer ml-2 flex items-center gap-1 text-[11px] font-bold text-muted hover:text-accent hover:border-accent/30"
                      title="Edit Text Pattern"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-accent" />
                      Edit
                    </button>
                  </div>
                )}

                {activePattern.patternType === 'image' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] px-1">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRotate(prev => (prev + 90) % 360)}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white ml-1.5 cursor-pointer"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activePattern.patternType === 'pdf' && (
                  <div className="flex items-center gap-1 pl-2 border-l border-subtle">
                    <button
                      onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] px-1">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Enter distraction free view */}
              <button
                onClick={() => setIsFullScreen(true)}
                className="px-3 py-1.5 rounded-xl border border-subtle bg-white hover:bg-accent/10 hover:border-accent text-muted hover:text-accent flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Focus Mode
              </button>
            </div>

            {/* Pattern Display Window */}
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-stone-50/50">

              {/* PDF Content */}
              {activePattern.patternType === 'pdf' && (
                <div className="relative border border-subtle rounded-2xl bg-white shadow-xs overflow-hidden max-w-full">
                  {pdfLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                      <div className="flex flex-col items-center gap-2">
                        <YarnSpinner className="w-6 h-6 text-accent" />
                        <span className="text-[11px] font-bold text-muted">Rendering PDF page...</span>
                      </div>
                    </div>
                  )}
                  <canvas ref={canvasRef} />
                </div>
              )}

              {/* Image Content */}
              {activePattern.patternType === 'image' && (
                <div className="overflow-auto border border-subtle rounded-2xl bg-white p-2 shadow-xs max-w-full">
                  <div
                    style={{
                      transform: `scale(${zoom}) rotate(${rotate}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.2s ease-out'
                    }}
                    className="flex justify-center items-center"
                  >
                    {(() => {
                      let images: string[] = [];
                      try {
                        const parsed = JSON.parse(activePattern.patternContent);
                        images = Array.isArray(parsed) ? parsed : [activePattern.patternContent];
                      } catch {
                        images = [activePattern.patternContent];
                      }
                      const currentImg = images[Math.min(images.length - 1, Math.max(0, pageNum - 1))];
                      return (
                        <img
                          src={currentImg}
                          alt={`${activePattern.fileName || 'Pattern'} page ${pageNum}`}
                          className="max-h-[500px] object-contain rounded-lg"
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Text Content */}
              {activePattern.patternType === 'text' && (
                isEditingText ? (
                  <div
                    ref={textEditCardRef}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        textAutosave.flush();
                        setIsEditingText(false);
                      }
                    }}
                    className="w-full max-w-2xl bg-white border border-subtle rounded-3xl p-6 md:p-8 shadow-xs flex flex-col gap-4 text-left"
                  >
                    <h4 className="font-serif font-extrabold text-heading text-sm">Edit Text Pattern</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Pattern Name</label>
                        <input
                          type="text"
                          value={textTitle}
                          onChange={(e) => {
                            setTextTitle(e.target.value);
                            textAutosave.schedule({ title: e.target.value, content: textContent });
                          }}
                          placeholder="Pattern title..."
                          className="w-full bg-stone-50/50 border border-subtle text-xs p-2.5 rounded-xl text-heading outline-none focus:ring-1 focus:ring-accent font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Pattern Content</label>
                        <textarea
                          rows={12}
                          value={textContent}
                          onChange={(e) => {
                            setTextContent(e.target.value);
                            textAutosave.schedule({ title: textTitle, content: e.target.value });
                          }}
                          placeholder="Pattern instructions (Supports Markdown)..."
                          className="w-full bg-stone-50/50 border border-subtle text-xs p-3 rounded-xl text-heading outline-none focus:ring-1 focus:ring-accent resize-none font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingText(false)}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200/60 text-muted rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateTextPattern}
                        disabled={!textContent.trim() || !textTitle.trim()}
                        className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-full max-w-2xl bg-white border border-subtle rounded-3xl p-6 md:p-8 shadow-xs markdown-body overflow-auto leading-relaxed select-text"
                    style={{ fontSize: `${textSize}px`, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  >
                    <h3 className="font-serif font-extrabold text-heading text-xl border-b border-subtle pb-3 mb-4 leading-snug">
                      {activePattern.fileName}
                    </h3>
                    <ReactMarkdown>{activePattern.patternContent}</ReactMarkdown>
                  </div>
                )
              )}

            </div>

          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* DISTRACTION-FREE FULL SCREEN MODAL */}
      {/* ============================================================== */}
      {isFullScreen && activePattern && (
        <div className="fixed inset-0 z-[100000] bg-surface flex flex-col md:flex-row select-none animate-fade-in">

          {/* Main Pattern View Panel (Left / Full Area) */}
          <div className="flex-1 flex flex-col min-h-0 md:h-full overflow-hidden border-b md:border-b-0 md:border-r border-subtle">

            {/* Fullscreen Toolbar */}
            <div className="p-2 md:p-4 bg-surface border-b border-subtle flex justify-between items-center shrink-0 gap-2 min-w-0 max-w-full overflow-x-auto scrollbar-none touch-pan-x">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <span className="text-[11px] font-bold text-brand bg-brand/10 border border-brand/20 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md shrink-0">
                  Focus Mode
                </span>
                <span className="text-[11px] md:text-xs font-extrabold text-heading min-w-0 truncate">
                  {activePattern.fileName}
                </span>
              </div>

              {/* Custom full screen zoom toolbar */}
              <div className="flex items-center gap-2 shrink-0">
                {(activePattern.patternType === 'pdf' || (activePattern.patternType === 'image' && numPages > 1)) && (
                  <div className="flex items-center gap-1.5 mr-2">
                    <button
                      onClick={() => setPageNum(prev => Math.max(1, prev - 1))}
                      disabled={pageNum <= 1}
                      className="p-1 rounded-lg bg-white border border-subtle hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-bold px-1 whitespace-nowrap">{pageNum} / {numPages}</span>
                    <button
                      onClick={() => setPageNum(prev => Math.min(numPages, prev + 1))}
                      disabled={pageNum >= numPages}
                      className="p-1 rounded-lg bg-white border border-subtle hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activePattern.patternType === 'text' && (
                  <div className="flex items-center gap-1 mr-2">
                    <button
                      onClick={() => setTextSize(prev => Math.max(12, prev - 2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTextSize(prev => Math.min(28, prev + 2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activePattern.patternType === 'image' && (
                  <div className="flex items-center gap-1 mr-2">
                    <button
                      onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRotate(prev => (prev + 90) % 360)}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activePattern.patternType === 'pdf' && (
                  <div className="flex items-center gap-1 border-l border-subtle pl-2 mr-2">
                    <button
                      onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                      className="p-1.5 rounded-lg hover:bg-stone-50 border border-subtle bg-white cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setIsFullScreen(false)}
                  className="p-2 bg-stone-100 hover:bg-red-50 text-muted hover:text-red-500 rounded-xl cursor-pointer transition-colors"
                  title="Close distraction-free counter"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pattern content wrapper inside full screen */}
            <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start justify-center bg-stone-50/50">
              {activePattern.patternType === 'pdf' && (
                <div className="border border-subtle rounded-2xl bg-white shadow-lg max-w-full">
                  <canvas ref={canvasRef} />
                </div>
              )}

              {activePattern.patternType === 'image' && (
                <div className="overflow-auto border border-subtle rounded-2xl bg-white p-3 shadow-lg max-w-full">
                  <div
                    style={{
                      transform: `scale(${zoom}) rotate(${rotate}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.2s ease-out'
                    }}
                  >
                    {(() => {
                      let images: string[] = [];
                      try {
                        const parsed = JSON.parse(activePattern.patternContent);
                        images = Array.isArray(parsed) ? parsed : [activePattern.patternContent];
                      } catch {
                        images = [activePattern.patternContent];
                      }
                      const currentImg = images[Math.min(images.length - 1, Math.max(0, pageNum - 1))];
                      return (
                        <img
                          src={currentImg}
                          alt={`${activePattern.fileName || 'Pattern'} page ${pageNum}`}
                          className="max-h-[85vh] object-contain rounded-lg"
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {activePattern.patternType === 'text' && (
                <div
                  className="w-full max-w-3xl bg-white border border-subtle rounded-[2rem] p-8 md:p-12 shadow-lg markdown-body overflow-auto leading-relaxed select-text"
                  style={{ fontSize: `${textSize}px`, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  <h3 className="font-serif font-extrabold text-heading text-2xl border-b border-subtle pb-3 mb-6 leading-snug">
                    {activePattern.fileName}
                  </h3>
                  <ReactMarkdown>{activePattern.patternContent}</ReactMarkdown>
                </div>
              )}
            </div>

          </div>

          {/* Row Counter Side Drawer (Right panel in desktop / bottom resizable panel in mobile) */}
          {(() => {
            const isCompact = mobileHeight < 230;

            return (
              <div
                className="w-full md:w-80 bg-white flex flex-col items-center shrink-0 select-none transition-all duration-75 relative md:h-full border-t md:border-t-0 md:border-l border-subtle overflow-hidden"
                style={{
                  height: typeof window !== 'undefined' && window.innerWidth < 768 ? `${mobileHeight}px` : 'auto'
                }}
              >
                {/* Mobile Top Drag Handle for Resizing Height (Mobile Only - md:hidden) */}
                <div
                  onTouchStart={handleDragStart}
                  onMouseDown={handleDragStart}
                  className="w-full py-2.5 flex flex-col items-center justify-center cursor-ns-resize hover:bg-stone-50 active:bg-stone-100 transition-colors select-none group touch-none rounded-t-2xl border-b border-subtle md:hidden shrink-0"
                  title="Drag handle to resize counter height"
                >
                  <div className="w-12 h-1.5 bg-stone-300 group-hover:bg-brand group-active:bg-brand rounded-full transition-colors" />
                </div>

                <div className="w-full flex-1 flex flex-col justify-between items-center p-3 md:p-6 overflow-hidden">
                  <span className="text-[10px] md:text-[11px] uppercase font-extrabold tracking-widest text-brand block shrink-0">
                    Row counter
                  </span>

                  <div className="flex items-center justify-center gap-3 md:gap-5 my-auto">
                    {/* Symmetrical Decrease Row Button */}
                    <button
                      onClick={() => updateRowCount(-1)}
                      disabled={project.rowCount === 0}
                      className={`sewing-button rounded-full text-white transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0 ${
                        isCompact ? 'w-9 h-9' : 'w-10 h-10 md:w-12 md:h-12'
                      }`}
                      title="Decrease row count"
                    >
                      <Minus className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'} />
                    </button>

                    {/* Massive Tap to Count Button */}
                    <button
                      onClick={() => updateRowCount(1)}
                      className={`sewing-button flex flex-col items-center justify-center rounded-full text-white transition-all shadow-lg cursor-pointer shrink-0 ${
                        isCompact ? 'w-20 h-20' : 'w-28 h-28 md:w-36 md:h-36'
                      }`}
                      title="Tap to increase row count"
                    >
                      <span className={`font-black tabular-nums tracking-tighter drop-shadow-sm leading-none ${
                        isCompact ? 'text-2xl mt-0.5' : 'text-3xl md:text-4xl mt-2'
                      }`}>
                        {project.rowCount}
                      </span>
                      <span className={`font-bold uppercase tracking-widest opacity-90 ${
                        isCompact ? 'text-[8px] mt-0.5' : 'text-[11px] mt-2'
                      }`}>
                        Tap to Count
                      </span>
                    </button>

                    {/* Symmetrical Increase Row Button */}
                    <button
                      onClick={() => updateRowCount(1)}
                      className={`sewing-button four-hole-button rounded-full text-white transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0 ${
                        isCompact ? 'w-9 h-9' : 'w-10 h-10 md:w-12 md:h-12'
                      }`}
                      title="Increase row count"
                    >
                      <Plus className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-5 md:h-5'} />
                    </button>
                  </div>

                  {/* Quick offset buttons */}
                  <div className="flex gap-2 w-full justify-center shrink-0">
                    <button
                      onClick={() => updateRowCount(5)}
                      className="flex-1 py-1.5 md:py-2 bg-surface border border-subtle text-[10px] md:text-[11px] font-extrabold text-brand rounded-xl hover:bg-brand/5 transition-colors cursor-pointer"
                    >
                      +5 Rows
                    </button>
                    <button
                      onClick={() => updateRowCount(10)}
                      className="flex-1 py-1.5 md:py-2 bg-surface border border-subtle text-[10px] md:text-[11px] font-extrabold text-brand rounded-xl hover:bg-brand/5 transition-colors cursor-pointer"
                    >
                      +10 Rows
                    </button>
                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm('Reset row counter back to zero?');
                        if (confirmed) onUpdateProject({ rowCount: 0 });
                      }}
                      className="px-2.5 py-1.5 md:py-2 bg-white border border-subtle text-[10px] md:text-[11px] font-extrabold text-muted rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  {!isCompact && (
                    <div className="hidden md:block text-center pt-3 border-t border-subtle w-full space-y-1 shrink-0">
                      <p className="text-[11px] font-bold text-heading leading-relaxed">
                        Tap the circle each time you finish a row.
                      </p>
                      <p className="text-[11px] text-muted leading-relaxed">
                        Your pattern stays in view while you count, and your progress saves automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
