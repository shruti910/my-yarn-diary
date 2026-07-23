/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Calendar, Play, Heart, Trash2, ClipboardList, PackageOpen, CircleCheckBig, Clock, TrendingUp, Trophy, FolderOpenDot, Image as ImageIcon, Archive, CirclePause, Filter, ArrowUpDown, ArrowUp, ArrowDown, ArrowDownAZ, ArrowUpAZ, ChevronDown, Route } from 'lucide-react';
import { Project, Category, JournalLog, ProjectStatus } from '../types';
import { ProjectGallery } from './ProjectGallery';
import { CustomDropdown } from './CustomDropdown';
import { YarnSpinner } from './YarnSpinner';
import { useDialog } from './DialogProvider';

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

const getProjectCoverPhoto = (project: Project): string | undefined => {
  if (project.base64CoverPhoto) {
    return project.base64CoverPhoto;
  }
  if (project.photos && project.photos.length > 0) {
    const cover = project.photos.find(ph => ph.isCover);
    if (cover) return cover.photoBase64;
    return project.photos[0].photoBase64;
  }
  return undefined;
};


interface DashboardProps {
  projects: Project[];
  journalLogs?: JournalLog[];
  categoryId: string;
  categories: Category[];
  token: string;
  onSelectProject: (proj: Project) => void;
  onCreateProject: (categoryId: string, title: string, notes?: string) => Promise<any>;
  onDeleteProject: (projectId: string) => void;
  onToggleFavorite: (projectId: string) => void;
  isSidebarCollapsed?: boolean;
  onSelectCategory?: (categoryId: string) => void;
  user?: any;
  onUpdateCrochetTerminology?: (pref: 'US' | 'UK') => Promise<void>;
  autoOpenNewProject?: boolean;
  onModalOpened?: () => void;

  // Pagination & sorting props
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  sort: string;
  searchQuery: string;
  stageFilter: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (sort: string) => void;
  onSearchChange: (search: string) => void;
  onStageFilterChange: (status: string) => void;
}

