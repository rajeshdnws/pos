import React, { useState } from 'react';
import {
  X,
  Receipt,
  Printer,
  Building,
  RotateCcw,
  FileText,
  User,
  DollarSign,
} from 'lucide-react';
import { SalesInvoice } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { PrintSalesReceiptModal } from './PrintSalesReceiptModal';

interface SalesDetailsModalProps {
  invoice: SalesInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment?: (invoice: SalesInvoice) => void;
  onCreateReturn?: (invoice: SalesInvoice) => void;
}

export const SalesDetailsModal: React.FC<SalesDetailsModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onRecordPayment,
  onCreateReturn,
}) => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  if (!isOpen || !invoice) return null;

  const balDue = (invoice.grandTotal || 0) - (invoice.amountPaid || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DRAFT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PARTIALLY_PAID':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'UNPAID':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
          {/* Header */}
          <div className="px-6 py-4 border-b border-surface-800 bg-surface-950/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white font-mono">
                    {invoice.invoiceNumber}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                      invoice.status,
                    )}`}
                  >
                    {invoice.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPaymentStatusBadge(
                      invoice.paymentStatus,
                    )}`}
                  >
                    {invoice.paymentStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Date: {formatDate(invoice.invoiceDate)} • Type: {invoice.invoiceType || 'B2C'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Customer & Transaction Overview */}
          <div className="p-6 bg-surface-950/40 border-b border-surface-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <User className="h-3 w-3" /> Customer Details
              </span>
              <div className="font-semibold text-white text-sm">
                {invoice.customerNameSnapshot || (invoice as any).customer?.name || 'Walk-in Customer'}
              </div>
              {invoice.customerPhoneSnapshot && (
                <div className="text-slate-400">Phone: {invoice.customerPhoneSnapshot}</div>
              )}
              {invoice.customerGstinSnapshot && (
                <div className="text-brand-400 font-mono">GSTIN: {invoice.customerGstinSnapshot}</div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Building className="h-3 w-3" /> Billing Info
              </span>
              <div className="text-slate-300">
                POS Mode: {Boolean(invoice.igstAmount && invoice.igstAmount > 0) ? 'Interstate (IGST)' : 'Intrastate (CGST+SGST)'}
              </div>
              {invoice.customerAddressSnapshot && (
                <div className="text-slate-400 truncate">{invoice.customerAddressSnapshot}</div>
              )}
              <div className="text-slate-400">
                Notes: {invoice.notes || 'No customer notes recorded.'}
              </div>
            </div>

            <div className="space-y-1 md:text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Total Payable
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {formatCurrency(invoice.grandTotal)}
              </div>
              <div className="text-slate-400">
                Paid: <span className="font-mono text-white">{formatCurrency(invoice.amountPaid || 0)}</span>
                {balDue > 0 && (
                  <span className="text-rose-400 font-mono ml-2">Due: {formatCurrency(balDue)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="p-6 max-h-[45vh] overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-brand-400" />
              <span>Billed Items ({invoice.items?.length || 0})</span>
            </h3>

            <div className="border border-surface-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-950/70 border-b border-surface-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">GST Rate</th>
                    <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60">
                  {invoice.items?.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-surface-800/20 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{item.productNameSnapshot}</div>
                        {item.skuSnapshot && (
                          <span className="text-[10px] font-mono text-slate-500">
                            SKU: {item.skuSnapshot}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                        {item.quantity} {item.unitNameSnapshot || ''}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatCurrency(item.sellingRate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {item.taxRate}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatCurrency(item.taxAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Breakup */}
            <div className="mt-4 p-4 rounded-xl bg-surface-950/40 border border-surface-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Subtotal</span>
                <span className="text-slate-200 font-semibold">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Discounts</span>
                <span className="text-slate-200 font-semibold">{formatCurrency(invoice.invoiceDiscount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Taxable Value</span>
                <span className="text-slate-200 font-semibold">{formatCurrency(invoice.taxableAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Tax (GST)</span>
                <span className="text-slate-200 font-semibold">
                  {formatCurrency((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0) + (invoice.igstAmount || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-surface-800 bg-surface-950/60 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
            >
              Close
            </button>
            <div className="flex items-center gap-2">
              {onCreateReturn && invoice.status === 'POSTED' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateReturn(invoice);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Return / Credit Note</span>
                </button>
              )}
              {onRecordPayment && invoice.status === 'POSTED' && invoice.paymentStatus !== 'PAID' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRecordPayment(invoice);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Record Payment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      <PrintSalesReceiptModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoice={invoice}
      />
    </>
  );
};
