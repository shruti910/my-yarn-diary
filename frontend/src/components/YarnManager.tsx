import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Plus, Trash2, Pencil, Check } from 'lucide-react';
import { YarnSpinner } from './YarnSpinner';
import { CustomDropdown } from './CustomDropdown';
import { useDialog } from './DialogProvider';
import { Yarn } from '../types';
import { useAutosave } from '../hooks/useAutosave';
import { useClickOutside } from '../hooks/useClickOutside';
import { swatchColor } from '../lib/color';

export interface YarnManagerHandle {
  add: () => void;
}

interface YarnManagerProps {
  projectId: string;
  initialYarns?: Yarn[];
  isNewProject?: boolean;
  fetchWithToken: (url: string, options?: RequestInit) => Promise<any>;
  disabled?: boolean;
  hideAddButton?: boolean;
  onYarnsChange?: (yarns: Yarn[]) => void;
}

interface YarnCardProps {
  yarn: Yarn;
  index: number;
  disabled?: boolean;
  isEditing: boolean;
  onSetEditing: (editing: boolean) => void;
  onChange: (yarn: Yarn) => void;
  onSave: (yarn: Yarn) => Promise<void>;
  onRemove: () => void;
}

function YarnCard({ yarn, index, disabled, isEditing, onSetEditing, onChange, onSave, onRemove }: YarnCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { schedule, flush, status } = useAutosave<Yarn>((y) => onSave(y), { delay: 1000 });

  const collapse = () => {
    flush();
    onSetEditing(false);
  };

  // Click outside the whole card (not blur) collapses it, after flushing the pending save.
  useClickOutside(cardRef, collapse, isEditing);

  const brandLine = [yarn.brand, yarn.lineName].filter(Boolean).join(' - ') || `Yarn #${index + 1}`;

  // Update parent state immediately and schedule a debounced background save.
  const edit = (field: keyof Yarn, value: any) => {
    const updated = { ...yarn, [field]: value };
    onChange(updated);
    schedule(updated);
  };

  const inputClass =
    'w-full bg-surface border border-subtle text-xs p-2.5 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold';

  return (
    <div
      ref={cardRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isEditing) collapse();
      }}
      className="bg-white border border-subtle rounded-xl overflow-hidden shadow-xs transition-all"
    >
      {/* Card Header Bar */}
      <div className="bg-surface px-3.5 py-2 border-b border-subtle flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0 border border-black/15 shadow-xs"
            style={{ backgroundColor: swatchColor(yarn.colorway) }}
          />
          <h5 className="text-xs font-extrabold text-heading truncate">{brandLine}</h5>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {status === 'saving' ? (
            <YarnSpinner className="w-4 h-4 text-brand" />
          ) : (
            <button
              type="button"
              onClick={() => (isEditing ? collapse() : onSetEditing(true))}
              disabled={disabled}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                isEditing ? 'text-brand bg-brand/10' : 'text-muted hover:text-brand hover:bg-brand/10'
              }`}
              title={isEditing ? 'Done editing' : 'Edit yarn specifications'}
            >
              {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Remove yarn"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* READ-ONLY DISPLAY MODE */}
      {!isEditing ? (
        <div className="px-3.5 py-2 bg-white text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted font-medium">
            {yarn.colorway && (
              <span className="flex items-center gap-1 font-bold text-heading">
                <span className="text-muted font-semibold">Colorway:</span>
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-black/10"
                  style={{ backgroundColor: swatchColor(yarn.colorway) }}
                />
                {yarn.colorway}
              </span>
            )}
            {yarn.quantityUsed !== undefined && (
              <span className="font-bold text-heading">
                <span className="text-muted font-semibold">Qty:</span> {yarn.quantityUsed} {yarn.unit || 'skeins'}
              </span>
            )}
            {yarn.weight && (
              <span className="font-bold text-heading">
                <span className="text-muted font-semibold">Weight:</span> {yarn.weight}
              </span>
            )}
            {yarn.dyeLot && (
              <span className="font-bold text-heading">
                <span className="text-muted font-semibold">Dye Lot:</span> {yarn.dyeLot}
              </span>
            )}
            {yarn.fiberContent && (
              <span className="font-bold text-heading">
                <span className="text-muted font-semibold">Fiber:</span> {yarn.fiberContent}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* EDIT FORM MODE WITH DEBOUNCED AUTOSAVE */
        <div className="p-3.5 space-y-3 bg-white">
          {/* Row 1: Brand & Line Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Brand Name</label>
              <input
                type="text"
                value={yarn.brand || ''}
                disabled={disabled}
                onChange={(e) => edit('brand', e.target.value)}
                className={inputClass}
                placeholder="e.g. Red Heart"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Line Name</label>
              <input
                type="text"
                value={yarn.lineName || ''}
                disabled={disabled}
                onChange={(e) => edit('lineName', e.target.value)}
                className={inputClass}
                placeholder="e.g. Super Saver"
              />
            </div>
          </div>

          {/* Row 2: Colorway & Dye Lot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Colorway</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  disabled={disabled}
                  value={swatchColor(yarn.colorway, '#000000')}
                  onChange={(e) => edit('colorway', e.target.value)}
                  className="w-9 h-9 rounded-xl border border-subtle cursor-pointer p-0.5 shrink-0"
                />
                <input
                  type="text"
                  value={yarn.colorway || ''}
                  disabled={disabled}
                  onChange={(e) => edit('colorway', e.target.value)}
                  className="flex-1 min-w-0 bg-surface border border-subtle text-xs p-2.5 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold"
                  placeholder="Name or Hex (e.g. #CD1818)"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Dye Lot</label>
              <input
                type="text"
                value={yarn.dyeLot || ''}
                disabled={disabled}
                onChange={(e) => edit('dyeLot', e.target.value)}
                className={inputClass}
                placeholder="e.g. 12345"
              />
            </div>
          </div>

          {/* Row 3: Weight & Fiber */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Yarn Weight</label>
              <input
                type="text"
                value={yarn.weight || ''}
                disabled={disabled}
                onChange={(e) => edit('weight', e.target.value)}
                className={inputClass}
                placeholder="e.g. 4 / Worsted"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Fiber Content</label>
              <input
                type="text"
                value={yarn.fiberContent || ''}
                disabled={disabled}
                onChange={(e) => edit('fiberContent', e.target.value)}
                className={inputClass}
                placeholder="e.g. 100% Acrylic"
              />
            </div>
          </div>

          {/* Row 4: Quantity Used & Unit */}
          <div>
            <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Quantity Used</label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                value={yarn.quantityUsed || ''}
                disabled={disabled}
                min="0"
                step="0.5"
                onChange={(e) => edit('quantityUsed', e.target.value ? parseFloat(e.target.value) : 0)}
                className="w-28 bg-surface border border-subtle text-xs p-2.5 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold"
                placeholder="0"
              />
              <div className="flex-1 max-w-xs relative z-20">
                <CustomDropdown
                  value={yarn.unit || 'skeins'}
                  direction="up"
                  disabled={disabled}
                  onChange={(val) => edit('unit', val)}
                  options={[
                    { value: 'skeins', label: 'skeins' },
                    { value: 'balls', label: 'balls' },
                    { value: 'cakes', label: 'cakes' },
                    { value: 'hanks', label: 'hanks' },
                    { value: 'meters', label: 'meters' },
                    { value: 'yards', label: 'yards' },
                    { value: 'grams', label: 'grams' },
                    { value: 'ounces', label: 'ounces' }
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const YarnManager = forwardRef<YarnManagerHandle, YarnManagerProps>(function YarnManager(
  { projectId, initialYarns, isNewProject, fetchWithToken, disabled, hideAddButton, onYarnsChange },
  ref
) {
  const { showConfirm, showToast } = useDialog();
  const [yarns, setYarns] = useState<Yarn[]>(initialYarns || []);
  const [isLoading, setIsLoading] = useState(!initialYarns || initialYarns.length === 0);
  const [editingYarnIds, setEditingYarnIds] = useState<Set<number>>(new Set());

  const fetchYarns = async () => {
    try {
      const data = await fetchWithToken(`/api/v1/projects/${projectId}/yarns`);
      const yarnList = data || [];
      setYarns(yarnList);
      onYarnsChange?.(yarnList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Depends only on projectId/isNewProject — NOT on initialYarns. The projects
  // PUT response can carry a stale yarns array, so once mounted we trust our own
  // fetch from the dedicated /yarns endpoint, not repeated parent prop updates.
  useEffect(() => {
    if (isNewProject) {
      setYarns([]);
      setIsLoading(false);
      return;
    }
    if (initialYarns !== undefined) setYarns(initialYarns); // instant first paint
    fetchYarns(); // reconcile with the authoritative list
  }, [projectId, isNewProject]);

  const addYarn = async () => {
    try {
      const newYarn = { brand: 'New Brand', lineName: '', colorway: '#D4738B', dyeLot: '', weight: '', fiberContent: '', quantityUsed: 1, unit: 'skeins' };
      const created = await fetchWithToken(`/api/v1/projects/${projectId}/yarns`, {
        method: 'POST',
        body: JSON.stringify(newYarn)
      });
      await fetchYarns();
      if (created?.yarnId) {
        setEditingYarnIds((prev) => new Set(prev).add(created.yarnId));
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to add yarn.', 'error');
    }
  };

  const removeYarn = async (yarnId: number) => {
    const confirmed = await showConfirm('Are you sure you want to remove this yarn entry?');
    if (!confirmed) return;

    try {
      await fetchWithToken(`/api/v1/yarns/${yarnId}`, { method: 'DELETE' });
      await fetchYarns();
    } catch (e) {
      console.error(e);
      showToast('Failed to remove yarn.', 'error');
    }
  };

  // Update a single yarn in local state (keeps titles / swatch / count badge in sync).
  const updateYarn = (index: number, updated: Yarn) => {
    const newYarns = yarns.map((y, i) => (i === index ? updated : y));
    setYarns(newYarns);
    onYarnsChange?.(newYarns);
  };

  const saveYarn = async (yarn: Yarn) => {
    if (!yarn.yarnId) return;
    try {
      await fetchWithToken(`/api/v1/yarns/${yarn.yarnId}`, {
        method: 'PUT',
        body: JSON.stringify(yarn)
      });
    } catch (e) {
      console.error(e);
      showToast('Failed to save yarn details.', 'error');
      throw e;
    }
  };

  const setEditing = (yarnId: number, editing: boolean) => {
    setEditingYarnIds((prev) => {
      const next = new Set(prev);
      if (editing) next.add(yarnId);
      else next.delete(yarnId);
      return next;
    });
  };

  // Expose the add action so the section header can host the "Add Yarn" button.
  useImperativeHandle(ref, () => ({ add: addYarn }), [addYarn]);

  if (isLoading) return <div className="text-xs text-muted italic">Loading yarns...</div>;

  return (
    <div className="space-y-3">
      {!hideAddButton && (
        <div className="flex justify-end items-center">
          <button
            type="button"
            onClick={addYarn}
            disabled={disabled}
            className="px-3 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add Yarn
          </button>
        </div>
      )}

      {yarns.length === 0 ? (
        <div className="p-4 text-center border border-dashed border-subtle rounded-xl bg-surface">
          <p className="text-xs text-muted font-semibold">No yarn specifications added yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {yarns.map((yarn, yarnIdx) => {
            const isEditing = yarn.yarnId ? editingYarnIds.has(yarn.yarnId) : true;
            return (
              <YarnCard
                key={yarn.yarnId || yarnIdx}
                yarn={yarn}
                index={yarnIdx}
                disabled={disabled}
                isEditing={isEditing}
                onSetEditing={(editing) => yarn.yarnId && setEditing(yarn.yarnId, editing)}
                onChange={(updated) => updateYarn(yarnIdx, updated)}
                onSave={saveYarn}
                onRemove={() => yarn.yarnId && removeYarn(yarn.yarnId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
