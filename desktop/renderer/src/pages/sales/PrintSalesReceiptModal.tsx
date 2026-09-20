import React, { useState } from 'react';
import {
  X,
  Printer,
  Receipt,
} from 'lucide-react';
import { SalesInvoice } from '@rs-inventory/types';
import { formatDate } from '@rs-inventory/business';
import { useAuthStore } from '../../store/authStore';

interface PrintSalesReceiptModalProps {
  invoice: SalesInvoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintSalesReceiptModal: React.FC<PrintSalesReceiptModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { company } = useAuthStore();
  const [printFormat, setPrintFormat] = useState<'thermal80' | 'thermal58' | 'a4'>('thermal80');

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 bg-surface-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Invoice & Receipt Print</h2>
              <p className="text-xs text-slate-400 font-mono">Invoice #{invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Format Toggle */}
            <div className="flex items-center bg-surface-950 p-1 rounded-xl border border-surface-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal80')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  printFormat === 'thermal80'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal58')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  printFormat === 'thermal58'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                58mm POS
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  printFormat === 'a4'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                A4 Tax Inv
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Receipt Preview Body (white thermal receipt style) */}
        <div className="p-6 max-h-[65vh] overflow-y-auto bg-surface-950 flex justify-center">
          <div
            id="printable-receipt"
            className={`bg-white text-black p-6 font-mono shadow-2xl transition-all ${
              printFormat === 'thermal58'
                ? 'w-[280px] text-[10px]'
                : printFormat === 'thermal80'
                ? 'w-[360px] text-xs'
                : 'w-full max-w-xl text-xs'
            }`}
          >
            {/* Company Details */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400 space-y-1">
              <h1 className="text-base font-bold uppercase tracking-wider text-black">
                {company?.businessName || company?.name || 'RS RETAIL STORE'}
              </h1>
              <p className="text-[11px] text-gray-700">
                {[company?.address, company?.city, company?.state, company?.pincode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {company?.phone && <p className="text-[11px] text-gray-700">Phone: {company.phone}</p>}
              {company?.gstin && (
                <p className="text-[11px] font-bold text-gray-900">GSTIN: {company.gstin}</p>
              )}
            </div>

            {/* Bill Header Info */}
            <div className="py-2.5 border-b border-dashed border-gray-400 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Invoice: {invoice.invoiceNumber}</span>
                <span>{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Customer: {invoice.customerNameSnapshot || (invoice as any).customer?.name || 'Walk-in Customer'}
                </span>
                <span>Status: {invoice.status}</span>
              </div>
              {invoice.customerGstinSnapshot && (
                <div>
                  <span>GSTIN: {invoice.customerGstinSnapshot}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold border-b border-gray-300 pb-1 mb-1 text-[11px]">
                <span className="flex-1">Item</span>
                <span className="w-12 text-center">Qty</span>
                <span className="w-16 text-right">Rate</span>
                <span className="w-16 text-right">Total</span>
              </div>
              <div className="space-y-1 text-[11px]">
                {invoice.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="flex-1 pr-1 truncate">
                      <div>{item.productNameSnapshot}</div>
                      {item.discountAmount > 0 && (
                        <div className="text-[10px] text-gray-500">
                          Disc: -₹{item.discountAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <span className="w-12 text-center font-bold">
                      {item.quantity} {item.unitNameSnapshot || ''}
                    </span>
                    <span className="w-16 text-right font-mono">₹{item.sellingRate.toFixed(2)}</span>
                    <span className="w-16 text-right font-mono font-bold">
                      ₹{item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Tax Breakup */}
            <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Gross Subtotal:</span>
                <span className="font-mono">₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.invoiceDiscount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Total Discount:</span>
                  <span className="font-mono">-₹{invoice.invoiceDiscount.toFixed(2)}</span>
                </div>
              )}
              {invoice.pointsDiscount && invoice.pointsDiscount > 0 ? (
                <div className="flex justify-between text-gray-700">
                  <span>Loyalty Discount ({invoice.pointsRedeemed || 0} pts):</span>
                  <span className="font-mono">-₹{invoice.pointsDiscount.toFixed(2)}</span>
                </div>
              ) : null}
              {invoice.cgstAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>CGST:</span>
                  <span className="font-mono">+₹{invoice.cgstAmount.toFixed(2)}</span>
                </div>
              )}
              {invoice.sgstAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>SGST:</span>
                  <span className="font-mono">+₹{invoice.sgstAmount.toFixed(2)}</span>
                </div>
              )}
              {invoice.igstAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>IGST:</span>
                  <span className="font-mono">+₹{invoice.igstAmount.toFixed(2)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Round Off:</span>
                  <span className="font-mono">{invoice.roundOff > 0 ? `+₹${invoice.roundOff.toFixed(2)}` : `-₹${Math.abs(invoice.roundOff).toFixed(2)}`}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-300">
                <span>NET PAYABLE:</span>
                <span className="font-mono font-bold">₹{invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700 pt-0.5">
                <span>Amount Paid:</span>
                <span className="font-mono">₹{(invoice.amountPaid || 0).toFixed(2)}</span>
              </div>
              {invoice.grandTotal - (invoice.amountPaid || 0) > 0 && (
                <div className="flex justify-between font-bold text-red-600">
                  <span>Balance Due:</span>
                  <span className="font-mono">
                    ₹{(invoice.grandTotal - (invoice.amountPaid || 0)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Loyalty Rewards Summary Section */}
            {((invoice.pointsEarned && invoice.pointsEarned > 0) || (invoice.pointsRedeemed && invoice.pointsRedeemed > 0)) && (
              <div className="pt-2 pb-1 border-b border-dashed border-gray-400 space-y-0.5 text-xs text-gray-800">
                <div className="font-bold text-center text-[10px] uppercase tracking-wider text-gray-900 pb-0.5">
                  *** LOYALTY REWARDS ***
                </div>
                {invoice.pointsRedeemed && invoice.pointsRedeemed > 0 ? (
                  <div className="flex justify-between">
                    <span>Points Redeemed:</span>
                    <span className="font-mono font-bold">-{invoice.pointsRedeemed} Pts</span>
                  </div>
                ) : null}
                {invoice.pointsEarned && invoice.pointsEarned > 0 ? (
                  <div className="flex justify-between">
                    <span>Points Earned Today:</span>
                    <span className="font-mono font-bold text-green-700">+{invoice.pointsEarned} Pts</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Footer Message */}
            <div className="pt-3 text-center space-y-1 text-[10px] text-gray-700">
              <p className="font-bold">Thank You for Shopping with Us!</p>
              <p>Goods once sold can be returned within 7 days with bill.</p>
              <p className="text-[9px] text-gray-500 pt-1">
                Powered by RS Inventory • Solo Edition
              </p>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-4 border-t border-surface-800 bg-surface-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Thermal ESC/POS & standard Windows printer compatible
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
