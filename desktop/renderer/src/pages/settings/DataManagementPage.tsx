import React, { useEffect, useState } from 'react';
import {
  Database,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Layers,
  Building2,
  ArrowLeftRight,
  ShieldCheck,
  RefreshCw,
  Truck,
  ShoppingCart,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { DemoDataStatus } from '@rs-inventory/types';

export const DataManagementPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [status, setStatus] = useState<DemoDataStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await window.rsInventory.getDemoDataStatus();
      if (res.success && res.data) {
        setStatus(res.data);
      }
    } catch {
      notify('error', 'Failed to fetch demo data status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleInstall = async () => {
    setShowInstallModal(false);
    setIsInstalling(true);
    try {
      const res = await window.rsInventory.installDemoData();
      if (res.success && res.data) {
        notify('success', res.data.message || 'Demo data installed successfully!');
        await fetchStatus();
      } else {
        notify('error', res.error?.message || 'Failed to install demo data.');
      }
    } catch {
      notify('error', 'An unexpected error occurred during demo data installation.');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleClear = async () => {
    setShowClearModal(false);
    setIsClearing(true);
    try {
      const res = await window.rsInventory.clearDemoData();
      if (res.success && res.data) {
        notify('success', res.data.message || 'Demo data cleared successfully!');
        await fetchStatus();
      } else {
        notify('error', res.error?.message || 'Failed to clear demo data.');
      }
    } catch {
      notify('error', 'An unexpected error occurred while clearing demo data.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Database className="h-6 w-6 text-brand-400" />
            Data & Demo Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Install realistic retail sample datasets for testing or safely purge demo records with zero impact on company profile.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading || isInstalling || isClearing}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800/80 hover:bg-surface-700 text-slate-300 text-xs font-medium border border-surface-700/60 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Demo Status Indicator Card */}
      <div className="rounded-2xl bg-surface-900/80 border border-surface-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-800/70 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                status?.hasDemoData
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-400 border border-surface-700'
              }`}
            >
              {status?.hasDemoData ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Database className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {status?.hasDemoData ? 'Demo Dataset Installed' : 'No Demo Dataset Present'}
              </h2>
              <p className="text-xs text-slate-400">
                {status?.hasDemoData
                  ? `Installed on ${status.installedAt ? new Date(status.installedAt).toLocaleDateString() : 'System'}`
                  : 'Your database currently contains only production/custom records.'}
              </p>
            </div>
          </div>

          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold ${
              status?.hasDemoData
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-surface-700'
            }`}
          >
            {status?.hasDemoData ? 'ACTIVE DEMO' : 'CLEAN STATE'}
          </span>
        </div>

        {/* Demo Record Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center">
            <span className="block text-lg font-bold text-white">
              {status?.demoProductsCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <Boxes className="h-3 w-3 text-brand-400" /> Products
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center">
            <span className="block text-lg font-bold text-white">
              {status?.demoSuppliersCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <Truck className="h-3 w-3 text-blue-400" /> Suppliers
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center">
            <span className="block text-lg font-bold text-white">
              {status?.demoPurchasesCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <ShoppingCart className="h-3 w-3 text-indigo-400" /> Purchases
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center">
            <span className="block text-lg font-bold text-white">
              {status?.demoPaymentsCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <CreditCard className="h-3 w-3 text-emerald-400" /> Payments
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center">
            <span className="block text-lg font-bold text-white">
              {status?.demoReturnsCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <RotateCcw className="h-3 w-3 text-amber-400" /> Returns
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center">
            <span className="block text-lg font-bold text-white">
              {status?.demoCategoriesCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <Layers className="h-3 w-3 text-emerald-400" /> Categories
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center">
            <span className="block text-lg font-bold text-white">
              {status?.demoBrandsCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3 text-cyan-400" /> Brands
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800/80 text-center">
            <span className="block text-lg font-bold text-white">
              {status?.demoMovementsCount || 0}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <ArrowLeftRight className="h-3 w-3 text-purple-400" /> Stock Logs
            </span>
          </div>
        </div>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Install Demo Data Card */}
        <div className="rounded-2xl bg-gradient-to-br from-surface-900/90 via-surface-900/60 to-brand-950/20 border border-brand-500/20 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-brand-400">
              <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <Sparkles className="h-5 w-5 text-brand-400" />
              </div>
              <h3 className="text-base font-bold text-white">Install Demo Dataset</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Populates your store with a curated Indian retail catalog, suppliers, and purchase vouchers to test inventory, billing, vendor ledgers, and debit notes.
            </p>

            <ul className="space-y-2 pt-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
                <span><strong>16 Retail Products</strong>: FMCG, Dairy, Audio & Electronics with EAN-13 barcodes & HSN codes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
                <span><strong>3 Verified Suppliers</strong>: FMCG Distributor, Electronics Wholesaler, and Dairy Agro Co. with GSTINs & opening payables.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
                <span><strong>Complete Purchase Cycle</strong>: Posted purchases, draft PO, partial payment with supplier ledger entries, and sample debit return.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
                <span><strong>Multi-Location Stock</strong>: Stock balances, stock adjustment write-off, and warehouse transfer.</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setShowInstallModal(true)}
            disabled={isInstalling || isClearing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/25 transition-all disabled:opacity-50"
          >
            {isInstalling ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Installing Demo Data...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Install Demo Data
              </>
            )}
          </button>
        </div>

        {/* Clear Demo Data Card */}
        <div className="rounded-2xl bg-surface-900/80 border border-rose-500/20 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white">Clear Demo Dataset</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Safely removes all seeded demo products, movements, adjustments, and demo locations from your local database.
            </p>

            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Safe Purge Guarantee
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Your registered company profile, administrator account, user logins, roles, and any custom non-demo products will remain 100% untouched.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowClearModal(true)}
            disabled={isInstalling || isClearing || !status?.hasDemoData}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all disabled:opacity-40 disabled:hover:bg-rose-600/20 disabled:hover:text-rose-300"
          >
            {isClearing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Purging Demo Data...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Clear Demo Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal - Install */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-brand-400">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <Sparkles className="h-6 w-6 text-brand-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install Sample Catalog?</h3>
                <p className="text-xs text-slate-400">Load sample retail items into your database</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will add 16 realistic Indian retail products, 3 verified suppliers, 3 purchase invoices, sample payments, and debit returns to test end-to-end billing and inventory management.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInstall}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 transition-all"
              >
                Yes, Install Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Clear */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-900 border border-rose-500/30 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Demo Data Purge</h3>
                <p className="text-xs text-slate-400">This action will delete all demo records</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete all demo products, suppliers, purchases, payments, returns, and inventory movements? Custom user records and company profile will NOT be affected.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all"
              >
                Yes, Clear Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
