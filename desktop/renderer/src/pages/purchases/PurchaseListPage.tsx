import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Printer,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  Purchase,
  PurchaseFilterDTO,
  PurchaseStatus,
  PurchasePaymentStatus,
  Supplier,
} from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { CreatePurchaseReturnModal } from './CreatePurchaseReturnModal';
import { PrintPurchaseInvoiceModal } from './PrintPurchaseInvoiceModal';

interface PurchaseListPageProps {
  onNewPurchase: () => void;
  onEditPurchase: (purchaseId: string) => void;
}

export const PurchaseListPage: React.FC<PurchaseListPageProps> = ({
  onNewPurchase,
  onEditPurchase,
}) => {
  const { notify } = useNotificationStore();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState<PurchaseStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus | ''>('');

  // Modals state
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [paymentPurchaseId, setPaymentPurchaseId] = useState<string | null>(null);
  const [returnPurchaseId, setReturnPurchaseId] = useState<string | null>(null);
  const [printPurchaseId, setPrintPurchaseId] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [page, pageSize, supplierId, status, paymentStatus]);

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

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const filter: PurchaseFilterDTO = {
        page,
        pageSize,
        search: search.trim() || undefined,
        supplierId: supplierId || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
      };

      const res = await window.rsInventory.listPurchases(filter);
      if (res.success && res.data) {
        setPurchases(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        notify('error', res.error?.message || 'Failed to load purchases');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPurchases();
  };

  const handlePostPurchaseDirect = async (p: Purchase) => {
    if (
      !window.confirm(
        `Are you sure you want to Post Purchase #${p.purchaseNumber} to Stock?\nThis will create inward stock movements and add ${formatCurrency(p.grandTotal)} to the supplier's balance.`,
      )
    ) {
      return;
    }

    try {
      const res = await window.rsInventory.postPurchase(p.id);
      if (res.success && res.data) {
        notify('success', `Purchase #${res.data.purchaseNumber} posted successfully!`);
        loadPurchases();
      } else {
        notify('error', res.error?.message || 'Failed to post purchase');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error posting purchase');
    }
  };

  const handleCancelDraft = async (p: Purchase) => {
    if (!window.confirm(`Are you sure you want to cancel draft #${p.purchaseNumber}?`)) {
      return;
    }
    try {
      const res = await window.rsInventory.cancelPurchase(p.id, 'Cancelled by user');
      if (res.success) {
        notify('success', 'Purchase draft cancelled');
        loadPurchases();
      } else {
        notify('error', res.error?.message || 'Failed to cancel draft');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error cancelling draft');
    }
  };

  const [isInstallingDemo, setIsInstallingDemo] = useState(false);

  const handleInstallDemo = async () => {
    setIsInstallingDemo(true);
    try {
      const res = await window.rsInventory.installDemoData();
      if (res.success && res.data) {
        notify('success', res.data.message || 'Sample purchases & suppliers installed successfully!');
        await loadSuppliers();
        await loadPurchases();
      } else {
        notify('error', res.error?.message || 'Failed to install demo data');
      }
    } catch {
      notify('error', 'Error installing sample data');
    } finally {
      setIsInstallingDemo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-400" />
            <span>Purchase Invoices & Orders</span>
          </h2>
          <p className="text-xs text-slate-400">
            Create drafts, post inwards to stock ledger, manage partial payments, and issue debit returns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleInstallDemo}
            disabled={isInstallingDemo}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all disabled:opacity-50"
            title="Install realistic sample purchases and suppliers"
          >
            <Sparkles className={`h-3.5 w-3.5 text-indigo-400 ${isInstallingDemo ? 'animate-spin' : ''}`} />
            <span>{isInstallingDemo ? 'Installing Demo...' : 'Load Sample Purchases'}</span>
          </button>

          <button
            onClick={onNewPurchase}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-surface-900 border border-surface-800">
        <form onSubmit={handleSearchSubmit} className="sm:col-span-4 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, bill #, notes..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface-950 border border-surface-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="sm:col-span-3">
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-3 text-xs bg-surface-950 border border-surface-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.supplierCode || s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              setPage(1);
            }}
            className="w-full py-2 px-3 text-xs bg-surface-950 border border-surface-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value as any);
              setPage(1);
            }}
            className="w-full py-2 px-3 text-xs bg-surface-950 border border-surface-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Payment Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-surface-800">
              <tr>
                <th className="py-3 px-4">Purchase #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier / Vendor</th>
                <th className="py-3 px-4">Bill #</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60 bg-surface-900">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading purchases...</span>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">No Purchase Records Found</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Create your first purchase invoice or load sample purchases and suppliers for testing.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          onClick={handleInstallDemo}
                          disabled={isInstallingDemo}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Install Demo Purchases</span>
                        </button>
                        <button
                          onClick={onNewPurchase}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>New Purchase</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div
                        onClick={() => setSelectedPurchaseId(p.id)}
                        className="font-mono font-bold text-white hover:text-indigo-400 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{p.purchaseNumber}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">{formatDate(p.purchaseDate)}</td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white truncate max-w-[160px]">
                        {p.supplier?.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.supplier?.supplierCode || p.supplier?.code}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {p.supplierInvoiceNumber || '—'}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'POSTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatCurrency(p.grandTotal)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {(() => {
                        const due = p.balanceDue ?? (p.grandTotal - p.amountPaid - p.amountReturned);
                        return (
                          <span className={due > 0 ? 'text-rose-400' : 'text-slate-500'}>
                            {formatCurrency(due)}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedPurchaseId(p.id)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => setPrintPurchaseId(p.id)}
                          title="Print Purchase Voucher"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        {p.status === 'DRAFT' ? (
                          <>
                            <button
                              onClick={() => onEditPurchase(p.id)}
                              title="Edit Draft"
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handlePostPurchaseDirect(p)}
                              title="Post to Stock"
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelDraft(p)}
                              title="Cancel / Delete Draft"
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : p.status === 'POSTED' ? (
                          <>
                            <button
                              onClick={() => setPaymentPurchaseId(p.id)}
                              title="Record Payment"
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setReturnPurchaseId(p.id)}
                              title="Create Return"
                              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-800 flex items-center justify-between text-xs text-slate-400 bg-surface-950">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} purchases
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
      <PurchaseDetailsModal
        isOpen={Boolean(selectedPurchaseId)}
        purchaseId={selectedPurchaseId}
        onClose={() => setSelectedPurchaseId(null)}
        onEditDraft={(pId) => {
          setSelectedPurchaseId(null);
          onEditPurchase(pId);
        }}
        onUpdated={() => {
          loadPurchases();
        }}
      />

      {/* Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(paymentPurchaseId)}
        purchaseId={paymentPurchaseId}
        onClose={() => setPaymentPurchaseId(null)}
        onPaymentRecorded={() => {
          loadPurchases();
        }}
      />

      {/* Return Modal */}
      <CreatePurchaseReturnModal
        isOpen={Boolean(returnPurchaseId)}
        purchaseId={returnPurchaseId}
        onClose={() => setReturnPurchaseId(null)}
        onReturnCreated={() => {
          loadPurchases();
        }}
      />

      {/* Print Modal */}
      <PrintPurchaseInvoiceModal
        isOpen={Boolean(printPurchaseId)}
        purchaseId={printPurchaseId}
        onClose={() => setPrintPurchaseId(null)}
      />
    </div>
  );
};
