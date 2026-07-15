/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Folder, Plus, Trash2, Edit2, Check, X, LogOut, Scissors, PanelRightOpen, Archive, Heart, Settings, CircleUserRound, Camera, Lock } from 'lucide-react';
import { Category } from '../types';
import { useDialog } from './DialogProvider';
import { motion, AnimatePresence } from 'motion/react';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
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
  return /^[ \p{L}\p{N}\-_()#.\p{Emoji}\p{Extended_Pictographic}\p{M}\p{Cf}]+$/u.test(str) && /[\p{L}\p{N}\p{Emoji}\p{Extended_Pictographic}]/u.test(str);
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
  onUpdateUser: (user: any) => void;
  token: string | null;
  onUpdateToken?: (token: string) => void;
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
  onToggleCollapse,
  onUpdateUser,
  token,
  onUpdateToken
}: SidebarProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert, showConfirm } = useDialog();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempProfilePicture, setTempProfilePicture] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    const curPass = currentPassword.trim();
    const newPass = newPassword.trim();
    const confPass = confirmNewPassword.trim();

    if (!curPass || !newPass || !confPass) {
      showAlert('All password fields are required.', 'Missing Fields');
      return;
    }

    if (newPass.length < 6) {
      showAlert('New password must be at least 6 characters long.', 'Password Too Short');
      return;
    }

    if (newPass !== confPass) {
      showAlert('New passwords do not match.', 'Password Mismatch');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        throw new Error('No authenticated user session found.');
      }

      const credential = EmailAuthProvider.credential(auth.currentUser.email, curPass);
      await reauthenticateWithCredential(auth.currentUser, credential);

      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(`/api/v1/users/${currentUser?.userId}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPassword: newPass
        })
      });

      if (!response.ok) {
        let errMsg = 'Failed to update password on the server.';
        try {
          const data = await response.json();
          if (data && data.message) errMsg = data.message;
        } catch (_) {}
        throw new Error(errMsg);
      }

      setIsChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      await showAlert('Password updated successfully! For security, you will now be logged out.', 'Success');
      onLogout();

    } catch (err: any) {
      console.error('Password update failed:', err);
      let friendlyMsg = err.message || 'Verification failed. Please check your current password.';
      if (err.code === 'auth/wrong-password' || err.message?.includes('wrong-password')) {
        friendlyMsg = 'The current password you entered is incorrect.';
      } else if (err.code === 'auth/user-token-expired') {
        friendlyMsg = 'Your session expired. Please reload and try again.';
      }
      showAlert(friendlyMsg, 'Update Failed');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const openProfileModal = () => {
    setTempDisplayName(currentUser?.displayName || '');
    setTempProfilePicture(currentUser?.profilePicture || '');
    setIsProfileOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 2MB
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      showAlert('Profile picture size exceeds the maximum allowed limit of 2MB.', 'File Too Large');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    const name = tempDisplayName.trim();
    if (!name) return;

    setIsSavingProfile(true);
    let activeToken = token;
    try {
      // 1. Synchronize the display name update with Firebase Auth profile
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: name
          });
          // Force refresh token to update the displayName claim inside the ID Token
          const newToken = await auth.currentUser.getIdToken(true);
          activeToken = newToken;
          if (onUpdateToken) {
            onUpdateToken(newToken);
          }
        } catch (firebaseErr) {
          console.warn('Failed to update Firebase profile display name:', firebaseErr);
        }
      }

      // 2. Submit display name and profile picture to backend
      const response = await fetch(`/api/v1/users/${currentUser?.userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName: name,
          profilePicture: tempProfilePicture,
          crochetTerminology: currentUser?.crochetTerminology || 'US'
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        onUpdateUser(updatedUser);
        localStorage.setItem('crochet_user', JSON.stringify(updatedUser));
        setIsProfileOpen(false);
        await showAlert('Profile updated successfully!', 'Success');
      } else {
        let errorMsg = '';
        if (response.status >= 500) {
          errorMsg = 'An unexpected server error occurred. Please try again later.';
        } else {
          let rawMsg = 'Failed to update profile. Please try again.';
          try {
            const data = await response.json();
            if (data && data.message) rawMsg = data.message;
          } catch (_) { }

          if (rawMsg && (rawMsg.toLowerCase().includes('must be') || rawMsg.toLowerCase().includes('required') || rawMsg.toLowerCase().includes('already exists') || rawMsg.toLowerCase().includes('invalid name'))) {
            errorMsg = rawMsg;
          } else {
            errorMsg = 'Failed to update profile. Please check your inputs and try again.';
          }
        }
        await showAlert(errorMsg, 'Error');
      }
    } catch (err) {
      console.error(err);
      await showAlert('A network error occurred. Please check your connection.', 'Error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!token) return;
    const confirmed = await showConfirm(
      'Are you sure you want to deactivate your account? This will log you out immediately and make your profile inactive.',
      'Deactivate Account'
    );
    if (!confirmed) return;

    setIsDeactivating(true);
    try {
      const response = await fetch(`/api/v1/users/${currentUser?.userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setIsSettingsOpen(false);
        await showAlert('Your account has been successfully deactivated.', 'Account Deactivated');
        onLogout();
      } else {
        await showAlert('Failed to deactivate your account. Please try again.', 'Error');
      }
    } catch (err) {
      console.error(err);
      await showAlert('A network error occurred. Please try again.', 'Error');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed || isSubmitting) return;

    const capitalized = capitalizeWords(trimmed);
    const norm = capitalized.toLowerCase();
    if (norm === 'default' || norm === 'favourites ❤️') {
      await showAlert(`"${capitalized}" is a reserved category name.`);
      return;
    }
    if (!isValidName(capitalized)) {
      await showAlert('Category name can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, parentheses, and emojis.');
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
    const norm = capitalized.toLowerCase();
    if (norm === 'default' || norm === 'favourites ❤️') {
      await showAlert(`"${capitalized}" is a reserved category name.`);
      return;
    }
    if (!isValidName(capitalized)) {
      await showAlert('Category name can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, parentheses, and emojis.');
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
      className={`bg-[#F9F6F2] flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 border-r-0 overflow-hidden' : 'w-80 border-r border-[#E8E2D9]'
        }`}
    >
      <div className="w-80 h-full flex flex-col shrink-0">
        {/* Brand area */}
        <div className="p-6 border-b border-[#E8E2D9] bg-[#F9F6F2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧶</div>
            <div>
              <h2 className="font-sans font-bold text-xl text-[#2D231B] tracking-tight leading-tight">
                My Yarn <span className="text-[#F28482]">Diary</span>
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
              <PanelRightOpen className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* User profile segment */}
        <div className="p-4 mx-4 my-3 bg-white border border-[#E8E2D9] rounded-2xl flex flex-col gap-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isStockOrEmptyAvatar(currentUser?.profilePicture) ? (
                <img
                  src={currentUser.profilePicture}
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
              onClick={async () => {
                const confirmed = await showConfirm('Are you sure you want to sign out?');
                if (confirmed) onLogout();
              }}
              title="Sign Out"
              className="p-2 rounded-lg hover:bg-red-50 text-[#7C7167] hover:text-red-500 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 border-t border-[#F9F6F2] pt-2.5">
            <button
              className="flex-1 py-1.5 px-2 bg-[#F9F6F2] hover:bg-[#E8E2D9]/40 border border-[#E8E2D9]/60 rounded-xl text-[10px] font-bold text-[#7C7167] flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="User Profile"
              onClick={openProfileModal}
            >
              <CircleUserRound className="w-3.5 h-3.5 text-[#F28482]" />
              Profile
            </button>
            <button
              className="flex-1 py-1.5 px-2 bg-[#F9F6F2] hover:bg-[#E8E2D9]/40 border border-[#E8E2D9]/60 rounded-xl text-[10px] font-bold text-[#7C7167] flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Account Settings"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-3.5 h-3.5 text-[#84A59D]" />
              Settings
            </button>
          </div>
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
                placeholder="Category name"
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
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer border ${activeCategoryId === 'all'
              ? 'bg-white border-[#E8E2D9] text-[#F28482] font-semibold warm-shadow'
              : 'bg-transparent border-transparent hover:bg-white/40 text-[#4A3F35] hover:text-[#2D231B]'
              }`}
          >
            <div className="flex items-center gap-3 w-full">
              <Folder className={`w-4 h-4 shrink-0 ${activeCategoryId === 'all' ? 'text-[#F28482] fill-[#F5CAC3]/20' : 'text-[#A89F94]'}`} />
              <span className="text-xs truncate font-semibold">All Projects</span>
            </div>
          </div>

          <div
            onClick={() => onSelectCategory('archived')}
            className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer border ${activeCategoryId === 'archived'
              ? 'bg-white border-[#E8E2D9] text-[#F28482] font-semibold warm-shadow'
              : 'bg-transparent border-transparent hover:bg-white/40 text-[#4A3F35] hover:text-[#2D231B]'
              }`}
          >
            <div className="flex items-center gap-3 w-full">
              <Archive className={`w-4 h-4 shrink-0 ${activeCategoryId === 'archived' ? 'text-[#F28482] fill-[#F5CAC3]/20' : 'text-[#A89F94]'}`} />
              <span className="text-xs truncate font-semibold">Archived Projects</span>
            </div>
          </div>

          {categories.map((cat, index) => {
            const catId = cat.categoryId || (cat as any).folderId || `cat-${index}`;
            const isActive = catId === activeCategoryId;
            const isSystem = cat.userId === 'all';
            const isDefaultFold = cat.name.trim().toLowerCase() === 'default';
            const isFavouritesFold = cat.name === 'Favourites ❤️';
            const isProtected = isDefaultFold || isFavouritesFold;
            const isEditing = catId === editingCategoryId;

            return (
              <div
                key={catId}
                onClick={() => { if (!isEditing) onSelectCategory(catId); }}
                className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer border ${isActive
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
            <span className="flex items-center gap-1.5 justify-center">Stitched with Love <Heart className="w-3.5 h-3.5 text-[#F28482] fill-current" /></span>
          </p>
        </div>
      </div>

      {/* Profile Settings Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-[2rem] border border-[#E8E2D9] max-w-md w-full p-6 space-y-5 shadow-2xl relative text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-[#F9F6F2]">
                <h3 className="font-serif font-extrabold text-[#2D231B] text-lg flex items-center gap-2">
                  <CircleUserRound className="w-5 h-5 text-[#F28482]" />
                  Profile Settings
                </h3>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-[#7C7167] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <div className="space-y-4">
                {/* Profile Picture */}
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[11px] font-bold text-[#7C7167] uppercase tracking-widest self-start">Profile Picture</span>
                  <div className="relative group w-24 h-24 rounded-full overflow-hidden border border-[#E8E2D9] shadow-xs bg-[#F5CAC3] flex items-center justify-center">
                    {tempProfilePicture ? (
                      <img
                        src={tempProfilePicture}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-[#2D231B] font-serif font-extrabold text-2xl">
                        {getInitials(tempDisplayName || currentUser?.email)}
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <Camera className="w-5 h-5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = 'image/*';
                        fileInput.onchange = (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // File size validation (2MB)
                            if (file.size > 2 * 1024 * 1024) {
                              showAlert('Profile picture size exceeds the maximum allowed limit of 2MB.', 'File Too Large');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setTempProfilePicture(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        fileInput.click();
                      }}
                      className="py-1 px-3 bg-[#F9F6F2] hover:bg-[#E8E2D9]/40 border border-[#E8E2D9]/60 rounded-lg text-[10px] font-bold text-[#7C7167] transition-all cursor-pointer"
                    >
                      Choose Photo
                    </button>
                    {tempProfilePicture && (
                      <button
                        type="button"
                        onClick={() => setTempProfilePicture('')}
                        className="py-1 px-3 bg-red-50 hover:bg-red-100/60 border border-red-200 rounded-lg text-[10px] font-bold text-red-500 transition-all cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#7C7167] uppercase tracking-widest">Display Name</label>
                  <input
                    type="text"
                    value={tempDisplayName}
                    onChange={(e) => setTempDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={100}
                    className="w-full px-4 py-2.5 bg-white border border-[#E8E2D9] rounded-xl text-xs font-semibold text-[#2D231B] focus:border-[#F28482] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#F9F6F2]">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="px-4 py-2 bg-[#FDFCFB] hover:bg-[#F9F6F2] text-[#7C7167] border border-[#E8E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || !tempDisplayName.trim()}
                  className="px-5 py-2.5 bg-[#84A59D] hover:bg-[#84A59D]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Account Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-[2rem] border border-[#E8E2D9] max-w-md w-full p-6 space-y-5 shadow-2xl relative text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-[#F9F6F2]">
                <h3 className="font-serif font-extrabold text-[#2D231B] text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#84A59D]" />
                  Account Settings
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-[#7C7167] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-6">
                {/* Change Password Section */}
                <div className="space-y-2 bg-[#F9F6F2]/30 p-4 border border-[#E8E2D9]/40 rounded-2xl">
                  <h4 className="text-xs font-bold text-[#84A59D] uppercase tracking-widest">Change Password</h4>
                  <p className="text-[11px] text-[#7C7167] font-semibold leading-relaxed">
                    Update your password regularly to keep your account secure.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsChangePasswordOpen(true);
                    }}
                    className="mt-2 px-4 py-2 border border-[#84A59D]/40 bg-[#84A59D]/10 hover:bg-[#84A59D]/20 text-[#84A59D] font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Change Password
                  </button>
                </div>

                {/* Deactivate Account Section */}
                <div className="space-y-2 bg-[#F9F6F2]/30 p-4 border border-[#E8E2D9]/40 rounded-2xl">
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest">Deactivate Account</h4>
                  <p className="text-[11px] text-[#7C7167] font-semibold leading-relaxed">
                    Deactivating your account will make your profile inactive and log you out immediately. You can reactivate it later by logging back in.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeactivateAccount}
                    disabled={isDeactivating}
                    className="mt-2 px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40"
                  >
                    {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
                  </button>
                </div>

                {/* Delete Account Section */}
                <div className="space-y-2 bg-stone-50/50 p-4 border border-[#E8E2D9]/40 rounded-2xl">
                  <h4 className="text-xs font-bold text-[#2D231B] uppercase tracking-widest">Delete Account</h4>
                  <p className="text-[11px] text-[#7C7167] font-semibold leading-relaxed">
                    To permanently delete your account and all associated patterns, projects, and chat history, please email us to delete your account at:
                  </p>
                  <div className="flex items-center justify-between bg-white border border-[#E8E2D9]/60 px-3.5 py-2.5 rounded-xl mt-1">
                    <a
                      href="mailto:shrujith8320@gmail.com?subject=Delete%20My%20Yarn%20Diary%20Account"
                      className="text-xs font-bold text-[#84A59D] hover:underline transition-all"
                    >
                      shrujith8320@gmail.com
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('shrujith8320@gmail.com');
                        showAlert('Email copied to clipboard!', 'Copied');
                      }}
                      className="text-[10px] font-bold text-[#7C7167] bg-[#F9F6F2] hover:bg-[#E8E2D9]/60 px-2 py-1 rounded-md border border-[#E8E2D9]/30 transition-all cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end pt-2 border-t border-[#F9F6F2]">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2.5 bg-[#7C7167] hover:bg-[#7C7167]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangePasswordOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-[2rem] border border-[#E8E2D9] max-w-md w-full p-6 space-y-5 shadow-2xl relative text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-[#F9F6F2]">
                <h3 className="font-serif font-extrabold text-[#2D231B] text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#84A59D]" />
                  Change Password
                </h3>
                <button
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-[#7C7167] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#7C7167] uppercase tracking-widest">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 bg-white border border-[#E8E2D9] rounded-xl text-xs font-semibold text-[#2D231B] focus:border-[#F28482] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#7C7167] uppercase tracking-widest">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full px-4 py-2.5 bg-white border border-[#E8E2D9] rounded-xl text-xs font-semibold text-[#2D231B] focus:border-[#F28482] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#7C7167] uppercase tracking-widest">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-2.5 bg-white border border-[#E8E2D9] rounded-xl text-xs font-semibold text-[#2D231B] focus:border-[#F28482] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#F9F6F2]">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-4 py-2 bg-[#FDFCFB] hover:bg-[#F9F6F2] text-[#7C7167] border border-[#E8E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword || !currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()}
                  className="px-5 py-2.5 bg-[#84A59D] hover:bg-[#84A59D]/90 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isUpdatingPassword ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : 'Update Password'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
