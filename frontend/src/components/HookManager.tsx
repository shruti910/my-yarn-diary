import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Plus, Trash2, Pencil, Check } from 'lucide-react';
import { YarnSpinner } from './YarnSpinner';
import { useDialog } from './DialogProvider';
import { Hook } from '../types';
import { useAutosave } from '../hooks/useAutosave';
import { useClickOutside } from '../hooks/useClickOutside';

export interface HookManagerHandle {
  add: () => void;
}

interface HookManagerProps {
  projectId: string;
  initialHooks?: Hook[];
  isNewProject?: boolean;
  fetchWithToken: (url: string, options?: RequestInit) => Promise<any>;
  disabled?: boolean;
  hideAddButton?: boolean;
  onHooksChange?: (hooks: Hook[]) => void;
}

interface HookCardProps {
  hook: Hook;
  index: number;
  disabled?: boolean;
  isEditing: boolean;
  onSetEditing: (editing: boolean) => void;
  onChange: (hook: Hook) => void;
  onSave: (hook: Hook) => Promise<void>;
  onRemove: () => void;
}

function HookCard({ hook, index, disabled, isEditing, onSetEditing, onChange, onSave, onRemove }: HookCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { schedule, flush, status } = useAutosave<Hook>((h) => onSave(h), { delay: 1000 });

  const collapse = () => {
    flush();
    onSetEditing(false);
  };

  // Click outside the whole card (not blur) collapses it, after flushing the pending save.
  useClickOutside(cardRef, collapse, isEditing);

  const cardTitle =
    [hook.sizeMm ? `${hook.sizeMm} mm` : '', hook.sizeUs ? `(${hook.sizeUs})` : '', hook.brand]
      .filter(Boolean)
      .join(' ') || `Hook #${index + 1}`;

  // Update parent state immediately and schedule a debounced background save.
  const edit = (field: keyof Hook, value: any) => {
    const updated = { ...hook, [field]: value };
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
        <h5 className="text-xs font-extrabold text-heading truncate">{cardTitle}</h5>
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
              title={isEditing ? 'Done editing' : 'Edit hook specifications'}
            >
              {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Remove hook"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* READ-ONLY DISPLAY MODE */}
      {!isEditing ? (
        <div className="px-3.5 py-2 bg-white text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted font-medium">
            {hook.sizeMm && (
              <span className="font-bold text-heading">
                <span className="text-muted font-semibold">Size:</span> {hook.sizeMm} mm {hook.sizeUs ? `(${hook.sizeUs})` : ''}
              </span>
            )}
            {hook.material && (
              <span className="font-bold text-heading">
                <span className="text-muted font-semibold">Material:</span> {hook.material}
              </span>
            )}
            {hook.brand && (
              <span className="font-bold text-heading">
                <span className="text-muted font-semibold">Brand:</span> {hook.brand}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* EDIT FORM MODE WITH DEBOUNCED AUTOSAVE */
        <div className="p-3.5 space-y-3 bg-white">
          {/* Row 1: Size mm & Size US */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Size (mm)</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={hook.sizeMm || ''}
                disabled={disabled}
                onChange={(e) => {
                  const val = e.target.value;
                  edit('sizeMm', val ? parseFloat(val) : null);
                }}
                className={inputClass}
                placeholder="e.g. 5.0"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Size (US)</label>
              <input
                type="text"
                value={hook.sizeUs || ''}
                disabled={disabled}
                onChange={(e) => edit('sizeUs', e.target.value)}
                className={inputClass}
                placeholder="e.g. H/8"
              />
            </div>
          </div>

          {/* Row 2: Material & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Material</label>
              <input
                type="text"
                value={hook.material || ''}
                disabled={disabled}
                onChange={(e) => edit('material', e.target.value)}
                className={inputClass}
                placeholder="e.g. Aluminum / Ergonomic Rubber"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1">Brand</label>
              <input
                type="text"
                value={hook.brand || ''}
                disabled={disabled}
                onChange={(e) => edit('brand', e.target.value)}
                className={inputClass}
                placeholder="e.g. Clover Armor"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const HookManager = forwardRef<HookManagerHandle, HookManagerProps>(function HookManager(
  { projectId, initialHooks, isNewProject, fetchWithToken, disabled, hideAddButton, onHooksChange },
  ref
) {
  const { showConfirm, showToast } = useDialog();
  const [hooks, setHooks] = useState<Hook[]>(initialHooks || []);
  const [isLoading, setIsLoading] = useState(!initialHooks || initialHooks.length === 0);
  const [editingHookIds, setEditingHookIds] = useState<Set<number>>(new Set());

  const fetchHooks = async () => {
    try {
      const data = await fetchWithToken(`/api/v1/projects/${projectId}/hooks`);
      const hookList = data || [];
      setHooks(hookList);
      onHooksChange?.(hookList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Depends only on projectId/isNewProject — NOT on initialHooks. The projects
  // PUT response can carry a stale hooks array, so once mounted we trust our own
  // fetch from the dedicated /hooks endpoint, not repeated parent prop updates.
  useEffect(() => {
    if (isNewProject) {
      setHooks([]);
      setIsLoading(false);
      return;
    }
    if (initialHooks !== undefined) setHooks(initialHooks); // instant first paint
    fetchHooks(); // reconcile with the authoritative list
  }, [projectId, isNewProject]);

  const addHook = async () => {
    try {
      const newHook = { sizeMm: 4.0, sizeUs: '', material: '', brand: '' };
      const created = await fetchWithToken(`/api/v1/projects/${projectId}/hooks`, {
        method: 'POST',
        body: JSON.stringify(newHook)
      });
      await fetchHooks();
      if (created?.hookId) {
        setEditingHookIds((prev) => new Set(prev).add(created.hookId));
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to add hook.', 'error');
    }
  };

  const removeHook = async (hookId: number) => {
    const confirmed = await showConfirm('Are you sure you want to remove this hook entry?');
    if (!confirmed) return;

    try {
      await fetchWithToken(`/api/v1/hooks/${hookId}`, { method: 'DELETE' });
      await fetchHooks();
    } catch (e) {
      console.error(e);
      showToast('Failed to remove hook.', 'error');
    }
  };

  // Update a single hook in local state (keeps titles / count badge in sync).
  const updateHook = (index: number, updated: Hook) => {
    const newHooks = hooks.map((h, i) => (i === index ? updated : h));
    setHooks(newHooks);
    onHooksChange?.(newHooks);
  };

  const saveHook = async (hook: Hook) => {
    if (!hook.hookId) return;
    try {
      await fetchWithToken(`/api/v1/hooks/${hook.hookId}`, {
        method: 'PUT',
        body: JSON.stringify(hook)
      });
    } catch (e) {
      console.error(e);
      showToast('Failed to save hook details.', 'error');
      throw e;
    }
  };

  const setEditing = (hookId: number, editing: boolean) => {
    setEditingHookIds((prev) => {
      const next = new Set(prev);
      if (editing) next.add(hookId);
      else next.delete(hookId);
      return next;
    });
  };

  // Expose the add action so the section header can host the "Add Hook" button.
  useImperativeHandle(ref, () => ({ add: addHook }), [addHook]);

  if (isLoading) return <div className="text-xs text-muted italic">Loading hooks...</div>;

  return (
    <div className="space-y-3">
      {!hideAddButton && (
        <div className="flex justify-end items-center">
          <button
            type="button"
            onClick={addHook}
            disabled={disabled}
            className="px-3 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add Hook
          </button>
        </div>
      )}

      {hooks.length === 0 ? (
        <div className="p-4 text-center border border-dashed border-subtle rounded-xl bg-surface">
          <p className="text-xs text-muted font-semibold">No hook specifications added yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {hooks.map((hook, hookIdx) => {
            const isEditing = hook.hookId ? editingHookIds.has(hook.hookId) : true;
            return (
              <HookCard
                key={hook.hookId || hookIdx}
                hook={hook}
                index={hookIdx}
                disabled={disabled}
                isEditing={isEditing}
                onSetEditing={(editing) => hook.hookId && setEditing(hook.hookId, editing)}
                onChange={(updated) => updateHook(hookIdx, updated)}
                onSave={saveHook}
                onRemove={() => hook.hookId && removeHook(hook.hookId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
