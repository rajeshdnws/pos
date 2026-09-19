import React, { useState } from 'react';
import { CashInOutDTO } from '@rs-inventory/types';
import { X, Loader2, AlertCircle, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface CashInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: 'IN' | 'OUT';
}

export const CashInOutModal: React.FC<CashInOutModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  mode,
}) => {
  const isCashIn = mode === 'IN';

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for this cash movement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dto: CashInOutDTO = {
        amount: parsed,
        reason: reason.trim(),
        notes: notes.trim() || null,
      };

      if (isCashIn) {
        const res = await window.rsInventory.recordCashIn(dto);
        if (!res.success) throw new Error(res.error?.message || 'Failed to record cash in.');
      } else {
        const res = await window.rsInventory.recordCashOut(dto);
        if (!res.success) throw new Error(res.error?.message || 'Failed to record cash out.');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error recording movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                isCashIn
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {isCashIn ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {isCashIn ? 'Record Cash In (Drawer Float)' : 'Record Cash Out (Withdrawal)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isCashIn ? 'Add cash float or change into drawer' : 'Remove cash from drawer for safe drop or operational use'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Reason *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isCashIn
                  ? 'e.g. Float addition for small change, bank cash withdrawal'
                  : 'e.g. Mid-day safe drop, bank deposit, emergency operational cash'
              }
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Additional Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal reference or authorization details..."
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-surface-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl font-semibold text-white transition flex items-center gap-2 ${
                isCashIn ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isCashIn ? 'Confirm Cash In' : 'Confirm Cash Out'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
