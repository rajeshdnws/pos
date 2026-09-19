import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  IndianRupee,
  Save,
  RotateCcw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Purchase, PurchasePayment, PaymentMethod } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';

interface RecordPaymentModalProps {
  purchaseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: (updatedPurchase: Purchase) => void;
}

const PAYMENT_MODES: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT / RTGS / IMPS)' },
  { value: 'UPI', label: 'UPI / QR Code' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'OTHER', label: 'Other' },
];

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  purchaseId,
  isOpen,
  onClose,
  onPaymentRecorded,
}) => {
  const { notify } = useNotificationStore();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [payments, setPayments] = useState<PurchasePayment[]>([]);

  // Form
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reversal State
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseId) {
      loadData();
    }
  }, [isOpen, purchaseId]);

  const loadData = async () => {
    if (!purchaseId) return;
    try {
      const [purRes, payRes] = await Promise.all([
        window.rsInventory.getPurchase(purchaseId),
        window.rsInventory.listPurchasePayments(purchaseId),
      ]);

      if (purRes.success && purRes.data) {
        setPurchase(purRes.data);
        const due = purRes.data.balanceDue ?? (purRes.data.grandTotal - purRes.data.amountPaid - purRes.data.amountReturned);
        setAmount(due);
      }
      if (payRes.success && payRes.data) {
        setPayments(Array.isArray(payRes.data) ? payRes.data : payRes.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load purchase payments:', err);
    }
  };

  const currentDue = purchase ? (purchase.balanceDue ?? (purchase.grandTotal - purchase.amountPaid - purchase.amountReturned)) : 0;

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchase) return;

    if (amount <= 0) {
      notify('warning', 'Payment amount must be greater than 0');
      return;
    }
    if (amount > currentDue) {
      notify(
        'warning',
        `Payment amount cannot exceed remaining balance of ${formatCurrency(currentDue)}`,
      );
      return;
    }

    setSaving(true);
    try {
      const dto = {
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        paymentDate,
        amount: Number(amount),
        paymentMode,
        referenceNo: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await window.rsInventory.recordPurchasePayment(dto);
      if (res.success && res.data) {
        notify('success', `Payment of ${formatCurrency(amount)} recorded successfully!`);
        // Refresh
        const updated = await window.rsInventory.getPurchase(purchase.id);
        if (updated.success && updated.data) {
          onPaymentRecorded(updated.data);
        }
        onClose();
      } else {
        notify('error', res.error?.message || 'Failed to record payment');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error recording payment');
    } finally {
      setSaving(false);
    }
  };

  const handleReversePayment = async (paymentId: string) => {
    if (!reversalReason.trim()) {
      notify('warning', 'Please provide a valid reason for reversing this payment');
      return;
    }

    setReversing(true);
    try {
      const res = await window.rsInventory.reversePurchasePayment(
        paymentId,
        reversalReason.trim(),
      );
      if (res.success && res.data) {
        notify('success', 'Payment reversed successfully');
        setReversingPaymentId(null);
        setReversalReason('');
        loadData();
        const updated = await window.rsInventory.getPurchase(purchaseId!);
        if (updated.success && updated.data) {
          onPaymentRecorded(updated.data);
        }
      } else {
        notify('error', res.error?.message || 'Failed to reverse payment');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error reversing payment');
    } finally {
      setReversing(false);
    }
  };

  if (!isOpen || !purchaseId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700/80 flex items-center justify-between bg-surface-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Outgoing Payment</h2>
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Balance Card */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-950 border border-surface-800 text-center">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Invoice Total</span>
              <div className="text-base font-bold font-mono text-white mt-1">
                {formatCurrency(purchase?.grandTotal || 0)}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Paid So Far</span>
              <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(purchase?.amountPaid || 0)}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Balance Due</span>
              <div className="text-base font-bold font-mono text-rose-400 mt-1">
                {formatCurrency(currentDue)}
              </div>
            </div>
          </div>

          {/* Payment Form (Only if balance > 0) */}
          {currentDue > 0 ? (
            <form onSubmit={handleRecord} className="space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                <span>New Payment Voucher</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Payment Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={currentDue}
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Transaction / Cheque / UTR Ref
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. UTR-987654321 / CHQ-1002"
                    className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional remarks"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving || amount <= 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving Payment...' : 'Record Payment Voucher'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-300 font-medium">
              ✓ This purchase invoice is fully paid. No pending balance remains.
            </div>
          )}

          {/* Payment History */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>Voucher Payment History ({payments.length})</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-surface-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 bg-surface-900">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-800/30">
                      <td className="py-2.5 px-3">{formatDate(p.paymentDate)}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-300 font-medium">{p.paymentNumber}</td>
                      <td className="py-2.5 px-3">{p.paymentMode}</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.referenceNo || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.status === 'REVERSED' || p.reversedAt ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Reversed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {p.status !== 'REVERSED' && !p.reversedAt && (
                          <button
                            onClick={() => setReversingPaymentId(p.id)}
                            title="Reverse Payment Voucher"
                            className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 justify-end"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
          </div>
        </div>

        {/* Payment Reversal Modal overlay */}
        {reversingPaymentId && (
          <div className="absolute inset-0 z-20 bg-surface-950/90 backdrop-blur-sm p-6 flex flex-col justify-center items-center">
            <div className="w-full max-w-md bg-surface-900 border border-rose-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertCircle className="h-6 w-6" />
                <h4 className="text-sm font-bold text-white">Reverse Payment Voucher</h4>
              </div>
              <p className="text-xs text-slate-300">
                Reversing this payment will restore the supplier's outstanding payable balance and mark the voucher as REVERSED.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Reversal <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Cheque bounced / Incorrect voucher entry"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setReversingPaymentId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReversePayment(reversingPaymentId)}
                  disabled={reversing}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/20"
                >
                  {reversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
