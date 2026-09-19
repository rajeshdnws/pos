import React, { useEffect, useState } from 'react';
import {
  Truck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  Phone,
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Supplier, SupplierFilterDTO } from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { SupplierModal } from './SupplierModal';
import { SupplierDetailsModal } from './SupplierDetailsModal';

interface SupplierListPageProps {
  onViewLedger: (supplierId: string) => void;
  onNewPurchase: (supplierId: string) => void;
}

export const SupplierListPage: React.FC<SupplierListPageProps> = ({
  onViewLedger,
  onNewPurchase,
}) => {
  const { notify } = useNotificationStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Details Modal
  const [detailsSupplierId, setDetailsSupplierId] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, [page, activeFilter]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const filter: SupplierFilterDTO = {
        page,
        pageSize,
        search: search.trim() || undefined,
        isActive: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
      };

      const res = await window.rsInventory.listSuppliers(filter);
      if (res.success && res.data) {
        setSuppliers(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } else {
        notify('error', res.error?.message || 'Failed to fetch suppliers');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSuppliers();
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setIsModalOpen(true);
  };

  const handleDelete = async (s: Supplier) => {
    if (
      !window.confirm(
        `Are you sure you want to delete supplier "${s.name}" (${s.supplierCode || s.code})?\nNote: Suppliers with purchases or transaction history cannot be deleted.`,
      )
    ) {
      return;
    }

    try {
      const res = await window.rsInventory.deleteSupplier(s.id);
      if (res.success) {
        notify('success', `Supplier "${s.name}" deleted successfully`);
        loadSuppliers();
      } else {
        notify('error', res.error?.message || 'Failed to delete supplier');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error deleting supplier');
    }
  };

  const [isInstallingDemo, setIsInstallingDemo] = useState(false);

  const handleInstallDemo = async () => {
    setIsInstallingDemo(true);
    try {
      const res = await window.rsInventory.installDemoData();
      if (res.success && res.data) {
        notify('success', res.data.message || 'Sample suppliers installed successfully!');
        await loadSuppliers();
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
            <Truck className="h-6 w-6 text-indigo-400" />
            <span>Suppliers & Vendors Master</span>
          </h2>
          <p className="text-xs text-slate-400">
            Manage vendor profiles, tax registrations, credit limits, and running payables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleInstallDemo}
            disabled={isInstallingDemo}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all disabled:opacity-50"
            title="Install realistic sample suppliers"
          >
            <Sparkles className={`h-3.5 w-3.5 text-indigo-400 ${isInstallingDemo ? 'animate-spin' : ''}`} />
            <span>{isInstallingDemo ? 'Installing Demo...' : 'Load Sample Suppliers'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-surface-900 border border-surface-800">
        <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by supplier name, code, contact, phone, GSTIN..."
            className="w-full pl-9 pr-4 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </form>

        <div className="sm:col-span-3">
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Status (Active & Inactive)</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="sm:col-span-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPage(1);
              loadSuppliers();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-surface-800 hover:bg-surface-700 text-slate-200 rounded-xl text-xs font-semibold border border-surface-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Supplier / Code</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Tax / GSTIN</th>
                <th className="py-3 px-4 text-right">Current Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60 bg-surface-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading suppliers...</span>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                        <Truck className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">No Suppliers Found</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Register your first vendor or load sample FMCG & electronics suppliers.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          onClick={handleInstallDemo}
                          disabled={isInstallingDemo}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Install Demo Suppliers</span>
                        </button>
                        <button
                          onClick={handleOpenAdd}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Supplier</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-[11px] font-bold shrink-0">
                          {(s.supplierCode || s.code || 'SUP').substring(0, 4)}
                        </div>
                        <div>
                          <div className="font-semibold text-white hover:text-indigo-300 cursor-pointer" onClick={() => setDetailsSupplierId(s.id)}>
                            {s.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{s.supplierCode || s.code}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {s.contactPerson && (
                          <div className="text-slate-200 font-medium">{s.contactPerson}</div>
                        )}
                        {s.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-500" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.email && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[150px]">
                            <Mail className="h-3 w-3 text-slate-500" />
                            <span>{s.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono text-indigo-300 font-semibold text-[11px]">
                          {s.gstin || 'Unregistered'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      <div
                        className={`font-bold text-sm ${
                          (s.currentBalance || 0) > 0
                            ? 'text-rose-400'
                            : (s.currentBalance || 0) < 0
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(Math.abs(s.currentBalance || 0))}
                      </div>
                      <div className="text-[10px] uppercase font-semibold text-slate-500">
                        {(s.currentBalance || 0) > 0
                          ? 'Payable'
                          : (s.currentBalance || 0) < 0
                          ? 'Advance'
                          : 'Settled'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="h-3 w-3" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailsSupplierId(s.id)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-surface-800 rounded-lg transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onViewLedger(s.id)}
                          title="View Ledger Statement"
                          className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Supplier"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          title="Delete Supplier"
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} suppliers
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

      {/* Supplier Form Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplier={editingSupplier}
        onSaved={() => {
          loadSuppliers();
        }}
      />

      {/* Supplier Details Drawer */}
      <SupplierDetailsModal
        isOpen={Boolean(detailsSupplierId)}
        supplierId={detailsSupplierId}
        onClose={() => setDetailsSupplierId(null)}
        onViewLedger={(sId) => {
          setDetailsSupplierId(null);
          onViewLedger(sId);
        }}
        onNewPurchase={(sId) => {
          setDetailsSupplierId(null);
          onNewPurchase(sId);
        }}
      />
    </div>
  );
};
