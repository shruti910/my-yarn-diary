/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { YarnSpinner } from './YarnSpinner';

interface CrochetLoaderProps {
 onComplete?: () => void;
}

export function CrochetLoader({ onComplete }: CrochetLoaderProps) {
 const [progress, setProgress] = useState(1);

 // Simulate progress moving forward (faster at first, then easing as it waits
 // for the backend). Holds at 98% until the real load completes. Unchanged logic.
 useEffect(() => {
 const progressInterval = setInterval(() => {
 setProgress(prev => {
 if (prev >= 98) {
 return 98;
 }
 const increment = prev < 50 ? 3 : prev < 80 ? 1 : 0.4;
 return Math.min(prev + increment, 98);
 });
 }, 400);

 return () => {
 clearInterval(progressInterval);
 };
 }, []);

 return (
 <div
 id="crochet-craft-loader-viewport"
 className="fixed inset-0 bg-page flex flex-col justify-center items-center z-50 p-6 select-none"
 >
 {/* The single app spinner, sized up as the whole loader. */}
 <YarnSpinner size={128} className="text-brand" />

 {/* Percentage */}
 <span className="mt-8 text-2xl font-extrabold font-serif text-heading tabular-nums tracking-tight">
 {Math.round(progress)}%
 </span>

 {/* Thin progress track */}
 <div className="mt-3 w-52 max-w-[70vw] h-1.5 bg-sunken rounded-full overflow-hidden">
 <motion.div
 className="h-full bg-brand rounded-full"
 animate={{ width: `${progress}%` }}
 transition={{ ease: 'easeOut', duration: 0.4 }}
 />
 </div>
 </div>
 );
}
