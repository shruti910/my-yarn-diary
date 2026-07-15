/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Calendar, Play, Heart, Trash2, ClipboardList, PackageOpen, CircleCheckBig, Clock, TrendingUp, Trophy, FolderOpenDot, Image as ImageIcon, Archive, CirclePause, Filter, ArrowUpDown, ChevronDown, Route } from 'lucide-react';
import { Project, Category, JournalLog, ProjectStatus } from '../types';
import { ProjectGallery } from './ProjectGallery';
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
  const [dashboardSubTab, setDashboardSubTab] = useState<'projects' | 'gallery'>('projects');
  const { showAlert, showConfirm } = useDialog();

  // New project forms
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await onCreateProject(categoryId, capitalized, notes);

      // Clear
      setTitle('');
      setNotes('');
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
        return <span className="text-[10px] bg-[#E9C46A]/10 text-[#D9A05B] border border-[#E9C46A]/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit"><ClipboardList className="w-3 h-3 text-[#D9A05B]" /> Planning</span>;
      case ProjectStatus.InProgress:
        return <span className="text-[10px] bg-[#F28482]/10 text-[#F28482] border border-[#F28482]/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit"><Route className="w-3 h-3 text-[#F28482]" /> In Progress</span>;
      case ProjectStatus.Completed:
        return <span className="text-[10px] bg-[#84A59D]/10 text-[#84A59D] border border-[#84A59D]/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit"><CircleCheckBig className="w-3 h-3 text-[#84A59D]" /> Completed</span>;
      default:
        return <span className="text-[10px] bg-[#F9F6F2] text-[#A89F94] border border-[#E8E2D9] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit"><CirclePause className="w-3 h-3 text-[#A89F94]" /> On Hold</span>;
    }
  };

  return (
    <div id="dashboard-manager-stage" className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

      {/* Dynamic stats cards container */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] warm-shadow flex items-center justify-between animate-fade-in">
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-[#A89F94] block font-mono leading-tight">In Progress</span>
            <span className="text-xl font-bold font-serif text-[#2D231B] mt-1 block">{totalWips}</span>
          </div>
          <span className="bg-[#F28482]/10 border border-[#F28482]/20 w-8 h-8 rounded-lg flex items-center justify-center"><Route className="w-4 h-4 text-[#F28482]" /></span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] warm-shadow flex items-center justify-between animate-fade-in animate-duration-75">
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-[#A89F94] block font-mono leading-tight">Completed</span>
            <span className="text-xl font-bold font-serif text-[#2D231B] mt-1 block">{completedCount}</span>
          </div>
          <span className="bg-[#84A59D]/10 border border-[#84A59D]/20 w-8 h-8 rounded-lg flex items-center justify-center"><CircleCheckBig className="w-4 h-4 text-[#84A59D]" /></span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] warm-shadow flex items-center justify-between animate-fade-in animate-duration-100">
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-[#A89F94] block font-mono leading-tight">Planning</span>
            <span className="text-xl font-bold font-serif text-[#2D231B] mt-1 block">{planningCount}</span>
          </div>
          <span className="bg-[#E9C46A]/10 border border-[#E9C46A]/20 w-8 h-8 rounded-lg flex items-center justify-center"><ClipboardList className="w-4 h-4 text-[#D9A05B]" /></span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] warm-shadow flex items-center justify-between animate-fade-in animate-duration-150">
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-[#A89F94] block font-mono leading-tight">On Hold</span>
            <span className="text-xl font-bold font-serif text-[#2D231B] mt-1 block">{onHoldCount}</span>
          </div>
          <span className="bg-[#F9F6F2] border border-[#E8E2D9] w-8 h-8 rounded-lg flex items-center justify-center"><CirclePause className="w-4 h-4 text-[#A89F94]" /></span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] warm-shadow flex items-center justify-between animate-fade-in animate-duration-200">
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-[#A89F94] block font-mono leading-tight">Total Rows</span>
            <span className="text-xl font-bold font-serif text-[#2D231B] mt-1 block">{totalStitches}</span>
          </div>
          <span className="bg-blue-50 border border-blue-100 w-8 h-8 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-blue-400" /></span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#E8E2D9] warm-shadow flex items-center justify-between animate-fade-in animate-duration-300">
          <div>
            <span className="text-[9px] uppercase font-semibold tracking-wider text-[#A89F94] block font-mono leading-tight">Success Rate</span>
            <span className="text-xl font-bold font-serif text-[#2D231B] mt-1 block">{completionRate}%</span>
          </div>
          <span className="bg-amber-50 border border-amber-100 w-8 h-8 rounded-lg flex items-center justify-center"><Trophy className="w-4 h-4 text-amber-500" /></span>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-[#E8E2D9] gap-6 px-1 pt-1 shrink-0 -mt-3">
        <button
          type="button"
          onClick={() => setDashboardSubTab('projects')}
          className={`pb-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${dashboardSubTab === 'projects'
            ? 'border-[#F28482] text-[#2D231B]'
            : 'border-transparent text-[#A89F94] hover:text-[#2D231B]'
            }`}
        >
          <span className="flex items-center gap-1.5"><FolderOpenDot className="w-4 h-4" /> Project Tracker</span>
        </button>
        <button
          type="button"
          onClick={() => setDashboardSubTab('gallery')}
          className={`pb-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${dashboardSubTab === 'gallery'
            ? 'border-[#F28482] text-[#2D231B]'
            : 'border-transparent text-[#A89F94] hover:text-[#2D231B]'
            }`}
        >
          <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> Project Gallery</span>
        </button>
      </div>

      {dashboardSubTab === 'gallery' ? (
        <ProjectGallery projects={projects} token={token} />
      ) : (
        <>
          {/* Main projects grid workspace control segment */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#E8E2D9] pb-4 bg-white p-5 rounded-3xl mt-4 warm-shadow animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
              {isSidebarCollapsed ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={categoryId}
                      onChange={(e) => onSelectCategory?.(e.target.value)}
                      className="appearance-none bg-[#FDFCFB] pl-8 pr-8 py-2.5 border border-[#E8E2D9] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#F28482] focus:border-[#F28482] transition-all text-[#2D231B] font-extrabold cursor-pointer min-w-[175px]"
                    >
                      <option value="all">All Projects</option>
                      <option value="archived">Archived Projects</option>
                      {categories.map((cat) => (
                        <option key={cat.categoryId} value={cat.categoryId}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <FolderOpenDot className="w-3.5 h-3.5 text-[#F28482] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-3.5 h-3.5 text-[#A89F94] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              ) : (
                <h2 className="text-lg font-extrabold font-serif text-[#2D231B] whitespace-nowrap">
                  {categoryId === 'archived' ? 'Archived Projects' : (categoryId === 'all' ? 'All Projects' : (activeCategory?.name || 'My Projects'))}
                </h2>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {/* Stage Filter */}
                <div className="relative">
                  <select
                    id="stage-filter-select"
                    value={stageFilter}
                    onChange={(e) => {
                      onStageFilterChange(e.target.value);
                      onPageChange(0);
                    }}
                    className="appearance-none bg-[#FDFCFB] pl-8 pr-8 py-2.5 border border-[#E8E2D9] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#F28482] focus:border-[#F28482] transition-all text-[#2D231B] font-bold cursor-pointer"
                  >
                    <option value="all">All Stages</option>
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A89F94] pointer-events-none">
                    <Filter className="w-3.5 h-3.5" />
                  </span>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A89F94] pointer-events-none">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Sort selector */}
                <div className="relative">
                  <select
                    id="sort-by-select"
                    value={sortBy}
                    onChange={(e) => handleSortChangeLocal(e.target.value)}
                    className="appearance-none bg-[#FDFCFB] pl-8 pr-8 py-2.5 border border-[#E8E2D9] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#F28482] focus:border-[#F28482] transition-all text-[#2D231B] font-bold cursor-pointer"
                  >
                    <option value="createdAt-desc">Date Created: Newest</option>
                    <option value="createdAt-asc">Date Created: Oldest</option>
                    <option value="updatedAt-desc">Recently Updated</option>
                    <option value="updatedAt-asc">Least Recently Updated</option>
                    <option value="name-asc">Alphabetical: A-Z</option>
                    <option value="name-desc">Alphabetical: Z-A</option>
                  </select>
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A89F94] pointer-events-none">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A89F94] pointer-events-none">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 w-full lg:w-auto">
              {/* Search bar */}
              <div className="relative flex-1 sm:flex-initial">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#A89F94] pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full bg-[#FDFCFB] pl-9 pr-4 py-2.5 border border-[#E8E2D9] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#F28482] focus:border-[#F28482] transition-all text-[#2D231B] font-semibold max-w-[200px] placeholder-[#A89F94]"
                />
              </div>

              {!isFavouritesCategory && categoryId !== 'archived' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 font-bold rounded-xl text-xs flex items-center gap-1 transition-all shadow-md bg-[#F28482] hover:bg-[#F28482]/85 text-white cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              )}
            </div>
          </div>

          {/* Grid container */}
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E2D9] warm-shadow-lg max-w-lg mx-auto space-y-3 animate-fade-in flex flex-col items-center">
              <div className="text-4xl text-vibrant-peach animate-pulse flex justify-center mb-1">
                {categoryId === 'archived' ? (
                  <Archive className="w-10 h-10 text-[#A89F94]" />
                ) : isFavouritesCategory ? (
                  '❤️'
                ) : (
                  '🧶'
                )}
              </div>
              <h3 className="font-serif font-extrabold text-[#2D231B] text-lg">
                {categoryId === 'archived'
                  ? 'No Archived Projects'
                  : isFavouritesCategory
                    ? 'No Favourites Yet'
                    : "It's So Quiet Here..."}
              </h3>
              <p className="text-xs text-[#7C7167] font-semibold max-w-[280px] mx-auto leading-relaxed">
                {categoryId === 'archived'
                  ? 'Projects you archive will be shown here. You can archive projects from the project details page.'
                  : isFavouritesCategory
                    ? 'Mark projects as favourites by clicking the heart icon on any project card to view them here.'
                    : 'Add your first crochet project'}
              </p>
              {categoryId !== 'archived' && !isFavouritesCategory && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-xs text-[#F28482] font-extrabold underline cursor-pointer mt-1"
                >
                  New Project
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {filteredProjects.map((p) => (
                  <div
                    key={p.projectId}
                    onClick={() => onSelectProject(p)}
                    className="group bg-white rounded-3xl border border-[#E8E2D9] hover:border-[#F28482]/30 warm-shadow hover:warm-shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden relative"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold text-[#A89F94] block flex items-center gap-1 uppercase tracking-widest">
                            <Calendar className="w-3 h-3 text-[#84A59D]" />
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                          <h3 className="font-serif font-extrabold text-[#2D231B] text-base group-hover:text-[#F28482] transition-colors line-clamp-1">{p.title}</h3>
                        </div>
                        {getStatusBadge(p.status)}
                      </div>

                      {/* Visual Project Thumbnail */}
                      {getProjectCoverPhoto(p) ? (
                        <div className="w-full h-32 rounded-2xl border border-[#E8E2D9] overflow-hidden bg-[#F9F6F2] relative">
                          <img
                            src={getProjectCoverPhoto(p)}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-2xl border border-dashed border-[#E8E2D9] bg-[#FDFCFB] flex flex-col items-center justify-center text-[#A89F94] gap-1 shrink-0">
                          <span className="text-2xl">🧶</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">No photos yet</span>
                        </div>
                      )}

                      {p.notes && (
                        <p className="text-[11px] text-[#7C7167] italic max-w-full truncate font-semibold">"{p.notes}"</p>
                      )}
                    </div>

                    {/* Bottom footer bar row trigger */}
                    <div className="bg-[#FDFCFB] border-t border-[#E8E2D9] px-6 py-3.5 flex justify-between items-center group-hover:bg-[#F9F6F2] transition-colors shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-[#2D231B] font-extrabold">
                        <span>Row Count Mark: <span className="text-[#F28482] font-mono">{p.rowCount}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(p.projectId);
                          }}
                          className={`p-1 px-1.5 bg-white border rounded-lg shrink-0 cursor-pointer transition-colors ${p.isFavorite
                            ? 'text-[#F28482] border-rose-100 hover:bg-rose-50/50'
                            : 'text-[#A89F94] hover:text-rose-500 border-[#E8E2D9] hover:bg-rose-50/50'
                            }`}
                          title={p.isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
                        >
                          <Heart
                            className="w-3.5 h-3.5 transition-colors"
                            fill={p.isFavorite ? '#F28482' : 'none'}
                            color={p.isFavorite ? '#F28482' : 'currentColor'}
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
                          className="p-1 px-1.5 bg-white hover:bg-red-55 text-[#A89F94] hover:text-red-500 border border-[#E8E2D9] hover:border-red-100 rounded-lg shrink-0 cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5 cursor-pointer" />
                        </button>
                        <span className="text-[10px] font-extrabold text-[#84A59D] group-hover:translate-x-1 duration-150 flex items-center gap-0.5">
                          Open Project
                          <Play className="w-2.5 h-2.5 fill-[#84A59D] text-transparent" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-[#E8E2D9] rounded-2xl p-4 warm-shadow">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[#7C7167] font-semibold">
                      Showing <span className="font-extrabold text-[#2D231B]">{page * pageSize + 1}</span> to{' '}
                      <span className="font-extrabold text-[#2D231B]">
                        {Math.min((page + 1) * pageSize, totalElements)}
                      </span>{' '}
                      of <span className="font-extrabold text-[#2D231B]">{totalElements}</span> projects
                    </span>

                    <div className="flex items-center gap-2 text-xs text-[#7C7167] font-semibold">
                      <span>Show:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          onPageSizeChange(Number(e.target.value));
                          onPageChange(0);
                        }}
                        className="bg-white border border-[#E8E2D9] rounded-lg p-1 text-[#2D231B] font-bold focus:outline-none focus:border-[#F28482] cursor-pointer"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={page === 0}
                      onClick={() => onPageChange(page - 1)}
                      className="p-2 px-3 border border-[#E8E2D9] rounded-xl text-[#7C7167] hover:text-[#2D231B] hover:bg-[#F9F6F2] disabled:opacity-40 disabled:hover:bg-transparent transition-all text-xs font-bold cursor-pointer"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => onPageChange(i)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${page === i
                            ? 'bg-[#F28482] text-white shadow-sm'
                            : 'border border-[#E8E2D9] text-[#7C7167] hover:text-[#2D231B] hover:bg-[#F9F6F2]'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      disabled={page === totalPages - 1}
                      onClick={() => onPageChange(page + 1)}
                      className="p-2 px-3 border border-[#E8E2D9] rounded-xl text-[#7C7167] hover:text-[#2D231B] hover:bg-[#F9F6F2] disabled:opacity-40 disabled:hover:bg-transparent transition-all text-xs font-bold cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 selection:bg-vibrant-peach/20 animate-fade-in animate-duration-100">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-[#E8E2D9] warm-shadow-lg space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-[#E8E2D9] pb-3">
              <h3 className="font-serif font-extrabold text-[#2D231B] text-lg">New Project</h3>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={isSubmitting}
                className="p-1 text-[#A89F94] hover:text-[#2D231B] rounded-lg hover:bg-stone-50 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Project Title *</label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="e.g. Sunny Day Tote Bag"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-3 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Notes</label>
                <textarea
                  rows={2}
                  disabled={isSubmitting}
                  placeholder="Need 2 balls of green, 1 ball of cream yarn..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-3 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold resize-none disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#F28482] hover:bg-[#F28482]/85 disabled:bg-[#F28482]/60 text-white font-bold rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 mt-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
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
