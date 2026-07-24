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
 * Dismissal is remembered in localStorage, mirroring the floating-buddy pattern
 * in App.tsx, so the card is never a recurring nag — but it *expires*. An
 * indefinite flag is a trap: localStorage survives both uninstalling the app and
 * a hard reload, so a single early dismissal would hide the card forever on that
 * profile with no way back short of clearing site data by hand.
 */

const DISMISSED_KEY = 'crochet_install_dismissed_until';
const DISMISS_DAYS = 30;

/** Dismissed and still inside the cooling-off window? */
function isDismissActive(): boolean {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const until = Number(raw);
  // Treat unparseable values (including the legacy 'true' flag this key
  // replaced) as expired, so nobody stays permanently opted out.
  if (!Number.isFinite(until)) {
    localStorage.removeItem(DISMISSED_KEY);
    return false;
  }
  if (Date.now() > until) {
    localStorage.removeItem(DISMISSED_KEY);
    return false;
  }
  return true;
}

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

function isIosDevice(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent;
  const isIosUa = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports itself as Macintosh in User Agent, so touch points are the giveaway
  const isTouchMac = /Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1;
  return isIosUa || isTouchMac;
}

function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = window.navigator.userAgent;
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return !isOtherBrowser;
}

function isIosNonSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = window.navigator.userAgent;
  return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/**
 * Desktop macOS Safari (16.4+) can install web apps via File -> Add to Dock,
 * but it fires no `beforeinstallprompt` (that's Chromium-only), so we detect it
 * and show manual steps. Guard against every look-alike: iPadOS (reports as
 * Macintosh but is touch), and Chrome/Firefox/Edge on Mac (carry their own UA
 * token while still saying "Safari").
 */
function isMacSafari(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent;
  const isMac = /Macintosh/.test(ua);
  const isTouch = window.navigator.maxTouchPoints > 1; // iPadOS, not a real Mac
  const isOtherBrowser = /Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|Edg\/|OPR\/|Firefox/.test(ua);
  const isSafari = /Safari/.test(ua);
  return isMac && !isTouch && !isOtherBrowser && isSafari;
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showIosNonSafariHint, setShowIosNonSafariHint] = useState(false);
  const [showMacSafariHint, setShowMacSafariHint] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(isDismissActive);

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
      (window as any).__installPromptEvent = null;
      setShowIosHint(false);
      setShowIosNonSafariHint(false);
      setShowMacSafariHint(false);
      localStorage.removeItem(DISMISSED_KEY);
    };

    // The event may already have fired before this component mounted; the
    // snippet in index.html stashes it for exactly that case.
    const stashed = (window as any).__installPromptEvent as BeforeInstallPromptEvent | null;
    if (stashed) setInstallEvent(stashed);

    const handleStashed = () => {
      const e = (window as any).__installPromptEvent as BeforeInstallPromptEvent | null;
      if (e) setInstallEvent(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('installpromptready', handleStashed);
    window.addEventListener('appinstalled', handleInstalled);

    if (isIosSafari()) {
      setShowIosHint(true);
    } else if (isIosNonSafari()) {
      setShowIosNonSafariHint(true);
    } else if (isMacSafari()) {
      setShowMacSafariHint(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('installpromptready', handleStashed);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    setInstallEvent(null);
    (window as any).__installPromptEvent = null;
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch {
      // Chrome rejects prompt() if consumed or expired
    }
  };

  const visible =
    !dismissed &&
    (installEvent !== null || showIosHint || showIosNonSafariHint || showMacSafariHint);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
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
                  Keep your diary one tap away, in your pocket.
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-2.5 px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </button>
              </>
            ) : showIosNonSafariHint ? (
              <p className="text-[11px] text-muted font-medium mt-1 leading-relaxed">
                To install on iPhone/iPad, open this site in <span className="font-bold text-heading">Safari</span>, tap <Share className="w-3.5 h-3.5 inline text-brand mx-0.5" aria-label="Share" /> then <span className="inline-flex items-center gap-0.5 font-bold text-heading"><Plus className="w-3 h-3" /> Add to Home Screen</span>.
              </p>
            ) : showMacSafariHint ? (
              <p className="text-[11px] text-muted font-medium mt-1 leading-relaxed">
                In Safari, choose <span className="font-bold text-heading">File</span> then <span className="inline-flex items-center gap-0.5 font-bold text-heading"><Plus className="w-3 h-3" /> Add to Dock</span> to install.
              </p>
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
