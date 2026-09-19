import React, { useEffect, useState } from 'react';
import {
  Percent,
  Save,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';

export const TaxPricingSettingsPage: React.FC = () => {
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
      notify('success', 'Tax and pricing preferences updated successfully.');
    } else {
      notify('error', res.error || 'Failed to save settings.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Percent className="h-6 w-6 text-brand-400" />
            Tax & Pricing Preferences
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure GST taxation modes, default rates, pricing flexibility, discounts, and margin protection rules.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Taxation Rules */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Percent className="h-4 w-4 text-brand-400" />
              Tax Calculation & GST Defaults
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Tax Treatment</label>
              <select
                name="defaultTaxInclusive"
                value={formData.defaultTaxInclusive}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="false">Tax Exclusive (Base Price + Tax added)</option>
                <option value="true">Tax Inclusive (MRP / Retail Price includes Tax)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {formData.defaultTaxInclusive === 'true'
                  ? 'Item selling price is treated as inclusive of all applicable GST taxes.'
                  : 'GST tax amount is computed on top of the net item rate.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default GST Slab</label>
              <select
                name="defaultTaxRate"
                value={formData.defaultTaxRate}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="0">0% (Nil / Exempted)</option>
                <option value="5">5% (Essential Commodities)</option>
                <option value="12">12% (Standard Low)</option>
                <option value="18">18% (Standard General)</option>
                <option value="28">28% (Luxury / Sin goods)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Pre-filled default for newly registered products.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tax Display on Vouchers</label>
              <select
                name="defaultTaxDisplay"
                value={formData.defaultTaxDisplay}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="ITEMIZED">Itemized (Rate and GST per line item)</option>
                <option value="SUMMARY">Summary Only (Combined tax total at bottom)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Flexibility & Overrides */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Tag className="h-4 w-4 text-brand-400" />
              Cashier Price Overrides & Discount Policies
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="allowPriceOverride"
                checked={formData.allowPriceOverride === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Allow Cashier Price Override</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Permit cashiers and sales operators to adjust the unit selling price on POS checkout lines.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="allowInvoiceDiscount"
                checked={formData.allowInvoiceDiscount === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Allow Bill-Level Discounts</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Enable applying overall flat or percentage discounts to the entire invoice total.
                </span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Discount Preference Mode</label>
              <select
                name="discountDisplayPreference"
                value={formData.discountDisplayPreference}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="PERCENTAGE">Percentage (%) based discount</option>
                <option value="FLAT">Flat currency amount discount</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Unit Price Precision</label>
              <select
                name="priceDecimalPrecision"
                value={formData.priceDecimalPrecision}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="2">2 Decimal Places (₹ 0.01)</option>
                <option value="3">3 Decimal Places (₹ 0.001)</option>
                <option value="4">4 Decimal Places (₹ 0.0001)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selling Below Cost Safeguard */}
        <div className="rounded-2xl bg-surface-900/70 border border-amber-500/20 p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            Margin Protection & Below-Cost Safeguard
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950/80 border border-amber-500/30 cursor-pointer">
            <input
              type="checkbox"
              name="allowSellBelowCost"
              checked={formData.allowSellBelowCost === 'true'}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-amber-500/50 text-amber-600 focus:ring-amber-500"
            />
            <div>
              <span className="text-xs font-semibold text-white block">Allow Selling Below Purchase Cost</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                When unchecked (recommended), the system prevents posting sales if the effective item rate is lower than its purchase cost.
              </span>
            </div>
          </label>
        </div>
      </form>
    </div>
  );
};