export function Dashboard({
  projects,
  journalLogs = [],
  categoryId,
  categories,
  token,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onToggleFavorite,
  isSidebarCollapsed = false,
  onSelectCategory,
  user,
  onUpdateCrochetTerminology,
  autoOpenNewProject,
  onModalOpened,

  // Pagination & sorting destructuring
  page,
  pageSize,
  totalPages,
  totalElements,
  sort,
  searchQuery,
  stageFilter,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSearchChange,
  onStageFilterChange
}: DashboardProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [showAddModal, setShowAddModal] = useState(false);
  const { showAlert, showConfirm } = useDialog();

  // New project forms
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProjectCategoryId, setNewProjectCategoryId] = useState<string>('');

  // Map sort string to local sortBy selector value
  const sortBy = useMemo(() => {
    if (sort === 'createdAt,desc') return 'createdAt-desc';
    if (sort === 'createdAt,asc') return 'createdAt-asc';
    if (sort === 'updatedAt,desc') return 'updatedAt-desc';
    if (sort === 'updatedAt,asc') return 'updatedAt-asc';
    if (sort === 'title,asc') return 'name-asc';
    if (sort === 'title,desc') return 'name-desc';
    return 'createdAt-desc';
  }, [sort]);

  const handleSortChangeLocal = (value: string) => {
    let mapped = 'createdAt,desc';
    if (value === 'createdAt-desc') mapped = 'createdAt,desc';
    else if (value === 'createdAt-asc') mapped = 'createdAt,asc';
    else if (value === 'updatedAt-desc') mapped = 'updatedAt,desc';
    else if (value === 'updatedAt-asc') mapped = 'updatedAt,asc';
    else if (value === 'name-asc') mapped = 'title,asc';
    else if (value === 'name-desc') mapped = 'title,desc';
    onSortChange(mapped);
    onPageChange(0);
  };

  // Debounced search query sync
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchQuery);
      onPageChange(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearchQuery]);

  const openModal = (fromSidebar: boolean = false) => {
    const defaultCategory = categories.find(c => c.name.toLowerCase() === 'default');
    const defaultCatId = defaultCategory ? (defaultCategory.categoryId || (defaultCategory as any).folderId) : (categories.length > 0 ? (categories[0].categoryId || (categories[0] as any).folderId) : '');

    if (fromSidebar) {
      setNewProjectCategoryId(defaultCatId);
    } else {
      if (categoryId && categoryId !== 'all' && categoryId !== 'archived') {
        const activeCat = categories.find(c => c.categoryId === categoryId);
        if (activeCat && activeCat.name !== 'Favourites ❤️') {
          setNewProjectCategoryId(categoryId);
        } else {
          setNewProjectCategoryId(defaultCatId);
        }
      } else {
        setNewProjectCategoryId(defaultCatId);
      }
    }
    setShowAddModal(true);
  };

  // Listen for open-new-project-modal event from Sidebar
  useEffect(() => {
    const handleOpenModalEvent = (e: any) => openModal(e.detail?.fromSidebar);
    window.addEventListener('open-new-project-modal', handleOpenModalEvent as EventListener);
    return () => window.removeEventListener('open-new-project-modal', handleOpenModalEvent as EventListener);
  }, [categoryId, categories]);

  useEffect(() => {
    if (autoOpenNewProject) {
      openModal(true);
      onModalOpened?.();
    }
  }, [autoOpenNewProject, categoryId, categories]);

  const activeCategory = categories.find(c => c.categoryId === categoryId);
  const isFavouritesCategory = activeCategory && activeCategory.name === 'Favourites ❤️';

  // The backend already handles all filters, searches and sorts.
  const filteredProjects = projects;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    const capitalized = capitalizeWords(trimmed);
    if (!isValidName(capitalized)) {
      await showAlert('Project title can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, parentheses, and emojis.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateProject(newProjectCategoryId, capitalized, notes);

      // Clear
      setTitle('');
      setNotes('');
      setNewProjectCategoryId('');
      setShowAddModal(false);
    } catch (err) {
      // Error is captured by global toast system
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation
  const totalProjects = totalElements;
  const totalWips = projects.filter(p => p.status === ProjectStatus.InProgress).length;
  const completedCount = projects.filter(p => p.status === ProjectStatus.Completed).length;
  const planningCount = projects.filter(p => p.status === ProjectStatus.Planning).length;
  const onHoldCount = projects.filter(p => p.status === ProjectStatus.OnHold).length;
  const totalStitches = projects.reduce((acc, current) => acc + current.rowCount, 0);
  const completionRate = totalElements > 0 ? Math.round((completedCount / totalElements) * 100) : 0;

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.Planning:
        return <span className="text-[11px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit"><ClipboardList className="w-3 h-3 text-warning" /> Planning</span>;
      case ProjectStatus.InProgress:
        return <span className="text-[11px] bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit"><Route className="w-3 h-3 text-brand" /> In Progress</span>;
      case ProjectStatus.Completed:
        return <span className="text-[11px] bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit"><CircleCheckBig className="w-3 h-3 text-accent" /> Completed</span>;
      default:
        return <span className="text-[11px] bg-page text-muted border border-subtle px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit"><CirclePause className="w-3 h-3 text-muted" /> On Hold</span>;
    }
  };

  return (
    <div id="dashboard-manager-stage" className="max-w-6xl mx-auto p-2 sm:p-6 space-y-2 sm:space-y-6">

      {/* Dynamic stats cards container */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-subtle warm-shadow flex flex-row-reverse items-center justify-end gap-1.5 sm:gap-2 animate-fade-in">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[11px] uppercase font-semibold tracking-wide text-muted block leading-tight truncate">In Progress</span>
            <span className="text-base sm:text-lg font-bold font-serif text-heading block leading-tight">{totalWips}</span>
          </div>
          <span className="bg-brand/10 border border-brand/20 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0"><Route className="w-3.5 h-3.5 text-brand" /></span>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-subtle warm-shadow flex flex-row-reverse items-center justify-end gap-1.5 sm:gap-2 animate-fade-in animate-duration-75">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[11px] uppercase font-semibold tracking-wide text-muted block leading-tight truncate">Completed</span>
            <span className="text-base sm:text-lg font-bold font-serif text-heading block leading-tight">{completedCount}</span>
          </div>
          <span className="bg-accent/10 border border-accent/20 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0"><CircleCheckBig className="w-3.5 h-3.5 text-accent" /></span>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-subtle warm-shadow flex flex-row-reverse items-center justify-end gap-1.5 sm:gap-2 animate-fade-in animate-duration-100">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[11px] uppercase font-semibold tracking-wide text-muted block leading-tight truncate">Planning</span>
            <span className="text-base sm:text-lg font-bold font-serif text-heading block leading-tight">{planningCount}</span>
          </div>
          <span className="bg-warning/10 border border-warning/20 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0"><ClipboardList className="w-3.5 h-3.5 text-warning" /></span>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-subtle warm-shadow flex flex-row-reverse items-center justify-end gap-1.5 sm:gap-2 animate-fade-in animate-duration-150">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[11px] uppercase font-semibold tracking-wide text-muted block leading-tight truncate">On Hold</span>
            <span className="text-base sm:text-lg font-bold font-serif text-heading block leading-tight">{onHoldCount}</span>
          </div>
          <span className="bg-page border border-subtle w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0"><CirclePause className="w-3.5 h-3.5 text-muted" /></span>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-subtle warm-shadow flex flex-row-reverse items-center justify-end gap-1.5 sm:gap-2 animate-fade-in animate-duration-200">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[11px] uppercase font-semibold tracking-wide text-muted block leading-tight truncate">Total Rows</span>
            <span className="text-base sm:text-lg font-bold font-serif text-heading block leading-tight">{totalStitches}</span>
          </div>
          <span className="bg-blue-50 border border-blue-100 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0"><TrendingUp className="w-3.5 h-3.5 text-blue-400" /></span>
        </div>

        <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-subtle warm-shadow flex flex-row-reverse items-center justify-end gap-1.5 sm:gap-2 animate-fade-in animate-duration-300">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[11px] uppercase font-semibold tracking-wide text-muted block leading-tight truncate">Success Rate</span>
            <span className="text-base sm:text-lg font-bold font-serif text-heading block leading-tight">{completionRate}%</span>
          </div>
          <span className="bg-amber-50 border border-amber-100 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0"><Trophy className="w-3.5 h-3.5 text-amber-500" /></span>
        </div>
      </div>


      {/* Main projects grid workspace control segment */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 sm:gap-3 border-b border-subtle pb-2 sm:pb-3 bg-white p-2 sm:p-3.5 rounded-xl sm:rounded-2xl mt-1.5 sm:mt-3 warm-shadow animate-fade-in w-full min-w-0">
        {/* No overflow-x here: it would clip the absolutely-positioned dropdown panels. Wrap instead. */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 w-full lg:w-auto min-w-0">
          {isSidebarCollapsed ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative min-w-[110px] sm:min-w-[175px]">
                <CustomDropdown
                  value={categoryId}
                  onChange={(val) => onSelectCategory?.(val)}
                  options={[
                    { value: 'all', label: 'All Projects' },
                    { value: 'archived', label: 'Archived Projects' },
                    ...categories.map(cat => ({ value: cat.categoryId, label: cat.name }))
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <h2 className="text-sm sm:text-lg font-extrabold font-serif text-heading whitespace-nowrap shrink-0">
              {categoryId === 'archived' ? 'Archived Projects' : (categoryId === 'all' ? 'All Projects' : (activeCategory?.name || 'My Projects'))}
            </h2>
          )}

          <div className="flex items-center gap-1.5 flex-1 min-w-0 lg:flex-none">
            {/* Stage Filter */}
            <div className="relative flex-1 min-w-0 lg:flex-none lg:min-w-[140px]">
              <CustomDropdown
                value={stageFilter}
                onChange={(val) => {
                  onStageFilterChange(val);
                  onPageChange(0);
                }}
                options={[
                  { value: 'all', label: 'All Stages' },
                  { value: 'Planning', label: 'Planning', icon: <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4 text-warning" /> },
                  { value: 'In Progress', label: 'In Progress', icon: <Route className="w-3 h-3 sm:w-4 sm:h-4 text-brand" /> },
                  { value: 'Completed', label: 'Completed', icon: <CircleCheckBig className="w-3 h-3 sm:w-4 sm:h-4 text-accent" /> },
                  { value: 'On Hold', label: 'On Hold', icon: <CirclePause className="w-3 h-3 sm:w-4 sm:h-4 text-muted" /> }
                ]}
              />
            </div>

            {/* Sort selector */}
            <div className="relative flex-1 min-w-0 lg:flex-none lg:min-w-[200px]">
              <CustomDropdown
                value={sortBy}
                onChange={(val) => handleSortChangeLocal(val)}
                options={[
                  { value: 'createdAt-desc', label: 'Newest', icon: <ArrowDown className="w-3.5 h-3.5 text-brand" /> },
                  { value: 'createdAt-asc', label: 'Oldest', icon: <ArrowUp className="w-3.5 h-3.5 text-brand" /> },
                  { value: 'updatedAt-desc', label: 'Recently Updated', icon: <Clock className="w-3.5 h-3.5 text-accent" /> },
                  { value: 'updatedAt-asc', label: 'Least Updated', icon: <Clock className="w-3.5 h-3.5 text-muted" /> },
                  { value: 'name-asc', label: 'Name: A-Z', icon: <ArrowDownAZ className="w-3.5 h-3.5 text-accent" /> },
                  { value: 'name-desc', label: 'Name: Z-A', icon: <ArrowUpAZ className="w-3.5 h-3.5 text-accent" /> }
                ]}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto mt-1 lg:mt-0">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-muted pointer-events-none">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-surface pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2.5 border border-subtle rounded-xl text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-all text-heading font-semibold placeholder-muted"
            />
          </div>

          {!isFavouritesCategory && categoryId !== 'archived' && (
            <button
              onClick={() => openModal(false)}
              className="sewing-button px-7 sm:px-8 py-1.5 sm:py-2 flex items-center justify-center text-xs sm:text-sm whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid container */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-subtle warm-shadow-lg max-w-lg mx-auto space-y-3 animate-fade-in flex flex-col items-center">
          <div className="text-4xl text-brand-light animate-pulse flex justify-center mb-1">
            {categoryId === 'archived' ? (
              <Archive className="w-10 h-10 text-muted" />
            ) : isFavouritesCategory ? (
              '❤️'
            ) : (
              '🧶'
            )}
          </div>
          <h3 className="font-serif font-extrabold text-heading text-lg">
            {categoryId === 'archived'
              ? 'No Archived Projects'
              : isFavouritesCategory
                ? 'No Favourites Yet'
                : "It's So Quiet Here..."}
          </h3>
          <p className="text-xs text-muted font-semibold max-w-[280px] mx-auto leading-relaxed">
            {categoryId === 'archived'
              ? 'Projects you archive will be shown here. You can archive projects from the project details page.'
              : isFavouritesCategory
                ? 'Mark projects as favourites by clicking the heart icon on any project card to view them here.'
                : 'Add a new crochet project'}
          </p>
          {categoryId !== 'archived' && !isFavouritesCategory && (
            <button
              onClick={() => openModal(false)}
              className="mt-4 px-6 py-2.5 sewing-button text-sm"
            >
              New Project
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 animate-fade-in">
            {filteredProjects.map((p) => (
              <div
                key={p.projectId}
                onClick={() => onSelectProject(p)}
                className="group fabric-card flex flex-col justify-between overflow-hidden relative"
              >
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-start gap-2 sm:gap-4">
                    <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-muted block flex items-center gap-1 uppercase tracking-widest">
                        <Calendar className="w-3 h-3 text-accent" />
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                      <h3 className="font-serif font-extrabold text-heading text-sm sm:text-base group-hover:text-brand transition-colors line-clamp-1">{p.title}</h3>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>

                  {/* Visual Project Thumbnail */}
                  {getProjectCoverPhoto(p) ? (
                    <div className="w-full aspect-[16/10] sm:aspect-[16/9] min-h-[160px] sm:min-h-[190px] rounded-xl sm:rounded-2xl border border-subtle overflow-hidden bg-page relative">
                      <img
                        src={getProjectCoverPhoto(p)}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-[16/10] sm:aspect-[16/9] min-h-[160px] sm:min-h-[190px] rounded-xl sm:rounded-2xl border border-subtle bg-surface flex flex-col items-center justify-center text-muted gap-1 shrink-0">
                      <span className="text-2xl sm:text-3xl">🧶</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">No photos yet</span>
                    </div>
                  )}

                  {p.notes && (
                    <p className="text-[11px] text-muted italic max-w-full truncate font-semibold">"{p.notes}"</p>
                  )}
                </div>

                {/* Bottom footer bar row trigger */}
                <div className="bg-surface border-t border-subtle px-3.5 py-2 sm:px-6 sm:py-3.5 flex justify-between items-center group-hover:bg-page transition-colors shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-heading font-extrabold">
                    <span>Row Count Mark: <span className="text-brand">{p.rowCount}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(p.projectId);
                      }}
                      className={`p-2 sm:p-1 sm:px-1.5 bg-white border rounded-lg shrink-0 cursor-pointer transition-colors ${p.isFavorite
                        ? 'text-brand border-rose-100 hover:bg-rose-50/50'
                        : 'text-muted hover:text-rose-500 border-subtle hover:bg-rose-50/50'
                        }`}
                      title={p.isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
                    >
                      <Heart
                        className="w-3.5 h-3.5 transition-colors"
                        fill={p.isFavorite ? 'var(--color-brand)' : 'none'}
                        color={p.isFavorite ? 'var(--color-brand)' : 'currentColor'}
                      />
                    </button>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = await showConfirm('Are you sure you want to delete this project?');
                        if (confirmed) {
                          onDeleteProject(p.projectId);
                        }
                      }}
                      className="p-2 sm:p-1 sm:px-1.5 bg-white hover:bg-red-55 text-muted hover:text-red-500 border border-subtle hover:border-red-100 rounded-lg shrink-0 cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5 cursor-pointer" />
                    </button>
                    <span className="text-[11px] font-extrabold text-accent group-hover:translate-x-1 duration-150 flex items-center gap-0.5">
                      Open Project
                      <Play className="w-2.5 h-2.5 fill-accent text-transparent" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-subtle rounded-2xl p-4 warm-shadow">
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted font-semibold">
                  Showing <span className="font-extrabold text-heading">{page * pageSize + 1}</span> to{' '}
                  <span className="font-extrabold text-heading">
                    {Math.min((page + 1) * pageSize, totalElements)}
                  </span>{' '}
                  of <span className="font-extrabold text-heading">{totalElements}</span> projects
                </span>

                <div className="flex items-center gap-2 text-xs text-muted font-semibold">
                  <span>Show:</span>
                  <div className="w-20">
                    <CustomDropdown
                      value={String(pageSize)}
                      onChange={(val) => {
                        onPageSizeChange(Number(val));
                        onPageChange(0);
                      }}
                      options={[
                        { value: '5', label: '5' },
                        { value: '10', label: '10' },
                        { value: '20', label: '20' },
                        { value: '50', label: '50' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => onPageChange(page - 1)}
                  className="p-2 px-3 border border-subtle rounded-xl text-muted hover:text-heading hover:bg-page disabled:opacity-40 disabled:hover:bg-transparent transition-all text-xs font-bold cursor-pointer"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${page === i
                      ? 'bg-brand text-white shadow-sm'
                      : 'border border-subtle text-muted hover:text-heading hover:bg-page'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={page === totalPages - 1}
                  onClick={() => onPageChange(page + 1)}
                  className="p-2 px-3 border border-subtle rounded-xl text-muted hover:text-heading hover:bg-page disabled:opacity-40 disabled:hover:bg-transparent transition-all text-xs font-bold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}


      {/* CREATE NEW PROJECT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 selection:bg-brand-light/20 animate-fade-in animate-duration-100">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-subtle warm-shadow-lg space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-subtle pb-3">
              <h3 className="font-serif font-extrabold text-heading text-lg">New Project</h3>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={isSubmitting}
                className="p-1 text-muted hover:text-heading rounded-lg hover:bg-stone-50 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Journal Category</label>
                <CustomDropdown
                  value={newProjectCategoryId}
                  onChange={(val) => setNewProjectCategoryId(val)}
                  disabled={isSubmitting}
                  options={categories.filter(cat => cat.name !== 'Favourites ❤️').map(cat => ({
                    value: cat.categoryId || (cat as any).folderId,
                    label: cat.name
                  }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Project Title *</label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="e.g. Sunny Day Tote Bag"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface border border-subtle text-xs p-3 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Notes</label>
                <textarea
                  rows={2}
                  disabled={isSubmitting}
                  placeholder="Need 2 balls of green, 1 ball of cream yarn..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface border border-subtle text-xs p-3 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold resize-none disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-brand hover:bg-brand/85 disabled:bg-brand/60 text-white font-bold rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 mt-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <YarnSpinner size={18} onBrand />
                ) : (
                  <Heart className="w-4 h-4 fill-white text-transparent" />
                )}
                <span>{isSubmitting ? 'Creating Project...' : 'Create Project'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
