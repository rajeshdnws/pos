import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  FileText,
  RotateCcw,
  Plus,
  Truck,
} from 'lucide-react';
import { PurchaseDashboardKPIs, Purchase } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';

interface PurchaseDashboardTabProps {
  onNewPurchase: () => void;
  onViewPurchases: () => void;
  onViewReturns: () => void;
  onViewSuppliers: () => void;
  onSelectPurchase: (purchaseId: string) => void;
}

export const PurchaseDashboardTab: React.FC<PurchaseDashboardTabProps> = ({
  onNewPurchase,
  onViewPurchases,
  onViewSuppliers,
  onSelectPurchase,
}) => {
  const [kpis, setKpis] = useState<PurchaseDashboardKPIs | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [kpiRes, purchasesRes] = await Promise.all([
        window.rsInventory.getPurchaseKPIs(),
        window.rsInventory.listPurchases({ pageSize: 5 }),
      ]);
      if (kpiRes.success && kpiRes.data) {
        setKpis(kpiRes.data);
      }
      if (purchasesRes.success && purchasesRes.data) {
        setRecentPurchases(purchasesRes.data.items);
      }
    } catch (err) {
      console.error('Failed to load purchase dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3" />
        <span>Loading procurement dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Action Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-900/60 p-4 rounded-2xl border border-surface-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-400" />
            <span>Procurement & Purchases Overview</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time supplier invoices, payment liabilities, and inventory receiving metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onNewPurchase}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase</span>
          </button>
          <button
            onClick={onViewSuppliers}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 bg-surface-800 hover:bg-surface-700 rounded-xl border border-surface-700 transition-colors"
          >
            <Truck className="h-4 w-4" />
            <span>Suppliers</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases */}
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Purchases (Net)</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {formatCurrency(kpis?.totalPurchases || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-indigo-300">{kpis?.postedInvoicesCount || 0}</span>
              <span>posted invoices</span>
            </div>
          </div>
        </div>

        {/* Total Outstanding Payables */}
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Outstanding Payables</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-400">
              {formatCurrency(kpis?.totalOutstanding || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-rose-300">Liability</span>
              <span>due to suppliers</span>
            </div>
          </div>
        </div>

        {/* Total Amount Paid */}
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Amount Paid</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(kpis?.totalPaid || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-emerald-300">Settled</span>
              <span>via outgoing payments</span>
            </div>
          </div>
        </div>

        {/* Total Returns */}
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Purchase Returns</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-amber-400">
              {formatCurrency(kpis?.totalReturns || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-amber-300">Debit notes</span>
              <span>issued to vendors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Top Payables Suppliers & Recent Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Suppliers by Payable Balance */}
        <div className="rounded-2xl border border-surface-800 bg-surface-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span>Highest Payables</span>
            </h3>
            <button
              onClick={onViewSuppliers}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View All
            </button>
          </div>

          {!kpis?.topSuppliersByPayable || kpis.topSuppliersByPayable.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No supplier payables currently pending.
            </div>
          ) : (
            <div className="space-y-3">
              {kpis.topSuppliersByPayable.map((supp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-950/60 border border-surface-800"
                >
                  <div className="overflow-hidden pr-2">
                    <div className="text-xs font-semibold text-slate-200 truncate">{supp.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{supp.code}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-rose-400">
                      {formatCurrency(supp.balance)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-medium">Pending</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases List */}
        <div className="lg:col-span-2 rounded-2xl border border-surface-800 bg-surface-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Recent Invoices</span>
            </h3>
            <button
              onClick={onViewPurchases}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View Invoices List
            </button>
          </div>

          {recentPurchases.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No purchase orders or invoices recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Purchase #</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 bg-surface-900">
                  {recentPurchases.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPurchase(p.id)}
                      className="hover:bg-surface-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3">{formatDate(p.purchaseDate)}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-white">{p.purchaseNumber}</td>
                      <td className="py-2.5 px-3 text-slate-200 truncate max-w-[150px]">
                        {p.supplier?.name || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            p.status === 'POSTED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : p.status === 'DRAFT'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-white">
                        {formatCurrency(p.grandTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                        {formatCurrency(p.balanceDue ?? (p.grandTotal - p.amountPaid - p.amountReturned))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
