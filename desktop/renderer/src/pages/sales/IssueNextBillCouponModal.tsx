import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Ticket,
  Printer,
  Copy,
  Check,
  AlertCircle,
  Percent,
  DollarSign,
} from 'lucide-react';
import { Customer, CouponDiscountType, CouponDeliveryChannel, CouponDTO } from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

interface IssueNextBillCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  issuingInvoiceId?: string;
  onCouponIssued?: (coupon: CouponDTO) => void;
}

export const IssueNextBillCouponModal: React.FC<IssueNextBillCouponModalProps> = ({
  isOpen,
  onClose,
  customer,
  issuingInvoiceId,
  onCouponIssued,
}) => {
  const { notify } = useNotificationStore();

  const [discountType, setDiscountType] = useState<CouponDiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minimumPurchase, setMinimumPurchase] = useState<number>(0);
  const [maximumDiscount, setMaximumDiscount] = useState<number | undefined>(undefined);
  const [validityDays, setValidityDays] = useState<number>(30);
  const [deliveryChannel, setDeliveryChannel] = useState<CouponDeliveryChannel>('PRINTED');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result state
  const [issuedCoupon, setIssuedCoupon] = useState<CouponDTO | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleIssue = async () => {
    if (!customer) {
      notify('error', 'A registered customer is required to issue a next-bill coupon.');
      return;
    }
    if (discountValue <= 0) {
      notify('error', 'Discount value must be greater than zero.');
      return;
    }
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      notify('error', 'Percentage discount cannot exceed 100%.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await window.rsInventory.issueNextBillCoupon({
        customerId: customer.id,
        discountType,
        discountValue: Number(discountValue),
        minimumPurchase: minimumPurchase ? Number(minimumPurchase) : 0,
        maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
        validityDays: Number(validityDays) || 30,
        deliveryChannel,
        issuingSalesInvoiceId: issuingInvoiceId,
      });

      if (res.success && res.data) {
        setIssuedCoupon(res.data);
        notify('success', `Next-Bill coupon ${res.data.code} generated successfully!`);
        if (onCouponIssued) onCouponIssued(res.data);
      } else {
        notify('error', res.error?.message || 'Failed to issue next-bill coupon.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error creating coupon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!issuedCoupon) return;
    navigator.clipboard.writeText(issuedCoupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    notify('success', 'Coupon code copied to clipboard');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleReset = () => {
    setIssuedCoupon(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-950 border border-surface-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Issue Coupon for Next Bill</h3>
              <p className="text-xs text-slate-400">Voucher valid strictly on customer's future visits</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!customer && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Please assign a registered customer to this bill before issuing a next-bill coupon.</span>
            </div>
          )}

          {issuedCoupon ? (
            /* Voucher Success Preview */
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-brand-500/5 to-surface-900 border border-amber-500/30 text-center relative overflow-hidden">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
                  <Ticket className="w-3.5 h-3.5" /> Next-Bill Discount Voucher
                </div>

                <div className="text-3xl font-extrabold tracking-wider text-white my-2 font-mono select-all">
                  {issuedCoupon.code}
                </div>

                <div className="text-lg font-bold text-amber-400">
                  {issuedCoupon.discountType === 'PERCENTAGE'
                    ? `${issuedCoupon.discountValue}% OFF`
                    : `₹${issuedCoupon.discountValue.toFixed(2)} OFF`}
                </div>

                <div className="text-xs text-slate-300 mt-2 space-y-1">
                  <div>Customer: <strong className="text-white">{customer?.name}</strong></div>
                  {issuedCoupon.minimumPurchase > 0 && (
                    <div>Min. Purchase: <strong className="text-white">₹{issuedCoupon.minimumPurchase.toFixed(2)}</strong></div>
                  )}
                  <div>Valid until: <strong className="text-white">{new Date(issuedCoupon.validUntil).toLocaleDateString()}</strong></div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-500/20 text-[11px] text-amber-200/80">
                  ⚠️ Valid on your next visit only. Not applicable on today's bill.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-surface-700 bg-surface-900 hover:bg-surface-800 text-slate-200 text-sm font-medium transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors shadow-lg shadow-brand-600/20"
                >
                  <Printer className="w-4 h-4" /> Print Voucher Slip
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleIssue();
              }}
              className="space-y-4"
            >
              {/* Customer Banner */}
              {customer && (
                <div className="p-3.5 rounded-xl bg-surface-900 border border-surface-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Issuing To:</span>{' '}
                    <strong className="text-slate-200">{customer.name}</strong>
                  </div>
                  {customer.phone && <span className="text-slate-400 font-mono">{customer.phone}</span>}
                </div>
              )}

              {/* Discount Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Discount Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('PERCENTAGE')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      discountType === 'PERCENTAGE'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-surface-800 bg-surface-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" /> Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('FIXED_AMOUNT')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      discountType === 'FIXED_AMOUNT'
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-surface-800 bg-surface-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Fixed Amount (₹)
                  </button>
                </div>
              </div>

              {/* Discount Value & Validity Days */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={discountType === 'PERCENTAGE' ? '100' : '100000'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Minimum Purchase & Maximum Discount Cap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Min. Bill Total (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = No minimum"
                    value={minimumPurchase || ''}
                    onChange={(e) => setMinimumPurchase(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                {discountType === 'PERCENTAGE' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Optional"
                      value={maximumDiscount || ''}
                      onChange={(e) => setMaximumDiscount(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Delivery Method</label>
                    <select
                      value={deliveryChannel}
                      onChange={(e) => setDeliveryChannel(e.target.value as CouponDeliveryChannel)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white text-sm focus:outline-none focus:border-brand-500"
                    >
                      <option value="PRINTED">Printed Slip</option>
                      <option value="SMS">SMS Notification</option>
                      <option value="WHATSAPP">WhatsApp Message</option>
                      <option value="EMAIL">Email</option>
                      <option value="MANUAL">Manual Handover</option>
                    </select>
                  </div>
                )}
              </div>

              {discountType === 'PERCENTAGE' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Delivery Method</label>
                  <select
                    value={deliveryChannel}
                    onChange={(e) => setDeliveryChannel(e.target.value as CouponDeliveryChannel)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="PRINTED">Printed Slip</option>
                    <option value="SMS">SMS Notification</option>
                    <option value="WHATSAPP">WhatsApp Message</option>
                    <option value="EMAIL">Email</option>
                    <option value="MANUAL">Manual Handover</option>
                  </select>
                </div>
              )}

              {/* Notice */}
              <div className="p-3 rounded-xl bg-surface-900 border border-surface-800 text-[11px] text-slate-400">
                💡 <strong>Important Note:</strong> Issuing this next-bill coupon registers the voucher for the customer's future purchase. It will <strong>NOT</strong> deduct any amount from today's bill.
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-900 border border-surface-700 text-slate-300 hover:bg-surface-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customer || isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-lg shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Generating...' : 'Issue Next-Bill Coupon'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
