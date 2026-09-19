import React, { useState, useEffect, useCallback } from 'react';
import {
  Expense,
  ExpenseCategory,
  ExpenseFilterDTO,
  FinancialDashboardKPIs,
} from '@rs-inventory/types';
import {
  Plus,
  Search,
  Wallet,
  Calendar,
  CreditCard,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Eye,
  FileText,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ExpenseModal } from './ExpenseModal';
import { ExpenseCategoryModal } from './ExpenseCategoryModal';
import { ExpenseDetailsModal } from './ExpenseDetailsModal';
import { useAuthStore } from '../../store/authStore';

export const ExpensesIndexPage: React.FC = () => {
  const { hasPermission } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'expenses' | 'categories' | 'analytics'>('expenses');

  // Expenses State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Categories State
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // KPIs
  const [kpis, setKpis] = useState<FinancialDashboardKPIs | null>(null);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<ExpenseCategory | null>(null);
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<Expense | null>(null);

  // Loading & Alerts
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await window.rsInventory.listExpenseCategories(true);
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadKPIs = useCallback(async () => {
    try {
      const res = await window.rsInventory.getFinancialDashboardKPIs();
      if (res.success && res.data) {
        setKpis(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ExpenseFilterDTO = {
        search: search.trim() || undefined,
        categoryId: selectedCategory || undefined,
        paymentMethod: selectedPaymentMethod || undefined,
        status: selectedStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize,
      };

      const res = await window.rsInventory.listExpenses(filters);
      if (res.success && res.data) {
        setExpenses(res.data.items);
        setTotalExpenses(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load expenses.' });
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, selectedPaymentMethod, selectedStatus, startDate, endDate, page, pageSize]);

  useEffect(() => {
    loadCategories();
    loadKPIs();
  }, [loadCategories, loadKPIs]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Handle Post Draft
  const handlePostExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to post this expense voucher? This will commit cash movements.')) return;
    try {
      const res = await window.rsInventory.postExpense(id);
      if (!res.success) throw new Error(res.error?.message || 'Failed to post expense.');
      setAlert({ type: 'success', message: 'Expense posted successfully!' });
      loadExpenses();
      loadKPIs();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error posting expense.' });
    }
  };

  // Handle Cancel Draft
  const handleCancelDraft = async (id: string) => {
    if (!window.confirm('Cancel this draft expense? It cannot be reopened.')) return;
    try {
      const res = await window.rsInventory.cancelExpenseDraft(id);
      if (!res.success) throw new Error(res.error?.message || 'Failed to cancel draft.');
      setAlert({ type: 'success', message: 'Draft cancelled.' });
      loadExpenses();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error cancelling draft.' });
    }
  };

  // Handle Seed Default Categories
  const handleSeedDefaults = async () => {
    try {
      const res = await window.rsInventory.seedDefaultExpenseCategories();
      if (res.success) {
        setAlert({ type: 'success', message: `Added ${res.data} standard expense categories.` });
        loadCategories();
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to seed categories.' });
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this expense category? Categories with historical records cannot be deleted.')) return;
    try {
      const res = await window.rsInventory.deleteExpenseCategory(id);
      if (!res.success) throw new Error(res.error?.message || 'Cannot delete category.');
      setAlert({ type: 'success', message: 'Category removed successfully.' });
      loadCategories();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to remove category.' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Wallet className="h-7 w-7 text-brand-400" />
            Expense Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track daily business operational costs, manage categories, and audit cash/non-cash expenditures
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasPermission('expense.create') && (
            <button
              onClick={() => {
                setExpenseToEdit(null);
                setIsExpenseModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-500 font-semibold text-xs transition shadow-lg shadow-brand-600/20 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Record Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-surface-900 border border-surface-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Expenses Today</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">₹{(kpis?.expensesToday || 0).toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Posted expenses today</div>
        </div>

        <div className="rounded-2xl bg-surface-900 border border-surface-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Expenses This Month</span>
            <div className="h-8 w-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">₹{(kpis?.expensesThisMonth || 0).toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Month-to-date total</div>
        </div>

        <div className="rounded-2xl bg-surface-900 border border-surface-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Vouchers</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalExpenses}</div>
          <div className="text-[11px] text-slate-500 mt-1">Recorded expense records</div>
        </div>

        <div className="rounded-2xl bg-surface-900 border border-surface-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Expense Categories</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{categories.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {categories.filter((c) => c.isActive).length} active categories
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
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Expenses List</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Category Breakdown</span>
        </button>
      </div>

      {/* TAB 1: EXPENSES LIST */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search number, payee, desc..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => {
                    setSelectedPaymentMethod(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">All Payment Modes</option>
                  <option value="CASH">Cash (Register)</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">All Statuses</option>
                  <option value="POSTED">POSTED (Active)</option>
                  <option value="DRAFT">DRAFT (Unposted)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Date Range Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-surface-800/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-surface-950 border border-surface-800 rounded-lg px-2.5 py-1 text-slate-200"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-surface-950 border border-surface-800 rounded-lg px-2.5 py-1 text-slate-200"
                />
              </div>

              {(search || selectedCategory || selectedPaymentMethod || selectedStatus || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('');
                    setSelectedPaymentMethod('');
                    setSelectedStatus('');
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-surface-900 border border-surface-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-950/60 border-b border-surface-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Expense #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description & Payee</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-500" />
                        Loading expenses...
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No expenses found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-800/40 transition">
                        <td className="px-4 py-3 font-mono font-semibold text-brand-400">
                          {item.expenseNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {new Date(item.expenseDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-md bg-surface-950 text-slate-200 border border-surface-800">
                            {item.categoryNameSnapshot || item.category?.name || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="text-white font-medium truncate">{item.description}</div>
                          {item.payee && <div className="text-[11px] text-slate-400 truncate">To: {item.payee}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                            <CreditCard className="h-3 w-3 text-slate-500" />
                            {item.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-white">
                          ₹{item.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'POSTED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : item.status === 'DRAFT'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedExpenseForDetails(item)}
                              title="View Voucher"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {item.status === 'DRAFT' && hasPermission('expense.edit_draft') && (
                              <button
                                onClick={() => {
                                  setExpenseToEdit(item);
                                  setIsExpenseModalOpen(true);
                                }}
                                title="Edit Draft"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-surface-800 transition"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {item.status === 'DRAFT' && hasPermission('expense.post') && (
                              <button
                                onClick={() => handlePostExpense(item.id)}
                                title="Post to Cash Register & Cashbook"
                                className="px-2 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[11px] font-semibold transition"
                              >
                                Post
                              </button>
                            )}

                            {item.status === 'DRAFT' && hasPermission('expense.cancel_draft') && (
                              <button
                                onClick={() => handleCancelDraft(item.id)}
                                title="Cancel Draft"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-surface-800 transition"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-surface-800 bg-surface-950/40 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing page {page} of {totalPages} ({totalExpenses} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-surface-800 hover:bg-surface-800 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Configure and organize expense heads (e.g. Rent, Staff, Electricity). Historical categories with expenses
              are preserved.
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSeedDefaults}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-surface-800 text-slate-200 hover:bg-surface-700 transition flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Seed Standard Categories</span>
              </button>

              <button
                onClick={() => {
                  setCategoryToEdit(null);
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-500 transition flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Category</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-900 border border-surface-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950/60 border-b border-surface-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No expense categories configured yet. Click "Seed Standard Categories" to start.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-surface-800/30 transition">
                      <td className="px-4 py-3 font-semibold text-white">{cat.name}</td>
                      <td className="px-4 py-3 text-slate-400">{cat.description || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            cat.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setCategoryToEdit(cat);
                              setIsCategoryModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400"
                            title="Delete or Deactivate"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS / BREAKDOWN */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-400" />
              <span>Operational Expense Heads</span>
            </h3>
            <p className="text-xs text-slate-400">
              Active categories configured to classify expenses. Each voucher preserves an immutable category name
              snapshot for historical reporting even if categories are renamed later.
            </p>
            <div className="space-y-2 pt-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-950/60 border border-surface-800/80 text-xs"
                >
                  <span className="font-medium text-slate-200">{c.name}</span>
                  <span className="text-[11px] text-slate-400">{c.isActive ? 'Active Head' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-400" />
              <span>Payment Tender Isolation</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="font-semibold text-emerald-400">Cash Expenses (Physical Drawer)</div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Expenses paid via CASH create an atomic CASH_EXPENSE movement in the active Cash Register Session,
                  decreasing physical drawer cash and reflecting directly in the Cashbook.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <div className="font-semibold text-brand-400">Non-Cash Expenses (Bank / UPI / Card)</div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Expenses paid via UPI, NEFT, Cheque, or Card are recorded in the business expense ledger but do not
                  deplete physical register cash, preventing cash drawer discrepancy during day-end closing.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal (Add / Edit) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSaved={() => {
          loadExpenses();
          loadKPIs();
          setAlert({ type: 'success', message: 'Expense saved successfully.' });
        }}
        expenseToEdit={expenseToEdit}
        categories={categories}
        onOpenCategoryModal={() => {
          setCategoryToEdit(null);
          setIsCategoryModalOpen(true);
        }}
      />

      {/* Category Modal (Add / Edit) */}
      <ExpenseCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={() => {
          loadCategories();
          setAlert({ type: 'success', message: 'Category saved successfully.' });
        }}
        categoryToEdit={categoryToEdit}
      />

      {/* Expense Details View Modal */}
      <ExpenseDetailsModal
        isOpen={Boolean(selectedExpenseForDetails)}
        onClose={() => setSelectedExpenseForDetails(null)}
        expense={selectedExpenseForDetails}
      />
    </div>
  );
};
