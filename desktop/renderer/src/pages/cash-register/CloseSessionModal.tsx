import React, { useState, useEffect } from 'react';
import { CashRegisterCloseSessionDTO, DayEndClosingPreview, DayEndClosing } from '@rs-inventory/types';
import { X, Loader2, AlertCircle, CheckCircle2, Calculator, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CloseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClosed: (closing: DayEndClosing) => void;
  preview: DayEndClosingPreview | null;
}

export const CloseSessionModal: React.FC<CloseSessionModalProps> = ({
  isOpen,
  onClose,
  onClosed,
  preview,
}) => {
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preview) {
      setCountedCash(String(preview.expectedCash.toFixed(2)));
      setClosingNotes('');
      setError(null);
    }
  }, [preview, isOpen]);

  if (!isOpen || !preview) return null;

  const expected = preview.expectedCash;
  const counted = parseFloat(countedCash) || 0;
  const difference = Math.round((counted - expected) * 100) / 100;
  const hasDiscrepancy = Math.abs(difference) > 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedCounted = parseFloat(countedCash);
    if (isNaN(parsedCounted) || parsedCounted < 0) {
      setError('Counted cash must be a valid non-negative number.');
      return;
    }

    if (hasDiscrepancy && !closingNotes.trim()) {
      setError('A cash discrepancy exists. A closing explanation note is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dto: CashRegisterCloseSessionDTO = {
        countedCash: parsedCounted,
        closingNotes: closingNotes.trim() || null,
      };

      const res = await window.rsInventory.closeDayEndSession(dto);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Failed to complete day-end closing.');
      }

      onClosed(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error closing session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Day-End Closing & Reconciliation</h3>
              <p className="text-[11px] text-slate-400">
                Session: {preview.session.sessionNumber} ({preview.cashRegister.name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cash Breakdown Grid */}
          <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Physical Cash Movements Summary
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Opening Cash Float:</span>
              <span className="font-semibold text-slate-100">₹{preview.openingCash.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-emerald-400">
              <span>(+) Cash Sales Tender:</span>
              <span className="font-semibold">+₹{preview.cashSales.toFixed(2)}</span>
            </div>

            {preview.customerCashReceipts > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>(+) Customer Cash Receipts:</span>
                <span className="font-semibold">+₹{preview.customerCashReceipts.toFixed(2)}</span>
              </div>
            )}

            {preview.cashIn > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>(+) Cash In (Drawer Float Additions):</span>
                <span className="font-semibold">+₹{preview.cashIn.toFixed(2)}</span>
              </div>
            )}

            {preview.supplierCashPayments > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>(−) Supplier Cash Payments:</span>
                <span className="font-semibold">−₹{preview.supplierCashPayments.toFixed(2)}</span>
              </div>
            )}

            {preview.cashExpenses > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>(−) Cash Expenses:</span>
                <span className="font-semibold">−₹{preview.cashExpenses.toFixed(2)}</span>
              </div>
            )}

            {preview.cashRefunds > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>(−) Cash Return Refunds:</span>
                <span className="font-semibold">−₹{preview.cashRefunds.toFixed(2)}</span>
              </div>
            )}

            {preview.cashOut > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>(−) Cash Out (Withdrawals/Drops):</span>
                <span className="font-semibold">−₹{preview.cashOut.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t border-surface-800 pt-2 flex justify-between items-center">
              <span className="font-bold text-slate-200">Expected Physical Cash:</span>
              <span className="text-base font-bold text-brand-400">₹{expected.toFixed(2)}</span>
            </div>
          </div>

          {/* Counted Cash Entry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Counted Cash in Drawer (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-brand-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Count all currency notes and coins physically present in the drawer.
              </p>
            </div>

            {/* Reconciliation Difference Badge Card */}
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Cash Variance / Difference</label>
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  !hasDiscrepancy
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : difference > 0
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider">
                    {!hasDiscrepancy ? 'Perfect Match' : difference > 0 ? 'Cash Surplus' : 'Cash Shortage'}
                  </div>
                  <div className="text-sm font-bold mt-0.5">
                    {difference > 0 ? `+₹${difference.toFixed(2)}` : `₹${difference.toFixed(2)}`}
                  </div>
                </div>
                {!hasDiscrepancy ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
            </div>
          </div>

          {/* Notes & Justification */}
          <div>
            <label className="block font-medium text-slate-300 mb-1.5">
              Closing Notes {hasDiscrepancy && <span className="text-rose-400">* (Required for discrepancy)</span>}
            </label>
            <textarea
              rows={2}
              required={hasDiscrepancy}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder={
                hasDiscrepancy
                  ? 'Explain the cash difference (e.g. ₹5 coin miscount, customer forgot change, etc.)'
                  : 'Optional closing remarks...'
              }
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Non-Cash Information Banner */}
          <div className="p-3 bg-surface-950/50 rounded-xl border border-surface-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Non-Cash Collections (Separated)</div>
            <div>
              UPI / Card / Bank: <span className="text-slate-200 font-medium">₹{preview.nonCashSales.toFixed(2)}</span>
              {' | '}
              Non-Cash Expenses: <span className="text-slate-200 font-medium">₹{preview.nonCashExpenses.toFixed(2)}</span>
            </div>
          </div>
        </form>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-surface-800 bg-surface-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-surface-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl font-semibold bg-amber-600 text-white hover:bg-amber-500 transition flex items-center gap-2 shadow-lg shadow-amber-600/20"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Reconcile & Close Register</span>
          </button>
        </div>
      </div>
    </div>
  );
};
