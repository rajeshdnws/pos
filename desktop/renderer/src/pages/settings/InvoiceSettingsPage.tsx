import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Printer,
  Save,
  Sliders,
  FileText,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';

export const InvoiceSettingsPage: React.FC = () => {
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { notify } = useNotificationStore();

  const [formData, setFormData] = useState({ ...settings });
  const [printers, setPrinters] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);

  useEffect(() => {
    fetchSettings();
    loadPrinters();
  }, [fetchSettings]);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const loadPrinters = async () => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.listAvailablePrinters();
        if (res.success && res.data) {
          const list = res.data;
          setPrinters(list);
          if (!formData.selectedPrinter && list.length > 0) {
            setFormData((prev) => ({ ...prev, selectedPrinter: list[0] || '' }));
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      notify('success', 'Invoice and receipt settings saved successfully.');
    } else {
      notify('error', res.error || 'Failed to save settings.');
    }
  };

  const handleTestPrint = async () => {
    setIsPrintingTest(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.testPrint(
          formData.selectedPrinter,
          formData.invoicePrintFormat,
        );
        if (res.success) {
          notify('success', res.data?.message || 'Test print sent successfully.');
        } else {
          notify('error', res.error?.message || 'Test print failed.');
        }
      }
    } catch (err: any) {
      notify('error', err?.message || 'Test print error.');
    } finally {
      setIsPrintingTest(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-brand-400" />
            Invoice & Receipt Printing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure invoice numbering prefixes, thermal/A4 printing templates, hardware printers, and receipt content toggles.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Document Numbering Prefixes */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-400" />
              Document Numbering & Sequences
            </h2>
            <span className="text-[11px] text-slate-400">Prefixes apply to all newly generated vouchers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sales Invoice Prefix</label>
              <input
                type="text"
                name="invoicePrefix"
                value={formData.invoicePrefix}
                onChange={handleChange}
                placeholder="INV"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Preview: {formData.invoicePrefix}-00001</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sales Return Prefix</label>
              <input
                type="text"
                name="salesReturnPrefix"
                value={formData.salesReturnPrefix}
                onChange={handleChange}
                placeholder="SRET"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Preview: {formData.salesReturnPrefix}-00001</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Purchase Order Prefix</label>
              <input
                type="text"
                name="purchasePrefix"
                value={formData.purchasePrefix}
                onChange={handleChange}
                placeholder="PUR"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Preview: {formData.purchasePrefix}-00001</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Purchase Return Prefix</label>
              <input
                type="text"
                name="purchaseReturnPrefix"
                value={formData.purchaseReturnPrefix}
                onChange={handleChange}
                placeholder="PRET"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Preview: {formData.purchaseReturnPrefix}-00001</span>
            </div>
          </div>
        </div>

        {/* Print Layout & Hardware Printer */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Printer className="h-4 w-4 text-brand-400" />
              Printer Selection & Format Template
            </h2>
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={isPrintingTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-medium border border-surface-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-brand-400" />
              {isPrintingTest ? 'Sending Test...' : 'Test Print'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Primary Layout Format</label>
              <select
                name="invoicePrintFormat"
                value={formData.invoicePrintFormat}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="thermal">Thermal Receipt (POS Roll)</option>
                <option value="standard_a4">Standard A4 / Letterhead Invoice</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {formData.invoicePrintFormat === 'thermal'
                  ? 'Optimized for high-speed POS thermal receipt printers.'
                  : 'Full detailed tax invoice with company letterhead layout.'}
              </span>
            </div>

            {formData.invoicePrintFormat === 'thermal' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Thermal Paper Width</label>
                <select
                  name="thermalPaperSize"
                  value={formData.thermalPaperSize}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="80mm">80mm (Standard POS width)</option>
                  <option value="58mm">58mm (Compact portable roll)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Printer Hardware</label>
              <select
                name="selectedPrinter"
                value={formData.selectedPrinter}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="">Default Windows System Printer</option>
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Display & Content Toggles */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
          <div className="border-b border-surface-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-brand-400" />
              Receipt & Invoice Content Toggles
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Control optional headers, breakdowns, and customer notes printed on slips.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="showLogoOnInvoice"
                checked={formData.showLogoOnInvoice === 'true'}
                onChange={handleChange}
                className="h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Print Company Logo</span>
                <span className="text-[10px] text-slate-400">Display uploaded business logo on header</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="showGstinOnInvoice"
                checked={formData.showGstinOnInvoice === 'true'}
                onChange={handleChange}
                className="h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Print GSTIN / Tax ID</span>
                <span className="text-[10px] text-slate-400">Include GSTIN and PAN in company header</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="showCustomerContactOnInvoice"
                checked={formData.showCustomerContactOnInvoice === 'true'}
                onChange={handleChange}
                className="h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Customer Contact Info</span>
                <span className="text-[10px] text-slate-400">Print customer phone & ledger balance</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="showSkuBarcodeOnInvoice"
                checked={formData.showSkuBarcodeOnInvoice === 'true'}
                onChange={handleChange}
                className="h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Print SKU / Barcode</span>
                <span className="text-[10px] text-slate-400">Show item codes underneath product names</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="showTaxBreakdownOnInvoice"
                checked={formData.showTaxBreakdownOnInvoice === 'true'}
                onChange={handleChange}
                className="h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Tax Breakdown Summary</span>
                <span className="text-[10px] text-slate-400">Print CGST / SGST rate-wise split</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                name="showTermsOnInvoice"
                checked={formData.showTermsOnInvoice === 'true'}
                onChange={handleChange}
                className="h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Terms & Conditions</span>
                <span className="text-[10px] text-slate-400">Print return policy and warranty conditions</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Invoice Footer Greeting</label>
              <input
                type="text"
                name="invoiceFooterText"
                value={formData.invoiceFooterText}
                onChange={handleChange}
                placeholder="Thank you for your business! Visit again."
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Standard Terms & Conditions</label>
              <textarea
                name="invoiceTermsAndConditions"
                rows={3}
                value={formData.invoiceTermsAndConditions}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
