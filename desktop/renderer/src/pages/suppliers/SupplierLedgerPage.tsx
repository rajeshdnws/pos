import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ChevronLeft,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Supplier, SupplierStatementResult, SupplierLedgerEntry } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';

interface SupplierLedgerPageProps {
  initialSupplierId?: string;
  onBack?: () => void;
}

export const SupplierLedgerPage: React.FC<SupplierLedgerPageProps> = ({
  initialSupplierId,
  onBack,
}) => {
  const { notify } = useNotificationStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplierId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statement, setStatement] = useState<SupplierStatementResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      loadStatement();
    }
  }, [selectedSupplierId]);

  const loadSuppliers = async () => {
    try {
      const res = await window.rsInventory.listSuppliers({ pageSize: 500 });
      if (res.success && res.data) {
        setSuppliers(res.data.items);
        if (!selectedSupplierId && res.data.items.length > 0) {
          setSelectedSupplierId(res.data.items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  const loadStatement = async () => {
    if (!selectedSupplierId) return;
    setLoading(true);
    try {
      const res = await window.rsInventory.getSupplierStatement(selectedSupplierId, {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      if (res.success && res.data) {
        setStatement(res.data);
      } else {
        notify('error', res.error?.message || 'Failed to generate statement');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading ledger statement');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!statement || !statement.entries.length) {
      notify('warning', 'No entries to export');
      return;
    }

    const headers = ['Date', 'Transaction Type', 'Ref Number', 'Description', 'Debit (Payment/Return)', 'Credit (Purchase)', 'Balance'];
    const rows = statement.entries.map((e: SupplierLedgerEntry) => [
      formatDate(e.entryDate),
      e.transactionType,
      e.referenceNumber || '',
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.debitAmount.toFixed(2),
      e.creditAmount.toFixed(2),
      e.runningBalance.toFixed(2),
    ]);

    const supplierCode = statement.supplier.supplierCode || statement.supplier.code || 'SUP';
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `Supplier Statement: ${statement.supplier.name} (${supplierCode})`,
        `Period: ${startDate || 'Inception'} to ${endDate || 'Current'}`,
        `Opening Balance: ${statement.openingBalance.toFixed(2)}`,
        `Closing Balance: ${statement.closingBalance.toFixed(2)}`,
        '',
        headers.join(','),
        ...rows.map((r: string[]) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Ledger_${supplierCode}_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('success', 'Ledger exported to CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-900/60 p-4 rounded-2xl border border-surface-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-surface-800 hover:bg-surface-700 text-slate-300 rounded-xl transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-400" />
              <span>Supplier Ledger & Statements</span>
            </h2>
            <p className="text-xs text-slate-400">
              Double-entry balance tracking with debits, credits, and chronological running balances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={!statement || statement.entries.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 rounded-xl border border-surface-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={!statement}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 rounded-xl border border-surface-700 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Filter Selection Panel */}
      <div className="p-4 rounded-2xl bg-surface-900/40 border border-surface-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Select Supplier</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">-- Choose Supplier --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.supplierCode || 'SUP'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <button
            onClick={loadStatement}
            disabled={!selectedSupplierId || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Generate Statement</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {statement && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
            <div className="text-xs text-slate-400 font-medium">Opening Balance</div>
            <div className="text-xl font-bold font-mono text-slate-200 mt-2">
              {formatCurrency(statement.openingBalance)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">At start of selected period</div>
          </div>

          <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
            <div className="text-xs text-slate-400 font-medium">Total Invoiced (Credit)</div>
            <div className="text-xl font-bold font-mono text-indigo-400 mt-2">
              {formatCurrency(statement.totalCredits ?? statement.totalCredit ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Purchases recorded</div>
          </div>

          <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
            <div className="text-xs text-slate-400 font-medium">Total Paid / Returned (Debit)</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
              {formatCurrency(statement.totalDebits ?? statement.totalDebit ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Payments & returns</div>
          </div>

          <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
            <div className="text-xs text-slate-400 font-medium">Closing Balance</div>
            <div
              className={`text-xl font-bold font-mono mt-2 ${
                statement.closingBalance > 0
                  ? 'text-rose-400'
                  : statement.closingBalance < 0
                  ? 'text-emerald-400'
                  : 'text-slate-200'
              }`}
            >
              {formatCurrency(Math.abs(statement.closingBalance))}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5 uppercase">
              {statement.closingBalance > 0
                ? 'Net Payable to Supplier'
                : statement.closingBalance < 0
                ? 'Advance Paid (Credit)'
                : 'Account Settled'}
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Tx Type</th>
                <th className="py-3 px-4">Reference #</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Debit (₹)</th>
                <th className="py-3 px-4 text-right">Credit (₹)</th>
                <th className="py-3 px-4 text-right">Running Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60 bg-surface-900">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading ledger statement...</span>
                  </td>
                </tr>
              ) : !statement || statement.entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No ledger entries found for the selected period.
                  </td>
                </tr>
              ) : (
                statement.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-300">{formatDate(entry.entryDate)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          entry.transactionType === 'PURCHASE'
                            ? 'bg-indigo-500/10 text-indigo-400'
                            : entry.transactionType === 'PAYMENT'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : entry.transactionType === 'PURCHASE_RETURN'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-surface-800 text-slate-400'
                        }`}
                      >
                        {entry.transactionType === 'PAYMENT' || entry.transactionType === 'PURCHASE_RETURN' ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        <span>{entry.transactionType}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-white">
                      {entry.referenceNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{entry.description || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                      {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400 font-medium">
                      {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
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
  );
};
