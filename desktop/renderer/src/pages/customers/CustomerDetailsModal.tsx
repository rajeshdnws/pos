import React from 'react';
import {
  X,
  Phone,
  MapPin,
  Building,
  FileText,
  ShoppingCart,
  Calendar,
} from 'lucide-react';
import { Customer } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onViewLedger?: (customerId: string) => void;
  onNewSale?: (customerId: string) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customer,
  isOpen,
  onClose,
  onViewLedger,
  onNewSale,
}) => {
  if (!isOpen || !customer) return null;

  const currentBal = customer.currentBalance || 0;
  const creditLim = customer.creditLimit || 0;
  const availableCredit = creditLim > 0 ? Math.max(0, creditLim - currentBal) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-800 bg-surface-950/60 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-lg">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{customer.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    customer.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-800 text-slate-300 border border-surface-700">
                  {customer.customerType || 'INDIVIDUAL'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="font-mono text-brand-400">{customer.customerCode}</span>
                {customer.contactPerson && (
                  <>
                    <span>•</span>
                    <span>Contact: {customer.contactPerson}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Financial Highlights */}
        <div className="p-6 bg-surface-950/30 border-b border-surface-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-surface-900 border border-surface-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Outstanding Balance
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  currentBal > 0
                    ? 'text-rose-400'
                    : currentBal < 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {formatCurrency(Math.abs(currentBal))}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {currentBal > 0 ? '(Receivable / Due)' : currentBal < 0 ? '(Advance Credit)' : 'Clear'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-900 border border-surface-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">Credit Limit</span>
              <span className="text-base font-bold font-mono text-slate-200">
                {creditLim > 0 ? formatCurrency(creditLim) : 'Unlimited'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Approved ceiling</span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-900 border border-surface-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">Available Credit</span>
              <span
                className={`text-base font-bold font-mono ${
                  availableCredit !== null && availableCredit < (creditLim * 0.2)
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {availableCredit !== null ? formatCurrency(availableCredit) : 'Unlimited'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Remaining buffer</span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-900 border border-surface-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">Credit Period</span>
              <span className="text-base font-bold font-mono text-slate-200">
                {customer.creditPeriodDays ? `${customer.creditPeriodDays} Days` : 'Immediate'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Payment terms</span>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-6 max-h-[55vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Details */}
            <div className="p-4 rounded-xl bg-surface-950/40 border border-surface-800 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-brand-400" />
                <span>Contact Channels</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Primary Phone:</span>
                  <span className="font-mono text-slate-200">{customer.phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Alternate Phone:</span>
                  <span className="font-mono text-slate-200">{customer.alternatePhone || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="text-slate-200">{customer.email || '—'}</span>
                </div>
              </div>
            </div>

            {/* GST & Tax Details */}
            <div className="p-4 rounded-xl bg-surface-950/40 border border-surface-800 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Building className="h-3.5 w-3.5 text-brand-400" />
                <span>GSTIN & Tax Registration</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">Registration Type:</span>
                  <span className="text-slate-200 font-medium">
                    {customer.registrationType || 'UNREGISTERED'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">GSTIN:</span>
                  <span className="font-mono text-brand-400 font-semibold">
                    {customer.gstin || 'Not Registered'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
                  <span className="text-slate-400">State:</span>
                  <span className="text-slate-200">{customer.state || '—'}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="p-4 rounded-xl bg-surface-950/40 border border-surface-800 space-y-3 md:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                <span>Billing Address</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {[customer.addressLine1, customer.addressLine2, customer.city, customer.state, customer.pinCode]
                  .filter(Boolean)
                  .join(', ') || 'No address registered.'}
              </p>
            </div>

            {/* Opening Balance and Notes */}
            <div className="p-4 rounded-xl bg-surface-950/40 border border-surface-800 space-y-3 md:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-brand-400" />
                <span>Account History & Remarks</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Opening Balance Record:</span>
                  <span className="text-slate-200 font-mono">
                    {formatCurrency(customer.openingBalance || 0)} ({customer.openingBalanceType || 'RECEIVABLE'})
                  </span>
                  {customer.openingBalanceDate && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      As of {formatDate(customer.openingBalanceDate)}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Remarks:</span>
                  <span className="text-slate-300 italic">{customer.notes || 'No remarks recorded.'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-800 bg-surface-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            {onViewLedger && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewLedger(customer.id);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700 flex items-center gap-2 transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-brand-400" />
                <span>Khata Statement</span>
              </button>
            )}
            {onNewSale && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewSale(customer.id);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>New Invoice / POS</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
