import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions {
  /** Debounce delay in ms before a scheduled save fires. Default 1000. */
  delay?: number;
}

/**
 * Debounced background saver.
 *
 * - `schedule(payload)` (re)starts the debounce timer with the latest payload.
 * - `flush()` saves the pending payload immediately (used on collapse / unmount / tab-hide).
 * - `status` reflects the last save attempt for an optional "Saving… / Saved" indicator.
 *
 * The latest payload is held in a ref so `flush()` always persists the freshest value,
 * even when called from event listeners registered once on mount.
 */
export function useAutosave<T>(
  saveFn: (payload: T) => Promise<void> | void,
  { delay = 1000 }: UseAutosaveOptions = {}
) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ payload: T } | null>(null);
  const saveFnRef = useRef(saveFn);

  // Keep the latest saveFn without re-registering listeners/timers.
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  const runSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    setStatus('saving');
    try {
      await saveFnRef.current(pending.payload);
      setStatus('saved');
    } catch (e) {
      console.error('Autosave failed:', e);
      setStatus('error');
    }
  }, []);

  const schedule = useCallback(
    (payload: T) => {
      pendingRef.current = { payload };
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        void runSave();
      }, delay);
    },
    [delay, runSave]
  );

  const flush = useCallback(() => {
    void runSave();
  }, [runSave]);

  // Persist the latest edit if the tab is hidden/closed, and on unmount.
  useEffect(() => {
    const onHide = () => {
      if (pendingRef.current) void runSave();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      if (pendingRef.current) void runSave();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [runSave]);

  return { schedule, flush, status };
}
