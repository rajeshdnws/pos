import React from 'react';
import { DayEndClosing } from '@rs-inventory/types';
import { X, Printer } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface PrintableClosingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  closing: DayEndClosing | null;
}

export const PrintableClosingReportModal: React.FC<PrintableClosingReportModalProps> = ({
  isOpen,
  onClose,
  closing,
}) => {
  const { company } = useAuthStore();

  if (!isOpen || !closing) return null;

  const handlePrint = () => {
    window.print();
  };

  const hasDifference = Math.abs(closing.cashDifference) > 0.01;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-6 py-3 border-b border-surface-800 flex items-center justify-between bg-surface-950/40 print:hidden">
          <span className="text-xs font-semibold text-slate-300">Day-End Closing Report Preview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-500 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Voucher */}
        <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-300 print:text-black print:overflow-visible">
          {/* Business Header */}
          <div className="text-center border-b border-surface-800 pb-4 print:border-black/20">
            <div className="text-base font-bold text-white tracking-wide print:text-black">
              {company?.businessName || company?.name || 'RS INVENTORY'}
            </div>
            {company?.address && <div className="text-slate-400 print:text-gray-600 text-[11px]">{company.address}</div>}
            <div className="text-[11px] text-slate-400 print:text-gray-600">
              {company?.city && `${company.city}, `}{company?.state && `${company.state} `}{company?.pincode}
              {company?.gstin && ` | GSTIN: ${company.gstin}`}
            </div>
            <div className="text-xs font-bold text-brand-400 uppercase tracking-wider mt-2 print:text-black">
              DAY-END CLOSING & CASH RECONCILIATION REPORT
            </div>
          </div>

          {/* Report Metadata */}
          <div className="grid grid-cols-2 gap-3 text-[11px] bg-surface-950/60 p-3 rounded-xl border border-surface-800 print:bg-gray-50 print:border-gray-300 print:text-black">
            <div>
              <div><span className="text-slate-500 print:text-gray-500">Closing Number:</span> <span className="font-mono font-bold text-white print:text-black">{closing.closingNumber}</span></div>
              <div><span className="text-slate-500 print:text-gray-500">Business Date:</span> <span className="font-medium text-slate-200 print:text-black">{new Date(closing.businessDate).toLocaleDateString()}</span></div>
              <div><span className="text-slate-500 print:text-gray-500">Cash Register:</span> <span className="font-medium text-slate-200 print:text-black">{closing.cashRegister?.name || 'Main Counter'}</span></div>
            </div>
            <div className="text-right">
              <div><span className="text-slate-500 print:text-gray-500">Closed At:</span> <span className="font-medium text-slate-200 print:text-black">{new Date(closing.closedAt).toLocaleString()}</span></div>
              <div><span className="text-slate-500 print:text-gray-500">Status:</span> <span className="font-bold text-emerald-400 print:text-black">{closing.status}</span></div>
              {closing.closedBy && <div><span className="text-slate-500 print:text-gray-500">Cashier:</span> <span className="font-medium text-slate-200 print:text-black">{closing.closedBy}</span></div>}
            </div>
          </div>

          {/* Section 1: Physical Cash Drawer Reconciliation */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-surface-800 pb-1 print:text-gray-700 print:border-gray-300">
              1. Physical Cash Reconciliation
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-surface-800/60 print:divide-gray-200">
                <tr>
                  <td className="py-1.5 text-slate-300 print:text-black">Opening Cash Float</td>
                  <td className="py-1.5 text-right font-medium text-white print:text-black">₹{closing.openingCash.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-emerald-400 print:text-black">(+) Cash Sales Tender Received</td>
                  <td className="py-1.5 text-right font-medium text-emerald-400 print:text-black">+₹{closing.cashSales.toFixed(2)}</td>
                </tr>
                {closing.customerCashReceipts > 0 && (
                  <tr>
                    <td className="py-1.5 text-emerald-400 print:text-black">(+) Customer Cash Receipts (A/R)</td>
                    <td className="py-1.5 text-right font-medium text-emerald-400 print:text-black">+₹{closing.customerCashReceipts.toFixed(2)}</td>
                  </tr>
                )}
                {closing.cashIn > 0 && (
                  <tr>
                    <td className="py-1.5 text-emerald-400 print:text-black">(+) Cash In (Drawer Float Additions)</td>
                    <td className="py-1.5 text-right font-medium text-emerald-400 print:text-black">+₹{closing.cashIn.toFixed(2)}</td>
                  </tr>
                )}
                {closing.cashWithdrawals > 0 && (
                  <tr>
                    <td className="py-1.5 text-emerald-400 print:text-black">(+) Bank Cash Withdrawals Added</td>
                    <td className="py-1.5 text-right font-medium text-emerald-400 print:text-black">+₹{closing.cashWithdrawals.toFixed(2)}</td>
                  </tr>
                )}
                {closing.supplierCashPayments > 0 && (
                  <tr>
                    <td className="py-1.5 text-rose-400 print:text-black">(−) Supplier Cash Payments</td>
                    <td className="py-1.5 text-right font-medium text-rose-400 print:text-black">−₹{closing.supplierCashPayments.toFixed(2)}</td>
                  </tr>
                )}
                {closing.cashExpenses > 0 && (
                  <tr>
                    <td className="py-1.5 text-rose-400 print:text-black">(−) Cash Expenses Paid</td>
                    <td className="py-1.5 text-right font-medium text-rose-400 print:text-black">−₹{closing.cashExpenses.toFixed(2)}</td>
                  </tr>
                )}
                {closing.cashRefunds > 0 && (
                  <tr>
                    <td className="py-1.5 text-rose-400 print:text-black">(−) Sales Return Cash Refunds</td>
                    <td className="py-1.5 text-right font-medium text-rose-400 print:text-black">−₹{closing.cashRefunds.toFixed(2)}</td>
                  </tr>
                )}
                {closing.cashOut > 0 && (
                  <tr>
                    <td className="py-1.5 text-rose-400 print:text-black">(−) Cash Out (Safe Drops / Payouts)</td>
                    <td className="py-1.5 text-right font-medium text-rose-400 print:text-black">−₹{closing.cashOut.toFixed(2)}</td>
                  </tr>
                )}
                {closing.cashDeposits > 0 && (
                  <tr>
                    <td className="py-1.5 text-rose-400 print:text-black">(−) Bank Cash Deposits</td>
                    <td className="py-1.5 text-right font-medium text-rose-400 print:text-black">−₹{closing.cashDeposits.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-surface-700 font-bold print:border-black">
                  <td className="py-2 text-white print:text-black">Expected Drawer Cash</td>
                  <td className="py-2 text-right text-brand-400 text-sm print:text-black">₹{closing.expectedCash.toFixed(2)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="py-2 text-white print:text-black">Actual Counted Cash</td>
                  <td className="py-2 text-right text-white text-sm print:text-black">₹{closing.countedCash.toFixed(2)}</td>
                </tr>
                <tr className={`font-bold ${hasDifference ? 'text-amber-400 print:text-black' : 'text-emerald-400 print:text-black'}`}>
                  <td className="py-2">Reconciliation Variance</td>
                  <td className="py-2 text-right text-sm">
                    {closing.cashDifference > 0
                      ? `+₹${closing.cashDifference.toFixed(2)} (Surplus)`
                      : closing.cashDifference < 0
                      ? `−₹${Math.abs(closing.cashDifference).toFixed(2)} (Shortage)`
                      : '₹0.00 (Balanced)'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Non-Cash Financial Operations */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-surface-800 pb-1 print:text-gray-700 print:border-gray-300">
              2. Non-Cash Financial Operations (Electronic / Banking)
            </div>
            <div className="grid grid-cols-2 gap-4 bg-surface-950/40 p-3 rounded-xl border border-surface-800 print:bg-white print:border-gray-300">
              <div>
                <span className="text-slate-400 print:text-gray-600">Electronic Sales & Receipts (UPI/Card/NEFT):</span>
                <div className="text-sm font-bold text-white mt-0.5 print:text-black">₹{closing.nonCashSales.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 print:text-gray-600">Non-Cash Operational Expenses:</span>
                <div className="text-sm font-bold text-white mt-0.5 print:text-black">₹{closing.nonCashExpenses.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Section 3: Notes & Signatures */}
          {closing.notes && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Closing Notes & Discrepancy Explanation
              </div>
              <div className="p-3 bg-surface-950/40 rounded-xl border border-surface-800 text-slate-200 print:bg-white print:border-gray-300 print:text-black italic">
                {closing.notes}
              </div>
            </div>
          )}

          {/* Signatures Row */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-400 print:text-gray-700 border-t border-surface-800 print:border-gray-300">
            <div>
              <div className="border-b border-surface-700 w-3/4 mx-auto mb-2 print:border-black"></div>
              <span>Cashier Signature</span>
            </div>
            <div>
              <div className="border-b border-surface-700 w-3/4 mx-auto mb-2 print:border-black"></div>
              <span>Authorized Manager Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
