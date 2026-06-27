/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { BookOpen, Sparkles, X, Menu } from 'lucide-react';
import { TerminologyToggle } from './components/TerminologyToggle';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
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

  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCelebrationTitle, setShowCelebrationTitle] = useState<string | null>(null);

  // Toast notifications state
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({
      id: Date.now(),
      message,
      type
    });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Proactive background wakeup ping on mount to boot Cloud Run containers instantly
  // useEffect(() => {
  //   fetch('/api/v1/categories').catch(() => { });
  // }, []);

  const syncUserWithBackend = async (idToken: string, fallbackProfile: any) => {
    try {
      const response = await fetch('/api/v1/users/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
          'X-User-Name': fallbackProfile?.displayName || '',
          'X-User-Email': fallbackProfile?.email || '',
          'X-User-Avatar': fallbackProfile?.profilePicture || ''
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

  const updateCrochetTerminology = async (pref: 'US' | 'UK') => {
    if (!token || !user) return;
    try {
      const response = await fetch('/api/v1/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Terminology': pref
        },
        body: JSON.stringify({
          displayName: user.displayName,
          email: user.email,
          profilePicture: user.profilePicture || '',
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

      // 2. Fetch Projects
      const projectsData = await fetchWithToken('/api/v1/projects');
      if (projectsData) {
        let list = projectsData.map((p: any) => ({
          ...p,
          categoryId: p.categoryId || p.folderId,
        } as Project));
        list = list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        setProjects(list);
      }
    } catch (err: any) {
      console.error('Failed loading initial data sequence:', err);
      showToast(err.message || 'Failed loading data from server.', 'error');
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Sync data dynamically from backend with REST fetching
  useEffect(() => {
    if (!token || !user) return;
    loadAllData();
  }, [token, user]);

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
      productPhotos: []
    };

    try {
      const res = await fetchWithToken('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) {
        setProjects(prev => [{
          ...res,
          categoryId: res.categoryId || res.folderId
        } as Project, ...prev]);
        showToast('Project created successfully!', 'success');
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
    try {
      const fullProj = projects.find(p => p.projectId === projectId) || selectedProject;
      const oldStatus = fullProj.status;
      const payload = {
        categoryId: updates.categoryId !== undefined ? updates.categoryId : fullProj.categoryId,
        title: updates.title !== undefined ? updates.title : fullProj.title,
        yarns: updates.yarns !== undefined ? updates.yarns : fullProj.yarns,
        hooks: updates.hooks !== undefined ? updates.hooks : fullProj.hooks,
        careInstructions: updates.careInstructions !== undefined ? updates.careInstructions : fullProj.careInstructions,
        totalTime: updates.totalTime !== undefined ? updates.totalTime : fullProj.totalTime,
        status: updates.status !== undefined ? updates.status : fullProj.status,
        rowCount: updates.rowCount !== undefined ? updates.rowCount : fullProj.rowCount,
        notes: updates.notes !== undefined ? updates.notes : fullProj.notes,
        startDate: updates.startDate !== undefined ? updates.startDate : (fullProj.startDate || ''),
        endDate: updates.endDate !== undefined ? updates.endDate : (fullProj.endDate || ''),
        productPhotos: updates.productPhotos !== undefined ? updates.productPhotos : (fullProj.productPhotos || []),
        isArchive: updates.isArchive !== undefined ? updates.isArchive : (fullProj.isArchive !== undefined ? fullProj.isArchive : false),
        thumbnailIndex: updates.thumbnailIndex !== undefined ? updates.thumbnailIndex : (fullProj.thumbnailIndex !== undefined ? fullProj.thumbnailIndex : 0)
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
        setSelectedProject(merged);
        showToast('Project updated successfully!', 'success');

        if (merged.status === ProjectStatus.Completed && oldStatus !== ProjectStatus.Completed) {
          setShowCelebrationTitle(merged.title);
        }
      }
    } catch (err: any) {
      console.error('Failed updating project:', err);
      showToast(err.message || 'Failed to update project.', 'error');
      throw err;
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    try {
      const res = await fetchWithToken(`/api/v1/projects/${projectId}/duplicate`, {
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
      }
    } catch (err: any) {
      console.error('Failed duplicating project:', err);
      showToast(err.message || 'Failed to duplicate project.', 'error');
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      const res = await fetchWithToken(`/api/v1/projects/${projectId}/archive`, {
        method: 'POST'
      });
      if (res) {
        const merged = {
          ...res,
          categoryId: res.categoryId || res.folderId
        } as Project;
        setProjects(prev => prev.map(p => p.projectId === projectId ? merged : p));
        setSelectedProject(null); // Return to list view
        showToast(merged.isArchive ? 'Project archived successfully!' : 'Project unarchived successfully!', 'success');
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
        loadAllData();
      }
    } catch (err: any) {
      console.error('Failed to toggle project favorite status:', err);
      showToast(err.message || 'Failed to toggle favorite status.', 'error');
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    setSelectedProject(null);
    setActiveTab('dashboard');
  };

  const liveSelectedProject = selectedProject
    ? projects.find(p => p.projectId === selectedProject.projectId) || selectedProject
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
        onUpdateToken={(newToken) => {
          setToken(newToken);
          localStorage.setItem('crochet_token', newToken);
        }}
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
                      onSelectProject={setSelectedProject}
                      onCreateProject={handleCreateProject}
                      onDeleteProject={handleDeleteProject}
                      onToggleFavorite={handleToggleFavorite}
                      isSidebarCollapsed={isSidebarCollapsed}
                      onSelectCategory={handleSelectCategory}
                      user={user}
                      onUpdateCrochetTerminology={updateCrochetTerminology}
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

      {/* Global Toast component wrapper */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 right-6 z-[9999] max-w-sm p-4 rounded-2xl border backdrop-blur-md shadow-lg flex items-start gap-3 ${toast.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
              : toast.type === 'warning'
                ? 'bg-amber-50/90 border-amber-200 text-amber-800'
                : 'bg-rose-50/90 border-rose-200 text-rose-800'
              }`}
          >
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-stone-400 hover:text-stone-700 font-bold text-sm shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
