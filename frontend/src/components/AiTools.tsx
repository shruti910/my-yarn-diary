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
      <div className={`px-3 sm:px-6 bg-white border-b border-subtle flex flex-col lg:flex-row justify-between shrink-0 shadow-xs transition-all duration-300 ${isHeaderCollapsed ? 'py-2 items-center' : 'py-2.5 sm:py-3 items-start lg:items-center gap-2 lg:gap-4'}`}>
        <div className="flex justify-between items-center w-full lg:w-auto shrink-0">
          <div>
            <h2 className="text-sm sm:text-lg font-extrabold font-serif text-heading tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand animate-pulse" />
              AI Tools Studio
            </h2>
            {!isHeaderCollapsed && (
              <p className="text-[11px] text-muted font-bold uppercase tracking-wider mt-0.5 hidden sm:block">Empower your craft with personalized AI Tools</p>
            )}
          </div>
          <button
            onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
            className="p-1 sm:p-1.5 lg:hidden rounded-full hover:bg-surface text-muted transition-colors cursor-pointer"
            title={isHeaderCollapsed ? "Expand Tools" : "Collapse Tools"}
          >
            {isHeaderCollapsed ? <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

        {/* 5 Sub buttons */}
        {!isHeaderCollapsed && (
          <div className="w-full lg:w-auto min-w-0 max-w-full overflow-hidden flex justify-start lg:justify-end shrink-0">
            <div className="flex bg-white p-1 rounded-full border border-subtle w-full max-w-full overflow-x-auto scrollbar-none gap-1 sm:gap-1.5 shadow-sm animate-fade-in touch-pan-x shrink-0">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.name}
                    aria-label={tab.name}
                    aria-current={isActive ? 'page' : undefined}
                    className={`tap-safe px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-1.5 justify-center shrink-0 ${isActive
                      ? 'bg-brand text-white shadow-md transform scale-[1.02]'
                      : 'text-muted hover:bg-brand/5 hover:text-brand'
                      }`}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    {/* Below sm: only the selected tool keeps its label, so all five
                        fit without horizontal scrolling. Names stay in title/aria. */}
                    <span className={isActive ? 'inline' : 'hidden sm:inline'}>{tab.name}</span>
                  </button>
                );
              })}
            </div>
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
