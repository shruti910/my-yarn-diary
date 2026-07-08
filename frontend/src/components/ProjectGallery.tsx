import React, { useState, useEffect, useMemo } from 'react';
import { Project } from '../types';
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

export function ProjectGallery({ projects, token }: ProjectGalleryProps) {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'endProduct' | 'journal'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
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
    fetchGallery();
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
    <div id="project-media-gallery-hub" className="space-y-6">
      {/* Header and filters card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] warm-shadow space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl flex items-center justify-center text-[#84A59D] bg-[#84A59D]/10 rounded-xl w-10 h-10"><ImageIcon className="w-5 h-5" /></span>
            <div>
              <h2 className="text-lg font-extrabold font-serif text-[#2D231B]">Project Media Gallery</h2>
              <p className="text-[10px] text-[#A89F94] font-bold uppercase tracking-widest block font-mono">
                Beautiful memories of your handiwork progress {galleryItems.length > 0 ? `(${galleryItems.length} photos)` : ''}
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Category selection */}
            <div className="flex bg-[#FDFCFB] border border-[#E8E2D9] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => { setActiveCategoryFilter('all'); setLightboxIndex(null); }}
                className={`px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeCategoryFilter === 'all'
                    ? 'bg-[#F28482] text-white'
                    : 'text-[#7C7167] hover:text-[#2D231B]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setActiveCategoryFilter('endProduct'); setLightboxIndex(null); }}
                className={`px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeCategoryFilter === 'endProduct'
                    ? 'bg-[#84A59D] text-white'
                    : 'text-[#7C7167] hover:text-[#2D231B]'
                }`}
              >
                <span className="flex items-center gap-1.5 justify-center"><CircleCheckBig className="w-3 h-3" /> Finished items</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveCategoryFilter('journal'); setLightboxIndex(null); }}
                className={`px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeCategoryFilter === 'journal'
                    ? 'bg-[#F5CAC3] text-[#2D231B]'
                    : 'text-[#7C7167] hover:text-[#2D231B]'
                }`}
              >
                <span className="flex items-center gap-1.5 justify-center"><BookOpen className="w-3 h-3" /> Journal updates</span>
              </button>
            </div>

            {/* Project dropdown filter */}
            <div className="relative w-full sm:w-48">
              <select
                value={selectedProjectId}
                onChange={(e) => { setSelectedProjectId(e.target.value); setLightboxIndex(null); }}
                className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-[11px] font-bold py-2 px-3 pr-8 rounded-xl text-[#2D231B] appearance-none focus:outline-none focus:ring-1 focus:ring-[#F28482] focus:border-[#F28482]"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.title}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-[#7C7167]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid workspace */}
      {loading ? (
        <div className="flex justify-center items-center py-24 bg-white rounded-3xl border border-[#E8E2D9] warm-shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F28482]" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E2D9] warm-shadow-lg max-w-lg mx-auto space-y-3">
          <div className="text-4xl animate-pulse flex justify-center text-[#A89F94]"><ImageIcon className="w-12 h-12" /></div>
          <h3 className="font-serif font-extrabold text-[#2D231B] text-base">No Photos Found</h3>
          <p className="text-xs text-[#7C7167] font-semibold">
            {galleryItems.length === 0
              ? 'Start adding photos into your end product showpiece cards or within your Journal entries to see them listed in here!'
              : 'Try adjusting your chosen category filters or selection dropdown.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              onClick={() => setLightboxIndex(index)}
              className="bg-white rounded-2xl overflow-hidden border border-[#E8E2D9] hover:border-[#F28482]/40 hover:scale-[1.02] active:scale-[0.99] warm-shadow hover:warm-shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              {/* Photo Area */}
              <div className="aspect-square w-full bg-[#FDFCFB] overflow-hidden relative">
                <img
                  src={item.src}
                  alt={item.projectName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Badge label */}
                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                  {item.type === 'endProduct' ? (
                    <span className="text-[9px] bg-[#84A59D] text-white px-2 py-0.5 rounded-full font-bold shadow-xs flex items-center gap-1">
                      <CircleCheckBig className="w-2.5 h-2.5" /> End Product
                    </span>
                  ) : (
                    <span className="text-[9px] bg-[#F5CAC3] text-[#2D231B] px-2 py-0.5 rounded-full font-bold shadow-xs flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" /> Journal Log
                    </span>
                  )}
                </div>
              </div>

              {/* Text Meta Area */}
              <div className="p-3.5 space-y-2 bg-[#FDFCFB] border-t border-[#F1EFEA]">
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-extrabold text-[#2D231B] line-clamp-1 group-hover:text-[#F28482] transition-colors">
                    {item.projectName}
                  </h4>
                  <div className="flex items-center gap-1 text-[9px] text-[#A89F94] font-mono">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                </div>
                {item.description && (
                  <p className="text-[10px] text-[#7C7167] line-clamp-2 italic leading-relaxed">
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
            className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row border border-[#E8E2D9] shadow-2xl relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Canvas Panel */}
            <div className="bg-black/5 dark:bg-black/20 flex-1 flex items-center justify-center relative aspect-square md:aspect-auto md:h-[500px]">
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
            <div className="w-full md:w-80 p-6 flex flex-col justify-between bg-white border-t md:border-t-0 md:border-l border-[#E8E2D9] max-h-[250px] md:max-h-[500px] overflow-y-auto">
              {/* Top part */}
              <div className="space-y-4">
                <div className="space-y-1.5 border-b border-[#F9F6F2] pb-3">
                  <div className="flex items-center gap-1.5">
                    {currentLightboxItem.type === 'endProduct' ? (
                      <span className="text-[9px] uppercase bg-[#84A59D] text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CircleCheckBig className="w-2.5 h-2.5 text-white" /> End Product
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase bg-[#F5CAC3] text-[#2D231B] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5 text-[#2D231B]" /> Journal Log
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif font-extrabold text-[#2D231B] text-base leading-tight">
                    {currentLightboxItem.projectName}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-[#A89F94] font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Uploaded {new Date(currentLightboxItem.date).toLocaleDateString()} at {new Date(currentLightboxItem.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#A89F94] block">
                    Comment
                  </span>
                  <p className="text-[11px] text-[#7C7167] italic font-semibold leading-relaxed bg-[#F9F6F2] p-3 rounded-xl border border-[#E8E2D9]/60">
                    "{currentLightboxItem.description}"
                  </p>
                </div>
              </div>

              {/* Bottom part close trigger */}
              <div className="pt-4 border-t border-[#FDFCFB] flex justify-between items-center text-[10px] font-semibold text-[#A89F94] font-mono">
                <span>{lightboxIndex !== null ? `${lightboxIndex + 1} of ${filteredItems.length}` : ''}</span>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="text-xs text-[#F28482] hover:underline font-bold font-sans cursor-pointer"
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
