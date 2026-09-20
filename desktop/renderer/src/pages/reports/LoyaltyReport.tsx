import React, { useEffect, useState } from 'react';
import {
  Gift,
  Coins,
  RefreshCw,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Filter,
  Calendar,
} from 'lucide-react';
import { LoyaltyKPIsDTO } from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';

export const LoyaltyReport: React.FC = () => {
  const { notify } = useNotificationStore();

  const [kpis, setKpis] = useState<LoyaltyKPIsDTO | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [isLoadingKPIs, setIsLoadingKPIs] = useState<boolean>(false);
  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadKPIs = async () => {
    setIsLoadingKPIs(true);
    try {
      const res = await window.rsInventory.getLoyaltyKPIs();
      if (res.success && res.data) {
        setKpis(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingKPIs(false);
    }
  };

  const loadLedger = async (targetPage = 1) => {
    setIsLoadingLedger(true);
    try {
      const filters: any = {
        page: targetPage,
        pageSize,
        transactionType: selectedType !== 'ALL' ? selectedType : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : undefined,
      };

      const res = await window.rsInventory.getLoyaltyReport(filters);
      if (res.success && res.data) {
        setTransactions(res.data.items);
        setTotalRecords(res.data.total);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to load loyalty ledger');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  useEffect(() => {
    loadKPIs();
  }, []);

  useEffect(() => {
    loadLedger(1);
  }, [selectedType, startDate, endDate]);

  const handleRefresh = () => {
    loadKPIs();
    loadLedger(page);
    notify('info', 'Loyalty analytics refreshed');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Gift className="h-6 w-6 text-brand-400" />
            Loyalty Points Analytics & Liability Report
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of active points in circulation, estimated rupee liability, and full transactional audit ledger.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingKPIs || isLoadingLedger ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-brand-400" />
            Enrolled Customers
          </span>
          <span className="text-2xl font-black font-mono text-white block">
            {kpis?.totalEnrolledCustomers ?? 0}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Active customer wallets</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-900/30 to-surface-900 border border-brand-500/30">
          <span className="text-[11px] font-medium text-brand-300 block mb-1 flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-brand-400" />
            Active Points
          </span>
          <span className="text-2xl font-black font-mono text-white block">
            {kpis?.totalActivePoints ?? 0}
          </span>
          <span className="text-[10px] text-brand-400 block mt-1">Total points in circulation</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/20 to-surface-900 border border-amber-500/30">
          <span className="text-[11px] font-medium text-amber-300 block mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            Estimated Liability
          </span>
          <span className="text-2xl font-black font-mono text-amber-300 block">
            {formatCurrency(kpis?.estimatedLiabilityAmount ?? 0)}
          </span>
          <span className="text-[10px] text-amber-400/80 block mt-1">Rupee redemption cost</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
            Lifetime Earned
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400 block">
            {kpis?.lifetimePointsEarned ?? 0}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Awarded to customers</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400" />
            Lifetime Redeemed
          </span>
          <span className="text-xl font-bold font-mono text-indigo-400 block">
            {kpis?.lifetimePointsRedeemed ?? 0}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            Redemption rate: {kpis?.redemptionRate ?? 0}%
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-rose-400" />
            Lifetime Expired
          </span>
          <span className="text-xl font-bold font-mono text-slate-300 block">
            {kpis?.lifetimePointsExpired ?? 0}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Passed validity period</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-300">Transaction Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Types</option>
              <option value="EARN">EARN (Sale Earning)</option>
              <option value="REDEEM">REDEEM (POS Discount)</option>
              <option value="RETURN_REVERSAL">RETURN REVERSAL</option>
              <option value="RETURN_RESTORE">RETURN RESTORE</option>
              <option value="EXPIRE">EXPIRE (Batch Expiry)</option>
              <option value="MANUAL_CREDIT">MANUAL CREDIT</option>
              <option value="MANUAL_DEBIT">MANUAL DEBIT</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="text-slate-400 text-right w-full md:w-auto font-mono">
          Showing {transactions.length} of {totalRecords} entries
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-surface-800 overflow-hidden bg-surface-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950 border-b border-surface-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Balance After</th>
                <th className="px-4 py-3">Reference / Bill #</th>
                <th className="px-4 py-3">Description / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {isLoadingLedger ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-brand-500 mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No transactions matching current filters.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const isCredit = txn.points > 0;
                  return (
                    <tr key={txn.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(txn.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-white">{txn.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {txn.customerCode} {txn.customerPhone ? `• ${txn.customerPhone}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            txn.transactionType === 'EARN'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : txn.transactionType === 'REDEEM'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : txn.transactionType === 'RETURN_REVERSAL'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : txn.transactionType === 'RETURN_RESTORE'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : txn.transactionType === 'EXPIRE'
                              ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                              : 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                          }`}
                        >
                          {txn.transactionType.replace('_', ' ')}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isCredit ? `+${txn.points}` : txn.points}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-200 whitespace-nowrap">
                        {txn.balanceAfter}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-brand-400 font-semibold">
                        {txn.invoiceNumber !== '-' ? txn.invoiceNumber : txn.referenceType || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-sm truncate text-[11px]">
                        {txn.description || txn.reason || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-800 bg-surface-950 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => loadLedger(page - 1)}
                className="px-3 py-1 rounded-lg bg-surface-900 border border-surface-800 hover:bg-surface-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => loadLedger(page + 1)}
                className="px-3 py-1 rounded-lg bg-surface-900 border border-surface-800 hover:bg-surface-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
