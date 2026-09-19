import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  FileText,
} from 'lucide-react';
import { Purchase, Company } from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';

interface PrintPurchaseInvoiceModalProps {
  purchaseId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintPurchaseInvoiceModal: React.FC<PrintPurchaseInvoiceModalProps> = ({
  purchaseId,
  isOpen,
  onClose,
}) => {
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (isOpen && purchaseId) {
      loadData();
    }
  }, [isOpen, purchaseId]);

  const loadData = async () => {
    if (!purchaseId) return;
    try {
      const [purRes, compRes] = await Promise.all([
        window.rsInventory.getPurchase(purchaseId),
        window.rsInventory.getCompany(),
      ]);

      if (purRes.success && purRes.data) {
        setPurchase(purRes.data);
      }
      if (compRes.success && compRes.data) {
        setCompany(compRes.data);
      }
    } catch (err) {
      console.error('Failed to load purchase for print:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !purchaseId || !purchase) return null;

  const balanceDue =
    purchase.balanceDue ??
    purchase.grandTotal - purchase.amountPaid - purchase.amountReturned;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Controls Header (Hidden during print) */}
        <div className="px-6 py-3 border-b border-surface-700 flex items-center justify-between bg-surface-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <span className="text-sm font-bold text-white">Purchase Invoice Voucher Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 print:p-0 print:m-0 print:overflow-visible font-sans">
          {/* Company & Voucher Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                {company?.logoPath && (
                  <img
                    src={company.logoPath}
                    alt="Company Logo"
                    className="h-16 w-auto max-w-[130px] object-contain shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {company?.businessName || company?.name || 'RS INVENTORY'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm">
                    {[company?.address, company?.city, company?.state].filter(Boolean).join(', ')}
                    {company?.pincode ? ` - ${company.pincode}` : ''}
                  </p>
                  <div className="text-xs text-slate-600 mt-1 flex gap-4">
                    {company?.phone && <span>Phone: {company.phone}</span>}
                    {company?.email && <span>Email: {company.email}</span>}
                  </div>
                  {company?.gstin && (
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      GSTIN: {company.gstin}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded">
                  Purchase Voucher
                </span>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="font-mono font-bold text-base text-slate-900">
                    #{purchase.purchaseNumber}
                  </div>
                  <div>
                    <span className="text-slate-500">Date: </span>
                    <span className="font-semibold">{formatDate(purchase.purchaseDate)}</span>
                  </div>
                  {purchase.supplierInvoiceNumber && (
                    <div>
                      <span className="text-slate-500">Supplier Inv: </span>
                      <span className="font-semibold">{purchase.supplierInvoiceNumber}</span>
                    </div>
                  )}
                  {purchase.dueDate && (
                    <div>
                      <span className="text-slate-500">Due Date: </span>
                      <span className="font-semibold">{formatDate(purchase.dueDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Details */}
          <div className="mb-6 p-4 border border-slate-300 rounded-lg bg-slate-50 text-xs grid grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Supplier / Vendor:
              </span>
              <div className="font-bold text-sm text-slate-900">{purchase.supplier?.name}</div>
              <div className="text-slate-600">
                {[
                  purchase.supplier?.addressLine1,
                  purchase.supplier?.city,
                  purchase.supplier?.state,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </div>
              {purchase.supplier?.phone && <div>Phone: {purchase.supplier.phone}</div>}
              {purchase.supplier?.email && <div>Email: {purchase.supplier.email}</div>}
            </div>

            <div className="text-right">
              {purchase.supplier?.gstin && (
                <div className="font-semibold text-slate-800">
                  Vendor GSTIN: <span className="font-mono">{purchase.supplier.gstin}</span>
                </div>
              )}
              {purchase.supplier?.pan && (
                <div className="text-slate-600">
                  PAN: <span className="font-mono">{purchase.supplier.pan}</span>
                </div>
              )}
              <div className="mt-2 text-slate-600">
                Supply Type:{' '}
                <span className="font-semibold text-slate-800">
                  {purchase.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-2.5 w-8 border-r border-slate-300">#</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Item Description</th>
                  <th className="py-2 px-2.5 text-right w-16 border-r border-slate-300">Qty</th>
                  <th className="py-2 px-2.5 text-right w-20 border-r border-slate-300">Rate (₹)</th>
                  <th className="py-2 px-2.5 text-right w-20 border-r border-slate-300">Discount</th>
                  <th className="py-2 px-2.5 text-right w-16 border-r border-slate-300">GST %</th>
                  <th className="py-2 px-2.5 text-right w-24">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(purchase.items || []).map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-2 px-2.5 text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
                    <td className="py-2 px-2.5 border-r border-slate-200">
                      <div className="font-semibold text-slate-900">{item.product?.name || item.productNameSnapshot}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SKU: {item.product?.sku || item.skuSnapshot}</div>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono border-r border-slate-200">
                      {item.quantity} {item.freeQuantity ? `(+${item.freeQuantity})` : ''}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono border-r border-slate-200">
                      {item.purchaseRate.toFixed(2)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono border-r border-slate-200">
                      {item.discountAmount > 0 ? item.discountAmount.toFixed(2) : '—'}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono border-r border-slate-200">
                      {item.taxRate}%
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                      {item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end mb-8">
            <div className="w-72 text-xs space-y-1.5 border-t border-slate-300 pt-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Taxable Subtotal:</span>
                <span className="font-mono font-medium">{formatCurrency(purchase.taxableAmount)}</span>
              </div>
              {!purchase.isInterState ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">CGST Amount:</span>
                    <span className="font-mono">{formatCurrency(purchase.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">SGST Amount:</span>
                    <span className="font-mono">{formatCurrency(purchase.sgstAmount)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-slate-600">IGST Amount:</span>
                  <span className="font-mono">{formatCurrency(purchase.igstAmount)}</span>
                </div>
              )}
              {((purchase.otherCharges ?? purchase.additionalCharges ?? 0) > 0) && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Other Charges:</span>
                  <span className="font-mono">+{formatCurrency(purchase.otherCharges ?? purchase.additionalCharges ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Round Off:</span>
                <span className="font-mono">
                  {purchase.roundOff >= 0 ? '+' : ''}
                  {purchase.roundOff.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-2 font-black text-sm text-slate-900">
                <span>GRAND TOTAL:</span>
                <span className="font-mono">{formatCurrency(purchase.grandTotal)}</span>
              </div>
              <div className="flex justify-between pt-1 text-slate-700">
                <span>Amount Paid:</span>
                <span className="font-mono font-semibold">{formatCurrency(purchase.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Balance Due:</span>
                <span className="font-mono">{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Signature & Footer */}
          <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-300 text-xs text-slate-600">
            <div>
              <p className="font-medium">Goods Received By:</p>
              <div className="h-12 border-b border-dashed border-slate-400 mt-4"></div>
              <p className="mt-1 text-[11px]">Signature & Date</p>
            </div>
            <div className="text-right">
              <p className="font-medium">Authorized Signatory</p>
              <div className="h-12 border-b border-dashed border-slate-400 mt-4"></div>
              <p className="mt-1 text-[11px]">{company?.businessName || company?.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
