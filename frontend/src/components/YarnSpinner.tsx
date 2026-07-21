/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface YarnSpinnerProps {
 className?: string;
 /** Explicit pixel size. Omit to size via `w-` / `h-` classes instead. */
 size?: number;
 /** Use on a coloured (brand) background: forces a white ring. */
 onBrand?: boolean;
}

/**
 * The single spinner used everywhere in the app: a faint track with a rotating
 * arc. Colour follows `currentColor` (set it with a `text-*` class) unless
 * `onBrand` forces white. Size via the `size` prop or width/height classes.
 * Rotation uses Tailwind's `animate-spin` (halted by prefers-reduced-motion).
 */
export function YarnSpinner({ className = '', size, onBrand = false }: YarnSpinnerProps) {
 const color = onBrand ? '#ffffff' : 'currentColor';
 return (
 <svg
 className={`animate-spin ${className}`}
 style={size ? { width: size, height: size } : undefined}
 viewBox="0 0 50 50"
 role="img"
 aria-label="Loading"
 xmlns="http://www.w3.org/2000/svg"
 >
 <circle cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth={5} opacity={0.2} />
 <circle
 cx="25"
 cy="25"
 r="20"
 fill="none"
 stroke={color}
 strokeWidth={5}
 strokeLinecap="round"
 pathLength={100}
 strokeDasharray="25 75"
 />
 </svg>
 );
}
