import React, { useEffect, useState } from 'react';
import {
  FileText,
  Calendar,
  Printer,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Receipt,
  RotateCcw,
  DollarSign,
} from 'lucide-react';
import {
  Customer,
  CustomerStatementDTO,
} from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { RecordCustomerPaymentModal } from './RecordCustomerPaymentModal';

interface CustomerLedgerPageProps {
  initialCustomerId?: string;
  onBack?: () => void;
  onNewSale?: (customerId: string) => void;
}

export const CustomerLedgerPage: React.FC<CustomerLedgerPageProps> = ({
  initialCustomerId,
  onBack,
}) => {
  const { notify } = useNotificationStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [statement, setStatement] = useState<CustomerStatementDTO | null>(null);
  const [loading, setLoading] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadStatement(selectedCustomerId);
    } else {
      setStatement(null);
    }
  }, [selectedCustomerId, startDate, endDate]);

  const loadCustomers = async () => {
    try {
      const res = await window.rsInventory.listCustomers({ pageSize: 100 });
      if (res.success && res.data) {
        setCustomers(res.data.items);
        if (!selectedCustomerId && res.data.items.length > 0 && !initialCustomerId) {
          setSelectedCustomerId(res.data.items[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const loadStatement = async (customerId: string) => {
    setLoading(true);
    try {
      const res = await window.rsInventory.getCustomerStatement(
        customerId,
        startDate || undefined,
        endDate || undefined,
      );
      if (res.success && res.data) {
        setStatement(res.data);
      } else {
        notify('error', res.error?.message || 'Failed to load customer statement');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading statement');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const setDatePreset = (preset: 'today' | 'week' | 'month' | 'fy' | 'all') => {
    const today = new Date();
    if (preset === 'today') {
      const str = today.toISOString().split('T')[0];
      setStartDate(str);
      setEndDate(str);
    } else if (preset === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 86400000);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(monthAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'fy') {
      const curYear = today.getFullYear();
      const fyStart = today.getMonth() >= 3 ? new Date(curYear, 3, 1) : new Date(curYear - 1, 3, 1);
      setStartDate(fyStart.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const selectedCustomer = statement?.customer || customers.find((c) => c.id === selectedCustomerId);

  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'INVOICE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Receipt className="h-3 w-3" /> Invoice
          </span>
        );
      case 'PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="h-3 w-3" /> Payment Received
          </span>
        );
      case 'SALES_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RotateCcw className="h-3 w-3" /> Sales Return
          </span>
        );
      case 'OPENING_BALANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Opening Balance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-900/60 border border-surface-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 border border-surface-700 transition-colors"
              title="Back to Customer Directory"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 sm:w-72">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Select Customer Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} ({cust.customerCode}) — Bal: ₹{cust.currentBalance?.toFixed(2) || '0.00'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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

          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setDatePreset('today')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset('month')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => setDatePreset('fy')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
            >
              FY
            </button>
            <button
              onClick={() => setDatePreset('all')}
              className="px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
            >
              All
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-2">
            <button
              onClick={() => selectedCustomerId && loadStatement(selectedCustomerId)}
              className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 border border-surface-700 transition-colors"
              title="Refresh Statement"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            </button>
            <button
              onClick={handlePrint}
              disabled={!statement}
              className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 border border-surface-700 transition-colors disabled:opacity-50"
              title="Print Khata Statement"
            >
              <Printer className="h-4 w-4" />
            </button>
            {selectedCustomer && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <DollarSign className="h-4 w-4" />
                <span>Receive Payment</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Header Info & Financial Cards */}
      {selectedCustomer && statement && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Opening Balance
              </span>
              <span className="text-lg font-bold font-mono text-slate-200">
                {formatCurrency(statement.openingBalance)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">At start of period</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-rose-400" />
                <span>Total Invoiced (Debits)</span>
              </span>
              <span className="text-lg font-bold font-mono text-rose-400">
                {formatCurrency(statement.totalDebit)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Sales billed to customer</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                <span>Total Payments (Credits)</span>
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {formatCurrency(statement.totalCredit)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Receipts & credit returns</span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Net Closing Balance
              </span>
              <span
                className={`text-lg font-bold font-mono ${
                  statement.closingBalance > 0
                    ? 'text-rose-400'
                    : statement.closingBalance < 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {formatCurrency(Math.abs(statement.closingBalance))}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {statement.closingBalance > 0
                  ? 'Receivable (Customer owes)'
                  : statement.closingBalance < 0
                  ? 'Credit Advance'
                  : 'Settled'}
              </span>
            </div>
          </div>

          {/* Statement Entries Table */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Khata Ledger Statement</h3>
                <p className="text-xs text-slate-400">
                  {selectedCustomer.name} ({selectedCustomer.customerCode}) • Contact: {selectedCustomer.phone || 'N/A'}
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {statement.entries.length} transactions recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-950/70 border-b border-surface-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Ref Number</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Debit (+)</th>
                    <th className="py-3 px-4 text-right">Credit (-)</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60">
                  {statement.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <span>No ledger entries found for this period</span>
                      </td>
                    </tr>
                  ) : (
                    statement.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-surface-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {formatDate(entry.entryDate)}
                        </td>
                        <td className="py-3 px-4">{getBadgeForType(entry.transactionType)}</td>
                        <td className="py-3 px-4 font-mono font-medium text-brand-400">
                          {entry.referenceNumber || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {entry.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-rose-400">
                          {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                          {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                          {formatCurrency(entry.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedCustomer && (
        <RecordCustomerPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            loadStatement(selectedCustomer.id);
            loadCustomers();
          }}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
};
