import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Search,
  CheckCircle2,
} from 'lucide-react';
import {
  SalesInvoice,
  SalesReturnCreateDTO,
  SalesReturnItemDTO,
} from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedInvoice?: SalesInvoice | null;
}

interface ReturnRowState {
  originalItemId: string;
  productId: string;
  name: string;
  sku: string;
  originalQty: number;
  unitPrice: number;
  taxRate: number;
  returnQty: number;
  restockCondition: 'RESELLABLE' | 'DAMAGED';
  reason: string;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedInvoice,
}) => {
  const { notify } = useNotificationStore();
  const [loading, setLoading] = useState(false);

  // Invoice Lookup
  const [invoiceNumberSearch, setInvoiceNumberSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [returnRows, setReturnRows] = useState<ReturnRowState[]>([]);
  const [overallReason, setOverallReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (preselectedInvoice) {
        setupInvoice(preselectedInvoice);
      } else {
        setSelectedInvoice(null);
        setReturnRows([]);
        setInvoiceNumberSearch('');
        setOverallReason('');
      }
    }
  }, [isOpen, preselectedInvoice]);

  const setupInvoice = (inv: SalesInvoice) => {
    setSelectedInvoice(inv);
    const rows: ReturnRowState[] = (inv.items || []).map((item) => ({
      originalItemId: item.id,
      productId: item.productId,
      name: item.productNameSnapshot,
      sku: item.skuSnapshot || '',
      originalQty: item.quantity,
      unitPrice: item.sellingRate,
      taxRate: item.taxRate,
      returnQty: 0,
      restockCondition: 'RESELLABLE',
      reason: '',
    }));
    setReturnRows(rows);
  };

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumberSearch.trim()) return;

    setLoading(true);
    try {
      const res = await window.rsInventory.listSales({
        search: invoiceNumberSearch.trim(),
        status: 'POSTED',
      });
      if (res.success && res.data && res.data.items.length > 0) {
        const found = res.data.items[0];
        // Fetch full details
        const detRes = await window.rsInventory.getSale(found.id);
        if (detRes.success && detRes.data) {
          setupInvoice(detRes.data);
        } else {
          setupInvoice(found);
        }
      } else {
        notify('error', `No posted invoice found matching "${invoiceNumberSearch}"`);
      }
    } catch (err: any) {
      notify('error', err.message || 'Error finding invoice');
    } finally {
      setLoading(false);
    }
  };

  const updateRowQty = (idx: number, qty: number) => {
    const updated = [...returnRows];
    const maxQty = updated[idx].originalQty;
    updated[idx].returnQty = Math.max(0, Math.min(maxQty, qty));
    setReturnRows(updated);
  };

  const updateRowCondition = (idx: number, cond: 'RESELLABLE' | 'DAMAGED') => {
    const updated = [...returnRows];
    updated[idx].restockCondition = cond;
    setReturnRows(updated);
  };

  // Calculate return grand total
  const calculateReturnTotal = () => {
    let subtotal = 0;
    let tax = 0;

    returnRows.forEach((row) => {
      if (row.returnQty > 0) {
        const lineTaxable = row.returnQty * row.unitPrice;
        const lineTax = (lineTaxable * row.taxRate) / 100;
        subtotal += lineTaxable;
        tax += lineTax;
      }
    });

    return {
      subtotal,
      tax,
      grandTotal: Math.round(subtotal + tax),
    };
  };

  const returnTotals = calculateReturnTotal();
  const hasItemsToReturn = returnRows.some((r) => r.returnQty > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoice) {
      notify('error', 'Please select a valid sales invoice');
      return;
    }

    if (!hasItemsToReturn) {
      notify('error', 'Please specify return quantity for at least one item');
      return;
    }

    setLoading(true);
    try {
      const itemsToReturn: SalesReturnItemDTO[] = returnRows
        .filter((r) => r.returnQty > 0)
        .map((r) => ({
          originalSalesInvoiceItemId: r.originalItemId,
          productId: r.productId,
          quantity: r.returnQty,
          restockCondition: r.restockCondition,
          reason: r.reason.trim() || undefined,
        }));

      const dto: SalesReturnCreateDTO = {
        originalSalesInvoiceId: selectedInvoice.id,
        returnDate: new Date().toISOString(),
        reason: overallReason.trim() || undefined,
        items: itemsToReturn,
      };

      const res = await window.rsInventory.createSalesReturn(dto);
      if (res.success) {
        notify('success', `Sales Return #${res.data?.returnNumber} processed successfully!`);
        onSuccess();
        onClose();
      } else {
        notify('error', res.error?.message || 'Failed to process return');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error processing sales return');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 bg-surface-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Create Sales Return</h2>
              <p className="text-xs text-slate-400">
                Process customer returns, adjust stock & create credit notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Invoice Search Bar if not preselected */}
        {!preselectedInvoice && !selectedInvoice && (
          <form onSubmit={handleSearchInvoice} className="p-6 border-b border-surface-800 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={invoiceNumberSearch}
                onChange={(e) => setInvoiceNumberSearch(e.target.value)}
                placeholder="Enter Sales Invoice Number (e.g. INV-0001)..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors"
            >
              Find Invoice
            </button>
          </form>
        )}

        {selectedInvoice && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Invoice Info Banner */}
            <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-white font-mono text-sm">
                  Invoice #{selectedInvoice.invoiceNumber}
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Customer: {selectedInvoice.customerNameSnapshot || 'Walk-in'} • Net Total:{' '}
                  {formatCurrency(selectedInvoice.grandTotal)}
                </div>
              </div>
              {!preselectedInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setReturnRows([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Change Invoice
                </button>
              )}
            </div>

            {/* Overall Reason */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Return Reason / Remarks
              </label>
              <input
                type="text"
                value={overallReason}
                onChange={(e) => setOverallReason(e.target.value)}
                placeholder="e.g. Customer changed mind, defective item, incorrect size..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Return Items Selection Table */}
            <div className="border border-surface-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-950/70 border-b border-surface-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-center">Billed Qty</th>
                    <th className="py-2.5 px-3 text-center">Return Qty</th>
                    <th className="py-2.5 px-3 text-center">Condition</th>
                    <th className="py-2.5 px-3 text-right">Refund (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60">
                  {returnRows.map((row, idx) => {
                    const lineRefund = row.returnQty * row.unitPrice * (1 + row.taxRate / 100);
                    return (
                      <tr key={row.originalItemId} className="hover:bg-surface-800/20 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{row.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Price: ₹{row.unitPrice} • GST: {row.taxRate}%
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {row.originalQty}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={row.originalQty}
                            value={row.returnQty || ''}
                            placeholder="0"
                            onChange={(e) => updateRowQty(idx, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center font-mono font-bold rounded-lg bg-surface-950 border border-surface-700 text-amber-400 focus:outline-none focus:border-brand-500 text-xs"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <select
                            value={row.restockCondition}
                            onChange={(e) =>
                              updateRowCondition(idx, e.target.value as 'RESELLABLE' | 'DAMAGED')
                            }
                            className="px-2 py-1 rounded-lg bg-surface-950 border border-surface-700 text-[11px] text-slate-300 focus:outline-none"
                          >
                            <option value="RESELLABLE">Resellable (Add to Stock)</option>
                            <option value="DAMAGED">Damaged / Scrap</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          {row.returnQty > 0 ? formatCurrency(lineRefund) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Total Refund / Credit Value:</span>
                <span className="text-xl font-bold font-mono text-amber-400 block">
                  {formatCurrency(returnTotals.grandTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !hasItemsToReturn}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 shadow-lg shadow-amber-600/20 disabled:opacity-40 transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{loading ? 'Processing...' : 'Confirm Sales Return'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
