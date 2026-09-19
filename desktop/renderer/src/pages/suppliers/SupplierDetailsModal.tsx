import React, { useEffect, useState } from 'react';
import {
  X,
  Truck,
  Building2,
  MapPin,
  FileText,
  ExternalLink,
  Receipt,
} from 'lucide-react';
import { Supplier, Purchase } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';

interface SupplierDetailsModalProps {
  supplierId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onViewLedger: (supplierId: string) => void;
  onNewPurchase: (supplierId: string) => void;
}

export const SupplierDetailsModal: React.FC<SupplierDetailsModalProps> = ({
  supplierId,
  isOpen,
  onClose,
  onViewLedger,
  onNewPurchase,
}) => {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && supplierId) {
      loadData();
    }
  }, [isOpen, supplierId]);

  const loadData = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const [suppRes, purRes] = await Promise.all([
        window.rsInventory.getSupplier(supplierId),
        window.rsInventory.listPurchases({ supplierId, pageSize: 5 }),
      ]);
      if (suppRes.success && suppRes.data) {
        setSupplier(suppRes.data);
      }
      if (purRes.success && purRes.data) {
        setPurchases(purRes.data.items);
      }
    } catch (err) {
      console.error('Failed to load supplier details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !supplierId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700/80 flex items-center justify-between bg-surface-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{supplier?.name || 'Supplier Details'}</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-surface-800 text-indigo-300 rounded border border-surface-700">
                  {supplier?.code}
                </span>
                {supplier?.isActive ? (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{supplier?.companyName || 'Supplier Master Profile'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3" />
              <span>Loading supplier details...</span>
            </div>
          ) : (
            <>
              {/* Balance Cards Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Current Balance</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-xl font-bold font-mono ${
                    (supplier?.currentBalance || 0) > 0
                      ? 'text-rose-400'
                      : (supplier?.currentBalance || 0) < 0
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {formatCurrency(Math.abs(supplier?.currentBalance || 0))}
                </span>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  {(supplier?.currentBalance || 0) > 0
                    ? 'Payable'
                    : (supplier?.currentBalance || 0) < 0
                    ? 'Advance'
                    : 'Settled'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Opening Balance</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-slate-200">
                  {formatCurrency(supplier?.openingBalance || 0)}
                </span>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  {supplier?.openingBalanceType || 'PAYABLE'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">Credit Limits</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  {supplier?.creditPeriodDays ? `${supplier.creditPeriodDays} Days` : 'Not Set'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Max {supplier?.creditLimit ? formatCurrency(supplier.creditLimit) : 'No Limit'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact & Address Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800 space-y-3">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Contact & Tax Details</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Contact Person</span>
                  <span className="text-slate-200 font-medium">{supplier?.contactPerson || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Primary Phone</span>
                  <span className="text-slate-200 font-medium">{supplier?.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Alternate Phone</span>
                  <span className="text-slate-200 font-medium">{supplier?.altPhone || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Email</span>
                  <span className="text-slate-200 font-medium">{supplier?.email || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">GSTIN</span>
                  <span className="text-indigo-300 font-mono font-bold">{supplier?.gstin || 'Unregistered'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">PAN</span>
                  <span className="text-slate-200 font-mono">{supplier?.pan || '—'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800 space-y-3">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Address & Bank Details</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Address</span>
                  <span className="text-slate-200 font-medium text-right max-w-[200px] truncate">
                    {[supplier?.addressLine1, supplier?.addressLine2, supplier?.city].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">State / Code</span>
                  <span className="text-slate-200 font-medium">
                    {supplier?.state ? `${supplier.state} (${supplier.stateCode || '—'})` : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Bank Name</span>
                  <span className="text-slate-200 font-medium">{supplier?.bankName || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Account No</span>
                  <span className="text-slate-200 font-mono font-medium">{supplier?.accountNumber || '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">IFSC Code</span>
                  <span className="text-slate-200 font-mono">{supplier?.ifscCode || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span>Recent Invoices</span>
              </h3>
              <button
                onClick={() => onViewLedger(supplierId)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <span>View Full Statement</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            {purchases.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-surface-950/40 rounded-xl border border-surface-800">
                No purchases recorded for this supplier yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-surface-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-surface-950 text-slate-400 border-b border-surface-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Purchase #</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Payment</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/60 bg-surface-900">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-800/40 transition-colors">
                        <td className="py-2.5 px-3">{formatDate(p.purchaseDate)}</td>
                        <td className="py-2.5 px-3 font-mono font-medium text-white">{p.purchaseNumber}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              p.status === 'POSTED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : p.status === 'DRAFT'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              p.paymentStatus === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : p.paymentStatus === 'PARTIALLY_PAID'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {p.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-white">
                          {formatCurrency(p.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                          {formatCurrency(p.balanceDue ?? (p.grandTotal - p.amountPaid - p.amountReturned))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-700/80 flex items-center justify-between bg-surface-950/50">
          <button
            onClick={() => onViewLedger(supplierId)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 rounded-xl transition-all border border-indigo-500/20"
          >
            <FileText className="h-4 w-4" />
            <span>Open Supplier Ledger</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onNewPurchase(supplierId);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Receipt className="h-4 w-4" />
              <span>Create Purchase</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
