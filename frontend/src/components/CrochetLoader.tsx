/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CrochetLoaderProps {
  onComplete?: () => void;
}

const statusMessages = [
  { text: "Spinning our starter wool...", detail: "Aligning the dynamic fiber coordinates" },
  { text: "Warming up the cozy craft hook...", detail: "Selecting size H/5.00mm wood-carved hook" },
  { text: "Stitching a lovely foundation chain...", detail: "Preparing the row counters" },
  { text: "Weaving loops through double crochet...", detail: "Maintaining consistent tension parameters" },
  { text: "Dyeing the premium pastel yarn skein...", detail: "Merging colors into the warm design palette" },
  { text: "Waking up the Craft Greenhouse services...", detail: "Coaxing the database nodes out of healthy hibernation (~30s)" },
  { text: "Tallying row tallies and catalog folders...", detail: "Optimizing index structures for offline capability" },
  { text: "Stitching a cute finishing border...", detail: "Tying off the loose ends with a clean slip stitch" }
];

export function CrochetLoader({ onComplete }: CrochetLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(1);

  // Cycle messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % statusMessages.length);
    }, 3200);

    // Simulate progress bar moving forward (first faster, then slow as it waits for the active backend response)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) {
          return 98; // hold at 98 until load completes
        }
        // progressive slower increment as it approaches the end
        const increment = prev < 50 ? 3 : prev < 80 ? 1 : 0.4;
        return Math.min(prev + increment, 98);
      });
    }, 400);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div 
      id="crochet-craft-loader-viewport" 
      className="fixed inset-0 bg-[#FDFCFB] flex flex-col justify-center items-center z-50 p-4 font-sans select-none overflow-hidden"
    >
      {/* Decorative ambient background grid patterned to look like a canvas/linen texture */}
      <div className="absolute inset-0 opacity-4 pointer-events-none bg-[radial-gradient(#84A59D_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Immersive centerpiece frame with dashed "blanket stitch" borders */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg bg-white p-8 md:p-12 rounded-[2.5rem] border-[3px] border-dashed border-[#E8E2D9] relative warm-shadow-lg flex flex-col items-center"
      >
        {/* Cute decorative crochet flower label in top corner */}
        <div className="absolute -top-4 -right-4 bg-[#F5CAC3] text-[#2D231B] text-xl p-3 rounded-full warm-shadow border-2 border-white">
          🌸
        </div>
        <div className="absolute -bottom-4 -left-4 bg-[#84A59D] text-white text-xl p-3 rounded-full warm-shadow border-2 border-white">
          🧶
        </div>

        {/* Crocheting illustration header */}
        <h2 className="text-[#2D231B] font-serif text-2xl md:text-3xl font-bold tracking-tight text-center mb-1">
          Craft Greenhouse
        </h2>
        <p className="text-[10px] text-[#A89F94] font-bold uppercase tracking-widest mb-10">
          Studio Startup Pipeline
        </p>

        {/* Animated SVG Crochet Arena */}
        <div className="w-full h-48 relative flex items-center justify-center mb-8 bg-[#F9F6F2] rounded-3xl border border-[#E8E2D9] overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="coralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F28482" />
                <stop offset="100%" stopColor="#F5CAC3" />
              </linearGradient>
              <linearGradient id="sageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#84A59D" />
                <stop offset="100%" stopColor="#A4C2B9" />
              </linearGradient>
            </defs>

            {/* Simulated stitched bottom grid */}
            <path d="M20 170 H380" stroke="#E8E2D9" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M20 180 H380" stroke="#E8E2D9" strokeWidth="2" strokeDasharray="8 6" />

            {/* Yarn Strand being pulled from the yarn ball on the left to the hook on the right */}
            <motion.path 
              d="M 120 110 Q 180 80, 210 120 T 290 100" 
              stroke="#F28482" 
              strokeWidth="5" 
              strokeLinecap="round" 
              strokeDasharray="400"
              animate={{ 
                strokeDashoffset: [0, -400],
                d: [
                  "M 120 110 Q 180 80, 210 120 T 290 100",
                  "M 120 110 Q 170 95, 220 110 T 290 100",
                  "M 120 110 Q 190 75, 203 125 T 290 100",
                  "M 120 110 Q 180 80, 210 120 T 290 100"
                ]
              }}
              transition={{ 
                strokeDashoffset: { repeat: Infinity, duration: 8, ease: "linear" },
                d: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }}
            />

            {/* Yarn Ball (Skein) on the left side */}
            <g transform="translate(90, 110)">
              {/* Outer ring */}
              <motion.ellipse 
                cx="0" cy="0" rx="35" ry="32" 
                fill="url(#coralGrad)" 
                stroke="#2D231B" 
                strokeWidth="2.5"
                animate={{ scale: [1, 1.04, 0.98, 1], rotate: [0, 8, -6, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              />
              {/* Ball texture layers */}
              <motion.path 
                d="M -25 -15 C -10 -25, 10 -25, 25 -15" 
                stroke="#FFF" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                opacity="0.6"
              />
              <motion.path 
                d="M -30 0 C -15 -10, 15 -10, 30 0" 
                stroke="#2D231B" 
                strokeWidth="2" 
                strokeLinecap="round" 
                opacity="0.15" 
              />
              <motion.path 
                d="M -28 10 C -10 25, 10 25, 28 10" 
                stroke="#2D231B" 
                strokeWidth="2" 
                strokeLinecap="round" 
                opacity="0.15" 
              />
              {/* Spinning/wrapping strands */}
              <motion.ellipse 
                cx="-5" cy="-2" rx="20" ry="28" 
                stroke="#2D231B" 
                strokeWidth="1.5" 
                fill="none" 
                opacity="0.25"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
              />
              <motion.ellipse 
                cx="5" cy="2" rx="28" ry="16" 
                stroke="#2D231B" 
                strokeWidth="1.5" 
                fill="none" 
                opacity="0.25"
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
              />
              {/* Cute heart tag on yarn */}
              <g transform="translate(-15, 25) rotate(-20)">
                <rect width="18" height="12" rx="3" fill="#E8E2D9" stroke="#2D231B" strokeWidth="1" />
                <text x="5" y="9" fill="#F28482" fontSize="7" fontWeight="bold">yarn</text>
              </g>
            </g>

            {/* Small curly loop forming at the crochet tip */}
            <motion.path 
              d="M 285 96 C 275 80, 260 90, 275 105 C 290 120, 290 85, 285 96" 
              stroke="#F28482" 
              strokeWidth="4" 
              strokeLinecap="round"
              fill="none"
              animate={{ 
                scale: [0.95, 1.1, 0.95],
                rotate: [0, 15, -10, 0]
              }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              transform="translate(280, 100) translate(-280, -100)"
            />

            {/* The Crochet Hook (Sage Colored, gliding and threading through the loop) */}
            <motion.g 
              animate={{ 
                x: [0, -12, 18, -4, 0],
                y: [0, -22, 10, -5, 0],
                rotate: [20, 12, 28, 16, 20]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 3.2, 
                ease: "easeInOut" 
              }}
              style={{ transformOrigin: "295px 95px" }}
              className="cursor-pointer"
            >
              {/* Aluminum/wooden rod body */}
              <line x1="260" y1="130" x2="340" y2="50" stroke="url(#sageGrad)" strokeWidth="6.5" strokeLinecap="round" />
              {/* The carved hook indent */}
              <path d="M 261 129 C 255 135, 248 138, 244 133 C 240 128, 246 122, 252 118" stroke="url(#sageGrad)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <path d="M 244 133 C 242 135, 240 137, 239 140 C 238 143, 239 146, 243 144" stroke="#2D231B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              {/* Grip pad wrapping */}
              <rect x="290" y="85" width="22" height="10" rx="3" fill="#E8E2D9" stroke="#2D231B" strokeWidth="1" transform="rotate(-45, 290, 85)" />
              <text x="298" y="93" fill="#4A3F35" fontSize="5" fontWeight="bold" transform="rotate(-45, 290, 85)">5.0mm</text>
            </motion.g>

            {/* Little floating flowers / sparkles indicating progress */}
            <motion.text 
              x="200" y="60" fontSize="16"
              animate={{ y: [60, 40], opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
            >
              ✨
            </motion.text>
            <motion.text 
              x="280" y="55" fontSize="14"
              animate={{ y: [55, 30], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: 1.5 }}
            >
              🌸
            </motion.text>
            <motion.text 
              x="130" y="65" fontSize="12"
              animate={{ y: [65, 45], opacity: [0, 0.8, 0], rotate: [0, 45] }}
              transition={{ repeat: Infinity, duration: 2.2, delay: 1.0 }}
            >
              🍃
            </motion.text>
          </svg>
        </div>

        {/* Dynamic status display using clean AnimatePresence */}
        <div className="w-full text-center h-20 mb-6 flex flex-col justify-center px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <h3 className="text-base font-bold text-[#2D231B] leading-snug">
                {statusMessages[currentStep].text}
              </h3>
              <p className="text-xs text-[#7C7167] font-mono mt-1 font-medium tracking-tight">
                {statusMessages[currentStep].detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Crochet sliding progression tracker */}
        <div className="w-full px-4 mb-4">
          <div className="h-2 w-full bg-[#F9F6F2] rounded-full border border-[#E8E2D9] relative overflow-visible">
            {/* Thread path color filling */}
            <div 
              className="h-full bg-[#F28482] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
            {/* The little sliding yarn ball travel accessory */}
            <div 
              className="absolute -top-3.5 transition-all duration-300 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${progress}%` }}
            >
              <motion.span 
                className="text-lg leading-none select-none drop-shadow-sm"
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              >
                🧶
              </motion.span>
              <span className="text-[9px] font-bold font-mono text-[#F28482] mt-0.5">{Math.floor(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Heartfelt notice on startup delay */}
        <div className="text-center px-6 mt-2">
          <p className="text-[11px] leading-relaxed text-[#7C7167]">
            <strong>Note:</strong> We are spinning up our cloud-hosted backend nodes from their cozy, free-tier slumber. This initial stitch takes about 25–30 seconds. Thank you for your patience! 🌸
          </p>
        </div>
      </motion.div>
    </div>
  );
}
