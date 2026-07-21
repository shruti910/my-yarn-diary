import { useEffect, useState } from 'react';

/**
 * Tracks browser connectivity.
 *
 * Matters more once installed: with no browser chrome there is no address bar
 * or error page to tell the user why nothing is loading. The service worker
 * serves the app shell from cache offline, but every /api/v1 call still fails,
 * so the UI has to say so itself.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
