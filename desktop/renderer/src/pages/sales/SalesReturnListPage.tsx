import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  Calendar,
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import { SalesReturn, SalesReturnFilterDTO } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { SalesReturnModal } from './SalesReturnModal';

export const SalesReturnListPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  useEffect(() => {
    loadReturns();
  }, [page, search, startDate, endDate]);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const filters: SalesReturnFilterDTO = {
        page,
        pageSize,
        search: search.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      const res = await window.rsInventory.listSalesReturns(filters);
      if (res.success && res.data) {
        setReturns(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        notify('error', res.error?.message || 'Failed to fetch sales returns');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading returns');
    } finally {
      setLoading(false);
    }
  };

  const totalRefundAmount = returns.reduce((sum, r) => sum + r.grandTotal, 0);

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Total Returns Processed
            </span>
            <span className="text-xl font-bold text-white font-mono">{total}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Credit notes issued</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <RotateCcw className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Total Refund Value
            </span>
            <span className="text-xl font-bold text-rose-400 font-mono">
              {formatCurrency(totalRefundAmount)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Customer credits</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Items Returned</span>
            <span className="text-xl font-bold text-slate-200 font-mono">
              {returns.reduce((sum, r) => sum + (r.items?.length || 0), 0)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Restocked or scrapped</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-surface-800 border border-surface-700 text-slate-300 flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-900/60 border border-surface-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search return # or customer..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-surface-950 px-3 py-2 rounded-xl border border-surface-700 text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>

          <button
            onClick={() => loadReturns()}
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 border border-surface-700 transition-colors"
            title="Refresh Returns"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>

        <button
          onClick={() => setIsReturnModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all ml-auto sm:ml-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Sales Return</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/70 border-b border-surface-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-4">Return Date</th>
                <th className="py-3 px-4">Original Invoice</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Refund Amount</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {loading && returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-400" />
                    <span>Loading sales returns...</span>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <span>No sales returns recorded</span>
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {ret.returnNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {formatDate(ret.returnDate)}
                    </td>
                    <td className="py-3 px-4 font-mono text-brand-400">
                      {(ret as any).originalInvoice?.invoiceNumber || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {(ret as any).customer?.name || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {ret.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      {formatCurrency(ret.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {ret.reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-surface-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{returns.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> returns
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Return Creation Modal */}
      <SalesReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onSuccess={() => loadReturns()}
      />
    </div>
  );
};
