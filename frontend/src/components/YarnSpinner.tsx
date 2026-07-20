/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface YarnSpinnerProps {
 className?: string;
 size?: number;
}

export function YarnSpinner({ className = "", size = 24 }: YarnSpinnerProps) {
 return (
 <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
 <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
 <defs>
 <linearGradient id="miniCoralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="var(--color-brand)" />
 <stop offset="100%" stopColor="var(--color-brand-light)" />
 </linearGradient>
 </defs>

 {/* Unspooling thread path */}
 <motion.path
 d="M 30 50 Q 50 30, 70 50 T 90 50"
 stroke="var(--color-heading)"
 strokeWidth="6"
 strokeLinecap="round"
 strokeDasharray="200"
 animate={{
 strokeDashoffset: [0, -200],
 d: [
 "M 30 50 Q 50 30, 70 50 T 90 50",
 "M 30 50 Q 60 40, 70 60 T 90 50",
 "M 30 50 Q 40 60, 60 40 T 90 50",
 "M 30 50 Q 50 30, 70 50 T 90 50"
 ]
 }}
 transition={{
 strokeDashoffset: { repeat: Infinity, duration: 1.5, ease: "linear" },
 d: { repeat: Infinity, duration: 1, ease: "easeInOut" }
 }}
 opacity="0.8"
 />

 {/* Yarn Ball */}
 <g transform="translate(30, 50)">
 {/* Outer ring */}
 <motion.ellipse
 cx="0" cy="0" rx="22" ry="20"
 fill="url(#miniCoralGrad)"
 stroke="var(--color-heading)"
 strokeWidth="4"
 animate={{ scale: [1, 1.1, 0.9, 1], rotate: [0, 15, -10, 0] }}
 transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
 />
 {/* Texture lines */}
 <motion.path
 d="M -10 -8 C -5 -15, 5 -15, 10 -8"
 stroke="white"
 strokeWidth="3"
 strokeLinecap="round"
 opacity="0.7"
 />
 <motion.ellipse
 cx="-3" cy="-1" rx="10" ry="15"
 stroke="var(--color-heading)"
 strokeWidth="2.5"
 fill="none"
 opacity="0.3"
 animate={{ rotate: [0, 360] }}
 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
 />
 <motion.ellipse
 cx="2" cy="1" rx="14" ry="8"
 stroke="var(--color-heading)"
 strokeWidth="2.5"
 fill="none"
 opacity="0.2"
 animate={{ rotate: [360, 0] }}
 transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
 />
 </g>
 </svg>
 </div>
 );
}
