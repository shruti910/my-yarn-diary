import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { YarnSpinner } from './YarnSpinner';
import { Hook } from '../types';

interface HookManagerProps {
 projectId: string;
 initialHooks?: Hook[];
 isNewProject?: boolean;
 fetchWithToken: (url: string, options?: RequestInit) => Promise<any>;
 disabled?: boolean;
}

export function HookManager({ projectId, initialHooks, isNewProject, fetchWithToken, disabled }: HookManagerProps) {
 const [hooks, setHooks] = useState<Hook[]>(initialHooks || []);
 const [isLoading, setIsLoading] = useState(!initialHooks || initialHooks.length === 0);
 const [savingId, setSavingId] = useState<number | null>(null);

 const fetchHooks = async () => {
 try {
 const data = await fetchWithToken(`/api/v1/projects/${projectId}/hooks`);
 setHooks(data || []);
 } catch (e) {
 console.error(e);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 if (isNewProject) {
 setHooks([]);
 setIsLoading(false);
 } else if (initialHooks !== undefined) {
 setHooks(initialHooks);
 setIsLoading(false);
 } else {
 fetchHooks();
 }
 }, [projectId, isNewProject, initialHooks]);

 const addHook = async () => {
 try {
 const newHook = { sizeMm: 4.0, sizeUs: '', material: '', brand: '' };
 await fetchWithToken(`/api/v1/projects/${projectId}/hooks`, {
 method: 'POST',
 body: JSON.stringify(newHook)
 });
 fetchHooks();
 } catch (e) {
 console.error(e);
 }
 };

 const removeHook = async (hookId: number) => {
 try {
 await fetchWithToken(`/api/v1/hooks/${hookId}`, { method: 'DELETE' });
 fetchHooks();
 } catch (e) {
 console.error(e);
 }
 };

 const updateHookState = (index: number, field: keyof Hook, value: any) => {
 const newHooks = [...hooks];
 newHooks[index] = { ...newHooks[index], [field]: value };
 setHooks(newHooks);
 };

 const saveHook = async (hook: Hook) => {
 if (!hook.hookId) return;
 setSavingId(hook.hookId);
 try {
 await fetchWithToken(`/api/v1/hooks/${hook.hookId}`, {
 method: 'PUT',
 body: JSON.stringify(hook)
 });
 await fetchHooks();
 } catch (e) {
 console.error(e);
 } finally {
 setSavingId(null);
 }
 };

 if (isLoading) return <div className="text-xs text-muted italic">Loading hooks...</div>;

 return (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider">Hooks Used</label>
 <button
 type="button"
 onClick={addHook}
 disabled={disabled}
 className="text-[11px] font-extrabold text-brand flex items-center gap-1 hover:text-error disabled:opacity-50"
 >
 <Plus className="w-3 h-3" /> Add Hook
 </button>
 </div>
 
 {hooks.length === 0 ? (
 <p className="text-xs text-muted italic">No hooks added yet.</p>
 ) : (
 <div className="space-y-3">
 {hooks.map((hook, hookIdx) => (
 <div key={hook.hookId || hookIdx} className="p-3 bg-surface border border-subtle rounded-xl space-y-3 relative group">
 <div className="absolute top-3 right-3 flex items-center gap-2">
 <button
 type="button"
 onClick={() => saveHook(hook)}
 disabled={disabled || savingId === hook.hookId}
 className="text-muted hover:text-muted disabled:opacity-50 flex items-center"
 >
 {savingId === hook.hookId ? <YarnSpinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
 </button>
 <button
 type="button"
 onClick={() => hook.hookId && removeHook(hook.hookId)}
 disabled={disabled}
 className="text-muted hover:text-red-500 disabled:opacity-50"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pr-14 sm:pr-16">
 <div>
 <label className="text-[11px] font-bold text-muted uppercase">Size (mm)</label>
 <input
 type="number"
 step="0.25"
 min="0"
 value={hook.sizeMm || ''}
 disabled={disabled}
 onChange={(e) => {
 const val = e.target.value;
 updateHookState(hookIdx, 'sizeMm', val ? parseFloat(val) : null);
 }}
 onBlur={() => saveHook(hook)}
 className="w-full bg-transparent border-b border-subtle text-xs py-2 sm:py-1 focus:outline-none focus:border-brand"
 placeholder="e.g. 5.0"
 />
 </div>
 <div>
 <label className="text-[11px] font-bold text-muted uppercase">Size (US)</label>
 <input
 type="text"
 value={hook.sizeUs || ''}
 disabled={disabled}
 onChange={(e) => updateHookState(hookIdx, 'sizeUs', e.target.value)}
 onBlur={() => saveHook(hook)}
 className="w-full bg-transparent border-b border-subtle text-xs py-2 sm:py-1 focus:outline-none focus:border-brand"
 placeholder="e.g. H/8"
 />
 </div>
 <div>
 <label className="text-[11px] font-bold text-muted uppercase">Material</label>
 <input
 type="text"
 value={hook.material || ''}
 disabled={disabled}
 onChange={(e) => updateHookState(hookIdx, 'material', e.target.value)}
 onBlur={() => saveHook(hook)}
 className="w-full bg-transparent border-b border-subtle text-xs py-2 sm:py-1 focus:outline-none focus:border-brand"
 placeholder="e.g. Aluminum"
 />
 </div>
 <div>
 <label className="text-[11px] font-bold text-muted uppercase">Brand</label>
 <input
 type="text"
 value={hook.brand || ''}
 disabled={disabled}
 onChange={(e) => updateHookState(hookIdx, 'brand', e.target.value)}
 onBlur={() => saveHook(hook)}
 className="w-full bg-transparent border-b border-subtle text-xs py-2 sm:py-1 focus:outline-none focus:border-brand"
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
