import React from 'react';

interface TerminologyToggleProps {
 value: 'US' | 'UK';
 onChange: (pref: 'US' | 'UK') => void;
}

export function TerminologyToggle({ value, onChange }: TerminologyToggleProps) {
 return (
 <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-full border border-subtle shadow-sm shrink-0">
 <span className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-widest pl-2 pr-1 font-sans hidden sm:inline">
 Terminology
 </span>
 <div className="flex bg-white rounded-full p-1 border border-subtle shadow-inner gap-1">
 <button
 type="button"
 onClick={() => onChange('US')}
 className={`px-3 py-1 text-[10px] md:text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
 value === 'US'
 ? 'bg-brand text-white shadow-sm transform scale-105'
 : 'text-muted hover:bg-surface hover:text-heading'
 }`}
 >
 US
 </button>
 <button
 type="button"
 onClick={() => onChange('UK')}
 className={`px-3 py-1 text-[10px] md:text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
 value === 'UK'
 ? 'bg-brand text-white shadow-sm transform scale-105'
 : 'text-muted hover:bg-surface hover:text-heading'
 }`}
 >
 UK
 </button>
 </div>
 </div>
 );
}
