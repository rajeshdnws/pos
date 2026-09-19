import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Save,
  RotateCcw,
  Monitor,
  LayoutGrid,
  ShieldAlert,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';

export const ApplicationSettingsPage: React.FC = () => {
  const { settings, fetchSettings, updateSettings, resetDefaults } = useSettingsStore();
  const { notify } = useNotificationStore();

  const [formData, setFormData] = useState({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: String(checked) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSettings(formData);
    setIsSaving(false);

    if (res.success) {
      notify('success', 'Application preferences updated successfully.');
    } else {
      notify('error', res.error || 'Failed to save settings.');
    }
  };

  const handleResetDefaults = async () => {
    setIsResetting(true);
    try {
      const res = await resetDefaults();
      if (res.success) {
        notify('success', 'All system preferences restored to standard factory defaults.');
        setShowResetConfirm(false);
        await fetchSettings();
      } else {
        notify('error', res.error || 'Failed to reset settings.');
      }
    } catch (err: any) {
      notify('error', err?.message || 'Error resetting defaults.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="h-6 w-6 text-brand-400" />
            Application Preferences & System Behavior
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure desktop application theme, landing screen, POS layout defaults, confirmation alerts, and acoustic feedback.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 text-xs font-semibold border border-surface-700 hover:border-rose-800/40 transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore Factory Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Navigation & Layout Defaults */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Monitor className="h-4 w-4 text-brand-400" />
              Startup & Default Screen Views
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Color Theme</label>
              <select
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="dark">Professional Dark Mode (Default)</option>
                <option value="light">Classic Light Mode</option>
                <option value="system">Follow Windows System Preference</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Startup Landing Page</label>
              <select
                name="startPage"
                value={formData.startPage}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="/dashboard">Executive Dashboard</option>
                <option value="/sales">Sales & POS Billing Desk</option>
                <option value="/products">Product Master Directory</option>
                <option value="/inventory">Stock & Inventory Balance</option>
                <option value="/reports">Business Reports & Analytics</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Opened immediately after operator login.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Sales Screen Style</label>
              <select
                name="defaultSalesScreen"
                value={formData.defaultSalesScreen}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="standard">Standard Detailed Invoice Table</option>
                <option value="pos_touch">Touch POS Visual Category Grid</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Preferred billing layout for quick checkout.</span>
            </div>
          </div>
        </div>

        {/* Confirmation Guards & Acoustic Feedback */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-brand-400" />
              Safety Confirmation Dialogs & Acoustic Sounds
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="confirmBeforePost"
                checked={formData.confirmBeforePost === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Confirm Before Finalizing Transactions</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Display confirmation summary modal with total payable and change before printing bill.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="confirmBeforeDelete"
                checked={formData.confirmBeforeDelete === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Confirm Before Deleting Masters</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Prompt operator before deleting categories, brands, units, or draft transactions.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="soundOnScan"
                checked={formData.soundOnScan === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Audible Feedback on Barcode Scan</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Play acoustic confirmation tone when scanner successfully detects and enters a product.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="autoBackupOnClose"
                checked={formData.autoBackupOnClose === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Auto Database Backup on App Exit</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Execute safe SQLite checkpoint and save snapshot archive whenever app window is closed.
                </span>
              </div>
            </label>
          </div>
        </div>
      </form>

      {/* Restore Factory Defaults Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-surface-900 border border-rose-500/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-white">Reset All System Defaults?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  This will reset all regional formatting, document prefixes, inventory rules, and application options back to factory defaults.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 bg-surface-950 p-3 rounded-xl border border-surface-800">
              Your masters, products, inventory balance, customers, suppliers, and sales history will <strong className="text-emerald-400">NOT</strong> be affected or modified.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-800">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetDefaults}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
              >
                {isResetting ? 'Restoring...' : 'Yes, Restore Defaults'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
