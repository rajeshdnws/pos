import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Eye,
  Printer,
  RotateCcw,
  DollarSign,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import {
  SalesFilterDTO,
  SalesInvoice,
  SalesPaymentStatus,
  SalesInvoiceStatus,
} from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { SalesDetailsModal } from './SalesDetailsModal';
import { PrintSalesReceiptModal } from './PrintSalesReceiptModal';
import { SalesReturnModal } from './SalesReturnModal';
import { RecordCustomerPaymentModal } from '../customers/RecordCustomerPaymentModal';

interface SalesListPageProps {
  onNewPOSBill: () => void;
}

export const SalesListPage: React.FC<SalesListPageProps> = ({ onNewPOSBill }) => {
  const { notify } = useNotificationStore();

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SalesInvoiceStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<SalesPaymentStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);
  const [returnInvoice, setReturnInvoice] = useState<SalesInvoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<SalesInvoice | null>(null);

  useEffect(() => {
    loadSales();
  }, [page, status, paymentStatus, startDate, endDate]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const filters: SalesFilterDTO = {
        page,
        pageSize,
        search: search.trim() || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      const res = await window.rsInventory.listSales(filters);
      if (res.success && res.data) {
        setInvoices(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        notify('error', res.error?.message || 'Failed to fetch sales invoices');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading sales invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSales();
  };

  const handleCancelDraft = async (invoice: SalesInvoice) => {
    if (!window.confirm(`Are you sure you want to cancel draft invoice ${invoice.invoiceNumber}?`)) {
      return;
    }
    try {
      const res = await window.rsInventory.cancelSalesDraft(invoice.id, 'Cancelled by cashier');
      if (res.success) {
        notify('success', `Draft ${invoice.invoiceNumber} cancelled`);
        loadSales();
      } else {
        notify('error', res.error?.message || 'Failed to cancel draft');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error cancelling draft');
    }
  };

  // KPIs
  const totalBilled = invoices.reduce((s, inv) => s + (inv.status !== 'CANCELLED' ? inv.grandTotal : 0), 0);
  const totalPaid = invoices.reduce((s, inv) => s + (inv.status !== 'CANCELLED' ? inv.amountPaid || 0 : 0), 0);
  const totalDue = totalBilled - totalPaid;

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

  const getPaymentBadge = (ps: string) => {
    switch (ps) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PARTIALLY_PAID':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'UNPAID':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Total Invoiced</span>
            <span className="text-xl font-bold text-white font-mono">{formatCurrency(totalBilled)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">{total} invoices billed</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Total Collected</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(totalPaid)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Payments cleared</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Receivables Due</span>
            <span className="text-xl font-bold text-rose-400 font-mono">{formatCurrency(totalDue)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Khata & pending amounts</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Billed Items</span>
            <span className="text-xl font-bold text-indigo-400 font-mono">
              {invoices.reduce((cnt, inv) => cnt + (inv.items?.length || 0), 0)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Across displayed bills</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-900/60 border border-surface-800 p-4 rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or customer..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="POSTED">Posted</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Status filter */}
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">All Payments</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid / Khata</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1 bg-surface-950 px-2 py-1.5 rounded-xl border border-surface-700 text-xs">
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
            onClick={() => loadSales()}
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 border border-surface-700 transition-colors"
            title="Refresh Invoices"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>

          <button
            onClick={onNewPOSBill}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all ml-auto sm:ml-0"
          >
            <Plus className="h-4 w-4" />
            <span>New POS Bill</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/70 border-b border-surface-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid / Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-400" />
                    <span>Loading sales invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <span>No sales invoices found matching your criteria</span>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const bal = (inv.grandTotal || 0) - (inv.amountPaid || 0);
                  return (
                    <tr key={inv.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-brand-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {inv.customerNameSnapshot || (inv as any).customer?.name || 'Walk-in'}
                        </div>
                        {inv.customerPhoneSnapshot && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {inv.customerPhoneSnapshot}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {inv.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="text-slate-300 font-semibold">
                          {formatCurrency(inv.amountPaid || 0)}
                        </div>
                        {bal > 0 && (
                          <div className="text-[10px] text-rose-400">
                            Due: {formatCurrency(bal)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                            inv.status,
                          )}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPaymentBadge(
                            inv.paymentStatus,
                          )}`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white transition-colors"
                            title="View Invoice Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setPrintInvoice(inv)}
                            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white transition-colors"
                            title="Print Invoice / Receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          {inv.status === 'POSTED' && inv.paymentStatus !== 'PAID' && (
                            <button
                              onClick={() => setPaymentInvoice(inv)}
                              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-emerald-400 hover:text-emerald-300 transition-colors"
                              title="Record Payment"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {inv.status === 'POSTED' && (
                            <button
                              onClick={() => setReturnInvoice(inv)}
                              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-amber-400 hover:text-amber-300 transition-colors"
                              title="Sales Return / Credit Note"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {inv.status === 'DRAFT' && (
                            <button
                              onClick={() => handleCancelDraft(inv)}
                              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-rose-400 hover:text-rose-300 transition-colors"
                              title="Cancel Draft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-surface-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{invoices.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> invoices
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

      {/* Modals */}
      <SalesDetailsModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onRecordPayment={(inv) => setPaymentInvoice(inv)}
        onCreateReturn={(inv) => setReturnInvoice(inv)}
      />

      <PrintSalesReceiptModal
        invoice={printInvoice}
        isOpen={!!printInvoice}
        onClose={() => setPrintInvoice(null)}
      />

      <SalesReturnModal
        isOpen={!!returnInvoice}
        onClose={() => setReturnInvoice(null)}
        onSuccess={() => loadSales()}
        preselectedInvoice={returnInvoice}
      />

      {paymentInvoice && (
        <RecordCustomerPaymentModal
          isOpen={!!paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSuccess={() => loadSales()}
          customer={(paymentInvoice as any).customer || null}
          defaultInvoiceId={paymentInvoice.id}
          defaultAmount={
            paymentInvoice.grandTotal - (paymentInvoice.amountPaid || 0)
          }
        />
      )}
    </div>
  );
};
