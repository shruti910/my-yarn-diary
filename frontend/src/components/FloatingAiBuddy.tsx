import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessagesSquare, Layers, Eye, Image, GraduationCap, X, Sparkles } from 'lucide-react';
import { ChatCategory } from '../types';

interface FloatingAiBuddyProps {
 onSelectTool: (category: ChatCategory) => void;
 onDismiss: () => void;
}

export function FloatingAiBuddy({ onSelectTool, onDismiss }: FloatingAiBuddyProps) {
 const [isOpen, setIsOpen] = useState(false);

 const tools = [
 {
 id: 'crochet-buddy' as const,
 name: 'AI Crochet Buddy',
 icon: MessagesSquare,
 color: 'bg-brand'
 },
 {
 id: 'pattern-decoder' as const,
 name: 'Pattern Decoder',
 icon: Layers,
 color: 'bg-accent'
 },
 {
 id: 'reverse-engineer' as const,
 name: 'Visual Reverse Engineer',
 icon: Eye,
 color: 'bg-brand-dark'
 },
 {
 id: 'image-generator' as const,
 name: 'Image Generator',
 icon: Image,
 color: 'bg-accent-dark'
 },
 {
 id: 'crochet-tutor' as const,
 name: 'AI Crochet Tutor',
 icon: GraduationCap,
 color: 'bg-neutral-800'
 }
 ];

 return (
 <div className="fixed bottom-safe right-6 z-[9999] pointer-events-none">
 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 10 }}
 className="absolute bottom-20 right-0 bg-white border border-subtle rounded-2xl shadow-2xl p-4 w-72 pointer-events-auto flex flex-col gap-2"
 >
 <div className="flex justify-between items-center pb-2 border-b border-subtle">
 <h4 className="font-serif font-extrabold text-sm text-heading flex items-center gap-1.5">
 <Sparkles className="w-4 h-4 text-brand" />
 AI Tools Quick Access
 </h4>
 <button
 onClick={() => setIsOpen(false)}
 className="text-stone-400 hover:text-stone-700 cursor-pointer"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="flex flex-col gap-1.5 mt-2">
 {tools.map((tool) => (
 <button
 key={tool.id}
 onClick={() => {
 onSelectTool(tool.id);
 setIsOpen(false);
 }}
 className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-50 transition-colors text-left cursor-pointer group"
 >
 <div className={`w-8 h-8 rounded-lg ${tool.color} text-white flex items-center justify-center shrink-0`}>
 <tool.icon className="w-4 h-4" />
 </div>
 <span className="text-xs font-bold text-muted group-hover:text-heading transition-colors">
 {tool.name}
 </span>
 </button>
 ))}
 </div>

 <button
 onClick={onDismiss}
 className="mt-2 pt-2 border-t border-subtle text-center text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors w-full cursor-pointer flex items-center justify-center gap-1.5"
 >
 <X className="w-3.5 h-3.5" />
 Dismiss Floating Widget
 </button>
 </motion.div>
 )}
 </AnimatePresence>

 <motion.div
 drag
 dragMomentum={false}
 dragElastic={0.1}
 whileDrag={{ scale: 1.05 }}
 className="pointer-events-auto cursor-grab active:cursor-grabbing w-16 h-16 sewing-button flex items-center justify-center select-none shadow-2xl"
 onClick={(e) => {
 // Prevent opening menu when dragging
 setIsOpen((prev) => !prev);
 }}
 >
 <div className="flex flex-col items-center justify-center text-[11px] leading-tight font-extrabold uppercase tracking-wider text-center font-sans">
 <span>AI</span>
 <span>Tools</span>
 </div>
 </motion.div>
 </div>
 );
}
