import React, { useState, useEffect, useCallback } from 'react';
import {
  CashbookEntry,
  CashbookFilterDTO,
  CashbookSummary,
  CashRegister,
  CashRegisterSession,
  DayEndClosing,
  DayEndClosingFilterDTO,
  DayEndClosingPreview,
} from '@rs-inventory/types';
import {
  CircleDollarSign,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  Calendar,
  Layers,
  BookOpen,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { OpenSessionModal } from './OpenSessionModal';
import { CashInOutModal } from './CashInOutModal';
import { CloseSessionModal } from './CloseSessionModal';
import { PrintableClosingReportModal } from './PrintableClosingReportModal';
import { useAuthStore } from '../../store/authStore';

export const CashRegisterIndexPage: React.FC = () => {
  const { hasPermission } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'session' | 'cashbook' | 'history'>('session');

  // Active Session State
  const [activeSession, setActiveSession] = useState<CashRegisterSession | null>(null);
  const [defaultRegister, setDefaultRegister] = useState<CashRegister | null>(null);
  const [sessionPreview, setSessionPreview] = useState<DayEndClosingPreview | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Cashbook State
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>([]);
  const [cashbookSummary, setCashbookSummary] = useState<CashbookSummary | null>(null);
  const [cashbookPage, setCashbookPage] = useState(1);
  const [cashbookTotalPages, setCashbookTotalPages] = useState(1);
  const [cashbookStartDate, setCashbookStartDate] = useState('');
  const [cashbookEndDate, setCashbookEndDate] = useState('');
  const [cashbookMovementType, setCashbookMovementType] = useState('');
  const [isLoadingCashbook, setIsLoadingCashbook] = useState(false);

  // Closing History State
  const [closings, setClosings] = useState<DayEndClosing[]>([]);
  const [closingPage, setClosingPage] = useState(1);
  const [closingTotalPages, setClosingTotalPages] = useState(1);
  const [isLoadingClosings, setIsLoadingClosings] = useState(false);

  // Modals
  const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false);
  const [isCashInOutModalOpen, setIsCashInOutModalOpen] = useState(false);
  const [cashInOutMode, setCashInOutMode] = useState<'IN' | 'OUT'>('IN');
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);
  const [selectedClosingForReport, setSelectedClosingForReport] = useState<DayEndClosing | null>(null);

  // Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Load Register and Active Session
  const loadSessionData = useCallback(async () => {
    setIsLoadingSession(true);
    try {
      const regRes = await window.rsInventory.listCashRegisters();
      if (regRes.success && regRes.data && regRes.data.length > 0) {
        setDefaultRegister(regRes.data[0]);
      }

      const sessRes = await window.rsInventory.getActiveCashRegisterSession();
      if (sessRes.success) {
        setActiveSession(sessRes.data || null);
        if (sessRes.data) {
          const previewRes = await window.rsInventory.getSessionSummary(sessRes.data.id);
          if (previewRes.success && previewRes.data) {
            setSessionPreview(previewRes.data);
          }
        } else {
          setSessionPreview(null);
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load session status.' });
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  // 2. Load Cashbook
  const loadCashbook = useCallback(async () => {
    setIsLoadingCashbook(true);
    try {
      const filters: CashbookFilterDTO = {
        startDate: cashbookStartDate || undefined,
        endDate: cashbookEndDate || undefined,
        movementType: cashbookMovementType || undefined,
        page: cashbookPage,
        pageSize: 30,
      };

      const [entriesRes, summaryRes] = await Promise.all([
        window.rsInventory.getCashbookEntries(filters),
        window.rsInventory.getCashbookSummary(filters),
      ]);

      if (entriesRes.success && entriesRes.data) {
        setCashbookEntries(entriesRes.data.items);
        setCashbookTotalPages(entriesRes.data.totalPages);
      }
      if (summaryRes.success && summaryRes.data) {
        setCashbookSummary(summaryRes.data);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load cashbook.' });
    } finally {
      setIsLoadingCashbook(false);
    }
  }, [cashbookStartDate, cashbookEndDate, cashbookMovementType, cashbookPage]);

  // 3. Load Closing History
  const loadClosings = useCallback(async () => {
    setIsLoadingClosings(true);
    try {
      const filters: DayEndClosingFilterDTO = {
        page: closingPage,
        pageSize: 20,
      };
      const res = await window.rsInventory.listDayEndClosings(filters);
      if (res.success && res.data) {
        setClosings(res.data.items);
        setClosingTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load closings.' });
    } finally {
      setIsLoadingClosings(false);
    }
  }, [closingPage]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  useEffect(() => {
    if (activeTab === 'cashbook') loadCashbook();
    if (activeTab === 'history') loadClosings();
  }, [activeTab, loadCashbook, loadClosings]);

  // CSV Export
  const handleExportCashbook = () => {
    if (cashbookEntries.length === 0) return;
    const headers = ['Date', 'Movement Number', 'Type', 'Reference', 'Description', 'Cash In (₹)', 'Cash Out (₹)', 'Running Balance (₹)'];
    const rows = cashbookEntries.map((e) => [
      new Date(e.date).toISOString(),
      e.movementNumber,
      e.movementType,
      e.referenceNumber || '',
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.cashIn,
      e.cashOut,
      e.runningBalance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cashbook_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reopen session handler
  const handleReopenSession = async (sessionId: string) => {
    const reason = window.prompt('Enter mandatory justification for reopening this closed session:');
    if (!reason?.trim()) return;

    try {
      const res = await window.rsInventory.reopenCashRegisterSession(sessionId, reason.trim());
      if (!res.success) throw new Error(res.error?.message || 'Failed to reopen session.');
      setAlert({ type: 'success', message: 'Session reopened successfully.' });
      loadSessionData();
      loadClosings();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error reopening session.' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CircleDollarSign className="h-7 w-7 text-brand-400" />
            Cash Register & Cashbook
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time drawer cash reconciliation, cash float management, daily cashbook, and day-end closing
          </p>
        </div>

        {/* Register Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-surface-900 border border-surface-800 px-3.5 py-1.5 flex items-center gap-2.5">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                activeSession ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Drawer Status</div>
              <div className="text-xs font-semibold text-white">
                {activeSession ? `OPEN (${activeSession.sessionNumber})` : 'CLOSED'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {alert && (
        <div
          className={`rounded-xl border p-3.5 flex items-center justify-between text-xs ${
            alert.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alert.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-white">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-surface-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('session')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'session'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CircleDollarSign className="h-4 w-4" />
          <span>Active Session</span>
        </button>

        <button
          onClick={() => setActiveTab('cashbook')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'cashbook'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Daily Cashbook</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Day-End Closings</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE SESSION */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          {isLoadingSession ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-brand-500" />
              Checking cash drawer session...
            </div>
          ) : !activeSession ? (
            /* No Active Session View */
            <div className="rounded-3xl border border-surface-800 bg-surface-900/60 p-12 text-center max-w-xl mx-auto space-y-4 shadow-xl">
              <div className="h-16 w-16 rounded-2xl bg-surface-800 border border-surface-700 mx-auto flex items-center justify-center text-slate-400">
                <CircleDollarSign className="h-8 w-8 text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cash Register is Currently Closed</h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
                  Open a new cashier session with your starting cash float to begin processing POS cash sales, customer
                  payments, and expense vouchers.
                </p>
              </div>

              {hasPermission('cashRegister.open') && (
                <button
                  onClick={() => setIsOpenSessionModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Open Register Session</span>
                </button>
              )}
            </div>
          ) : (
            /* Active Session View */
            <div className="space-y-6">
              {/* Main Expected Cash Card & Action Buttons */}
              <div className="rounded-3xl bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Live Drawer Cash Balance</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="text-4xl font-extrabold text-white tracking-tight mt-1">
                    ₹{(sessionPreview?.expectedCash || activeSession.openingCash).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center gap-3">
                    <span>Opening Float: <strong className="text-slate-200">₹{activeSession.openingCash.toFixed(2)}</strong></span>
                    <span>•</span>
                    <span>Started: <strong className="text-slate-200">{new Date(activeSession.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                    <span>•</span>
                    <span>Register: <strong className="text-slate-200">{defaultRegister?.name || 'Main Counter'}</strong></span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {hasPermission('cashRegister.cashIn') && (
                    <button
                      onClick={() => {
                        setCashInOutMode('IN');
                        setIsCashInOutModalOpen(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-100 font-semibold text-xs transition border border-surface-700 flex items-center gap-1.5"
                    >
                      <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                      <span>Cash In</span>
                    </button>
                  )}

                  {hasPermission('cashRegister.cashOut') && (
                    <button
                      onClick={() => {
                        setCashInOutMode('OUT');
                        setIsCashInOutModalOpen(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-100 font-semibold text-xs transition border border-surface-700 flex items-center gap-1.5"
                    >
                      <ArrowUpRight className="h-4 w-4 text-rose-400" />
                      <span>Cash Out</span>
                    </button>
                  )}

                  {hasPermission('dayEndClosing.close') && (
                    <button
                      onClick={() => setIsCloseSessionModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition shadow-lg shadow-amber-600/20 flex items-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      <span>Close Register & Reconcile</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Movement Summary Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-surface-900 border border-surface-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Cash Sales</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    +₹{(sessionPreview?.cashSales || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Physical POS tender</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-900 border border-surface-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Customer Receipts</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    +₹{(sessionPreview?.customerCashReceipts || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">A/R invoice collections</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-900 border border-surface-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Cash In (Float)</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    +₹{(sessionPreview?.cashIn || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Float additions</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-900 border border-surface-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Supplier Payouts</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">
                    −₹{(sessionPreview?.supplierCashPayments || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Cash vendor payments</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-900 border border-surface-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Cash Expenses</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">
                    −₹{(sessionPreview?.cashExpenses || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Daily operational costs</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-900 border border-surface-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Refunds & Drops</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">
                    −₹{((sessionPreview?.cashRefunds || 0) + (sessionPreview?.cashOut || 0)).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Returns & cash out</div>
                </div>
              </div>

              {/* Electronic / Non-Cash Isolated Notice */}
              <div className="p-4 rounded-2xl bg-surface-950/60 border border-surface-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Electronic Tender Isolation (No Cash Discrepancy):</span>
                    <span className="text-slate-400 ml-2">
                      UPI, Card & Bank sales (₹{(sessionPreview?.nonCashSales || 0).toFixed(2)}) are tracked separately
                      and do not count as physical drawer cash.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAILY CASHBOOK */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4">
          {/* Cashbook Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Opening Cash Balance</div>
              <div className="text-xl font-bold text-white mt-1">₹{(cashbookSummary?.openingBalance || 0).toFixed(2)}</div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Cash Inflows</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">+₹{(cashbookSummary?.totalCashIn || 0).toFixed(2)}</div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Cash Outflows</div>
              <div className="text-xl font-bold text-rose-400 mt-1">−₹{(cashbookSummary?.totalCashOut || 0).toFixed(2)}</div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Closing Running Balance</div>
              <div className="text-xl font-bold text-brand-400 mt-1">₹{(cashbookSummary?.closingBalance || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Filters & Export Bar */}
          <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Date Range:</span>
                <input
                  type="date"
                  value={cashbookStartDate}
                  onChange={(e) => {
                    setCashbookStartDate(e.target.value);
                    setCashbookPage(1);
                  }}
                  className="bg-surface-950 border border-surface-800 rounded-lg px-2.5 py-1 text-slate-200"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={cashbookEndDate}
                  onChange={(e) => {
                    setCashbookEndDate(e.target.value);
                    setCashbookPage(1);
                  }}
                  className="bg-surface-950 border border-surface-800 rounded-lg px-2.5 py-1 text-slate-200"
                />
              </div>

              <div>
                <select
                  value={cashbookMovementType}
                  onChange={(e) => {
                    setCashbookMovementType(e.target.value);
                    setCashbookPage(1);
                  }}
                  className="bg-surface-950 border border-surface-800 rounded-lg px-3 py-1 text-slate-200"
                >
                  <option value="">All Movement Types</option>
                  <option value="OPENING_CASH">Opening Cash</option>
                  <option value="CASH_SALE">Cash Sale</option>
                  <option value="CUSTOMER_PAYMENT">Customer Payment</option>
                  <option value="CASH_EXPENSE">Cash Expense</option>
                  <option value="SUPPLIER_CASH_PAYMENT">Supplier Cash Payment</option>
                  <option value="CASH_REFUND">Cash Return Refund</option>
                  <option value="CASH_IN">Cash In</option>
                  <option value="CASH_OUT">Cash Out</option>
                </select>
              </div>

              {(cashbookStartDate || cashbookEndDate || cashbookMovementType) && (
                <button
                  onClick={() => {
                    setCashbookStartDate('');
                    setCashbookEndDate('');
                    setCashbookMovementType('');
                    setCashbookPage(1);
                  }}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCashbook}
                className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-200 font-medium flex items-center gap-1.5 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Cashbook Ledger Table */}
          <div className="rounded-2xl bg-surface-900 border border-surface-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-950/60 border-b border-surface-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Movement #</th>
                    <th className="px-4 py-3">Movement Type</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Cash Received (In)</th>
                    <th className="px-4 py-3 text-right">Cash Paid (Out)</th>
                    <th className="px-4 py-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 font-medium">
                  {isLoadingCashbook ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-500" />
                        Loading cashbook ledger...
                      </td>
                    </tr>
                  ) : cashbookEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No cash movements recorded for the selected period.
                      </td>
                    </tr>
                  ) : (
                    cashbookEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-surface-800/40 transition">
                        <td className="px-4 py-3 text-slate-300">
                          {new Date(entry.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-brand-400">
                          {entry.movementNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-950 border border-surface-800 text-slate-200">
                            {entry.movementType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {entry.referenceNumber || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-200">
                          {entry.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                          {entry.cashIn > 0 ? `+₹${entry.cashIn.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-400 font-semibold">
                          {entry.cashOut > 0 ? `−₹${entry.cashOut.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          ₹{entry.runningBalance.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {cashbookTotalPages > 1 && (
              <div className="p-3 border-t border-surface-800 bg-surface-950/40 flex items-center justify-between text-xs text-slate-400">
                <span>Page {cashbookPage} of {cashbookTotalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={cashbookPage <= 1}
                    onClick={() => setCashbookPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-surface-800 hover:bg-surface-800 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={cashbookPage >= cashbookTotalPages}
                    onClick={() => setCashbookPage((p) => Math.min(cashbookTotalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-surface-800 hover:bg-surface-800 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLOSING HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-900 border border-surface-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950/60 border-b border-surface-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Closing #</th>
                  <th className="px-4 py-3">Business Date</th>
                  <th className="px-4 py-3">Register</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Counted</th>
                  <th className="px-4 py-3 text-right">Difference</th>
                  <th className="px-4 py-3">Closed By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 font-medium">
                {isLoadingClosings ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-500" />
                      Loading closing records...
                    </td>
                  </tr>
                ) : closings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No historical day-end closing sessions recorded yet.
                    </td>
                  </tr>
                ) : (
                  closings.map((c) => {
                    const diff = c.cashDifference;
                    const isDiscrepant = Math.abs(diff) > 0.01;
                    return (
                      <tr key={c.id} className="hover:bg-surface-800/30 transition">
                        <td className="px-4 py-3 font-mono font-bold text-brand-400">{c.closingNumber}</td>
                        <td className="px-4 py-3 text-slate-200">
                          {new Date(c.businessDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">{c.cashRegister?.name || 'Main Counter'}</td>
                        <td className="px-4 py-3 text-right text-slate-300 font-semibold">
                          ₹{c.expectedCash.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          ₹{c.countedCash.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              !isDiscrepant
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : diff > 0
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {diff > 0 ? `+₹${diff.toFixed(2)}` : diff < 0 ? `−₹${Math.abs(diff).toFixed(2)}` : '₹0.00'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{c.closedBy || 'Admin'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedClosingForReport(c)}
                              className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-200 flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              <span>View Report</span>
                            </button>

                            {hasPermission('cashRegister.reopen') && (
                              <button
                                onClick={() => handleReopenSession(c.cashRegisterSessionId)}
                                className="px-2 py-1 rounded-lg text-slate-400 hover:text-amber-400 text-[11px]"
                                title="Reopen closed session (Audit Required)"
                              >
                                Reopen
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
            {closingTotalPages > 1 && (
              <div className="p-3 border-t border-surface-800 flex items-center justify-between text-xs text-slate-400">
                <span>Page {closingPage} of {closingTotalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={closingPage <= 1}
                    onClick={() => setClosingPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-slate-200 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={closingPage >= closingTotalPages}
                    onClick={() => setClosingPage((p) => Math.min(closingTotalPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-slate-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <OpenSessionModal
        isOpen={isOpenSessionModalOpen}
        onClose={() => setIsOpenSessionModalOpen(false)}
        onOpened={() => {
          setAlert({ type: 'success', message: 'Cash register session opened successfully!' });
          loadSessionData();
        }}
        cashRegisterId={defaultRegister?.id}
        registerName={defaultRegister?.name}
      />

      <CashInOutModal
        isOpen={isCashInOutModalOpen}
        onClose={() => setIsCashInOutModalOpen(false)}
        onSaved={() => {
          setAlert({ type: 'success', message: `Cash ${cashInOutMode} recorded successfully.` });
          loadSessionData();
          loadCashbook();
        }}
        mode={cashInOutMode}
      />

      <CloseSessionModal
        isOpen={isCloseSessionModalOpen}
        onClose={() => setIsCloseSessionModalOpen(false)}
        onClosed={(closingRecord) => {
          setAlert({ type: 'success', message: `Day-End Closing ${closingRecord.closingNumber} completed successfully.` });
          loadSessionData();
          loadClosings();
          setSelectedClosingForReport(closingRecord);
        }}
        preview={sessionPreview}
      />

      <PrintableClosingReportModal
        isOpen={Boolean(selectedClosingForReport)}
        onClose={() => setSelectedClosingForReport(null)}
        closing={selectedClosingForReport}
      />
    </div>
  );
};
