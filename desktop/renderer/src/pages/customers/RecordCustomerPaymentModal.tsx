import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Save,
} from 'lucide-react';
import { Customer, SalesPaymentCreateDTO } from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';

interface RecordCustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: Customer | null;
  defaultInvoiceId?: string;
  defaultAmount?: number;
}

export const RecordCustomerPaymentModal: React.FC<RecordCustomerPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customer,
  defaultInvoiceId,
  defaultAmount,
}) => {
  const { notify } = useNotificationStore();
  const [loading, setLoading] = useState(false);

  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      if (defaultAmount !== undefined && defaultAmount > 0) {
        setAmount(defaultAmount);
      } else if (customer && customer.currentBalance > 0) {
        setAmount(customer.currentBalance);
      } else {
        setAmount(0);
      }
      setPaymentMode('CASH');
      setReferenceNo('');
      setNotes('');
    }
  }, [isOpen, customer, defaultAmount]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      notify('error', 'Please enter a valid payment amount');
      return;
    }

    setLoading(true);
    try {
      const dto: SalesPaymentCreateDTO = {
        customerId: customer.id,
        salesInvoiceId: defaultInvoiceId || undefined,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        amount: Number(amount),
        paymentMode,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await window.rsInventory.createSalesPayment(dto);
      if (res.success) {
        notify('success', `Payment of ${formatCurrency(amount)} recorded successfully`);
        onSuccess();
        onClose();
      } else {
        notify('error', res.error?.message || 'Failed to record payment');
      }
    } catch (err: any) {
      notify('error', err.message || 'An error occurred while saving payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 bg-surface-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Record Customer Payment</h2>
              <p className="text-xs text-slate-400">
                Receipt entry for {customer.name} ({customer.customerCode})
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

        {/* Customer Balance Banner */}
        <div className="px-6 py-3 bg-surface-950/40 border-b border-surface-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Current Outstanding Balance:</span>
          <span
            className={`font-mono font-bold ${
              customer.currentBalance > 0
                ? 'text-rose-400'
                : customer.currentBalance < 0
                ? 'text-emerald-400'
                : 'text-slate-300'
            }`}
          >
            {formatCurrency(customer.currentBalance || 0)}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Payment Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Payment Mode <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Amount Received (₹) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">₹</span>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold rounded-xl bg-surface-950 border border-surface-700 text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Transaction / Reference / UTR #
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. UPI Ref, Cheque No, Bank txn ID"
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional receipt notes..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-surface-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
