import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Hook } from '../types';

interface HookManagerProps {
  hooks: Hook[];
  onChange: (hooks: Hook[]) => void;
  disabled?: boolean;
}

export function HookManager({ hooks, onChange, disabled }: HookManagerProps) {
  const addHook = () => {
    onChange([...hooks, { sizeMm: 4.0, sizeUs: '', material: '', brand: '' }]);
  };

  const removeHook = (index: number) => {
    const newHooks = [...hooks];
    newHooks.splice(index, 1);
    onChange(newHooks);
  };

  const updateHook = (index: number, field: keyof Hook, value: any) => {
    const newHooks = [...hooks];
    newHooks[index] = { ...newHooks[index], [field]: value };
    onChange(newHooks);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider">Hooks Used</label>
        <button
          type="button"
          onClick={addHook}
          disabled={disabled}
          className="text-[10px] font-extrabold text-[#F28482] flex items-center gap-1 hover:text-[#e06d6b] disabled:opacity-50"
        >
          <Plus className="w-3 h-3" /> Add Hook
        </button>
      </div>
      
      {hooks.length === 0 ? (
        <p className="text-xs text-[#A89F94] italic">No hooks added yet.</p>
      ) : (
        <div className="space-y-3">
          {hooks.map((hook, idx) => (
            <div key={idx} className="p-3 bg-[#FDFCFB] border border-[#E8E2D9] rounded-xl space-y-3 relative">
              <button
                type="button"
                onClick={() => removeHook(idx)}
                disabled={disabled}
                className="absolute top-3 right-3 text-[#A89F94] hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-2 gap-3 pr-6">
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Size (mm)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={hook.sizeMm || ''}
                    disabled={disabled}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateHook(idx, 'sizeMm', val ? parseFloat(val) : null);
                    }}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    placeholder="e.g. 5.0"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Size (US)</label>
                  <input
                    type="text"
                    value={hook.sizeUs || ''}
                    disabled={disabled}
                    onChange={(e) => updateHook(idx, 'sizeUs', e.target.value)}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    placeholder="e.g. H/8"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Material</label>
                  <input
                    type="text"
                    value={hook.material || ''}
                    disabled={disabled}
                    onChange={(e) => updateHook(idx, 'material', e.target.value)}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    placeholder="e.g. Aluminum"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Brand</label>
                  <input
                    type="text"
                    value={hook.brand || ''}
                    disabled={disabled}
                    onChange={(e) => updateHook(idx, 'brand', e.target.value)}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    placeholder="e.g. Clover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
