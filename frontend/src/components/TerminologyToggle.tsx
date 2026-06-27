import React from 'react';

interface TerminologyToggleProps {
  value: 'US' | 'UK';
  onChange: (pref: 'US' | 'UK') => void;
}

export function TerminologyToggle({ value, onChange }: TerminologyToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-[#F9F6F2] p-1 rounded-xl border border-[#E8E2D9] shadow-inner shrink-0">
      <span className="text-[10px] font-bold text-[#7C7167] uppercase tracking-widest pl-2 pr-1 font-mono">
        Terminology
      </span>
      <div className="flex bg-white rounded-lg p-0.5 border border-[#E8E2D9]/60 shadow-xs">
        <button
          type="button"
          onClick={() => onChange('US')}
          className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all duration-200 cursor-pointer ${
            value === 'US'
              ? 'bg-[#F28482] text-white shadow-xs scale-105'
              : 'text-[#A89F94] hover:text-[#2D231B]'
          }`}
        >
          US
        </button>
        <button
          type="button"
          onClick={() => onChange('UK')}
          className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all duration-200 cursor-pointer ${
            value === 'UK'
              ? 'bg-[#F28482] text-white shadow-xs scale-105'
              : 'text-[#A89F94] hover:text-[#2D231B]'
          }`}
        >
          UK
        </button>
      </div>
    </div>
  );
}
