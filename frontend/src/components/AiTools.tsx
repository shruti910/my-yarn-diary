import React, { useState } from 'react';
import { MessageSquare, Layers, Eye, Image, GraduationCap, Sparkles } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { ChatCategory } from '../types';

interface AiToolsProps {
  token: string;
  initialTab?: ChatCategory;
}

export function AiTools({ token, initialTab }: AiToolsProps) {
  const [activeTab, setActiveTab] = useState<ChatCategory>(initialTab || 'crochet-buddy');

  const tabs = [
    {
      id: 'crochet-buddy' as const,
      name: 'AI Crochet Buddy',
      description: 'Your companion for real-time tips, stitch calculations, and material suggestions.',
      icon: MessageSquare,
      color: 'bg-[#F28482]'
    },
    {
      id: 'pattern-decoder' as const,
      name: 'Pattern Decoder',
      description: 'Upload or snap photos of patterns and convert them into clear, understandable instructions you can follow.',
      icon: Layers,
      color: 'bg-[#84A59D]'
    },
    {
      id: 'reverse-engineer' as const,
      name: 'Visual Reverse Engineer',
      description: 'Analyze finished crochet products or swatches to reverse-engineer and generate readable patterns.',
      icon: Eye,
      color: 'bg-[#F5CAC3]'
    },
    {
      id: 'image-generator' as const,
      name: 'Image Generator',
      description: 'Generate hyper-detailed concept prompts to visualize designs before stitching.',
      icon: Image,
      color: 'bg-[#B5E2FA]'
    },
    {
      id: 'crochet-tutor' as const,
      name: 'AI Crochet Tutor',
      description: 'A dedicated AI mentor to answer your questions, resolve doubts, and guide you through complex crochet techniques.',
      icon: GraduationCap,
      color: 'bg-[#EDC4B3]'
    }
  ];

  const activeTabDetails = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar header */}
      <div className="px-6 py-4 bg-white border-b border-[#E8E2D9] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold font-serif text-[#2D231B] tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-[#F28482] animate-pulse" />
            AI Tools Studio
          </h2>
          <p className="text-[10px] text-[#7C7167] font-bold uppercase tracking-wider mt-0.5">Empower your craft with personalized AI Tools</p>
        </div>

        {/* 5 Sub buttons */}
        <div className="flex bg-[#F9F6F2] p-1 rounded-2xl border border-[#E8E2D9] w-full md:w-auto overflow-x-auto scrollbar-none shrink-0 gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${isActive
                  ? 'bg-[#F28482] text-white shadow-sm'
                  : 'text-[#7C7167] hover:bg-[#E8E2D9]/40'
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main chat interface panel */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel key={activeTab} token={token} category={activeTab} />
      </div>
    </div>
  );
}
