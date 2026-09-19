import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Layers,
  Save,
} from 'lucide-react';
import {
  Purchase,
  PurchaseReturnCreateDTO,
  PurchaseReturn,
  InventoryLocation,
} from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';

interface CreatePurchaseReturnModalProps {
  purchaseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnCreated: (purchaseReturn: PurchaseReturn) => void;
}

interface ReturnLineItem {
  purchaseItemId: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber?: string;
  purchasedQty: number;
  alreadyReturnedQty: number;
  eligibleQty: number;
  returnQty: number;
  purchaseRate: number;
  taxRate: number;
}

export const CreatePurchaseReturnModal: React.FC<CreatePurchaseReturnModalProps> = ({
  purchaseId,
  isOpen,
  onClose,
  onReturnCreated,
}) => {
  const { notify } = useNotificationStore();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [locationId, setLocationId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<ReturnLineItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseId) {
      loadData();
    }
  }, [isOpen, purchaseId]);

  const loadData = async () => {
    if (!purchaseId) return;
    try {
      const [purRes, locRes] = await Promise.all([
        window.rsInventory.getPurchase(purchaseId),
        window.rsInventory.listLocations(false),
      ]);

      if (locRes.success && locRes.data) {
        setLocations(locRes.data);
      }

      if (purRes.success && purRes.data) {
        const p = purRes.data;
        setPurchase(p);
        setLocationId(p.locationId || (locRes.data && locRes.data[0]?.id) || '');

        // Map items and calculate eligible quantities
        const mappedLines: ReturnLineItem[] = (p.items || []).map((item) => {
          const eligible = Math.max(0, item.quantity);
          return {
            purchaseItemId: item.id,
            productId: item.productId,
            productName: item.product?.name || item.productNameSnapshot || 'Product',
            sku: item.product?.sku || item.skuSnapshot || '',
            batchNumber: '',
            purchasedQty: item.quantity,
            alreadyReturnedQty: 0,
            eligibleQty: eligible,
            returnQty: 0,
            purchaseRate: item.purchaseRate,
            taxRate: item.taxRate,
          };
        });

        setLines(mappedLines);
      }
    } catch (err) {
      console.error('Failed to load purchase for return:', err);
    }
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;

    for (const line of lines) {
      if (line.returnQty > 0) {
        const lineTaxable = line.returnQty * line.purchaseRate;
        const lineTax = (lineTaxable * line.taxRate) / 100;
        subtotal += lineTaxable;
        taxTotal += lineTax;
      }
    }

    return {
      subtotal,
      taxTotal,
      grandTotal: Math.round((subtotal + taxTotal) * 100) / 100,
    };
  }, [lines]);

  const totalReturnEstimated = totals.grandTotal;

  const handleQtyChange = (purchaseItemId: string, val: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.purchaseItemId === purchaseItemId) {
          const clamped = Math.max(0, Math.min(line.eligibleQty, val));
          return { ...line, returnQty: clamped };
        }
        return line;
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchase) return;

    if (!reason.trim()) {
      notify('warning', 'Please provide a reason for the purchase return');
      return;
    }

    const returnItems = lines
      .filter((l) => l.returnQty > 0)
      .map((l) => ({
        purchaseItemId: l.purchaseItemId,
        productId: l.productId,
        quantity: l.returnQty,
        reason: reason.trim(),
      }));

    if (returnItems.length === 0) {
      notify('warning', 'Please enter return quantity > 0 for at least one item');
      return;
    }

    setSaving(true);
    try {
      const dto: PurchaseReturnCreateDTO = {
        purchaseId: purchase.id,
        locationId: locationId || undefined,
        returnDate: returnDate,
        reason: reason.trim(),
        items: returnItems,
      };

      const res = await window.rsInventory.createPurchaseReturn(dto);
      if (res.success && res.data) {
        notify(
          'success',
          `Purchase Return #${res.data.returnNumber} processed successfully! Stock decremented and supplier credited.`,
        );
        onReturnCreated(res.data);
        onClose();
      } else {
        notify('error', res.error?.message || 'Failed to create purchase return');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error creating return');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !purchaseId) return null;

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
              <h2 className="text-lg font-bold text-white">Create Purchase Return / Debit Note</h2>
              <p className="text-xs text-slate-400">
                Purchase #{purchase?.purchaseNumber} • Supplier: {purchase?.supplier?.name}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Return Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Returning Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason for Return <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Damaged goods in transit / Defective batch / Excess shipment"
                className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Items Eligible for Return */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Select Items & Quantities to Return</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-surface-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">Invoiced Qty</th>
                    <th className="py-2.5 px-3 text-right">Already Returned</th>
                    <th className="py-2.5 px-3 text-right">Eligible</th>
                    <th className="py-2.5 px-3 text-right w-28">Return Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 bg-surface-900">
                  {lines.map((l) => (
                    <tr key={l.purchaseItemId} className="hover:bg-surface-800/30">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{l.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {l.sku}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {l.purchasedQty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                        {l.alreadyReturnedQty}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {l.eligibleQty}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max={l.eligibleQty}
                          step="0.01"
                          disabled={l.eligibleQty <= 0}
                          value={l.returnQty}
                          onChange={(e) =>
                            handleQtyChange(l.purchaseItemId, Number(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 bg-surface-950 border border-surface-700 rounded text-xs text-right font-mono text-amber-300 focus:outline-none focus:border-amber-500 disabled:opacity-30"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatCurrency(l.purchaseRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Return Total Value */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-medium">
              Estimated Debit Note Value (Incl. Tax)
            </span>
            <span className="text-xl font-bold font-mono text-amber-400">
              {formatCurrency(totalReturnEstimated)}
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-700/80 flex items-center justify-end gap-3 bg-surface-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || totalReturnEstimated <= 0}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl shadow-lg shadow-amber-600/20 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Processing Return...' : 'Confirm Return & Issue Debit Note'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
