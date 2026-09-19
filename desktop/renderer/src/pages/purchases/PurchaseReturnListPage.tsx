import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PurchaseReturn, PurchaseReturnFilterDTO, Supplier } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { PurchaseReturnDetailsModal } from './PurchaseReturnDetailsModal';

interface PurchaseReturnListPageProps {
  onNewReturn?: () => void;
}

export const PurchaseReturnListPage: React.FC<PurchaseReturnListPageProps> = () => {
  const { notify } = useNotificationStore();

  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [supplierId, setSupplierId] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadReturns();
  }, [page, pageSize, supplierId]);

  const loadSuppliers = async () => {
    try {
      const res = await window.rsInventory.listSuppliers({ pageSize: 500 });
      if (res.success && res.data) {
        setSuppliers(res.data.items);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  const loadReturns = async () => {
    setLoading(true);
    try {
      const filter: PurchaseReturnFilterDTO = {
        page,
        pageSize,
        supplierId: supplierId || undefined,
      };

      const res = await window.rsInventory.listPurchaseReturns(filter);
      if (res.success && res.data) {
        setReturns(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        notify('error', res.error?.message || 'Failed to load purchase returns');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading purchase returns');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-amber-400" />
            <span>Purchase Returns & Debit Notes</span>
          </h2>
          <p className="text-xs text-slate-400">
            Audit history of returned goods, stock deductions, and vendor credit adjustments.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-surface-900 border border-surface-800">
        <div className="sm:col-span-8">
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-4 flex gap-2">
          <button
            onClick={() => {
              setPage(1);
              loadReturns();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-surface-800 hover:bg-surface-700 text-slate-200 rounded-xl text-xs font-semibold border border-surface-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-4">Return Date</th>
                <th className="py-3 px-4">Purchase Ref</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Debit Note / Reason</th>
                <th className="py-3 px-4 text-right">Total Credited</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60 bg-surface-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Loading purchase returns...</span>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No purchase returns recorded. To return goods, open a posted purchase and click &quot;Create Return&quot;.
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">{r.returnNumber}</td>
                    <td className="py-3 px-4 text-slate-300">{formatDate(r.returnDate)}</td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {r.purchase?.purchaseNumber || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{r.supplier?.name}</td>
                    <td className="py-3 px-4 text-slate-400">
                      <div className="truncate max-w-xs">{r.reason || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                      {formatCurrency(r.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedReturnId(r.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
                        title="View Return Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-800 flex items-center justify-between text-xs text-slate-400 bg-surface-950">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} returns
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 disabled:opacity-40 text-slate-300 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-white px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 disabled:opacity-40 text-slate-300 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <PurchaseReturnDetailsModal
        isOpen={Boolean(selectedReturnId)}
        returnId={selectedReturnId}
        onClose={() => setSelectedReturnId(null)}
      />
    </div>
  );
};
