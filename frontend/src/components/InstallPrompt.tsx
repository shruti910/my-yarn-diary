import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share, Plus, X } from 'lucide-react';

/**
 * Offers "install this app" in the two ways browsers actually support it:
 *
 *  - Chrome / Edge / Android fire `beforeinstallprompt`, which we stash and
 *    replay when the user taps Install.
 *  - iOS Safari fires nothing and has no programmatic install, so the only
 *    option is to show the manual Share -> Add to Home Screen steps.
 *
 * Dismissal persists in localStorage, mirroring the floating-buddy pattern in
 * App.tsx, so the card is never a recurring nag.
 */

const DISMISSED_KEY = 'crochet_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own non-standard flag
    (window.navigator as any).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports itself as a Mac, so touch points are the giveaway
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  // Chrome/Firefox/Edge on iOS cannot add to the home screen as an app
  const isSafari = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  useEffect(() => {
    // Already installed and launched from the home screen: nothing to offer.
    if (isRunningStandalone()) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Suppress Chrome's own mini-infobar so our card is the single entry point
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setShowIosHint(false);
      localStorage.removeItem(DISMISSED_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    if (isIosSafari()) setShowIosHint(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    // The stashed event is single-use either way
    setInstallEvent(null);
    if (outcome === 'dismissed') handleDismiss();
  };

  const visible = !dismissed && (installEvent !== null || showIosHint);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          /* Right inset on small screens clears the floating AI buddy, which
             sits at bottom-6 right-6 in the authenticated shell. */
          className="fixed bottom-safe left-4 right-20 sm:right-auto sm:w-[22rem] z-[9998] bg-white/95 backdrop-blur-md border border-subtle rounded-2xl shadow-lg p-4 flex items-start gap-3"
        >
          <img
            src="/pwa-192x192.png"
            alt=""
            className="w-10 h-10 rounded-xl border border-subtle shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-heading">Install My Yarn Diary</p>

            {installEvent ? (
              <>
                <p className="text-[11px] text-muted font-medium mt-0.5 leading-relaxed">
                  Keep your diary one tap away, in its own window.
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-2.5 px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </button>
              </>
            ) : (
              <p className="text-[11px] text-muted font-medium mt-1 leading-relaxed flex flex-wrap items-center gap-x-1 gap-y-1">
                <span>Tap</span>
                <Share className="w-3.5 h-3.5 inline text-brand" aria-label="Share" />
                <span>then</span>
                <span className="inline-flex items-center gap-0.5 font-bold text-heading">
                  <Plus className="w-3 h-3" />
                  Add to Home Screen
                </span>
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="text-stone-400 hover:text-stone-700 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
