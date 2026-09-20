import React, { useEffect, useState } from 'react';
import {
  Gift,
  Save,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Percent,
  Coins,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { LoyaltySettingsDTO, LoyaltySettingsUpdateDTO } from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

export const LoyaltySettingsPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingExpiry, setIsProcessingExpiry] = useState(false);
  const [expiryResult, setExpiryResult] = useState<{ lotsExpired: number; pointsExpired: number } | null>(null);

  const [settings, setSettings] = useState<LoyaltySettingsDTO>({
    id: '',
    companyId: '',
    enabled: false,
    earningMethod: 'AMOUNT_SPENT',
    eligibleAmount: 100,
    pointsPerEligibleAmount: 1,
    redemptionValue: 1,
    minimumRedemptionPoints: 10,
    maximumRedemptionPercentage: 50,
    minimumBillAmount: 100,
    minimumRedemptionIncrement: 1,
    pointExpiryDays: 0,
    allowEarningOnDiscountedBills: true,
    allowEarningOnBillsWithRedemption: true,
    allowEarningOnTax: false,
    allowEarningOnAdditionalCharges: false,
    negativeBalancePolicy: 'ALLOW_NEGATIVE',
    termsAndConditions: '',
  });

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await window.rsInventory.getLoyaltySettings();
      if (res.success && res.data) {
        setSettings(res.data);
      } else {
        notify('error', res.error?.message || 'Failed to load loyalty settings.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading loyalty settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (field: keyof LoyaltySettingsDTO, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const dto: LoyaltySettingsUpdateDTO = {
        enabled: settings.enabled,
        earningMethod: settings.earningMethod,
        eligibleAmount: Number(settings.eligibleAmount),
        pointsPerEligibleAmount: Number(settings.pointsPerEligibleAmount),
        redemptionValue: Number(settings.redemptionValue),
        minimumRedemptionPoints: Number(settings.minimumRedemptionPoints),
        maximumRedemptionPercentage: Number(settings.maximumRedemptionPercentage),
        minimumBillAmount: Number(settings.minimumBillAmount),
        minimumRedemptionIncrement: Number(settings.minimumRedemptionIncrement),
        pointExpiryDays: Number(settings.pointExpiryDays),
        allowEarningOnDiscountedBills: settings.allowEarningOnDiscountedBills,
        allowEarningOnBillsWithRedemption: settings.allowEarningOnBillsWithRedemption,
        allowEarningOnTax: settings.allowEarningOnTax,
        allowEarningOnAdditionalCharges: settings.allowEarningOnAdditionalCharges,
        negativeBalancePolicy: settings.negativeBalancePolicy,
        termsAndConditions: settings.termsAndConditions || '',
      };

      const res = await window.rsInventory.updateLoyaltySettings(dto);
      if (res.success && res.data) {
        setSettings(res.data);
        notify('success', 'Customer Loyalty & Wallet settings updated successfully.');
      } else {
        notify('error', res.error?.message || 'Failed to update loyalty settings.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error updating loyalty settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunExpiry = async () => {
    setIsProcessingExpiry(true);
    try {
      const res = await window.rsInventory.processLoyaltyExpiry();
      if (res.success && res.data) {
        setExpiryResult(res.data);
        if (res.data.pointsExpired > 0) {
          notify('warning', `Expiry complete: ${res.data.pointsExpired} points across ${res.data.lotsExpired} lot(s) were expired.`);
        } else {
          notify('info', 'Expiry check complete: No points are currently due for expiration.');
        }
      } else {
        notify('error', res.error?.message || 'Failed to process points expiry.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error running points expiry check.');
    } finally {
      setIsProcessingExpiry(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-brand-500 mr-2" />
        <span>Loading loyalty configuration...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Gift className="h-6 w-6 text-brand-400" />
              Customer Loyalty & Points Wallet
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                settings.enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
              }`}
            >
              {settings.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reward customers with loyalty points on qualifying purchases and allow instant checkout redemptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunExpiry}
            disabled={isProcessingExpiry}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-surface-900 border border-surface-700 hover:border-surface-600 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Scan active point lots and expire points that passed validity date"
          >
            <Clock className={`h-3.5 w-3.5 text-amber-400 ${isProcessingExpiry ? 'animate-spin' : ''}`} />
            <span>{isProcessingExpiry ? 'Checking Expiry...' : 'Run Expiry Check'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {expiryResult && (
        <div className="rounded-xl border border-surface-700 bg-surface-900/90 p-4 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400" />
            <span>
              Last expiry run result: <strong>{expiryResult.pointsExpired} points</strong> expired across{' '}
              <strong>{expiryResult.lotsExpired} lot(s)</strong>.
            </span>
          </div>
          <button
            onClick={() => setExpiryResult(null)}
            className="text-slate-400 hover:text-slate-200 text-[11px] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Activation & Earning Formula */}
        <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Coins className="h-4 w-4 text-brand-400" />
                Loyalty Program Status & Earning Rules
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enable customer points accumulation and define point calculation formula.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Earning Calculation Method
              </label>
              <select
                value={settings.earningMethod}
                onChange={(e) => handleChange('earningMethod', e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="AMOUNT_SPENT">Proportional to Amount Spent (e.g. ₹100 = 1 Pt)</option>
                <option value="FLAT_PER_ORDER">Flat Points Per Order (e.g. 50 Pts on qualifying bill)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {settings.earningMethod === 'AMOUNT_SPENT'
                  ? 'Calculates whole integer points earned for every qualifying spend increment.'
                  : 'Awards a fixed number of points once the qualifying threshold is reached.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {settings.earningMethod === 'AMOUNT_SPENT' ? 'Spend Unit (₹)' : 'Min Order Spend (₹)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={settings.eligibleAmount}
                    onChange={(e) => handleChange('eligibleAmount', parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Points Awarded
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="1"
                  value={settings.pointsPerEligibleAmount}
                  onChange={(e) => handleChange('pointsPerEligibleAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-surface-950/60 border border-surface-800/80 p-3.5 flex items-center gap-3 text-xs text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Rule Summary: </strong>
              {settings.earningMethod === 'AMOUNT_SPENT' ? (
                <>
                  Customer earns <strong>{settings.pointsPerEligibleAmount} Point(s)</strong> for every{' '}
                  <strong>₹{settings.eligibleAmount.toFixed(2)}</strong> spent. Example: A qualifying bill of ₹450
                  earns <strong>{Math.floor((450 / settings.eligibleAmount) * settings.pointsPerEligibleAmount)} Points</strong>.
                </>
              ) : (
                <>
                  Customer earns a flat <strong>{settings.pointsPerEligibleAmount} Point(s)</strong> on any order of{' '}
                  <strong>₹{settings.eligibleAmount.toFixed(2)}</strong> or more.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Section 2: Redemption Rules & Value */}
        <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Percent className="h-4 w-4 text-brand-400" />
              Redemption Value & Checkout Safeguards
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Set point conversion rates and limit max points allowed per transaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Point Value (₹ per Point)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={settings.redemptionValue}
                  onChange={(e) => handleChange('redemptionValue', parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">100 Points = ₹{(100 * settings.redemptionValue).toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Min Points to Redeem
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={settings.minimumRedemptionPoints}
                onChange={(e) => handleChange('minimumRedemptionPoints', parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Minimum wallet balance to unlock redemption</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Min Bill Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.minimumBillAmount}
                  onChange={(e) => handleChange('minimumBillAmount', parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Bill total must reach this amount</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Max Bill Coverage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={settings.maximumRedemptionPercentage}
                  onChange={(e) => handleChange('maximumRedemptionPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Prevents 100% free bills if set &lt; 100%</p>
            </div>
          </div>
        </div>

        {/* Section 3: Expiry & Offline Expiry Routine */}
        <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-400" />
              Points Expiration & FIFO Policy
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure point expiration validity. The system uses FIFO (First-In, First-Out) lot allocation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Point Validity (Days)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={settings.pointExpiryDays}
                onChange={(e) => handleChange('pointExpiryDays', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter <strong>0</strong> for points to never expire. E.g. 365 = 1 year validity from earned date.
              </p>
            </div>

            <div className="rounded-xl bg-surface-950/80 border border-surface-800 p-4 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-400" />
                Offline-First Expiry Routine
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Because this application runs fully offline, expired points are evaluated against local point lots.
                During day-end closing or by pressing "Run Expiry Check", all active lots past validity are closed and debited.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Eligibility & Exclusions */}
        <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-400" />
              Qualifying Spend & Stacking Rules
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Control what invoice components qualify for earning and whether points stack with discounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={settings.allowEarningOnDiscountedBills}
                onChange={(e) => handleChange('allowEarningOnDiscountedBills', e.target.checked)}
                className="mt-0.5 rounded border-surface-700 text-brand-600 focus:ring-0 bg-surface-900"
              />
              <div>
                <div className="text-xs font-medium text-slate-200">Earn on Discounted Orders</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Allow customers to earn points on orders that have coupon or invoice-level discounts.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={settings.allowEarningOnBillsWithRedemption}
                onChange={(e) => handleChange('allowEarningOnBillsWithRedemption', e.target.checked)}
                className="mt-0.5 rounded border-surface-700 text-brand-600 focus:ring-0 bg-surface-900"
              />
              <div>
                <div className="text-xs font-medium text-slate-200">Earn on Redemption Orders</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Allow customers to earn points on the remaining cash portion when redeeming points.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={settings.allowEarningOnTax}
                onChange={(e) => handleChange('allowEarningOnTax', e.target.checked)}
                className="mt-0.5 rounded border-surface-700 text-brand-600 focus:ring-0 bg-surface-900"
              />
              <div>
                <div className="text-xs font-medium text-slate-200">Include Tax in Qualifying Spend</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  If enabled, GST/tax amounts are included in the eligible amount for points calculation.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-950 border border-surface-800 hover:border-surface-700 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={settings.allowEarningOnAdditionalCharges}
                onChange={(e) => handleChange('allowEarningOnAdditionalCharges', e.target.checked)}
                className="mt-0.5 rounded border-surface-700 text-brand-600 focus:ring-0 bg-surface-900"
              />
              <div>
                <div className="text-xs font-medium text-slate-200">Include Delivery / Extra Charges</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  If enabled, delivery or packing charges qualify for points accumulation.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Section 5: Return Policy on Points Deficit */}
        <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Sales Return Policy for Points Deficit
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              When a customer returns an item, points earned on that purchase are reversed. If the customer already spent those points, choose how to handle the deficit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.negativeBalancePolicy === 'ALLOW_NEGATIVE'
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-surface-800 bg-surface-950 hover:border-surface-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Allow Negative Balance</span>
                  <input
                    type="radio"
                    name="negativeBalancePolicy"
                    value="ALLOW_NEGATIVE"
                    checked={settings.negativeBalancePolicy === 'ALLOW_NEGATIVE'}
                    onChange={(e) => handleChange('negativeBalancePolicy', e.target.value)}
                    className="text-brand-600 focus:ring-0"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  (Default) The customer's wallet balance goes negative. Future earned points automatically clear the deficit.
                </p>
              </div>
            </label>

            <label
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.negativeBalancePolicy === 'DEDUCT_FROM_REFUND'
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-surface-800 bg-surface-950 hover:border-surface-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Deduct Cash From Refund</span>
                  <input
                    type="radio"
                    name="negativeBalancePolicy"
                    value="DEDUCT_FROM_REFUND"
                    checked={settings.negativeBalancePolicy === 'DEDUCT_FROM_REFUND'}
                    onChange={(e) => handleChange('negativeBalancePolicy', e.target.value)}
                    className="text-brand-600 focus:ring-0"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The rupee value of unrecoverable points is subtracted from the refund amount given to the customer.
                </p>
              </div>
            </label>

            <label
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.negativeBalancePolicy === 'CLAMP_TO_ZERO'
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-surface-800 bg-surface-950 hover:border-surface-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">Clamp to Zero</span>
                  <input
                    type="radio"
                    name="negativeBalancePolicy"
                    value="CLAMP_TO_ZERO"
                    checked={settings.negativeBalancePolicy === 'CLAMP_TO_ZERO'}
                    onChange={(e) => handleChange('negativeBalancePolicy', e.target.value)}
                    className="text-brand-600 focus:ring-0"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Reverse only up to available balance; customer wallet does not go negative and cash refund is untouched.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 6: Terms & Conditions */}
        <div className="rounded-2xl border border-surface-800 bg-surface-900/50 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Terms & Conditions / Receipt Loyalty Footnote
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Optional terms printed or displayed regarding points expiry and non-transferability.
            </p>
          </div>

          <textarea
            rows={3}
            value={settings.termsAndConditions || ''}
            onChange={(e) => handleChange('termsAndConditions', e.target.value)}
            placeholder="e.g. Points are non-transferable and have no cash surrender value. Unused points expire 365 days after issuance."
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving Preferences...' : 'Save Loyalty Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
