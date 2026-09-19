import React, { useEffect, useState, useMemo } from 'react';
import {
  Coins,
  Save,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';

export const CurrencySettingsPage: React.FC = () => {
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSettings(formData);
    setIsSaving(false);

    if (res.success) {
      notify('success', 'Currency and number formatting preferences saved.');
    } else {
      notify('error', res.error || 'Failed to save settings.');
    }
  };

  // Live formatted sample calculation
  const sampleFormattedCurrency = useMemo(() => {
    const rawVal = 14950.75;
    const decimals = parseInt(formData.currencyDecimalPlaces || '2', 10);
    const thouSep = formData.thousandsSeparator || ',';
    const decSep = formData.decimalSeparator || '.';
    const sym = formData.currencySymbol || '₹';
    const place = formData.currencySymbolPlacement || 'BEFORE';

    const parts = rawVal.toFixed(decimals).split('.');
    const integerPart = (parts[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, thouSep);
    const formattedNum = decimals > 0 ? `${integerPart}${decSep}${parts[1] || ''}` : integerPart;

    return place === 'BEFORE' ? `${sym} ${formattedNum}` : `${formattedNum} ${sym}`;
  }, [formData]);

  const sampleFormattedQuantity = useMemo(() => {
    const qtyVal = 25.456;
    const decimals = parseInt(formData.quantityDecimalPlaces || '2', 10);
    const thouSep = formData.thousandsSeparator || ',';
    const decSep = formData.decimalSeparator || '.';

    const parts = qtyVal.toFixed(decimals).split('.');
    const integerPart = (parts[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, thouSep);
    return decimals > 0 ? `${integerPart}${decSep}${parts[1] || ''}` : integerPart;
  }, [formData]);

  const sampleFormattedDate = useMemo(() => {
    const d = new Date(2026, 8, 19, 14, 30, 0); // 19 Sep 2026
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    if (formData.dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
    if (formData.dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
    return `${day}/${month}/${year}`;
  }, [formData.dateFormat]);

  const sampleFormattedTime = useMemo(() => {
    if (formData.timeFormat === '24h') return '14:30:45';
    return '02:30:45 PM';
  }, [formData.timeFormat]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Coins className="h-6 w-6 text-brand-400" />
            Currency & Number Formatting
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardize monetary displays, decimal precision, separators, and calendar timestamp formats across the POS system.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Formatting'}
        </button>
      </div>

      {/* Live Sample Preview Card */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-950/70 via-surface-900/90 to-surface-900/70 border border-brand-500/20 p-5 shadow-xl">
        <div className="flex items-center gap-2 text-brand-400 font-semibold text-xs tracking-wider uppercase mb-3">
          <Sparkles className="h-4 w-4" />
          Real-Time Display Preview
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800">
            <span className="text-[11px] text-slate-400 block mb-1">Invoice Total Amount</span>
            <span className="text-lg font-bold text-white tracking-tight">{sampleFormattedCurrency}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800">
            <span className="text-[11px] text-slate-400 block mb-1">Product Quantity</span>
            <span className="text-lg font-bold text-brand-300 tracking-tight">{sampleFormattedQuantity} PCS</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800">
            <span className="text-[11px] text-slate-400 block mb-1">Invoice Date</span>
            <span className="text-lg font-bold text-slate-200 tracking-tight">{sampleFormattedDate}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800">
            <span className="text-[11px] text-slate-400 block mb-1">Print Timestamp</span>
            <span className="text-lg font-bold text-slate-200 tracking-tight">{sampleFormattedTime}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Currency & Placement */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Coins className="h-4 w-4 text-brand-400" />
              Currency Identification & Placement
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Currency Code (ISO)</label>
              <input
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                placeholder="INR"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500 uppercase"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">e.g. INR, USD, EUR, AED, GBP</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Currency Symbol</label>
              <input
                type="text"
                name="currencySymbol"
                value={formData.currencySymbol}
                onChange={handleChange}
                placeholder="₹"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">e.g. ₹, $, €, £, د.إ</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Symbol Placement</label>
              <select
                name="currencySymbolPlacement"
                value={formData.currencySymbolPlacement}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="BEFORE">Before Amount (₹ 100.00)</option>
                <option value="AFTER">After Amount (100.00 ₹)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Precision & Separators */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-400" />
              Decimal Places & Number Delimiters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Currency Decimals</label>
              <select
                name="currencyDecimalPlaces"
                value={formData.currencyDecimalPlaces}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="0">0 (Integer amounts only)</option>
                <option value="2">2 (Standard e.g. 10.50)</option>
                <option value="3">3 (High precision e.g. 10.550)</option>
                <option value="4">4 (Micro pricing e.g. 10.5525)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Quantity Decimals</label>
              <select
                name="quantityDecimalPlaces"
                value={formData.quantityDecimalPlaces}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="0">0 (Whole units e.g. 12 PCS)</option>
                <option value="2">2 (Fractional e.g. 12.50 KG)</option>
                <option value="3">3 (Granular e.g. 12.375 KG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Thousands Separator</label>
              <select
                name="thousandsSeparator"
                value={formData.thousandsSeparator}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value=",">Comma (,)</option>
                <option value=".">Period (.)</option>
                <option value=" ">Space ( )</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Decimal Separator</label>
              <select
                name="decimalSeparator"
                value={formData.decimalSeparator}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value=".">Period (.)</option>
                <option value=",">Comma (,)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date & Time Patterns */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-400" />
              Calendar Date & Time Preferences
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Display Date Format</label>
              <select
                name="dateFormat"
                value={formData.dateFormat}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO International)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Clock Time Format</label>
              <select
                name="timeFormat"
                value={formData.timeFormat}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="12h">12-Hour (e.g. 02:30 PM)</option>
                <option value="24h">24-Hour (e.g. 14:30)</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
