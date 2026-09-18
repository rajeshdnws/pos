import React, { useEffect, useState } from 'react';
import { Sliders, Save } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';

export const ApplicationSettingsPage: React.FC = () => {
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { notify } = useNotificationStore();

  const [formData, setFormData] = useState({ ...settings });
  const [isSaving, setIsSaving] = useState(false);

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
      notify('success', 'Application settings updated successfully.');
    } else {
      notify('error', res.error || 'Failed to save settings.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Application Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Customize display formatting, hardware preferences, and offline data policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Regional & Formatting */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-brand-400" />
            Regional & Display Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date Format</label>
              <select
                name="dateFormat"
                value={formData.dateFormat}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Currency Code</label>
              <input
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                name="currencySymbol"
                value={formData.currencySymbol}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Decimal Precision
              </label>
              <select
                name="decimalPrecision"
                value={formData.decimalPrecision}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="2">2 Decimals (e.g. ₹100.00)</option>
                <option value="0">0 Decimals (e.g. ₹100)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default Low Stock Alert Threshold
              </label>
              <input
                type="number"
                name="lowStockThresholdDefault"
                value={formData.lowStockThresholdDefault}
                onChange={handleChange}
                min={0}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Hardware & Printer Settings */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Printer Configuration</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Invoice Format
              </label>
              <select
                name="invoicePrintFormat"
                value={formData.invoicePrintFormat}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="thermal">Thermal POS Receipt</option>
                <option value="standard_a4">Standard A4 Document</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Thermal Paper Width
              </label>
              <select
                name="thermalPaperSize"
                value={formData.thermalPaperSize}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="80mm">80 mm (Standard POS)</option>
                <option value="58mm">58 mm (Compact Receipt)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Backup Preferences */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-white">Offline Data Safety</h2>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800">
            <input
              type="checkbox"
              id="autoBackupOnClose"
              name="autoBackupOnClose"
              checked={formData.autoBackupOnClose === 'true'}
              onChange={handleChange}
              className="h-4 w-4 rounded bg-surface-800 border-surface-700 text-brand-600 focus:ring-brand-500"
            />
            <label
              htmlFor="autoBackupOnClose"
              className="text-xs font-medium text-slate-200 cursor-pointer"
            >
              Automatically create snapshot database backup on application close
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving Settings...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
