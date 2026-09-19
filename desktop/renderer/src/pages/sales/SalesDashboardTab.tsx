import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Receipt,
  ArrowRight,
  Printer,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { SalesDashboardKPIs, SalesInvoice } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { PrintSalesReceiptModal } from './PrintSalesReceiptModal';

interface SalesDashboardTabProps {
  onStartPOS: () => void;
  onViewAllInvoices: () => void;
}

export const SalesDashboardTab: React.FC<SalesDashboardTabProps> = ({
  onStartPOS,
  onViewAllInvoices,
}) => {
  const { notify } = useNotificationStore();

  const [kpis, setKpis] = useState<SalesDashboardKPIs | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [kpiRes, invoicesRes] = await Promise.all([
        window.rsInventory.getSalesKPIs(),
        window.rsInventory.listSales({ pageSize: 6 }),
      ]);

      if (kpiRes.success && kpiRes.data) {
        setKpis(kpiRes.data);
      }
      if (invoicesRes.success && invoicesRes.data) {
        setRecentInvoices(invoicesRes.data.items);
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to load sales dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'POSTED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DRAFT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">Today's Sales</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(kpis?.salesTodayAmount || 0)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {kpis?.salesTodayCount || 0} bills closed today
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Month Sales */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">Month-to-Date</span>
            <span className="text-2xl font-bold font-mono text-white">
              {formatCurrency(kpis?.salesThisMonthAmount || 0)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {kpis?.salesThisMonthCount || 0} invoices this month
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Average Order Value */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">Average Bill Size</span>
            <span className="text-2xl font-bold font-mono text-indigo-400">
              {formatCurrency(
                kpis?.salesThisMonthCount
                  ? kpis.salesThisMonthAmount / kpis.salesThisMonthCount
                  : 0,
              )}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Per retail invoice</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">
              Customer Receivables
            </span>
            <span className="text-2xl font-bold font-mono text-rose-400">
              {formatCurrency(kpis?.outstandingReceivables || 0)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Unpaid customer balance</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-900/40 via-surface-900 to-surface-900 border border-brand-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <ShoppingCart className="h-5 w-5 text-brand-400" />
            <span>High-Speed Retail Billing Ready</span>
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Scan barcodes, add walk-in or credit customers, split payments between cash & UPI, and
            print instant 80mm receipts.
          </p>
        </div>
        <button
          onClick={onStartPOS}
          className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-brand-600/20 transition-all shrink-0"
        >
          <span>Open POS Billing Screen (F2)</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Sales Invoices</h3>
            <p className="text-xs text-slate-400">Latest completed sales transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadDashboard()}
              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            <button
              onClick={onViewAllInvoices}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/70 border-b border-surface-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4 text-center">Items</th>
                <th className="py-2.5 px-4 text-right">Net Amount</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30 text-brand-400" />
                    <span>No sales invoices recorded yet. Start billing via POS screen.</span>
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-brand-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-300">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-white">
                      {inv.customerNameSnapshot || (inv as any).customer?.name || 'Walk-in Customer'}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-300">
                      {inv.items?.length || 0}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                          inv.status,
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setPrintInvoice(inv)}
                        className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white transition-colors"
                        title="Print Receipt"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Modal */}
      <PrintSalesReceiptModal
        invoice={printInvoice}
        isOpen={!!printInvoice}
        onClose={() => setPrintInvoice(null)}
      />
    </div>
  );
};
