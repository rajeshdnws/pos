import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, ExpenseCreateDTO, ExpenseUpdateDTO, ExpensePaymentMethod } from '@rs-inventory/types';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  expenseToEdit?: Expense | null;
  categories: ExpenseCategory[];
  onOpenCategoryModal?: () => void;
}

const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash (Register Cash)' },
  { value: 'UPI', label: 'UPI / QR Code' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
  { value: 'CARD', label: 'Card (Debit / Credit)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  expenseToEdit,
  categories,
  onOpenCategoryModal,
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('CASH');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptReference, setReceiptReference] = useState('');
  const [notes, setNotes] = useState('');
  const [postImmediately, setPostImmediately] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expenseToEdit) {
      setCategoryId(expenseToEdit.categoryId);
      setAmount(String(expenseToEdit.amount));
      setPaymentMethod((expenseToEdit.paymentMethod as ExpensePaymentMethod) || 'CASH');
      setExpenseDate(
        expenseToEdit.expenseDate
          ? new Date(expenseToEdit.expenseDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      );
      setDescription(expenseToEdit.description);
      setPayee(expenseToEdit.payee || '');
      setReferenceNumber(expenseToEdit.referenceNumber || '');
      setReceiptReference(expenseToEdit.receiptReference || '');
      setNotes(expenseToEdit.notes || '');
      setPostImmediately(false);
    } else {
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setAmount('');
      setPaymentMethod('CASH');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setPayee('');
      setReferenceNumber('');
      setReceiptReference('');
      setNotes('');
      setPostImmediately(true);
    }
    setError(null);
  }, [expenseToEdit, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent, shouldPostDirectly: boolean = false) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid expense amount greater than zero.');
      return;
    }
    if (!categoryId) {
      setError('Please select an expense category.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description for this expense.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (expenseToEdit) {
        const updateDto: ExpenseUpdateDTO = {
          categoryId,
          amount: parsedAmount,
          paymentMethod,
          expenseDate,
          description: description.trim(),
          payee: payee.trim() || null,
          referenceNumber: referenceNumber.trim() || null,
          receiptReference: receiptReference.trim() || null,
          notes: notes.trim() || null,
        };
        const res = await window.rsInventory.updateExpenseDraft(expenseToEdit.id, updateDto);
        if (!res.success) {
          throw new Error(res.error?.message || 'Failed to update expense draft.');
        }
        if (shouldPostDirectly) {
          const postRes = await window.rsInventory.postExpense(expenseToEdit.id);
          if (!postRes.success) {
            throw new Error(postRes.error?.message || 'Failed to post expense.');
          }
        }
      } else {
        const createDto: ExpenseCreateDTO = {
          categoryId,
          amount: parsedAmount,
          paymentMethod,
          expenseDate,
          description: description.trim(),
          payee: payee.trim() || null,
          referenceNumber: referenceNumber.trim() || null,
          receiptReference: receiptReference.trim() || null,
          notes: notes.trim() || null,
          postImmediately: shouldPostDirectly || postImmediately,
        };
        const res = await window.rsInventory.createExpenseDraft(createDto);
        if (!res.success) {
          throw new Error(res.error?.message || 'Failed to create expense.');
        }
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {expenseToEdit ? `Edit Draft Expense: ${expenseToEdit.expenseNumber}` : 'Record Business Expense'}
            </h3>
            <p className="text-xs text-slate-400">
              {expenseToEdit ? 'Modify draft expense voucher' : 'Enter daily business expenditure and payment mode'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Category *</label>
                {onOpenCategoryModal && (
                  <button
                    type="button"
                    onClick={onOpenCategoryModal}
                    className="text-[11px] text-brand-400 hover:underline"
                  >
                    + Manage
                  </button>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="" disabled>Select category</option>
                {categories
                  .filter((c) => c.isActive || c.id === categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {!c.isActive ? '(Inactive)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
              {paymentMethod === 'CASH' && (
                <p className="text-[11px] text-amber-400/90 mt-1">
                  * Physical cash will be deducted from the active cash register session.
                </p>
              )}
            </div>

            {/* Expense Date */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Expense Date *</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Office electricity bill for September, Staff lunch, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Payee & References */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Payee / Recipient</label>
              <input
                type="text"
                placeholder="e.g. Torrent Power Ltd."
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Reference No. (Txn / Cheque)</label>
              <input
                type="text"
                placeholder="e.g. UPI-987263, CHQ-001"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Receipt / Voucher No.</label>
              <input
                type="text"
                placeholder="e.g. BILL-4412"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Internal Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Additional internal audit notes or justification..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          {!expenseToEdit && (
            <div className="p-3 bg-surface-950/60 rounded-xl border border-surface-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Post Immediately upon saving</div>
                <div className="text-[11px] text-slate-400">
                  Directly post to cash register & cashbook without keeping as DRAFT
                </div>
              </div>
              <input
                type="checkbox"
                checked={postImmediately}
                onChange={(e) => setPostImmediately(e.target.checked)}
                className="h-4 w-4 rounded bg-surface-900 border-surface-700 text-brand-600 focus:ring-brand-500"
              />
            </div>
          )}
        </form>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-surface-800 bg-surface-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-surface-800 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {expenseToEdit ? (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSubmit(e, false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-surface-800 text-slate-200 hover:bg-surface-700 transition"
                >
                  Save Draft Changes
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-brand-600 text-white hover:bg-brand-500 transition flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save & Post Expense
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, postImmediately)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-500 transition shadow-lg shadow-brand-600/20 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {postImmediately ? 'Record & Post Expense' : 'Save as Draft'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
