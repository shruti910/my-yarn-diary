import React, { useState, useEffect, useMemo } from 'react';
import { Project } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { YarnSpinner } from './YarnSpinner';
import { Image, Filter, Calendar, BookOpen, Sparkles, X, ChevronLeft, ChevronRight, Projector, CircleCheckBig, ImageIcon, ChevronDown } from 'lucide-react';

interface ProjectGalleryProps {
  projects: Project[];
  token: string;
}

interface GalleryItem {
  id: string; // unique ID
  src: string;
  type: 'journal' | 'endProduct';
  projectName: string;
  projectId: string;
  date: string;
  description: string;
}

export function ProjectGallery({ projects: initialProjects, token }: ProjectGalleryProps) {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'endProduct' | 'journal'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await fetch('/api/v1/galleries', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.status === 401) {
          window.dispatchEvent(new Event('unauthorized'));
        }
        if (response.ok) {
          const data = await response.json();
          setGalleryItems(data);
        }
      } catch (err) {
        console.error('Failed to fetch gallery items:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAllProjectsList = async () => {
      try {
        // Use the global URL from env
        const baseUrl = import.meta.env.VITE_GATEWAY_URL || '';
        const res = await fetch(`${baseUrl}/api/v1/projects?size=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.content) {
            setAllProjects(data.content);
          }
        }
      } catch (err) {
        console.error('Failed to load full projects list for gallery dropdown:', err);
      }
    };

    fetchGallery();
    fetchAllProjectsList();
  }, [token]);

  // Filter based on state parameters
  const filteredItems = useMemo(() => {
    return galleryItems.filter((item) => {
      const matchesCategory =
        activeCategoryFilter === 'all' || item.type === activeCategoryFilter;
      const matchesProject =
        selectedProjectId === 'all' || item.projectId === selectedProjectId;
      return matchesCategory && matchesProject;
    });
  }, [galleryItems, activeCategoryFilter, selectedProjectId]);

  // Handle lightbox navigation
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && filteredItems.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && filteredItems.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
    }
  };

  const currentLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <div id="project-media-gallery-hub" className="max-w-6xl mx-auto p-2.5 md:p-6 space-y-3 md:space-y-5">
      {/* Header and filters card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-2.5 md:p-5 border border-subtle warm-shadow w-full">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4 w-full min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl flex items-center justify-center text-accent bg-accent/10 rounded-xl w-8 h-8 md:w-10 md:h-10"><ImageIcon className="w-4 h-4 md:w-5 md:h-5" /></span>
            <div className="min-w-0">
              <h2 className="text-sm md:text-lg font-extrabold font-serif text-heading leading-tight">Photo Gallery</h2>
              {/* The full line wraps to two rows on a 412px phone, so the flourish is
                  desktop-only and small screens keep just the useful count. */}
              <p className="text-[11px] text-muted font-bold tracking-wide">
                <span className="hidden md:inline">Beautiful memories of your handiwork · </span>
                {galleryItems.length} {galleryItems.length === 1 ? 'photo' : 'photos'}
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink min-w-0 w-full lg:w-auto justify-end">
            {/* Category selection */}
            <div className="flex bg-white border border-subtle rounded-xl p-1 shadow-sm overflow-x-auto scrollbar-none touch-pan-x shrink min-w-0 max-w-full w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setActiveCategoryFilter('all'); setLightboxIndex(null); }}
                className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] font-extrabold tracking-wide rounded-lg transition-all cursor-pointer ${activeCategoryFilter === 'all'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted hover:text-heading'
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setActiveCategoryFilter('endProduct'); setLightboxIndex(null); }}
                title="Finished items"
                aria-label="Finished items"
                className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] font-extrabold tracking-wide rounded-lg transition-all cursor-pointer ${activeCategoryFilter === 'endProduct'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted hover:text-heading'
                  }`}
              >
                <span className="flex items-center gap-1.5 justify-center">
                  <CircleCheckBig className="w-3.5 h-3.5 shrink-0" />
                  <span className={activeCategoryFilter === 'endProduct' ? 'inline' : 'hidden sm:inline'}>Finished</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveCategoryFilter('journal'); setLightboxIndex(null); }}
                title="Journal updates"
                aria-label="Journal updates"
                className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] font-extrabold tracking-wide rounded-lg transition-all cursor-pointer ${activeCategoryFilter === 'journal'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted hover:text-heading'
                  }`}
              >
                <span className="flex items-center gap-1.5 justify-center">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className={activeCategoryFilter === 'journal' ? 'inline' : 'hidden sm:inline'}>Journal</span>
                </span>
              </button>
            </div>

            {/* Project dropdown filter */}
            <div className="relative shrink-0 w-full sm:w-48 lg:w-64">
              <CustomDropdown
                value={selectedProjectId}
                onChange={(val) => { setSelectedProjectId(val); setLightboxIndex(null); }}
                options={[
                  { value: 'all', label: 'All Projects' },
                  ...allProjects.map(p => ({ value: p.projectId, label: p.title }))
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid workspace */}
      {loading ? (
        <div className="flex justify-center items-center py-24 bg-white rounded-3xl border border-subtle warm-shadow-lg">
          <YarnSpinner className="h-8 w-8 text-brand" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-subtle warm-shadow-lg max-w-lg mx-auto space-y-3">
          <div className="text-4xl animate-pulse flex justify-center text-muted"><ImageIcon className="w-12 h-12" /></div>
          <h3 className="font-serif font-extrabold text-heading text-base">No Photos Found</h3>
          <p className="text-xs text-muted font-semibold">
            {galleryItems.length === 0
              ? 'Start adding photos into your end product showpiece cards or within your Journal entries to see them listed in here!'
              : 'Try adjusting your chosen category filters or selection dropdown.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              onClick={() => setLightboxIndex(index)}
              className="bg-white rounded-2xl overflow-hidden border border-subtle hover:border-brand/40 hover:scale-[1.02] active:scale-[0.99] warm-shadow hover:warm-shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              {/* Photo Area */}
              <div className="aspect-square w-full bg-surface overflow-hidden relative">
                <img
                  src={item.src}
                  alt={item.projectName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badge label */}
                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                  {item.type === 'endProduct' ? (
                    <span className="text-[11px] bg-accent text-white px-2 py-0.5 rounded-full font-bold shadow-xs flex items-center gap-1">
                      <CircleCheckBig className="w-2.5 h-2.5" /> End Product
                    </span>
                  ) : (
                    <span className="text-[11px] bg-brand-light text-heading px-2 py-0.5 rounded-full font-bold shadow-xs flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" /> Journal Log
                    </span>
                  )}
                </div>
              </div>

              {/* Text Meta Area */}
              <div className="p-2.5 sm:p-3.5 space-y-1 sm:space-y-1.5 bg-surface border-t border-subtle">
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-extrabold text-heading line-clamp-1 group-hover:text-brand transition-colors">
                    {item.projectName}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                </div>
                {item.description && (
                  <p className="text-[11px] text-muted line-clamp-2 italic leading-relaxed">
                    "{item.description}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal Window */}
      {currentLightboxItem && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Main frame */}
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90dvh] flex flex-col md:flex-row border border-subtle shadow-2xl relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Canvas Panel */}
            {/* min-h-0 lets this shrink inside the capped flex column instead of
                overflowing; no aspect-square, which blew past the viewport in landscape. */}
            <div className="bg-black/5 dark:bg-black/20 flex-1 min-h-0 flex items-center justify-center relative md:h-[500px]">
              <img
                src={currentLightboxItem.src}
                alt={currentLightboxItem.projectName}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain p-2"
              />

              {/* Close icon */}
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 left-4 w-9 h-9 bg-black/60 hover:bg-black text-white hover:scale-105 rounded-full flex items-center justify-center cursor-pointer transition-all border border-white/15"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left arrow nav */}
              {filteredItems.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-105 border border-white/10"
                >
                  <ChevronLeft className="w-5 h-5 animate-pulse" />
                </button>
              )}

              {/* Right arrow nav */}
              {filteredItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-105 border border-white/10"
                >
                  <ChevronRight className="w-5 h-5 animate-pulse" />
                </button>
              )}
            </div>

            {/* Sidebar information card */}
            <div className="w-full md:w-80 shrink-0 p-4 sm:p-6 flex flex-col justify-between bg-white border-t md:border-t-0 md:border-l border-subtle max-h-[40dvh] md:max-h-[500px] overflow-y-auto">
              {/* Top part */}
              <div className="space-y-4">
                <div className="space-y-1.5 border-b border-subtle pb-3">
                  <div className="flex items-center gap-1.5">
                    {currentLightboxItem.type === 'endProduct' ? (
                      <span className="text-[11px] uppercase bg-accent text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CircleCheckBig className="w-2.5 h-2.5 text-white" /> End Product
                      </span>
                    ) : (
                      <span className="text-[11px] uppercase bg-brand-light text-heading px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5 text-heading" /> Journal Log
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif font-extrabold text-heading text-base leading-tight">
                    {currentLightboxItem.projectName}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Uploaded {new Date(currentLightboxItem.date).toLocaleDateString()} at {new Date(currentLightboxItem.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] uppercase font-bold tracking-widest text-muted block">
                    Comment
                  </span>
                  <p className="text-[11px] text-muted italic font-semibold leading-relaxed bg-page p-3 rounded-xl border border-subtle/60">
                    "{currentLightboxItem.description}"
                  </p>
                </div>
              </div>

              {/* Bottom part close trigger */}
              <div className="pt-4 border-t border-subtle flex justify-between items-center text-[11px] font-semibold text-muted">
                <span>{lightboxIndex !== null ? `${lightboxIndex + 1} of ${filteredItems.length}` : ''}</span>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="text-xs text-brand hover:underline font-bold font-sans cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
