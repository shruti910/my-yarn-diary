import React, { useState } from 'react';
import { MessagesSquare, Layers, Eye, Image as ImageIcon, GraduationCap, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { ChatCategory } from '../types';

interface AiToolsProps {
 token: string;
 initialTab?: ChatCategory;
 user?: any;
 onUpdateCrochetTerminology?: (pref: 'US' | 'UK') => Promise<void>;
}

export function AiTools({ token, initialTab, user, onUpdateCrochetTerminology }: AiToolsProps) {
 const [activeTab, setActiveTab] = useState<ChatCategory>(initialTab || 'crochet-buddy');
 const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

 const tabs = [
 {
 id: 'crochet-buddy' as const,
 name: 'AI Crochet Buddy',
 description: 'Your companion for real-time tips, stitch calculations, and material suggestions.',
 icon: MessagesSquare,
 color: 'bg-brand'
 },
 {
 id: 'pattern-decoder' as const,
 name: 'Pattern Decoder',
 description: 'Upload or snap photos of patterns and convert them into clear, understandable instructions you can follow.',
 icon: Layers,
 color: 'bg-accent'
 },
 {
 id: 'reverse-engineer' as const,
 name: 'Visual Reverse Engineer',
 description: 'Analyze finished crochet products or swatches to reverse-engineer and generate readable patterns.',
 icon: Eye,
 color: 'bg-brand-light'
 },
 {
 id: 'image-generator' as const,
 name: 'Image Generator',
 description: 'Generate hyper-detailed concept prompts to visualize designs before stitching.',
 icon: ImageIcon,
 color: 'bg-info-light'
 },
 {
 id: 'crochet-tutor' as const,
 name: 'AI Crochet Tutor',
 description: 'A dedicated AI mentor to answer your questions, resolve doubts, and guide you through complex crochet techniques.',
 icon: GraduationCap,
 color: 'bg-warning-light'
 }
 ];

 const activeTabDetails = tabs.find(t => t.id === activeTab)!;

 return (
 <div className="h-full flex flex-col overflow-hidden">
 {/* Tab bar header */}
 <div className={`px-4 md:px-6 bg-white border-b border-subtle flex flex-col md:flex-row justify-between shrink-0 shadow-xs transition-all duration-300 ${isHeaderCollapsed ? 'py-2 md:py-3 items-center' : 'py-3 md:py-4 items-start md:items-center gap-3 md:gap-4'}`}>
 <div className="flex justify-between items-center w-full md:w-auto">
 <div>
 <h2 className="text-base md:text-lg font-extrabold font-serif text-heading tracking-tight flex items-center gap-1.5">
 <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-brand animate-pulse" />
 AI Tools Studio
 </h2>
 {!isHeaderCollapsed && (
 <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5">Empower your craft with personalized AI Tools</p>
 )}
 </div>
 <button
 onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
 className="p-1.5 md:hidden rounded-full hover:bg-surface text-muted transition-colors cursor-pointer"
 title={isHeaderCollapsed ? "Expand Tools" : "Collapse Tools"}
 >
 {isHeaderCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
 </button>
 </div>

 {/* 5 Sub buttons */}
 {!isHeaderCollapsed && (
 <div className="flex bg-white p-1 rounded-full border border-subtle w-full md:w-auto overflow-x-auto scrollbar-none shrink-0 gap-1.5 md:gap-2 shadow-sm animate-fade-in">
 {tabs.map((tab) => {
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`px-3 md:px-5 py-1.5 md:py-2.5 text-[11px] md:text-sm font-bold rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-1.5 justify-center shrink-0 ${isActive
 ? 'bg-brand text-white shadow-md transform scale-[1.02]'
 : 'text-muted hover:bg-surface hover:text-heading'
 }`}
 >
 <tab.icon className="w-4 h-4 md:w-4 md:h-4" />
 <span>{tab.name}</span>
 </button>
 );
 })}
 </div>
 )}
 </div>

 {/* Main chat interface panel */}
 <div className="flex-1 overflow-hidden">
 <ChatPanel
 key={activeTab}
 token={token}
 category={activeTab}
 user={user}
 onUpdateCrochetTerminology={onUpdateCrochetTerminology}
 />
 </div>
 </div>
 );
}
