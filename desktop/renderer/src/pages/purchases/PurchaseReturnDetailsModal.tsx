import React, { useEffect, useState } from 'react';
import {
  X,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { PurchaseReturn } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';

interface PurchaseReturnDetailsModalProps {
  returnId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseReturnDetailsModal: React.FC<PurchaseReturnDetailsModalProps> = ({
  returnId,
  isOpen,
  onClose,
}) => {
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(null);

  useEffect(() => {
    if (isOpen && returnId) {
      loadData();
    }
  }, [isOpen, returnId]);

  const loadData = async () => {
    if (!returnId) return;
    try {
      const res = await window.rsInventory.getPurchaseReturn(returnId);
      if (res.success && res.data) {
        setPurchaseReturn(res.data);
      }
    } catch (err) {
      console.error('Failed to load purchase return details:', err);
    }
  };

  if (!isOpen || !returnId || !purchaseReturn) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700/80 flex items-center justify-between bg-surface-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Purchase Return #{purchaseReturn.returnNumber}</h2>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  {purchaseReturn.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Original Purchase #{purchaseReturn.purchase?.purchaseNumber || '—'} • Supplier:{' '}
                {purchaseReturn.supplier?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
              <span className="text-xs text-slate-400 font-medium">Return Date</span>
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {formatDate(purchaseReturn.returnDate)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
              <span className="text-xs text-slate-400 font-medium">Return Number</span>
              <div className="text-sm font-mono font-semibold text-slate-200 mt-1">
                {purchaseReturn.returnNumber || '—'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800">
              <span className="text-xs text-slate-400 font-medium">Credited Grand Total</span>
              <div className="text-base font-bold font-mono text-amber-400 mt-1">
                {formatCurrency(purchaseReturn.grandTotal)}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800 text-xs">
            <span className="text-slate-400 font-medium">Return Reason: </span>
            <span className="text-slate-200">{purchaseReturn.reason || 'Not specified'}</span>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Returned Items ({purchaseReturn.items?.length || 0})</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-surface-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">Returned Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 bg-surface-900">
                  {purchaseReturn.items?.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-surface-800/30">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{item.product?.name || item.productNameSnapshot}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.product?.sku}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatCurrency(item.returnRate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {formatCurrency(item.taxAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-700/80 flex items-center justify-end bg-surface-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
