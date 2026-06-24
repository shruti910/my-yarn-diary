/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Folder, Plus, Trash2, Edit2, Check, X, LogOut, Scissors, ChevronLeft } from 'lucide-react';
import { Category } from '../types';
import { useDialog } from './DialogProvider';
import packageJson from '../../package.json';

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
  return /[\p{L}\p{N}]/u.test(str);
};

const isStockOrEmptyAvatar = (url?: string): boolean => {
  if (!url) return true;
  return url.includes('images.unsplash.com/photo-1535713875002-d1d0cf377fde') || 
         url.includes('images.unsplash.com/photo-1544005313-94ddf0286df2');
};

const getInitials = (name?: string): string => {
  if (!name) return 'C';
  const trimmed = name.trim();
  if (!trimmed) return 'C';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, Math.min(2, trimmed.length)).toUpperCase();
};


interface SidebarProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onCreateCategory: (name: string) => Promise<any>;
  onRenameCategory: (categoryId: string, newName: string) => Promise<any>;
  onDeleteCategory: (categoryId: string) => void;
  currentUser: any;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  categories,
  activeCategoryId,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  currentUser,
  onLogout,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert, showConfirm } = useDialog();

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed || isSubmitting) return;

    const capitalized = capitalizeWords(trimmed);
    if (!isValidName(capitalized)) {
      await showAlert('Category name must contain at least one letter or digit.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateCategory(capitalized);
      setNewCategoryName('');
      setIsAdding(false);
    } catch (err) {
      // Caught by global toast system
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting category
    setEditingCategoryId(cat.categoryId);
    setEditCategoryName(cat.name);
  };

  const saveRename = async (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    const trimmed = editCategoryName.trim();
    if (!trimmed || isSubmitting) return;

    const capitalized = capitalizeWords(trimmed);
    if (!isValidName(capitalized)) {
      await showAlert('Category name must contain at least one letter or digit.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRenameCategory(cat.categoryId, capitalized);
      setEditingCategoryId(null);
    } catch (err) {
      // Caught by global toast system
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategoryId(null);
  };

  const handleDelete = async (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm('Are you sure you want to delete this category? All projects inside will be deleted.');
    if (confirmed) {
      onDeleteCategory(categoryId);
    }
  };

  return (
    <div 
      id="sidebar-container" 
      className={`bg-[#F9F6F2] flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-0 border-r-0 overflow-hidden' : 'w-80 border-r border-[#E8E2D9]'
      }`}
    >
      <div className="w-80 h-full flex flex-col shrink-0">
        {/* Brand area */}
        <div className="p-6 border-b border-[#E8E2D9] bg-[#F9F6F2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧶</div>
            <div>
              <h2 className="font-sans font-bold text-xl text-[#2D231B] tracking-tight leading-tight">
                crochet<span className="text-[#F28482]">.ai</span>
              </h2>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#84A59D]">Crafter Companion</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#A89F94] text-[10px] font-mono">v{packageJson.version}</span>
            <button 
              onClick={onToggleCollapse}
              className="p-2 bg-white border border-[#E8E2D9] text-[#7C7167] hover:text-[#F28482] hover:border-[#F28482]/30 rounded-xl shadow-xs transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* User profile segment */}
        <div className="p-4 mx-4 my-3 bg-white border border-[#E8E2D9] rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {!isStockOrEmptyAvatar(currentUser?.avatarUrl) ? (
              <img 
                src={currentUser.avatarUrl} 
                alt="User avatar" 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover border border-[#E8E2D9]"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-[#F28482] to-[#F5CAC3] border border-[#E8E2D9] select-none shadow-xs">
                {getInitials(currentUser?.displayName || currentUser?.email)}
              </div>
            )}
            <div className="max-w-[120px]">
              <h4 className="font-sans text-xs font-bold text-[#2D231B] truncate">{currentUser?.displayName}</h4>
              <p className="text-[10px] text-[#F28482] font-semibold truncate uppercase tracking-wider">{currentUser?.email.split('@')[0]}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg hover:bg-red-50 text-[#7C7167] hover:text-red-500 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Categories List Title */}
        <div className="px-6 py-2 flex items-center justify-between mt-2">
          <span className="text-[11px] font-bold text-[#7C7167] uppercase tracking-widest">categories</span>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded-md hover:bg-white text-[#F28482] transition-colors cursor-pointer"
            title="New Category"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Category Adding Input form */}
        {isAdding && (
          <form onSubmit={handleAddSubmit} className="px-6 py-2">
            <div className="flex items-center gap-1 bg-white p-1 border border-[#E8E2D9] rounded-xl shadow-xs">
              <input 
                type="text"
                autoFocus
                disabled={isSubmitting}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category tag name..."
                className="bg-transparent border-none text-xs text-[#2D231B] p-1.5 focus:outline-none w-full placeholder-[#A89F94] font-semibold disabled:opacity-60"
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="p-1 bg-[#F28482] text-white rounded-lg hover:bg-[#F28482]/80 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={() => setIsAdding(false)} 
                className="p-1 text-[#A89F94] hover:text-[#7C7167] disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Categories scroll panel */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
          {/* All Projects Option */}
          <div
            onClick={() => onSelectCategory('all')}
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer border ${
              activeCategoryId === 'all'
                ? 'bg-white border-[#E8E2D9] text-[#F28482] font-semibold warm-shadow' 
                : 'bg-transparent border-transparent hover:bg-white/40 text-[#4A3F35] hover:text-[#2D231B]'
            }`}
          >
            <div className="flex items-center gap-3 w-full">
              <Folder className={`w-4 h-4 shrink-0 ${activeCategoryId === 'all' ? 'text-[#F28482] fill-[#F5CAC3]/20' : 'text-[#A89F94]'}`} />
              <span className="text-xs truncate font-semibold">All Projects</span>
            </div>
          </div>

          {categories.map((cat, index) => {
            const catId = cat.categoryId || (cat as any).folderId || `cat-${index}`;
            const isActive = catId === activeCategoryId;
            const isSystem = cat.userId === 'all';
            const isDefaultFold = cat.name.trim().toLowerCase() === 'default';
            const isFavouritesFold = cat.name.trim().toLowerCase() === 'favourites ❤️' || cat.name.trim().toLowerCase() === 'favourites';
            const isProtected = isDefaultFold || isFavouritesFold;
            const isEditing = catId === editingCategoryId;

            return (
              <div
                key={catId}
                onClick={() => { if (!isEditing) onSelectCategory(catId); }}
                className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer border ${
                  isActive 
                    ? 'bg-white border-[#E8E2D9] text-[#F28482] font-semibold warm-shadow' 
                    : 'bg-transparent border-transparent hover:bg-white/40 text-[#4A3F35] hover:text-[#2D231B]'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <Folder className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F28482] fill-[#F5CAC3]/20' : 'text-[#A89F94]'}`} />
                  {isEditing ? (
                    <input
                       type="text"
                       value={editCategoryName}
                       disabled={isSubmitting}
                       onClick={(e) => e.stopPropagation()}
                       onChange={(e) => setEditCategoryName(e.target.value)}
                       className="w-full bg-white border border-[#E8E2D9] rounded-lg text-xs p-1 focus:outline-none text-[#2D231B] disabled:opacity-60"
                    />
                  ) : (
                    <span className="text-xs truncate font-semibold">{cat.name}</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={(e) => saveRename(cat, e)} 
                        disabled={isSubmitting}
                        className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-40"
                      >
                        {isSubmitting ? (
                          <svg className="animate-spin h-3 w-3 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </button>
                      <button 
                        onClick={cancelRename} 
                        disabled={isSubmitting}
                        className="p-1 rounded text-[#A89F94] hover:bg-stone-100 disabled:opacity-40"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    !isSystem && !isProtected && (
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                        <button
                          onClick={(e) => startEditing(cat, e)}
                          className="p-1 rounded text-[#A89F94] hover:text-[#F28482] hover:bg-white/70"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(cat.categoryId, e)}
                          className="p-1 rounded text-[#A89F94] hover:text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar decorative footer badge */}
        <div className="p-4 border-t border-[#E8E2D9] bg-[#F9F6F2] text-center space-y-1">
          <p className="text-[10px] font-bold text-[#7C7167] uppercase tracking-widest flex items-center justify-center gap-1">
            Stitched with Love 🧶
          </p>
        </div>
      </div>
    </div>
  );
}
