import React, { useEffect, useState } from 'react';
import {
  X,
  ShoppingCart,
  Layers,
  CreditCard,
  RotateCcw,
  Printer,
  CheckCircle2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Purchase } from '@rs-inventory/types';
import { formatCurrency, formatDate, formatDateTime } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { RecordPaymentModal } from './RecordPaymentModal';
import { CreatePurchaseReturnModal } from './CreatePurchaseReturnModal';
import { PrintPurchaseInvoiceModal } from './PrintPurchaseInvoiceModal';

interface PurchaseDetailsModalProps {
  purchaseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEditDraft: (purchaseId: string) => void;
  onUpdated: () => void;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  purchaseId,
  isOpen,
  onClose,
  onEditDraft,
  onUpdated,
}) => {
  const { notify } = useNotificationStore();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [posting, setPosting] = useState(false);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseId) {
      loadData();
    }
  }, [isOpen, purchaseId]);

  const loadData = async () => {
    if (!purchaseId) return;
    try {
      const res = await window.rsInventory.getPurchase(purchaseId);
      if (res.success && res.data) {
        setPurchase(res.data);
      }
    } catch (err) {
      console.error('Failed to load purchase details:', err);
    }
  };

  const handlePostPurchase = async () => {
    if (!purchase) return;
    if (
      !window.confirm(
        `Are you sure you want to Post Purchase #${purchase.purchaseNumber} to Stock?\nThis will create inward stock movements and add ${formatCurrency(purchase.grandTotal)} to the supplier's balance.`,
      )
    ) {
      return;
    }

    setPosting(true);
    try {
      const res = await window.rsInventory.postPurchase(purchase.id);
      if (res.success && res.data) {
        notify('success', `Purchase #${res.data.purchaseNumber} posted successfully!`);
        loadData();
        onUpdated();
      } else {
        notify('error', res.error?.message || 'Failed to post purchase');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error posting purchase');
    } finally {
      setPosting(false);
    }
  };

  const handleCancelPurchase = async () => {
    if (!purchase) return;
    const reason = window.prompt('Enter reason for cancelling this purchase draft/order:');
    if (reason === null) return;

    try {
      const res = await window.rsInventory.cancelPurchase(purchase.id, reason);
      if (res.success) {
        notify('success', 'Purchase cancelled');
        loadData();
        onUpdated();
      } else {
        notify('error', res.error?.message || 'Failed to cancel purchase');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error cancelling purchase');
    }
  };

  if (!isOpen || !purchaseId || !purchase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700/80 flex items-center justify-between bg-surface-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Purchase #{purchase.purchaseNumber}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    purchase.status === 'POSTED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : purchase.status === 'DRAFT'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {purchase.status}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    purchase.paymentStatus === 'PAID'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : purchase.paymentStatus === 'PARTIALLY_PAID'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {purchase.paymentStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Supplier: {purchase.supplier?.name} ({purchase.supplier?.supplierCode || purchase.supplier?.code})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-surface-800 hover:bg-surface-700 rounded-xl border border-surface-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-surface-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Key Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
              <span className="text-xs text-slate-400 font-medium">Grand Total</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {formatCurrency(purchase.grandTotal)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
              <span className="text-xs text-slate-400 font-medium">Amount Paid</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(purchase.amountPaid)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
              <span className="text-xs text-slate-400 font-medium">Balance Due</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                {formatCurrency(purchase.balanceDue ?? (purchase.grandTotal - purchase.amountPaid - purchase.amountReturned))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
              <span className="text-xs text-slate-400 font-medium">Returns Amount</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {formatCurrency(purchase.amountReturned)}
              </div>
            </div>
          </div>

          {/* Supplier & Dates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-950/60 border border-surface-800 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="text-slate-200 font-medium">{purchase.supplier?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GSTIN:</span>
                <span className="text-indigo-300 font-mono font-bold">
                  {purchase.supplier?.gstin || 'Unregistered'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="text-slate-200">{purchase.location?.name || 'Default Warehouse'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tax Type:</span>
                <span className="text-slate-200 font-medium">
                  {purchase.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Purchase Date:</span>
                <span className="text-slate-200 font-medium">{formatDate(purchase.purchaseDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier Inv No:</span>
                <span className="text-slate-200 font-mono font-semibold">
                  {purchase.supplierInvoiceNumber || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Due Date:</span>
                <span className="text-slate-200">
                  {purchase.dueDate ? formatDate(purchase.dueDate) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Posted At:</span>
                <span className="text-slate-200">
                  {purchase.postedAt ? formatDateTime(purchase.postedAt) : 'Draft (Not Posted)'}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Purchased Items ({purchase.items?.length || 0})</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-surface-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Free</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Disc</th>
                    <th className="py-2.5 px-3 text-right">GST %</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 bg-surface-900">
                  {purchase.items?.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-surface-800/30">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{item.product?.name || item.productNameSnapshot}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.product?.sku || item.skuSnapshot}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-white">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {item.freeQuantity || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatCurrency(item.purchaseRate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                        {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">{item.taxRate}%</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax & Breakdown Summary */}
          <div className="flex justify-end">
            <div className="w-80 p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-1.5 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Taxable Subtotal:</span>
                <span className="text-slate-200 font-mono font-medium">
                  {formatCurrency(purchase.taxableAmount)}
                </span>
              </div>
              {!purchase.isInterState ? (
                <>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">CGST Amount:</span>
                    <span className="text-indigo-300 font-mono">{formatCurrency(purchase.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">SGST Amount:</span>
                    <span className="text-indigo-300 font-mono">{formatCurrency(purchase.sgstAmount)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">IGST Amount:</span>
                  <span className="text-indigo-300 font-mono">{formatCurrency(purchase.igstAmount)}</span>
                </div>
              )}
              {((purchase.otherCharges ?? purchase.additionalCharges ?? 0) > 0) && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Other Charges:</span>
                  <span className="text-slate-200 font-mono">+{formatCurrency(purchase.otherCharges ?? purchase.additionalCharges ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Round Off:</span>
                <span className="text-slate-300 font-mono">
                  {purchase.roundOff >= 0 ? '+' : ''}
                  {purchase.roundOff.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-surface-800 font-bold text-sm text-white">
                <span>Grand Total:</span>
                <span className="text-indigo-400 font-mono">{formatCurrency(purchase.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-surface-700/80 flex items-center justify-between bg-surface-950/50">
          <div className="flex items-center gap-2">
            {purchase.status === 'DRAFT' && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onEditDraft(purchase.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-xl transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit Draft</span>
                </button>
                <button
                  onClick={handleCancelPurchase}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Cancel / Delete</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {purchase.status === 'DRAFT' && (
              <button
                onClick={handlePostPurchase}
                disabled={posting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{posting ? 'Posting to Stock...' : 'Post to Stock'}</span>
              </button>
            )}

            {purchase.status === 'POSTED' && (
              <>
                <button
                  onClick={() => setIsReturnModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/20 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Create Return</span>
                </button>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Record Payment</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Child Modals */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        purchaseId={purchase.id}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentRecorded={() => {
          loadData();
          onUpdated();
        }}
      />

      <CreatePurchaseReturnModal
        isOpen={isReturnModalOpen}
        purchaseId={purchase.id}
        onClose={() => setIsReturnModalOpen(false)}
        onReturnCreated={() => {
          loadData();
          onUpdated();
        }}
      />

      <PrintPurchaseInvoiceModal
        isOpen={isPrintModalOpen}
        purchaseId={purchase.id}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
