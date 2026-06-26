import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Yarn } from '../types';

interface YarnManagerProps {
  yarns: Yarn[];
  onChange: (yarns: Yarn[]) => void;
  disabled?: boolean;
}

export function YarnManager({ yarns, onChange, disabled }: YarnManagerProps) {
  const addYarn = () => {
    onChange([...yarns, { brand: '', lineName: '', colorway: '', dyeLot: '', weight: '', fiberContent: '', quantityUsed: 0, unit: 'skeins' }]);
  };

  const removeYarn = (index: number) => {
    const newYarns = [...yarns];
    newYarns.splice(index, 1);
    onChange(newYarns);
  };

  const updateYarn = (index: number, field: keyof Yarn, value: any) => {
    const newYarns = [...yarns];
    newYarns[index] = { ...newYarns[index], [field]: value };
    onChange(newYarns);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider">Yarns Used</label>
        <button
          type="button"
          onClick={addYarn}
          disabled={disabled}
          className="text-[10px] font-extrabold text-[#F28482] flex items-center gap-1 hover:text-[#e06d6b] disabled:opacity-50"
        >
          <Plus className="w-3 h-3" /> Add Yarn
        </button>
      </div>
      
      {yarns.length === 0 ? (
        <p className="text-xs text-[#A89F94] italic">No yarns added yet.</p>
      ) : (
        <div className="space-y-3">
          {yarns.map((yarn, idx) => (
            <div key={idx} className="p-3 bg-[#FDFCFB] border border-[#E8E2D9] rounded-xl space-y-3 relative">
              <button
                type="button"
                onClick={() => removeYarn(idx)}
                disabled={disabled}
                className="absolute top-3 right-3 text-[#A89F94] hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-2 gap-3 pr-6">
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Brand</label>
                  <input
                    type="text"
                    value={yarn.brand || ''}
                    disabled={disabled}
                    required
                    onChange={(e) => updateYarn(idx, 'brand', e.target.value)}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    placeholder="e.g. Red Heart"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Line Name</label>
                  <input
                    type="text"
                    value={yarn.lineName || ''}
                    disabled={disabled}
                    onChange={(e) => updateYarn(idx, 'lineName', e.target.value)}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    placeholder="e.g. Super Saver"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase block">Colorway</label>
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="color"
                      disabled={disabled}
                      value={yarn.colorway?.startsWith('#') ? yarn.colorway : '#000000'}
                      onChange={(e) => updateYarn(idx, 'colorway', e.target.value)}
                      className="color-picker-round"
                    />
                    <input
                      type="text"
                      value={yarn.colorway || ''}
                      disabled={disabled}
                      onChange={(e) => updateYarn(idx, 'colorway', e.target.value)}
                      className="flex-1 min-w-0 bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                      placeholder="Name or Hex"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Dye Lot</label>
                  <input
                    type="text"
                    value={yarn.dyeLot || ''}
                    disabled={disabled}
                    onChange={(e) => updateYarn(idx, 'dyeLot', e.target.value)}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482] mt-1"
                    placeholder="e.g. 12345"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Weight</label>
                  <input
                    type="text"
                    value={yarn.weight || ''}
                    disabled={disabled}
                    onChange={(e) => updateYarn(idx, 'weight', e.target.value)}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    placeholder="e.g. 4 / Worsted"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Fiber</label>
                  <input
                    type="text"
                    value={yarn.fiberContent || ''}
                    disabled={disabled}
                    onChange={(e) => updateYarn(idx, 'fiberContent', e.target.value)}
                    className="w-full bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    placeholder="e.g. 100% Acrylic"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase block">Quantity Used</label>
                  <div className="flex gap-3 items-center mt-1">
                    <input
                      type="number"
                      value={yarn.quantityUsed || ''}
                      disabled={disabled}
                      min="0"
                      step="0.5"
                      onChange={(e) => updateYarn(idx, 'quantityUsed', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-24 bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                      placeholder="0"
                    />
                    <select
                      value={yarn.unit || 'skeins'}
                      disabled={disabled}
                      onChange={(e) => updateYarn(idx, 'unit', e.target.value)}
                      className="w-28 bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482] cursor-pointer"
                    >
                      <option value="skeins">skeins</option>
                      <option value="meters">meters</option>
                      <option value="grams">grams</option>
                      <option value="yards">yards</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
