import React, { useEffect, useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Building,
  FileText,
  ShoppingCart,
  Calendar,
  Gift,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  PlusCircle,
  Clock,
  AlertCircle,
  User,
} from 'lucide-react';
import {
  Customer,
  CustomerWalletDTO,
  LoyaltyTransactionDTO,
  LoyaltySettingsDTO,
} from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';

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
  const { notify } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'LOYALTY'>('DETAILS');
  const [wallet, setWallet] = useState<CustomerWalletDTO | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransactionDTO[]>([]);
  const [settings, setSettings] = useState<LoyaltySettingsDTO | null>(null);
  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  // Manual Adjustment Modal State
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustmentPoints, setAdjustmentPoints] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  useEffect(() => {
    if (isOpen && customer && activeTab === 'LOYALTY') {
      loadLoyaltyData();
    }
  }, [isOpen, customer, activeTab]);

  const loadLoyaltyData = async () => {
    if (!customer) return;
    setIsLoadingLoyalty(true);
    try {
      const [walletRes, txnsRes, settingsRes] = await Promise.all([
        window.rsInventory.getCustomerWallet(customer.id),
        window.rsInventory.listLoyaltyTransactions({ customerId: customer.id, pageSize: 50 }),
        window.rsInventory.getLoyaltySettings(),
      ]);

      if (walletRes.success && walletRes.data) {
        setWallet(walletRes.data);
      }
      if (txnsRes.success && txnsRes.data) {
        setTransactions(txnsRes.data.items);
      }
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to load loyalty information.');
    } finally {
      setIsLoadingLoyalty(false);
    }
  };

  const handleReconcile = async () => {
    if (!customer) return;
    setIsReconciling(true);
    try {
      const res = await window.rsInventory.reconcileCustomerWallet(customer.id);
      if (res.success && res.data) {
        if (res.data.reconciled) {
          notify(
            'success',
            `Wallet reconciled successfully: Old ${res.data.oldBalance} pts -> New ${res.data.newBalance} pts.`,
          );
        } else {
          notify('info', `Wallet is already strictly consistent with ledger (${res.data.newBalance} pts).`);
        }
        await loadLoyaltyData();
      } else {
        notify('error', res.error?.message || 'Reconciliation failed.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error during reconciliation.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleManualAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const pointsNum = parseFloat(adjustmentPoints);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      notify('error', 'Please enter a valid positive number of points.');
      return;
    }
    if (!adjustmentReason.trim()) {
      notify('error', 'Mandatory audit reason is required for points adjustments.');
      return;
    }

    setIsSubmittingAdjustment(true);
    try {
      const res = await window.rsInventory.performManualLoyaltyAdjustment({
        customerId: customer.id,
        adjustmentType,
        points: pointsNum,
        reason: adjustmentReason.trim(),
      });

      if (res.success) {
        notify('success', `Points successfully ${adjustmentType === 'CREDIT' ? 'credited' : 'debited'}.`);
        setShowAdjustmentModal(false);
        setAdjustmentPoints('');
        setAdjustmentReason('');
        await loadLoyaltyData();
      } else {
        notify('error', res.error?.message || 'Manual adjustment failed.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error during adjustment.');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  if (!isOpen || !customer) return null;

  const currentBal = customer.currentBalance || 0;
  const creditLim = customer.creditLimit || 0;
  const availableCredit = creditLim > 0 ? Math.max(0, creditLim - currentBal) : null;
  const redemptionValue = settings?.redemptionValue || 1.0;
  const availablePoints = wallet?.cachedAvailablePoints || 0;
  const pointsRupeeValue = availablePoints * redemptionValue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 bg-surface-950/80 flex items-start justify-between">
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
                {customer.phone && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-300">{customer.phone}</span>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-surface-800 bg-surface-950/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all select-none ${
              activeTab === 'DETAILS'
                ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile & Account</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LOYALTY')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all select-none ${
              activeTab === 'LOYALTY'
                ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="h-3.5 w-3.5" />
            <span>Loyalty Wallet & Points</span>
            {wallet && wallet.cachedAvailablePoints > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-brand-500/20 text-brand-300">
                {wallet.cachedAvailablePoints}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Profile & Financial Highlights */}
        {activeTab === 'DETAILS' && (
          <div>
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
                      availableCredit !== null && availableCredit < creditLim * 0.2
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
            <div className="p-6 space-y-6 max-h-[50vh] overflow-y-auto">
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
          </div>
        )}

        {/* Tab 2: Loyalty Wallet & Points */}
        {activeTab === 'LOYALTY' && (
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Loyalty Program Status Warning */}
            {settings && !settings.enabled && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center gap-3 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Loyalty program is currently <strong>disabled</strong> in settings. Points cannot be earned or redeemed at POS, but existing customer balances are preserved.
                </span>
              </div>
            )}

            {/* Wallet Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-900/40 to-surface-950 border border-brand-500/30">
                <span className="text-[11px] font-medium text-brand-300 block mb-1 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-brand-400" />
                  Available Points
                </span>
                <span className="text-2xl font-black font-mono text-white block">
                  {availablePoints}
                </span>
                <span className="text-[11px] text-brand-400 font-medium block mt-1">
                  ≈ {formatCurrency(pointsRupeeValue)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-surface-950/60 border border-surface-800">
                <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                  Lifetime Earned
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400 block">
                  {wallet?.cachedLifetimeEarned || 0}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Total points credited</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface-950/60 border border-surface-800">
                <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />
                  Lifetime Redeemed
                </span>
                <span className="text-xl font-bold font-mono text-amber-400 block">
                  {wallet?.cachedLifetimeRedeemed || 0}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Converted into bill discounts</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface-950/60 border border-surface-800">
                <span className="text-[11px] font-medium text-slate-400 block mb-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-rose-400" />
                  Expired / Reversed
                </span>
                <span className="text-xl font-bold font-mono text-slate-300 block">
                  {(wallet?.cachedLifetimeExpired || 0) + (wallet?.cachedLifetimeReversed || 0)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Exp: {wallet?.cachedLifetimeExpired || 0} | Rev: {wallet?.cachedLifetimeReversed || 0}
                </span>
              </div>
            </div>

            {/* Loyalty Toolbar */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Coins className="h-3.5 w-3.5 text-brand-400" />
                Points Ledger History
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-800 hover:bg-surface-700 text-slate-300 hover:text-white border border-surface-700 transition-all disabled:opacity-50"
                  title="Verify cached points balance against full ledger sum"
                >
                  <RefreshCw className={`h-3 w-3 ${isReconciling ? 'animate-spin' : ''}`} />
                  <span>{isReconciling ? 'Reconciling...' : 'Reconcile'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/20 transition-all"
                >
                  <PlusCircle className="h-3 w-3" />
                  <span>Manual Adjustment</span>
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            {isLoadingLoyalty ? (
              <div className="flex items-center justify-center p-8 text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin text-brand-500 mr-2" />
                <span className="text-xs">Loading ledger transactions...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-xl border border-surface-800 bg-surface-950/40 p-8 text-center text-xs text-slate-500">
                No loyalty transactions found for this customer.
              </div>
            ) : (
              <div className="rounded-xl border border-surface-800 overflow-hidden bg-surface-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950 border-b border-surface-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Date & Time</th>
                      <th className="px-3.5 py-2.5">Type</th>
                      <th className="px-3.5 py-2.5 text-right">Points</th>
                      <th className="px-3.5 py-2.5 text-right">Balance</th>
                      <th className="px-3.5 py-2.5">Reference / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/60">
                    {transactions.map((txn) => {
                      const isCredit = txn.points > 0;
                      return (
                        <tr key={txn.id} className="hover:bg-surface-800/30 transition-colors">
                          <td className="px-3.5 py-2 text-slate-400 whitespace-nowrap text-[11px]">
                            {new Date(txn.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-3.5 py-2 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                txn.transactionType === 'EARN'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : txn.transactionType === 'REDEEM'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : txn.transactionType === 'RETURN_REVERSAL'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : txn.transactionType === 'RETURN_RESTORE'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : txn.transactionType === 'EXPIRE'
                                  ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                                  : 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                              }`}
                            >
                              {txn.transactionType.replace('_', ' ')}
                            </span>
                          </td>
                          <td
                            className={`px-3.5 py-2 text-right font-mono font-bold whitespace-nowrap ${
                              isCredit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isCredit ? `+${txn.points}` : txn.points}
                          </td>
                          <td className="px-3.5 py-2 text-right font-mono font-medium text-slate-200 whitespace-nowrap">
                            {txn.balanceAfter}
                          </td>
                          <td className="px-3.5 py-2 text-slate-300 max-w-xs truncate text-[11px]">
                            {txn.invoiceNumberSnapshot ? (
                              <span className="font-mono text-brand-400 mr-1.5 font-semibold">
                                {txn.invoiceNumberSnapshot}
                              </span>
                            ) : null}
                            <span>{txn.description || txn.reason || '—'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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

      {/* Manual Points Adjustment Dialog Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-surface-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="h-4 w-4 text-brand-400" />
                Manual Points Adjustment
              </h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleManualAdjustmentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('CREDIT')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      adjustmentType === 'CREDIT'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-surface-950 text-slate-400 border-surface-800 hover:border-surface-700'
                    }`}
                  >
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    <span>Credit Points (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentType('DEBIT')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      adjustmentType === 'DEBIT'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-surface-950 text-slate-400 border-surface-800 hover:border-surface-700'
                    }`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>Debit Points (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Points Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 50"
                  value={adjustmentPoints}
                  onChange={(e) => setAdjustmentPoints(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Goodwill gesture, corrected billing error, offline promotion"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-surface-800 text-slate-300 hover:bg-surface-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmittingAdjustment ? 'Applying...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
