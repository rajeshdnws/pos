import React from 'react';
import { Expense } from '@rs-inventory/types';
import { X, Printer, Calendar, Tag, User, CreditCard, FileText } from 'lucide-react';

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  isOpen,
  onClose,
  expense,
}) => {
  if (!isOpen || !expense) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">{expense.expenseNumber}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  expense.status === 'POSTED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : expense.status === 'DRAFT'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {expense.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Payment Voucher & Expense Details</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Voucher Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Main Amount Card */}
          <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Total Amount</div>
              <div className="text-2xl font-bold text-white tracking-tight">₹{expense.amount.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Payment Mode</div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-900 border border-surface-800 text-slate-200 font-semibold mt-1">
                <CreditCard className="h-3.5 w-3.5 text-brand-400" />
                <span>{expense.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-slate-500 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>Category</span>
              </div>
              <div className="text-slate-100 font-medium">
                {expense.categoryNameSnapshot || expense.category?.name || '—'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Expense Date</span>
              </div>
              <div className="text-slate-100 font-medium">
                {new Date(expense.expenseDate).toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-500 flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Payee / Recipient</span>
              </div>
              <div className="text-slate-100 font-medium">{expense.payee || '—'}</div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-500 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>Reference / Voucher</span>
              </div>
              <div className="text-slate-100 font-medium font-mono text-[11px]">
                {expense.referenceNumber || expense.receiptReference || '—'}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1 pt-1">
            <div className="text-slate-500">Description</div>
            <div className="p-3 bg-surface-950/40 rounded-xl border border-surface-800 text-slate-200 font-normal">
              {expense.description}
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="space-y-1">
              <div className="text-slate-500">Internal Audit Notes</div>
              <div className="p-2.5 bg-surface-950/40 rounded-xl border border-surface-800 text-slate-400 italic">
                {expense.notes}
              </div>
            </div>
          )}

          {/* Audit Timestamp Footnote */}
          <div className="text-[11px] text-slate-500 border-t border-surface-800 pt-3 flex justify-between">
            <span>Created: {new Date(expense.createdAt).toLocaleString()}</span>
            {expense.postedAt && (
              <span>Posted: {new Date(expense.postedAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-surface-800 bg-surface-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-surface-800 text-slate-200 hover:bg-surface-700 transition flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Voucher
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-500 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
