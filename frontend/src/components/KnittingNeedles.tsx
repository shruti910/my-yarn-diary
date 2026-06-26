import React from 'react';

interface KnittingNeedlesProps {
  className?: string;
  strokeWidth?: number;
}

export function KnittingNeedles({ className = "w-4 h-4", strokeWidth = 2 }: KnittingNeedlesProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Needle 1 (Diagonal top-left to bottom-right) */}
      <line x1="6" y1="6" x2="18" y2="18" />
      <circle cx="5" cy="5" r="1.5" fill="currentColor" />

      {/* Needle 2 (Diagonal top-right to bottom-left) */}
      <line x1="18" y1="6" x2="6" y2="18" />
      <circle cx="19" cy="5" r="1.5" fill="currentColor" />
    </svg>
  );
}
