import { RefObject, useEffect, useRef } from 'react';

/**
 * Calls `onOutside` when a `mousedown` lands outside `ref`.
 *
 * Using `mousedown` (not focus/blur) is deliberate: opening an OS file/color
 * dialog blurs the active field but never dispatches a document `mousedown`,
 * so a card being edited stays open while the user picks a photo/color.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  onOutside: () => void,
  enabled = true
) {
  const handlerRef = useRef(onOutside);
  useEffect(() => {
    handlerRef.current = onOutside;
  }, [onOutside]);

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: MouseEvent) => {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handlerRef.current();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, enabled]);
}
