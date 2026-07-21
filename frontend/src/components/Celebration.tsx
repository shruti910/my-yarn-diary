/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Trophy, PartyPopper } from 'lucide-react';

interface CelebrationProps {
 projectTitle: string;
 onClose: () => void;
}

interface ConfettiParticle {
 x: number;
 y: number;
 size: number;
 color: string;
 speedY: number;
 speedX: number;
 rotation: number;
 rotationSpeed: number;
}

const PALETTE = ['var(--color-brand)', 'var(--color-brand-light)', 'var(--color-accent)', '#F7EDE2', '#F6BD60', '#F39A59'];

export function Celebration({ projectTitle, onClose }: CelebrationProps) {
 const canvasRef = useRef<HTMLCanvasElement | null>(null);

 useEffect(() => {
 const canvas = canvasRef.current;
 if (!canvas) return;

 const ctx = canvas.getContext('2d');
 if (!ctx) return;

 let animationId: number;
 let width = (canvas.width = window.innerWidth);
 let height = (canvas.height = window.innerHeight);

 const handleResize = () => {
 if (!canvas) return;
 width = canvas.width = window.innerWidth;
 height = canvas.height = window.innerHeight;
 };
 window.addEventListener('resize', handleResize);

 // Initialize particles
 const particles: ConfettiParticle[] = [];
 for (let i = 0; i < 150; i++) {
 particles.push({
 x: Math.random() * width,
 y: Math.random() * -height - 20,
 size: Math.random() * 8 + 6,
 color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
 speedY: Math.random() * 3 + 2,
 speedX: Math.random() * 2 - 1,
 rotation: Math.random() * 360,
 rotationSpeed: Math.random() * 4 - 2,
 });
 }

 const animate = () => {
 ctx.clearRect(0, 0, width, height);

 let active = false;
 for (const p of particles) {
 p.y += p.speedY;
 p.x += p.speedX;
 p.rotation += p.rotationSpeed;

 ctx.save();
 ctx.translate(p.x, p.y);
 ctx.rotate((p.rotation * Math.PI) / 180);
 ctx.fillStyle = p.color;

 // Draw rectangle confetti
 ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
 ctx.restore();

 // Recycle particles that fall off the screen
 if (p.y < height) {
 active = true;
 } else {
 p.y = -20;
 p.x = Math.random() * width;
 p.speedY = Math.random() * 3 + 2;
 }
 }

 if (active) {
 animationId = requestAnimationFrame(animate);
 }
 };

 animate();

 return () => {
 cancelAnimationFrame(animationId);
 window.removeEventListener('resize', handleResize);
 };
 }, []);

 return (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs select-none">
 {/* Background Confetti Canvas */}
 <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full" />

 {/* Celebration Dialog Card */}
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 transition={{ type: 'spring', damping: 25, stiffness: 350 }}
 className="bg-white rounded-[2.5rem] border border-subtle max-w-md w-full p-6 sm:p-8 text-center space-y-4 sm:space-y-6 shadow-2xl relative overflow-hidden max-h-[90dvh] overflow-y-auto warm-shadow-lg"
 >
 {/* Glow decoration */}
 <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-light/20 rounded-full blur-3xl" />
 <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />

 {/* Big visual banner */}
 <div className="relative flex justify-center">
 <div className="w-24 h-24 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center relative">
 <PartyPopper className="w-12 h-12 text-accent" strokeWidth={1.5} />
 <div className="absolute -top-1 -right-1 p-1 bg-white rounded-full border border-subtle shadow-xs">
 <Trophy className="w-4 h-4 text-amber-500 fill-amber-400" />
 </div>
 </div>
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-accent/25 rounded-full pointer-events-none"
 />
 </div>

 {/* Content texts */}
 <div className="space-y-2">
 <h2 className="font-serif font-extrabold text-2xl text-heading leading-tight">
 Congratulations!
 </h2>
 <p className="text-xs text-accent uppercase tracking-widest font-extrabold flex items-center justify-center gap-1">
 <Sparkles className="w-3.5 h-3.5 fill-accent" /> Project Completed <Sparkles className="w-3.5 h-3.5 fill-accent" />
 </p>
 <div className="pt-2">
 <p className="text-sm font-semibold text-muted">
 You have completed your beautiful creation:
 </p>
 <p className="text-base font-extrabold font-serif text-heading mt-1.5 px-4 py-2 bg-page border border-subtle rounded-2xl inline-block shadow-inner max-w-full truncate">
 {projectTitle}
 </p>
 </div>
 </div>

 {/* Call to action button */}
 <button
 type="button"
 onClick={onClose}
 className="w-full py-4 flex justify-center items-center gap-2 bg-accent hover:bg-accent/90 text-white font-extrabold rounded-2xl text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
 >
 Woohoo! <PartyPopper className="w-4 h-4" />
 </button>
 </motion.div>
 </div>
 );
}
