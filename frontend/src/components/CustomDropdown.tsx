import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  direction?: 'up' | 'down';
}

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  disabled = false,
  direction = 'down'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const positionClasses = direction === 'up'
    ? 'bottom-full mb-2 left-0 right-0'
    : 'top-full mt-2 left-0 right-0';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-2 sm:px-3.5 py-1 sm:py-2 bg-white border-2 border-subtle rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-between gap-1 sm:gap-3 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand/30 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-brand hover:bg-page/50'} ${isOpen ? 'border-brand bg-page/50' : ''}`}
      >
        <div className="flex items-center gap-1.5 text-heading truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="text-muted shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: direction === 'up' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === 'up' ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-[9999] ${positionClasses} fabric-card py-1 max-h-60 overflow-y-auto scrollbar-thin overflow-x-hidden shadow-2xl border border-subtle bg-white`}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-brand/10 text-brand' 
                      : 'text-heading hover:bg-page/80'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon && <span className={`${isSelected ? 'text-brand' : 'text-muted'}`}>{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0 text-brand" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
