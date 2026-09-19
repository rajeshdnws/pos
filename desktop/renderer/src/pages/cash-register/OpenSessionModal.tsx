import React, { useState } from 'react';
import { CashRegisterOpenSessionDTO } from '@rs-inventory/types';
import { X, Loader2, AlertCircle, CircleDollarSign } from 'lucide-react';

interface OpenSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpened: () => void;
  cashRegisterId?: string;
  registerName?: string;
}

export const OpenSessionModal: React.FC<OpenSessionModalProps> = ({
  isOpen,
  onClose,
  onOpened,
  cashRegisterId,
  registerName,
}) => {
  const [openingCash, setOpeningCash] = useState('2000.00');
  const [openingNotes, setOpeningNotes] = useState('Opening drawer float');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedCash = parseFloat(openingCash);
    if (isNaN(parsedCash) || parsedCash < 0) {
      setError('Please enter a valid non-negative opening cash amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dto: CashRegisterOpenSessionDTO = {
        cashRegisterId,
        openingCash: parsedCash,
        openingNotes: openingNotes.trim() || null,
      };

      const res = await window.rsInventory.openCashRegisterSession(dto);
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to open register session.');
      }

      onOpened();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error opening session.');
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
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CircleDollarSign className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Open Cash Register Session</h3>
              <p className="text-[11px] text-slate-400">{registerName || 'Main Counter'}</p>
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
            <label className="block font-medium text-slate-300 mb-1.5">Starting Cash Float (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-brand-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Physical cash counted and placed in the drawer at the start of shift.
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Opening Notes (Optional)</label>
            <textarea
              rows={2}
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="e.g. Initial petty cash, float from previous session"
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
              className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Open Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
