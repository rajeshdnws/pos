import React, { useEffect, useState, useCallback } from 'react';
import {
  Database,
  HardDrive,
  ShieldCheck,
  Building2,
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Users,
  PlusCircle,
  FileText,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useApplicationStore } from '../store/applicationStore';
import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import type { SalesDashboardKPIs, PurchaseDashboardKPIs, InventoryKPIs } from '@rs-inventory/types';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '\u20b9' +
  n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-surface-800 ${className}`} />
);

export const DashboardPage: React.FC = () => {
  const { systemInfo, databaseHealth } = useApplicationStore();
  const { currentUser } = useAuthStore();
  const { company } = useCompanyStore();

  const [salesKPIs, setSalesKPIs] = useState<SalesDashboardKPIs | null>(null);
  const [purchaseKPIs, setPurchaseKPIs] = useState<PurchaseDashboardKPIs | null>(null);
  const [inventoryKPIs, setInventoryKPIs] = useState<InventoryKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, purchaseRes, inventoryRes] = await Promise.all([
        window.rsInventory.getSalesKPIs(),
        window.rsInventory.getPurchaseKPIs(),
        window.rsInventory.getInventoryKPIs(),
      ]);
      if (salesRes.success && salesRes.data) setSalesKPIs(salesRes.data);
      if (purchaseRes.success && purchaseRes.data) setPurchaseKPIs(purchaseRes.data);
      if (inventoryRes.success && inventoryRes.data) setInventoryKPIs(inventoryRes.data);
      setLastRefreshed(new Date());
    } catch {
      // silently fail — values stay null and UI shows fallback zeros
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  const lowStockTotal = inventoryKPIs
    ? inventoryKPIs.lowStockItemsCount + inventoryKPIs.outOfStockItemsCount
    : 0;

  const metrics = [
    {
      title: "Today's Sales",
      value: salesKPIs ? fmt(salesKPIs.salesTodayAmount) : '\u20b90.00',
      subtitle: salesKPIs
        ? `${salesKPIs.salesTodayCount} bill${salesKPIs.salesTodayCount !== 1 ? 's' : ''} generated today`
        : '0 bills generated today',
      icon: ShoppingCart,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      title: "Today's Purchases",
      value: purchaseKPIs ? fmt(purchaseKPIs.purchasesTodayAmount) : '\u20b90.00',
      subtitle: purchaseKPIs
        ? `${purchaseKPIs.purchasesTodayCount} inward receipt${purchaseKPIs.purchasesTodayCount !== 1 ? 's' : ''}`
        : '0 inward receipts',
      icon: TrendingUp,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
    },
    {
      title: 'Total Receivables (Khata)',
      value: salesKPIs ? fmt(salesKPIs.outstandingReceivables) : '\u20b90.00',
      subtitle: salesKPIs
        ? `${salesKPIs.unpaidInvoicesCount + (salesKPIs.partiallyPaidInvoicesCount ?? 0)} outstanding invoice${(salesKPIs.unpaidInvoicesCount + (salesKPIs.partiallyPaidInvoicesCount ?? 0)) !== 1 ? 's' : ''}`
        : 'Outstanding from customers',
      icon: ArrowDownLeft,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    {
      title: 'Total Payables',
      value: purchaseKPIs ? fmt(purchaseKPIs.outstandingSupplierPayables) : '\u20b90.00',
      subtitle: purchaseKPIs
        ? `${purchaseKPIs.unpaidPurchasesCount + (purchaseKPIs.partiallyPaidPurchasesCount ?? 0)} unpaid to vendors`
        : 'Owed to vendors & suppliers',
      icon: ArrowUpRight,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'Active Products',
      value: inventoryKPIs ? String(inventoryKPIs.totalProducts) : '0',
      subtitle: inventoryKPIs
        ? `${inventoryKPIs.totalStockQuantity.toLocaleString('en-IN')} units in stock`
        : 'SKUs in catalog',
      icon: Package,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    {
      title: 'Low Stock Alerts',
      value: String(lowStockTotal),
      subtitle: inventoryKPIs
        ? `${inventoryKPIs.lowStockItemsCount} low \u00b7 ${inventoryKPIs.outOfStockItemsCount} out of stock`
        : 'Items below threshold',
      icon: AlertTriangle,
      color: lowStockTotal > 0 ? 'text-rose-400' : 'text-slate-400',
      bg: lowStockTotal > 0 ? 'bg-rose-500/10' : 'bg-surface-800',
    },
  ];

  const quickActions = [
    {
      label: 'New POS Sale',
      shortcut: 'F1',
      description: 'Barcode billing & thermal receipt print',
      icon: ShoppingCart,
      disabled: true,
      tag: 'Step 3',
    },
    {
      label: 'Add Product',
      shortcut: 'F2',
      description: 'SKU, HSN code, pricing & stock units',
      icon: PlusCircle,
      disabled: true,
      tag: 'Step 3',
    },
    {
      label: 'Inward Purchase',
      shortcut: 'F3',
      description: 'Record vendor purchase bills & GST input',
      icon: FileText,
      disabled: true,
      tag: 'Step 3',
    },
    {
      label: 'Customer Khata',
      shortcut: 'F4',
      description: 'Credit ledger, payment collections & reminders',
      icon: Users,
      disabled: true,
      tag: 'Step 3',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-gradient-to-r from-brand-950 via-surface-900 to-surface-900 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Offline-First Retail POS &bull; Solo Edition
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Welcome back, {currentUser?.name || 'Administrator'}!
            </h1>
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-400" />
              <span>
                Business:{' '}
                <strong className="text-white font-semibold">
                  {company?.name || 'RS Retail Stores'}
                </strong>
              </span>
              {company?.gstin && (
                <>
                  <span className="text-slate-600">&bull;</span>
                  <span className="font-mono text-xs text-slate-400">GSTIN: {company.gstin}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 bg-surface-950/60 p-4 rounded-xl border border-surface-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-brand-400" />
              <span>Financial Year</span>
            </div>
            <div className="text-sm font-bold text-white font-mono">2026-27</div>
            <div className="text-[11px] text-emerald-400">
              Session Active &bull; Role:{' '}
              {typeof currentUser?.role === 'object'
                ? currentUser.role?.name
                : currentUser?.role || 'ADMIN'}
            </div>
          </div>
        </div>
      </div>

      {/* Business Metrics Grid (Zero States) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Daily Retail Overview
          </h2>
          <div className="flex items-center gap-3">
            {lastRefreshed && !loading && (
              <span className="text-[11px] text-slate-500">
                Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchKPIs}
              disabled={loading}
              title="Refresh metrics"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading\u2026' : 'Refresh'}
            </button>
            <span className="text-xs text-slate-500">Real-time local metrics</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div
                key={idx}
                className="rounded-xl border border-surface-800/80 bg-surface-900/60 p-5 shadow-sm hover:border-surface-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">{metric.title}</span>
                  <div
                    className={`h-8 w-8 rounded-lg ${metric.bg} flex items-center justify-center ${metric.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  {loading ? (
                    <>
                      <Skeleton className="h-8 w-32 mb-2" />
                      <Skeleton className="h-3 w-40" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-white font-mono">{metric.value}</div>
                      <div className="mt-1 text-xs text-slate-500">{metric.subtitle}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions (Upcoming Step 3) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Retail Operations
          </h2>
          <span className="text-xs text-slate-500">Core business modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-xl border border-surface-800 bg-surface-900/40 p-5 flex flex-col justify-between transition-all opacity-85 hover:opacity-100"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-surface-800 flex items-center justify-center text-slate-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-slate-400 border border-surface-700">
                        {action.shortcut}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {action.tag}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                    {action.label}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Health & Storage Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Storage & DB */}
        <div className="rounded-xl border border-surface-800/80 bg-surface-900/60 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-brand-400" />
            Database & Offline Integrity
          </h3>
          <p className="text-xs text-slate-400">
            Isolated local SQLite database with zero cloud dependencies. Structured for future LAN
            synchronization.
          </p>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-surface-800">
              <span className="text-slate-400">Engine</span>
              <span className="font-semibold text-emerald-400">
                SQLite (Prisma ORM) &bull; Healthy
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-800">
              <span className="text-slate-400">Tables Migrated</span>
              <span className="font-semibold text-slate-200">21 Tables</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Query Latency</span>
              <span className="font-mono text-slate-200">{databaseHealth?.latencyMs || 2} ms</span>
            </div>
          </div>
        </div>

        {/* Operating Environment */}
        <div className="rounded-xl border border-surface-800/80 bg-surface-900/60 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-brand-400" />
            Environment & Runtime
          </h3>
          <p className="text-xs text-slate-400">
            Electron Windows runtime with secure IPC architecture and context isolation.
          </p>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-surface-800">
              <span className="text-slate-400">Operating System</span>
              <span className="font-semibold text-slate-200">
                {systemInfo?.osVersion || 'Windows Desktop'} ({systemInfo?.arch || 'x64'})
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-800">
              <span className="text-slate-400">Node Runtime</span>
              <span className="font-mono text-slate-200">v{systemInfo?.nodeVersion || '24'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Active Profile</span>
              <span className="font-semibold text-brand-400">RS Inventory – Solo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
