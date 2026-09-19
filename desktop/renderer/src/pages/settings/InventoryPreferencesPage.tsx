import React, { useEffect, useState } from 'react';
import {
  Package,
  Save,
  Barcode,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { InventoryLocation } from '@rs-inventory/types';

export const InventoryPreferencesPage: React.FC = () => {
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { notify } = useNotificationStore();

  const [formData, setFormData] = useState({ ...settings });
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    loadLocations();
  }, [fetchSettings]);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const loadLocations = async () => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.listLocations();
        if (res.success && res.data) {
          setLocations(res.data);
        }
      }
    } catch {
      // ignore
    }
  };

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
      notify('success', 'Inventory and warehouse preferences saved.');
    } else {
      notify('error', res.error || 'Failed to save settings.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Package className="h-6 w-6 text-brand-400" />
            Inventory & Stock Preferences
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure stock deduction rules, negative stock enforcement, default warehouse locations, and POS scanning behavior.
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
        {/* Negative Stock Control Safeguard */}
        <div className={`rounded-2xl border p-6 space-y-4 transition-colors ${
          formData.allowNegativeStock === 'true'
            ? 'bg-rose-950/30 border-rose-500/30'
            : 'bg-surface-900/70 border-surface-800'
        }`}>
          <div className="flex items-start gap-3">
            {formData.allowNegativeStock === 'true' ? (
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Package className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowNegativeStock"
                  checked={formData.allowNegativeStock === 'true'}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">Allow Negative Stock on Sales Invoices</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    When disabled (strictly enforced), transactions will be rejected if quantity exceeds current physical inventory on hand.
                  </span>
                </div>
              </label>

              {formData.allowNegativeStock === 'true' && (
                <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800/40 text-[11px] text-rose-300">
                  <span className="font-semibold">Warning:</span> Permitting negative inventory can distort cost calculations and valuation reports until supplier invoices are entered.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stock Locations & Thresholds */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-400" />
              Default Stock Location & Reorder Triggers
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Warehouse / Location</label>
              <select
                name="defaultStockLocationId"
                value={formData.defaultStockLocationId}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="">Main Store / Primary Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Global Low Stock Alert Level</label>
              <input
                type="number"
                min={0}
                name="lowStockThresholdDefault"
                value={formData.lowStockThresholdDefault}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default minimum quantity for alert triggers.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Adjustment Reason</label>
              <input
                type="text"
                name="defaultAdjustmentReason"
                value={formData.defaultAdjustmentReason}
                onChange={handleChange}
                placeholder="Physical Stock Reconciliation"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* POS Hardware & Scanning Preferences */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Barcode className="h-4 w-4 text-brand-400" />
              Barcode Scanner & Cashier Privacy Rules
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="enableBarcodeScanning"
                checked={formData.enableBarcodeScanning === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Enable USB/Bluetooth Barcode Scanner</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Listen for rapid keystroke scanner inputs and instantly add matching items to the active cart.
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
                <span className="text-xs font-semibold text-white block">Audible Beep on Scan</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Play acoustic confirmation sound whenever a barcode is successfully detected and added.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="showProductCostToCashiers"
                checked={formData.showProductCostToCashiers === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Show Purchase Cost to Cashiers</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  When disabled, purchase price and gross margin columns are hidden from cashier accounts.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="showInactiveProductsInSearch"
                checked={formData.showInactiveProductsInSearch === 'true'}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Include Inactive Products in Lookup</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Allow searching discontinued or disabled SKUs in product lookup screens.
                </span>
              </div>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};
