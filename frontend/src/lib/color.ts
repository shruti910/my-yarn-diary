// Color helpers for resolving user-entered colorway values (hex OR CSS color
// names like "RED", "teal") into a valid hex the <input type="color"> and swatch
// previews can display, without altering the raw string the user typed.

let probe: HTMLSpanElement | null = null;

/**
 * Resolve any CSS color string (hex, "red", "rebeccapurple", "rgb(...)") to a
 * `#rrggbb` hex, or `null` if the browser doesn't recognise it. Browser-only.
 */
export function cssColorToHex(input?: string | null): string | null {
  if (!input || typeof document === 'undefined') return null;
  const value = input.trim();
  if (!value) return null;

  if (!probe) {
    probe = document.createElement('span');
    probe.style.display = 'none';
    document.body.appendChild(probe);
  }
  // An invalid color leaves the property unset, so seed with a sentinel first.
  probe.style.color = '';
  probe.style.color = value;
  if (!probe.style.color) return null;

  const computed = getComputedStyle(probe).color; // e.g. "rgb(255, 0, 0)"
  const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  const toHex = (n: string) => parseInt(n, 10).toString(16).padStart(2, '0');
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}

/**
 * Best-effort hex for a swatch / color picker: the resolved color, or `fallback`
 * when the value can't be interpreted.
 */
export function swatchColor(input?: string | null, fallback = '#D4738B'): string {
  return cssColorToHex(input) || fallback;
}
