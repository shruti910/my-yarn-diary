import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registers the service worker and surfaces a Reload banner when a new build is
 * waiting.
 *
 * Deliberately a prompt rather than an automatic reload: project row counts save
 * on a 1s debounce and AI replies stream in, so swapping the page out from under
 * the user mid-session could lose work. A custom banner is needed because the
 * shared showToast() takes only a message and a type, with no action button.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      // Long-lived installed sessions would otherwise only notice a new build on
      // a full restart; check hourly while the app is open.
      setInterval(() => registration.update(), 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed:', error);
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          role="status"
          className="fixed bottom-safe left-1/2 -translate-x-1/2 z-[999999] w-[calc(100%-2rem)] max-w-xs md:max-w-sm p-4 rounded-2xl border border-subtle bg-white/95 backdrop-blur-md shadow-lg flex items-start gap-3"
        >
          <div className="p-1.5 rounded-lg bg-brand/10 text-brand shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-heading">A new version is ready</p>
            <p className="text-[11px] text-muted font-medium mt-0.5">
              Reload to get the latest My Yarn Diary.
            </p>
            <button
              onClick={() => updateServiceWorker(true)}
              className="mt-2.5 px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
            >
              Reload now
            </button>
          </div>

          <button
            onClick={() => setNeedRefresh(false)}
            aria-label="Dismiss update notice"
            className="text-stone-400 hover:text-stone-700 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
