/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatPanel } from './components/ChatPanel';
import { AiTools } from './components/AiTools';
import { FloatingAiBuddy } from './components/FloatingAiBuddy';
import { ProjectDetail } from './components/ProjectDetail';
import { Celebration } from './components/Celebration';
import { AuthScreen } from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CrochetLoader } from './components/CrochetLoader';
import { Category, Project, JournalLog, ProjectStatus, ChatCategory } from './types';
import { BookOpen, Sparkles, X, Menu, CircleUserRound, Settings, Mail, Trash2, User, Image as ImageIcon, Check } from 'lucide-react';
import { TerminologyToggle } from './components/TerminologyToggle';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from './components/DialogProvider';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSave: (displayName: string, profilePicture: string) => Promise<void>;
}

function ProfileModal({ isOpen, onClose, currentUser, onSave }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setProfilePicture(currentUser.profilePicture || '');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert('Profile picture size exceeds the maximum allowed limit of 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave(displayName.trim(), profilePicture.trim());
      onClose();
    } catch (err) {
      // Handled in caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[2rem] border border-[#E8E2D9] max-w-md w-full p-6 space-y-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#7C7167] hover:text-[#F28482] hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-[#E8E2D9] pb-4">
          <div className="p-2.5 rounded-xl bg-[#F28482]/10 text-[#F28482]">
            <CircleUserRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-extrabold text-[#2D231B] text-lg">Edit Profile</h3>
            <p className="text-xs text-[#7C7167] font-medium">Update your display name and upload profile picture</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Preview & File Input Container */}
          <div className="flex items-center gap-4 bg-[#F9F6F2] p-4 rounded-2xl border border-[#E8E2D9]/60">
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Avatar Preview"
                  className="w-16 h-16 rounded-xl object-cover border border-[#E8E2D9] shadow-sm bg-white group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-[#F28482] to-[#F5CAC3] border border-[#E8E2D9] shadow-sm group-hover:opacity-75 transition-opacity">
                  {displayName ? displayName.slice(0, 2).toUpperCase() : 'C'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-bold uppercase">Upload</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <span className="text-[10px] font-bold text-[#7C7167] uppercase tracking-wider block">Profile Image</span>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="px-3 py-1.5 bg-white border border-[#E8E2D9] text-[#7C7167] hover:text-[#F28482] rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Choose Image File
                </button>
                {profilePicture && (
                  <button
                    type="button"
                    onClick={() => setProfilePicture('')}
                    className="px-2.5 py-1.5 bg-transparent text-red-500 hover:text-red-600 text-xs font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="displayNameInput" className="text-[11px] font-bold text-[#7C7167] uppercase tracking-wider block">Display Name</label>
            <input
              id="displayNameInput"
              type="text"
              required
              disabled={isSubmitting}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white border border-[#E8E2D9] rounded-xl text-xs p-3 focus:outline-none focus:border-[#F28482] text-[#2D231B] font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 bg-[#FDFCFB] hover:bg-[#F9F6F2] text-[#7C7167] border border-[#E8E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer hover:border-[#84A59D] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
              className="px-5 py-2.5 bg-[#F28482] hover:bg-[#F28482]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer shadow-[#F28482]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onDeactivate: () => Promise<void>;
}

function SettingsModal({ isOpen, onClose, currentUser, onDeactivate }: SettingsModalProps) {
  if (!isOpen) return null;

  const mailtoUrl = `mailto:myyarndiary@gmail.com?subject=Delete%20Account%20Request&body=Please%20delete%20my%20account%20associated%20with%20email%20${encodeURIComponent(currentUser?.email || '')}.`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[2rem] border border-[#E8E2D9] max-w-md w-full p-6 space-y-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#7C7167] hover:text-[#F28482] hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-[#E8E2D9] pb-4">
          <div className="p-2.5 rounded-xl bg-[#84A59D]/10 text-[#84A59D]">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-extrabold text-[#2D231B] text-lg">Account Settings</h3>
            <p className="text-xs text-[#7C7167] font-medium">Manage your account preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Deactivate Option Card */}
          <div className="p-4 bg-amber-50/40 border border-amber-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-[240px]">
              <h4 className="text-xs font-bold text-amber-800">Deactivate Account</h4>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Temporarily disable your profile. You can reactivate anytime by logging back in.
              </p>
            </div>
            <button
              onClick={onDeactivate}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shadow-amber-600/10 shrink-0 self-start sm:self-center"
            >
              Deactivate
            </button>
          </div>

          {/* Delete Option Card */}
          <div className="p-4 bg-red-50/40 border border-red-200/60 rounded-2xl flex flex-col gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-red-800">Delete Account</h4>
              <p className="text-[11px] text-stone-600 leading-relaxed font-semibold">
                Permanently delete all stored projects, patterns, and journals. This action is irreversible.
              </p>
            </div>

            <a
              href={mailtoUrl}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shadow-red-600/10 flex items-center justify-center gap-1.5 text-center"
            >
              <Mail className="w-3.5 h-3.5" />
              Contact Support to Delete Account
            </a>
            <p className="text-[10px] text-center text-stone-500 font-semibold italic">
              Opens your default mail app to email support at myyarndiary@gmail.com
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { showToast, showAlert, showConfirm } = useDialog();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('crochet_token'));
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'aitools'>('dashboard');
  const [aiToolsInitialTab, setAiToolsInitialTab] = useState<ChatCategory>('crochet-buddy');
  const [isFloatingBuddyDismissed, setIsFloatingBuddyDismissed] = useState<boolean>(() => {
    return localStorage.getItem('crochet_floating_buddy_dismissed') === 'true';
  });
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('crochet_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const nextVal = !prev;
      localStorage.setItem('crochet_sidebar_collapsed', String(nextVal));
      return nextVal;
    });
  };

  const handleSelectFloatingTool = (category: ChatCategory) => {
    setAiToolsInitialTab(category);
    setActiveTab('aitools');
    setSelectedProject(null);
    setIsSidebarCollapsed(true);
    localStorage.setItem('crochet_sidebar_collapsed', 'true');
  };

  const handleDismissFloatingBuddy = () => {
    setIsFloatingBuddyDismissed(true);
    localStorage.setItem('crochet_floating_buddy_dismissed', 'true');
  };

  // Storage catalog
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [journalLogs, setJournalLogs] = useState<JournalLog[]>([]);

  // Server-side projects pagination states
  const [projectsPage, setProjectsPage] = useState(0);
  const [projectsPageSize, setProjectsPageSize] = useState(10);
  const [projectsTotalPages, setProjectsTotalPages] = useState(0);
  const [projectsTotalElements, setProjectsTotalElements] = useState(0);
  const [projectsSort, setProjectsSort] = useState('createdAt,desc');
  const [projectsSearch, setProjectsSearch] = useState('');
  const [projectsStatus, setProjectsStatus] = useState('all');

  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCelebrationTitle, setShowCelebrationTitle] = useState<string | null>(null);

  const rowCountTimeoutRef = useRef<any>(null);

  // Proactive background wakeup ping on mount to boot Cloud Run containers instantly
  // useEffect(() => {
  //   fetch('/api/v1/categories').catch(() => { });
  // }, []);

  const syncUserWithBackend = async (idToken: string, fallbackProfile: any) => {
    try {
      const response = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
          'X-User-Name': fallbackProfile?.displayName || '',
          'X-User-Email': fallbackProfile?.email || '',
          'X-User-Profile-Picture': fallbackProfile?.profilePicture || ''
        }
      });
      if (response.ok) {
        const dbUser = await response.json();
        return dbUser;
      } else {
        console.error('Failed to sync user with backend:', response.statusText);
      }
    } catch (err) {
      console.error('Network error during user sync:', err);
    }
    return fallbackProfile;
  };

  // Authenticate user on startup if token is available
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        const profileObj = {
          userId: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Crafter',
          email: firebaseUser.email || '',
          profilePicture: firebaseUser.photoURL || '',
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
        };

        setToken(idToken);
        localStorage.setItem('crochet_token', idToken);

        // Sync user in database
        const dbUser = await syncUserWithBackend(idToken, profileObj);
        setUser(dbUser);
        localStorage.setItem('crochet_user', JSON.stringify(dbUser));
        setIsInitialLoading(false);
      } else {
        setToken(null);
        setUser(null);
        localStorage.removeItem('crochet_token');
        localStorage.removeItem('crochet_user');
        setIsInitialLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchWithToken = async (url: string, options: RequestInit = {}) => {
    if (!token) throw new Error('No authentication token available');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-User-Terminology': user?.crochetTerminology || 'US',
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

  const updateCrochetTerminology = async (pref: 'US' | 'UK') => {
    if (!token || !user) return;
    try {
      const response = await fetch(`/api/v1/users/${user.userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          crochetTerminology: pref
        })
      });
      if (response.ok) {
        const dbUser = await response.json();
        setUser(dbUser);
        localStorage.setItem('crochet_user', JSON.stringify(dbUser));
        showToast(`Terminology set to ${pref} Standard`, 'success');
      }
    } catch (err) {
      console.error('Failed to update terminology preference:', err);
      showToast('Failed to save terminology preference', 'error');
    }
  };

  const loadAllData = async () => {
    if (!token || !user) return;

    try {
      // 1. Fetch Categories
      const categoriesData = await fetchWithToken('/api/v1/categories');
      if (categoriesData) {
        let list = categoriesData.map((c: any) => ({
          ...c,
          categoryId: c.categoryId || c.folderId,
        } as Category));

        if (list.length === 0) {
          // Create initial default category via API!
          const defaultCat = await fetchWithToken('/api/v1/categories', {
            method: 'POST',
            body: JSON.stringify({ name: 'Default' })
          });
          if (defaultCat) {
            list = [{
              ...defaultCat,
              categoryId: defaultCat.categoryId || defaultCat.folderId
            } as Category];
          }
        }

        list = list.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
        setCategories(list);
        if (!activeCategoryId) {
          setActiveCategoryId('all');
        }
      }

      // 2. Fetch Projects (paginated)
      await fetchProjects(activeCategoryId || 'all', 0, projectsPageSize, projectsSort, projectsSearch, projectsStatus);
    } catch (err: any) {
      console.error('Failed loading initial data sequence:', err);
      showToast(err.message || 'Failed loading data from server.', 'error');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const fetchProjects = async (catId = activeCategoryId, page = projectsPage, size = projectsPageSize, sort = projectsSort, search = projectsSearch, status = projectsStatus) => {
    if (!token || !user) return;
    try {
      const actualCat = catId === 'all' ? '' : catId;
      const actualStatus = status === 'all' ? '' : status;
      const url = `/api/v1/projects?categoryId=${actualCat}&page=${page}&size=${size}&sort=${sort}&search=${search}&status=${actualStatus}`;
      const res = await fetchWithToken(url);
      if (res && res.content) {
        setProjects(res.content.map((p: any) => ({
          ...p,
          categoryId: p.categoryId || p.folderId,
        } as Project)));
        setProjectsTotalPages(res.totalPages);
        setProjectsTotalElements(res.totalElements);
        setProjectsPage(res.number);
        setProjectsPageSize(res.size);
      }
    } catch (err: any) {
      console.error('Failed fetching projects page:', err);
      showToast(err.message || 'Failed loading projects.', 'error');
    }
  };

  // Sync data dynamically from backend with REST fetching
  useEffect(() => {
    if (!token || !user) return;
    loadAllData();
  }, [token, user]);

  // Refetch projects when filters or pagination states change
  useEffect(() => {
    if (!token || !user) return;
    if (categories.length > 0) {
      fetchProjects(activeCategoryId, projectsPage, projectsPageSize, projectsSort, projectsSearch, projectsStatus);
    }
  }, [activeCategoryId, projectsPage, projectsPageSize, projectsSort, projectsSearch, projectsStatus]);

  // Auth outcomes
  const handleAuthSuccess = async (newToken: string, authenticatedUser: any) => {
    setToken(newToken);
    localStorage.setItem('crochet_token', newToken);

    // Sync user in database
    const dbUser = await syncUserWithBackend(newToken, authenticatedUser);
    setUser(dbUser);
    localStorage.setItem('crochet_user', JSON.stringify(dbUser));
  };

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('crochet_token');
    localStorage.removeItem('crochet_user');
    localStorage.removeItem('crochet_floating_buddy_dismissed');
    setIsFloatingBuddyDismissed(false);
    setToken(null);
    setUser(null);
    setCategories([]);
    setProjects([]);
    setJournalLogs([]);
    setActiveCategoryId('all');
    setSelectedProject(null);
    setIsInitialLoading(true);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, [handleLogout]);

  // --- CRUD DISPATCH FUNCTIONS ---

  const handleCreateCategory = async (name: string) => {
    if (!user) return;
    try {
      const res = await fetchWithToken('/api/v1/categories', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      });
      if (res) {
        setCategories(prev => [...prev, {
          ...res,
          categoryId: res.categoryId || res.folderId
        } as Category]);
        setActiveCategoryId(res.categoryId || res.folderId);
        showToast('Category created successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Failed creating directory folder:', err);
      showToast(err.message || 'Failed to create category.', 'error');
      throw err;
    }
  };

  const handleRenameCategory = async (categoryId: string, newName: string) => {
    try {
      const res = await fetchWithToken(`/api/v1/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName.trim() })
      });
      if (res) {
        setCategories(prev => prev.map(c => c.categoryId === categoryId ? {
          ...res,
          categoryId: res.categoryId || res.folderId
        } as Category : c));
        showToast('Category renamed successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Failed renaming directory folder:', err);
      showToast(err.message || 'Failed to rename category.', 'error');
      throw err;
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await fetchWithToken(`/api/v1/categories/${categoryId}`, { method: 'DELETE' });
      setCategories(prev => prev.filter(c => c.categoryId !== categoryId));
      if (activeCategoryId === categoryId) {
        setActiveCategoryId('all');
      }
      showToast('Category deleted successfully!', 'success');
    } catch (err: any) {
      console.error('Failed deleting directory folder:', err);
      showToast(err.message || 'Failed to delete category.', 'error');
      throw err;
    }
  };

  const handleCreateProject = async (
    cid: string,
    title: string,
    notes?: string
  ) => {
    if (!user) return;

    let targetCid = cid;
    if (cid === 'all' || !cid) {
      const defaultCat = categories.find(c => c.name.toLowerCase() === 'default');
      targetCid = defaultCat?.categoryId || (categories[0]?.categoryId || 'f_default_' + user.userId);
    }

    const payload = {
      categoryId: targetCid,
      title: title.trim(),
      yarns: [],
      hooks: [],
      status: ProjectStatus.InProgress,
      rowCount: 0,
      notes: notes || '',
      patterns: []
    };

    try {
      const res = await fetchWithToken('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) {
        const merged = {
          ...res,
          categoryId: res.categoryId || res.folderId,
          isNewProject: true
        } as Project;
        setProjects(prev => [merged, ...prev]);
        setSelectedProject(merged); // Automatically view the new project
        showToast('Project created successfully!', 'success');
        fetchProjects(activeCategoryId, 0, projectsPageSize);
      }
    } catch (err: any) {
      console.error('Failed creating project:', err);
      showToast(err.message || 'Failed to create project.', 'error');
      throw err;
    }
  };

  const handleUpdateProject = async (updates: Partial<Project>) => {
    if (!selectedProject) return;
    const { projectId } = selectedProject;

    // Optimistically update the UI immediately
    const mergedLocally = {
      ...selectedProject,
      ...updates
    } as Project;
    setProjects(prev => prev.map(p => p.projectId === projectId ? mergedLocally : p));
    setSelectedProject(mergedLocally);

    const getPayload = (current: Project, upds: Partial<Project>) => {
      return {
        categoryId: upds.categoryId !== undefined ? upds.categoryId : current.categoryId,
        title: upds.title !== undefined ? upds.title : current.title,
        status: upds.status !== undefined ? upds.status : current.status,
        rowCount: upds.rowCount !== undefined ? upds.rowCount : current.rowCount,
        notes: upds.notes !== undefined ? upds.notes : current.notes,
        startDate: upds.startDate !== undefined ? upds.startDate : current.startDate,
        endDate: upds.endDate !== undefined ? upds.endDate : current.endDate,
        isArchive: upds.isArchive !== undefined ? upds.isArchive : current.isArchive,
        careInstructions: upds.careInstructions !== undefined ? upds.careInstructions : current.careInstructions,
        totalTime: upds.totalTime !== undefined ? upds.totalTime : current.totalTime,
      };
    };

    // Check if we are ONLY updating the row count (and possibly status)
    const isOnlyRowCount = Object.keys(updates).every(k => k === 'rowCount' || k === 'status');

    if (isOnlyRowCount) {
      // Clear any pending debounce saves
      if (rowCountTimeoutRef.current) {
        clearTimeout(rowCountTimeoutRef.current);
      }

      // Debounce the save to the database by 1 second to avoid massive network calls on rapid clicks
      rowCountTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetchWithToken(`/api/v1/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(getPayload(selectedProject, updates))
          });

          if (res) {
            // Keep state synced with the official server response
            const merged = {
              ...res,
              categoryId: res.categoryId || res.folderId
            } as Project;
            setProjects(prev => prev.map(p => p.projectId === projectId ? merged : p));
            setSelectedProject(merged);
          }
        } catch (err: any) {
          console.error('Failed to sync row count with backend:', err);
        }
      }, 1000);

      return;
    }

    // Otherwise, perform an immediate save for all other fields (e.g. text patterns, care instructions, notes)
    if (rowCountTimeoutRef.current) {
      clearTimeout(rowCountTimeoutRef.current);
    }

    try {
      const res = await fetchWithToken(`/api/v1/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(getPayload(selectedProject, updates))
      });
      if (res) {
        const merged = {
          ...res,
          categoryId: res.categoryId || res.folderId
        } as Project;
        setProjects(prev => prev.map(p => p.projectId === projectId ? merged : p));
        setSelectedProject(merged);
        showToast('Saving..', 'success');

        const oldStatus = selectedProject.status;
        if (updates.status === ProjectStatus.Completed && oldStatus !== ProjectStatus.Completed) {
          setShowCelebrationTitle(merged.title);
        }
      }
    } catch (err: any) {
      console.error('Failed updating project:', err);
      showToast(err.message || 'Failed to update project.', 'error');
      throw err;
    }
  };

  const handleUpdateProjectState = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.projectId === updatedProject.projectId ? updatedProject : p));
    if (selectedProject?.projectId === updatedProject.projectId) {
      setSelectedProject(updatedProject);
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    try {
      const res = await fetchWithToken(`/api/v1/projects/${projectId}/duplicates`, {
        method: 'POST'
      });
      if (res) {
        const merged = {
          ...res,
          categoryId: res.categoryId || res.folderId
        } as Project;
        setProjects(prev => [merged, ...prev]);
        showToast('Project duplicated successfully!', 'success');
        setSelectedProject(null); // Return to list view
        fetchProjects(activeCategoryId, 0, projectsPageSize);
      }
    } catch (err: any) {
      console.error('Failed duplicating project:', err);
      showToast(err.message || 'Failed to duplicate project.', 'error');
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      const currentProject = projects.find(p => p.projectId === projectId);
      if (!currentProject) return;
      const nextArchiveState = !currentProject.isArchive;
      const currentCover = currentProject.photos?.find(p => p.isCover);
      const currentCoverVal = currentCover ? String(currentCover.id) : null;
      const payload = {
        categoryId: currentProject.categoryId,
        title: currentProject.title,
        status: currentProject.status,
        rowCount: currentProject.rowCount,
        notes: currentProject.notes,
        startDate: currentProject.startDate,
        endDate: currentProject.endDate,
        isArchive: nextArchiveState,
        coverPhoto: currentCoverVal,
        careInstructions: currentProject.careInstructions,
        totalTime: currentProject.totalTime,
      };
      const res = await fetchWithToken(`/api/v1/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res) {
        const merged = {
          ...res,
          categoryId: res.categoryId || res.folderId
        } as Project;
        setProjects(prev => prev.map(p => p.projectId === projectId ? merged : p));
        setSelectedProject(null); // Return to list view
        showToast(merged.isArchive ? 'Project archived successfully!' : 'Project unarchived successfully!', 'success');
        fetchProjects(activeCategoryId, projectsPage, projectsPageSize);
      }
    } catch (err: any) {
      console.error('Failed toggling archive project status:', err);
      showToast(err.message || 'Failed to archive project.', 'error');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await fetchWithToken(`/api/v1/projects/${projectId}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.projectId !== projectId));
      if (selectedProject?.projectId === projectId) {
        setSelectedProject(null);
      }
      showToast('Project deleted successfully!', 'success');
      fetchProjects(activeCategoryId, 0, projectsPageSize);
    } catch (err: any) {
      console.error('Failed deleting project:', err);
      showToast(err.message || 'Failed to delete project.', 'error');
      throw err;
    }
  };

  const handleToggleFavorite = async (projectId: string) => {
    try {
      const res = await fetchWithToken(`/api/v1/projects/${projectId}/favorite`, {
        method: 'POST'
      });
      if (res) {
        setProjects(prev => prev.map(p => p.projectId === projectId ? {
          ...p,
          isFavorite: res.isFavorite
        } : p));
        showToast(res.isFavorite ? 'Added to Favourites ❤️' : 'Removed from Favourites', 'success');
        fetchProjects(activeCategoryId, projectsPage, projectsPageSize);
      }
    } catch (err: any) {
      console.error('Failed to toggle project favorite status:', err);
      showToast(err.message || 'Failed to toggle favorite status.', 'error');
    }
  };

  const handleUpdateProfile = async (displayName: string, profilePicture: string) => {
    try {
      const res = await fetchWithToken(`/api/v1/users/${user.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ displayName, profilePicture })
      });
      if (res) {
        setUser(res);
        localStorage.setItem('crochet_user', JSON.stringify(res));
        showToast('Profile updated successfully!', 'success');
        setIsProfileOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      showToast(err.message || 'Failed to update profile.', 'error');
    }
  };

  const handleDeactivateAccount = async () => {
    const confirmed = await showConfirm(
      'Are you sure you want to deactivate your account? This will hide your profile and log you out. You can re-activate by logging in again.',
      'Deactivate Account'
    );
    if (!confirmed) return;

    try {
      await fetchWithToken(`/api/v1/users/${user.userId}`, {
        method: 'DELETE'
      });
      showToast('Account deactivated successfully.', 'success');
      setIsSettingsOpen(false);
      handleLogout();
    } catch (err: any) {
      console.error('Failed to deactivate account:', err);
      showToast(err.message || 'Failed to deactivate account.', 'error');
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    setSelectedProject(null);
    setActiveTab('dashboard');
  };

  const handleSelectProject = async (projectSummary: Project) => {
    setSelectedProject(projectSummary);
    try {
      const detailedProject = await fetchWithToken(`/api/v1/projects/${projectSummary.projectId}/full`);
      if (detailedProject) {
        const mapped = {
          ...detailedProject,
          categoryId: detailedProject.categoryId || detailedProject.folderId
        } as Project;
        setSelectedProject(mapped);
        setProjects(prev => prev.map(p => p.projectId === mapped.projectId ? mapped : p));
      }
    } catch (err: any) {
      console.error('Failed fetching project details:', err);
      showToast('Failed to load project details.', 'error');
    }
  };

  const matchedProjectInList = selectedProject ? projects.find(p => p.projectId === selectedProject.projectId) : null;
  const liveSelectedProject = selectedProject
    ? (matchedProjectInList
        ? { ...matchedProjectInList, isNewProject: selectedProject.isNewProject } as Project
        : selectedProject)
    : null;

  if (!token || !user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (isInitialLoading) {
    return <CrochetLoader />;
  }

  return (
    <div id="crochet-app-workspace" className="h-screen bg-vibrant-bg flex text-vibrant-charcoal overflow-hidden font-sans select-none selection:bg-vibrant-peach/40 selection:text-vibrant-dark">

      {/* 1. Brand Side Navigation category Panel */}
      <Sidebar
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={handleSelectCategory}
        onCreateCategory={handleCreateCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
        currentUser={user}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onUpdateUser={setUser}
        token={token}
        onUpdateToken={setToken}
      />

      {/* 2. Main working content frame */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">

        {/* Navigation tabs header */}
        <header className="px-8 py-4 bg-white border-b border-vibrant-border flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 transition-all shadow-xs">

          {/* Welcome title indicator */}
          <div className="flex items-center gap-2">
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 mr-1.5 rounded-lg hover:bg-stone-100 text-[#7C7167] hover:text-[#2D231B] transition-colors cursor-pointer flex items-center justify-center animate-fadeIn"
                title="Expand Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <span className="text-xl">🧶</span>
            <div>
              <h1 className="text-sm font-extrabold text-vibrant-dark font-serif tracking-tight">Happy Knitting, {user.displayName}! ✨</h1>
              <p className="text-[10px] text-vibrant-khaki font-bold uppercase tracking-widest">Let's create something beautiful today</p>
            </div>
          </div>

          {/* Interactive Navigation Triggers */}
          <div className="flex items-center gap-4">
            {user && (
              <TerminologyToggle
                value={user.crochetTerminology || 'US'}
                onChange={updateCrochetTerminology}
              />
            )}
            <div className="flex bg-[#F9F6F2] p-1 rounded-2xl border border-vibrant-border w-max shadow-inner">
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedProject(null); }}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'dashboard'
                  ? 'bg-vibrant-coral text-white shadow-sm'
                  : 'text-vibrant-muted hover:bg-vibrant-coral/5 hover:text-vibrant-dark'
                  }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Project Journal</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('aitools');
                  setSelectedProject(null);
                  setIsSidebarCollapsed(true);
                  localStorage.setItem('crochet_sidebar_collapsed', 'true');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'aitools'
                  ? 'bg-vibrant-coral text-white shadow-sm'
                  : 'text-vibrant-muted hover:bg-vibrant-coral/5 hover:text-vibrant-dark'
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Tools Studio</span>
              </button>
            </div>
          </div>
        </header>

        {/* Core Workspace Board with transition animations */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (liveSelectedProject ? '-project' : '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto"
            >
              {activeTab === 'dashboard' && (
                liveSelectedProject ? (
                  <ErrorBoundary>
                    <ProjectDetail
                      project={liveSelectedProject}
                      categories={categories}
                      token={token}
                      onBack={() => setSelectedProject(null)}
                      onUpdateProject={handleUpdateProject}
                      onUpdateProjectState={handleUpdateProjectState}
                      onToggleFavorite={handleToggleFavorite}
                      onDeleteProject={handleDeleteProject}
                      onDuplicateProject={handleDuplicateProject}
                      onArchiveProject={handleArchiveProject}
                      user={user}
                      onUpdateCrochetTerminology={updateCrochetTerminology}
                    />
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary>
                    <Dashboard
                      projects={projects}
                      journalLogs={journalLogs}
                      categoryId={activeCategoryId}
                      categories={categories}
                      token={token}
                      onSelectProject={handleSelectProject}
                      onCreateProject={handleCreateProject}
                      onDeleteProject={handleDeleteProject}
                      onToggleFavorite={handleToggleFavorite}
                      isSidebarCollapsed={isSidebarCollapsed}
                      onSelectCategory={handleSelectCategory}
                      user={user}
                      onUpdateCrochetTerminology={updateCrochetTerminology}
                      page={projectsPage}
                      pageSize={projectsPageSize}
                      totalPages={projectsTotalPages}
                      totalElements={projectsTotalElements}
                      sort={projectsSort}
                      searchQuery={projectsSearch}
                      stageFilter={projectsStatus}
                      onPageChange={setProjectsPage}
                      onPageSizeChange={setProjectsPageSize}
                      onSortChange={setProjectsSort}
                      onSearchChange={setProjectsSearch}
                      onStageFilterChange={setProjectsStatus}
                    />
                  </ErrorBoundary>
                )
              )}

              {activeTab === 'aitools' && (
                <ErrorBoundary>
                  <AiTools
                    key={aiToolsInitialTab}
                    token={token}
                    initialTab={aiToolsInitialTab}
                    user={user}
                    onUpdateCrochetTerminology={updateCrochetTerminology}
                  />
                </ErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>



      {token && activeTab !== 'aitools' && !isFloatingBuddyDismissed && (
        <FloatingAiBuddy
          onSelectTool={handleSelectFloatingTool}
          onDismiss={handleDismissFloatingBuddy}
        />
      )}

      <AnimatePresence>
        {showCelebrationTitle && (
          <Celebration
            projectTitle={showCelebrationTitle}
            onClose={() => setShowCelebrationTitle(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileOpen && (
          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            currentUser={user}
            onSave={handleUpdateProfile}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentUser={user}
            onDeactivate={handleDeactivateAccount}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
