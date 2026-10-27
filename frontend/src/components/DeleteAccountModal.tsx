import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Lock, Download, Trash2, X, Loader2, CheckCircle2 } from 'lucide-react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { generateAccountArchiveZip } from '../lib/archiveExport';
import { Project, User, Category } from '../types';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  token: string | null;
  categories: Category[];
  projects: Project[];
}

type ModalStep = 'CONFIRM_WARNING' | 'REAUTH' | 'EXPORT_CHOICE' | 'FAREWELL_LOADER';

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  token,
  categories,
  projects
}) => {
  const [step, setStep] = useState<ModalStep>('CONFIRM_WARNING');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [farewellMessage, setFarewellMessage] = useState('Fastening off your journey...');
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  if (!isOpen) return null;

  const isGoogleUser = auth.currentUser?.providerData.some(
    p => p.providerId === GoogleAuthProvider.PROVIDER_ID
  );

  const handleReauth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const fbUser = auth.currentUser;
      if (!fbUser) throw new Error('No authenticated user session found.');

      if (isGoogleUser) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(fbUser, provider);
      } else {
        if (!fbUser.email) throw new Error('Account email missing.');
        const credential = EmailAuthProvider.credential(fbUser.email, password);
        await reauthenticateWithCredential(fbUser, credential);
      }

      setIsProcessing(false);
      setStep('EXPORT_CHOICE');
    } catch (err: any) {
      setIsProcessing(false);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Incorrect password. Please verify your credentials and try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed attempts. Please wait a few moments and try again.');
      } else {
        setErrorMessage(err.message || 'Re-authentication failed. Please try again.');
      }
    }
  };

  const generateAndDownloadZip = async () => {
    setIsProcessing(true);
    setExportProgress('Preparing your projects archive...');

    try {
      const zipBlob = await generateAccountArchiveZip({
        projects,
        categories,
        currentUser,
        token,
        onProgress: setExportProgress
      });

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `MyYarnDiary_Archive_${dateStr}.zip`;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      setIsProcessing(false);
      setExportProgress(null);
    } catch (err: any) {
      console.error('Failed generating zip export:', err);
      setIsProcessing(false);
      setExportProgress(null);
      setErrorMessage('Failed to generate export archive. You can still proceed with deletion.');
    }
  };

  const executePermanentDeletion = async () => {
    setStep('FAREWELL_LOADER');
    setFarewellMessage('Fastening off your journey...');

    // Change message after 1.5s
    const timer = setTimeout(() => {
      setFarewellMessage("Snipping the final thread. We're sorry to see you go.");
    }, 1500);

    try {
      const fbUser = auth.currentUser;
      const freshToken = fbUser ? await fbUser.getIdToken(true) : token;

      const res = await fetch(`/api/v1/users/${currentUser.userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${freshToken}`,
          'X-User-Id': currentUser.userId,
          'X-Firebase-Uid': fbUser?.uid || ''
        }
      });

      if (!res.ok && res.status !== 404) {
        let serverMsg = 'Failed to delete account from server.';
        try {
          const errorData = await res.json();
          if (errorData?.message) {
            serverMsg = errorData.message;
          } else if (errorData?.error) {
            serverMsg = errorData.error;
          }
        } catch {
          // If not JSON, try text
          const textMsg = await res.text().catch(() => null);
          if (textMsg) serverMsg = textMsg;
        }
        throw new Error(serverMsg);
      }

      // Cleanup client storage and log out
      localStorage.removeItem('crochet_user');
      localStorage.removeItem('crochet_token');
      sessionStorage.clear();
      await signOut(auth);

      clearTimeout(timer);
      window.location.href = '/';
    } catch (err: any) {
      clearTimeout(timer);
      console.error('Account deletion failure:', err);
      setStep('EXPORT_CHOICE');
      setErrorMessage(err.message || 'Deletion failed. Please try again or contact support.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl border border-subtle max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
      >
        {step !== 'FAREWELL_LOADER' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-muted hover:text-brand hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: ATTENTION RED WARNING */}
          {step === 'CONFIRM_WARNING' && (
            <motion.div
              key="warning"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-100 text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-600">Delete Account?</h3>
                  <p className="text-xs text-muted">Permanent, irreversible action</p>
                </div>
              </div>

              <div className="bg-red-50/70 border border-red-200/60 rounded-2xl p-4 text-xs font-semibold text-red-800 leading-relaxed">
                This action cannot be undone. All your projects, patterns, photos and chat logs will be lost forever.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-subtle text-xs font-bold text-heading hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep('REAUTH')}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-md transition-colors cursor-pointer"
                >
                  Yes, Continue to Delete
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: RE-AUTHENTICATION */}
          {step === 'REAUTH' && (
            <motion.div
              key="reauth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-100 text-amber-700">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-heading">Verify Your Identity</h3>
                  <p className="text-xs text-muted">Security confirmation required</p>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
                  {errorMessage}
                </div>
              )}

              {isGoogleUser ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted leading-relaxed">
                    You signed in with Google. Please click below to verify your Google identity before proceeding.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleReauth()}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm with Google
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReauth} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1.5">Enter Your Current Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-subtle text-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isProcessing || !password}
                    className="w-full py-3 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                    Verify Password
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* STEP 3: EXPORT CHOICE */}
          {step === 'EXPORT_CHOICE' && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-brand/10 text-brand">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-heading">Save Your Work</h3>
                  <p className="text-xs text-muted">Optional data archive before closing</p>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
                  {errorMessage}
                </div>
              )}

              <p className="text-xs text-muted leading-relaxed">
                Before your account is removed, you can download a full archive containing printable PDF copies of all your projects and account statistics in a single ZIP folder.
              </p>

              {exportProgress && (
                <div className="bg-stone-50 border border-subtle rounded-xl p-3 text-xs text-brand font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{exportProgress}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={generateAndDownloadZip}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download My Projects (.ZIP)
                </button>

                <button
                  type="button"
                  onClick={executePermanentDeletion}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Permanently Delete Account
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: FAREWELL CIRCLE LOADER */}
          {step === 'FAREWELL_LOADER' && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="p-4 rounded-full bg-stone-100 text-brand">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-heading">
                  {farewellMessage}
                </h4>
                <p className="text-xs text-muted">Closing your craft diary securely...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
