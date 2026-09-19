import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Eye,
  FileText,
  Phone,
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  ShoppingCart,
} from 'lucide-react';
import { Customer, CustomerFilterDTO } from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { CustomerModal } from './CustomerModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';

interface CustomerListPageProps {
  onViewLedger: (customerId: string) => void;
  onNewSale: (customerId: string) => void;
}

export const CustomerListPage: React.FC<CustomerListPageProps> = ({
  onViewLedger,
  onNewSale,
}) => {
  const { notify } = useNotificationStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Details Modal
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [page, activeFilter, typeFilter]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const filter: CustomerFilterDTO = {
        page,
        pageSize,
        search: search.trim() || undefined,
        isActive: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
        customerType: typeFilter !== 'all' ? (typeFilter as any) : undefined,
      };

      const res = await window.rsInventory.listCustomers(filter);
      if (res.success && res.data) {
        setCustomers(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        notify('error', res.error?.message || 'Failed to fetch customers');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      const res = await window.rsInventory.toggleCustomerActive(customer.id);
      if (res.success) {
        notify(
          'success',
          `Customer ${customer.name} marked as ${!customer.isActive ? 'Active' : 'Inactive'}`,
        );
        loadCustomers();
      } else {
        notify('error', res.error?.message || 'Failed to update customer status');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error toggling customer status');
    }
  };

  // KPIs
  const totalReceivables = customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
  const activeCount = customers.filter((c) => c.isActive).length;
  const creditAccountsCount = customers.filter((c) => (c.creditLimit || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Total Customers</span>
            <span className="text-xl font-bold text-white font-mono">{total}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Registered accounts</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Outstanding Receivables
            </span>
            <span className="text-xl font-bold text-rose-400 font-mono">
              {formatCurrency(totalReceivables)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Customer Khata balance</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Active Accounts</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{activeCount}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Ready for billing</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Credit Accounts</span>
            <span className="text-xl font-bold text-indigo-400 font-mono">{creditAccountsCount}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">With approved limits</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-900/60 border border-surface-800 p-4 rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, code, GSTIN..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Customer Types</option>
            <option value="INDIVIDUAL">Individual / Walk-in</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="CORPORATE">Corporate</option>
          </select>

          <button
            onClick={() => loadCustomers()}
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 border border-surface-700 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all ml-auto sm:ml-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/70 border-b border-surface-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer Name & Type</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">GSTIN & City</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-400" />
                    <span>Loading customer accounts...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <span>No customer records match your filter criteria</span>
                  </td>
                </tr>
              ) : (
                customers.map((cust) => {
                  const bal = cust.currentBalance || 0;
                  return (
                    <tr key={cust.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-brand-400">
                        {cust.customerCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{cust.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {cust.customerType || 'INDIVIDUAL'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-500" />
                            <span>{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                        {cust.email && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate max-w-[150px]">
                            <Mail className="h-2.5 w-2.5" />
                            <span>{cust.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {cust.gstin ? (
                          <div className="font-mono text-[11px] text-slate-300">{cust.gstin}</div>
                        ) : (
                          <span className="text-slate-600 text-[10px]">Unregistered</span>
                        )}
                        <div className="text-[10px] text-slate-500">{cust.city || cust.state || '—'}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            bal > 0
                              ? 'text-rose-400'
                              : bal < 0
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }
                        >
                          {formatCurrency(Math.abs(bal))}
                        </span>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {bal > 0 ? 'Receivable' : bal < 0 ? 'Advance' : 'Nil'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        {cust.creditLimit ? formatCurrency(cust.creditLimit) : 'Unlimited'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(cust)}
                          title="Click to toggle status"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                            cust.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          {cust.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewLedger(cust.id)}
                            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white transition-colors"
                            title="Khata Ledger & Statement"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onNewSale(cust.id)}
                            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-brand-400 hover:text-brand-300 transition-colors"
                            title="Create New Invoice for Customer"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDetailsCustomer(cust)}
                            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white transition-colors"
                            title="View Customer Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCustomer(cust);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit Customer Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-surface-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{customers.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> customers
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

      {/* Customer Add/Edit Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadCustomers()}
        editingCustomer={editingCustomer}
      />

      {/* Details Modal */}
      <CustomerDetailsModal
        isOpen={!!detailsCustomer}
        onClose={() => setDetailsCustomer(null)}
        customer={detailsCustomer}
        onViewLedger={onViewLedger}
        onNewSale={onNewSale}
      />
    </div>
  );
};
