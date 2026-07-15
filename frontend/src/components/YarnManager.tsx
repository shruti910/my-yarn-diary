import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Yarn } from '../types';

interface YarnManagerProps {
  projectId: string;
  initialYarns?: Yarn[];
  isNewProject?: boolean;
  fetchWithToken: (url: string, options?: RequestInit) => Promise<any>;
  disabled?: boolean;
}

export function YarnManager({ projectId, initialYarns, isNewProject, fetchWithToken, disabled }: YarnManagerProps) {
  const [yarns, setYarns] = useState<Yarn[]>(initialYarns || []);
  const [isLoading, setIsLoading] = useState(!initialYarns || initialYarns.length === 0);
  const [savingId, setSavingId] = useState<number | null>(null);

  const fetchYarns = async () => {
    try {
      const data = await fetchWithToken(`/api/v1/projects/${projectId}/yarns`);
      setYarns(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isNewProject) {
      setYarns([]);
      setIsLoading(false);
    } else if (initialYarns && initialYarns.length > 0) {
      setYarns(initialYarns);
      setIsLoading(false);
    } else {
      fetchYarns();
    }
  }, [projectId, isNewProject, initialYarns]);

  const addYarn = async () => {
    try {
      const newYarn = { brand: 'New Brand', lineName: '', colorway: '', dyeLot: '', weight: '', fiberContent: '', quantityUsed: 0, unit: 'skeins' };
      await fetchWithToken(`/api/v1/projects/${projectId}/yarns`, {
        method: 'POST',
        body: JSON.stringify(newYarn)
      });
      fetchYarns();
    } catch (e) {
      console.error(e);
    }
  };

  const removeYarn = async (yarnId: number) => {
    try {
      await fetchWithToken(`/api/v1/yarns/${yarnId}`, { method: 'DELETE' });
      fetchYarns();
    } catch (e) {
      console.error(e);
    }
  };

  const updateYarnState = (index: number, field: keyof Yarn, value: any) => {
    const newYarns = [...yarns];
    newYarns[index] = { ...newYarns[index], [field]: value };
    setYarns(newYarns);
  };

  const saveYarn = async (yarn: Yarn) => {
    if (!yarn.yarnId) return;
    setSavingId(yarn.yarnId);
    try {
      await fetchWithToken(`/api/v1/yarns/${yarn.yarnId}`, {
        method: 'PUT',
        body: JSON.stringify(yarn)
      });
      await fetchYarns();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) return <div className="text-xs text-[#A89F94] italic">Loading yarns...</div>;

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
          {yarns.map((yarn, yarnIdx) => (
            <div key={yarn.yarnId || yarnIdx} className="p-3 bg-[#FDFCFB] border border-[#E8E2D9] rounded-xl space-y-3 relative group">
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveYarn(yarn)}
                  disabled={disabled || savingId === yarn.yarnId}
                  className="text-[#A89F94] hover:text-[#7C7167] disabled:opacity-50 flex items-center"
                >
                  {savingId === yarn.yarnId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => yarn.yarnId && removeYarn(yarn.yarnId)}
                  disabled={disabled}
                  className="text-[#A89F94] hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pr-16">
                <div>
                  <label className="text-[9px] font-bold text-[#A89F94] uppercase">Brand</label>
                  <input
                    type="text"
                    value={yarn.brand || ''}
                    disabled={disabled}
                    onChange={(e) => updateYarnState(yarnIdx, 'brand', e.target.value)}
                    onBlur={() => saveYarn(yarn)}
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
                    onChange={(e) => updateYarnState(yarnIdx, 'lineName', e.target.value)}
                    onBlur={() => saveYarn(yarn)}
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
                      onChange={(e) => updateYarnState(yarnIdx, 'colorway', e.target.value)}
                      onBlur={() => saveYarn(yarn)}
                      className="color-picker-round"
                    />
                    <input
                      type="text"
                      value={yarn.colorway || ''}
                      disabled={disabled}
                      onChange={(e) => updateYarnState(yarnIdx, 'colorway', e.target.value)}
                      onBlur={() => saveYarn(yarn)}
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
                    onChange={(e) => updateYarnState(yarnIdx, 'dyeLot', e.target.value)}
                    onBlur={() => saveYarn(yarn)}
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
                    onChange={(e) => updateYarnState(yarnIdx, 'weight', e.target.value)}
                    onBlur={() => saveYarn(yarn)}
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
                    onChange={(e) => updateYarnState(yarnIdx, 'fiberContent', e.target.value)}
                    onBlur={() => saveYarn(yarn)}
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
                      onChange={(e) => updateYarnState(yarnIdx, 'quantityUsed', e.target.value ? parseFloat(e.target.value) : 0)}
                      onBlur={() => saveYarn(yarn)}
                      className="w-24 bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                      placeholder="0"
                    />
                    <select
                      value={yarn.unit || 'skeins'}
                      disabled={disabled}
                      onChange={(e) => {
                        updateYarnState(yarnIdx, 'unit', e.target.value);
                        saveYarn({ ...yarn, unit: e.target.value });
                      }}
                      className="bg-transparent border-b border-[#E8E2D9] text-xs py-1 focus:outline-none focus:border-[#F28482]"
                    >
                      <option value="skeins">skeins</option>
                      <option value="balls">balls</option>
                      <option value="cakes">cakes</option>
                      <option value="hanks">hanks</option>
                      <option value="meters">meters</option>
                      <option value="yards">yards</option>
                      <option value="grams">grams</option>
                      <option value="ounces">ounces</option>
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
