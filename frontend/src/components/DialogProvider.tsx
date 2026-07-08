/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, HelpCircle, CheckCircle2, X } from 'lucide-react';

interface DialogOptions {
  title?: string;
  message: string;
  type: 'alert' | 'confirm';
  resolve: (value: boolean) => void;
}

interface DialogContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<DialogOptions | null>(null);
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

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showAlert = (message: string, title: string = 'Warning') => {
    return new Promise<void>((resolve) => {
      setActiveDialog({
        title,
        message,
        type: 'alert',
        resolve: () => {
          setActiveDialog(null);
          resolve();
        },
      });
    });
  };

  const showConfirm = (message: string, title: string = 'Confirmation') => {
    return new Promise<boolean>((resolve) => {
      setActiveDialog({
        title,
        message,
        type: 'confirm',
        resolve: (value: boolean) => {
          setActiveDialog(null);
          resolve(value);
        },
      });
    });
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}
      <AnimatePresence>
        {activeDialog && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-[2rem] border border-[#E8E2D9] max-w-sm w-full p-6 space-y-5 shadow-2xl relative"
            >
              {/* Header section with themed color icon */}
              {(() => {
                const isSuccess = activeDialog.title && (
                  activeDialog.title.toLowerCase().includes('success') ||
                  activeDialog.title.toLowerCase().includes('copied') ||
                  activeDialog.title.toLowerCase().includes('saved') ||
                  activeDialog.title.toLowerCase().includes('completed') ||
                  activeDialog.title.toLowerCase().includes('deactivated')
                );

                return (
                  <>
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-2xl shrink-0 ${activeDialog.type === 'confirm' || isSuccess
                            ? 'bg-[#84A59D]/15 text-[#84A59D] border border-[#84A59D]/20'
                            : 'bg-[#F28482]/15 text-[#F28482] border border-[#F28482]/20'
                          }`}
                      >
                        {activeDialog.type === 'confirm' ? (
                          <HelpCircle className="w-5 h-5 animate-pulse" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-serif font-extrabold text-[#2D231B] text-base leading-snug">
                          {activeDialog.title}
                        </h4>
                        <p className="text-xs text-[#7C7167] font-semibold leading-relaxed whitespace-pre-wrap">
                          {activeDialog.message}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons footer */}
                    <div className="flex justify-end gap-2.5 pt-1">
                      {activeDialog.type === 'confirm' && (
                        <button
                          type="button"
                          onClick={() => activeDialog.resolve(false)}
                          className="px-4 py-2 bg-[#FDFCFB] hover:bg-[#F9F6F2] text-[#7C7167] border border-[#E8E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer hover:border-[#84A59D]"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => activeDialog.resolve(true)}
                        className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer ${activeDialog.type === 'confirm' || isSuccess
                            ? 'bg-[#84A59D] hover:bg-[#84A59D]/90 shadow-[#84A59D]/20'
                            : 'bg-[#F28482] hover:bg-[#F28482]/90 shadow-[#F28482]/20'
                          }`}
                      >
                        {activeDialog.type === 'confirm' ? 'Confirm' : 'OK'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Toast component wrapper */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] w-full max-w-xs md:max-w-sm p-4 rounded-2xl border backdrop-blur-md shadow-lg flex items-start gap-3 ${toast.type === 'success'
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
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
