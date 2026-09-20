import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Ticket,
  Send,
  History,
  BarChart3,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Play,
  Pause,
  FileSpreadsheet,
} from 'lucide-react';
import {
  PromotionCampaignDTO,
  PromotionCampaignCreateDTO,
  CouponDTO,
  CouponCreateDTO,
  CouponRedemptionDTO,
  PromotionsKPIsDTO,
  CampaignStatus,
} from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';

export const PromotionsIndexPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'coupons' | 'redemptions' | 'reports'>('dashboard');

  // -------------------------------------------------------------
  // 1. DASHBOARD & KPIS STATE
  // -------------------------------------------------------------
  const [kpis, setKpis] = useState<PromotionsKPIsDTO | null>(null);

  // -------------------------------------------------------------
  // 2. CAMPAIGNS STATE
  // -------------------------------------------------------------
  const [campaigns, setCampaigns] = useState<PromotionCampaignDTO[]>([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('ALL');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PromotionCampaignDTO | null>(null);
  const [campaignForm, setCampaignForm] = useState<PromotionCampaignCreateDTO>({
    name: '',
    description: '',
    campaignType: 'GENERAL',
    startAt: new Date().toISOString().slice(0, 10),
    endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    targetCustomerGroup: 'ALL',
    channels: ['SMS', 'WHATSAPP'],
    templateId: undefined,
    couponId: undefined,
  });
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<CouponDTO[]>([]);
  const [dispatchingCampaignId, setDispatchingCampaignId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 3. COUPONS STATE
  // -------------------------------------------------------------
  const [coupons, setCoupons] = useState<CouponDTO[]>([]);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponStatusFilter, setCouponStatusFilter] = useState('ALL');
  const [couponModeFilter, setCouponModeFilter] = useState('ALL');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState<CouponCreateDTO>({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minimumPurchase: 0,
    maximumDiscount: null,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    applicabilityMode: 'ANY_ELIGIBLE_PURCHASE',
    maximumRedemptions: 100,
    maximumRedemptionsPerCustomer: 1,
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 4. REDEMPTIONS STATE
  // -------------------------------------------------------------
  const [redemptions, setRedemptions] = useState<CouponRedemptionDTO[]>([]);
  const [redemptionsTotal, setRedemptionsTotal] = useState(0);
  const [redemptionsPage, setRedemptionsPage] = useState(1);

  // -------------------------------------------------------------
  // 5. REPORTS STATE
  // -------------------------------------------------------------
  const [activeReportSubTab, setActiveReportSubTab] = useState<'campaign_perf' | 'next_bill'>('next_bill');
  const [campaignPerfReport, setCampaignPerfReport] = useState<any[]>([]);
  const [nextBillReport, setNextBillReport] = useState<any>(null);

  // Load KPIs
  const loadKPIs = useCallback(async () => {
    try {
      const res = await window.rsInventory.getPromotionsKPIs();
      if (res.success && res.data) {
        setKpis(res.data);
      }
    } catch (err: any) {
      notify('error', 'Failed to load promotions KPIs');
    }
  }, [notify]);

  // Load Campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      const res = await window.rsInventory.listCampaigns({
        search: campaignSearch.trim() || undefined,
        status: campaignStatusFilter === 'ALL' ? undefined : campaignStatusFilter,
      });
      if (res.success && res.data) {
        setCampaigns(res.data.items);
      }
    } catch (err: any) {
      notify('error', 'Failed to load campaigns');
    }
  }, [campaignSearch, campaignStatusFilter, notify]);

  // Load Coupons
  const loadCoupons = useCallback(async () => {
    try {
      const res = await window.rsInventory.listCoupons({
        search: couponSearch.trim() || undefined,
        status: couponStatusFilter === 'ALL' ? undefined : couponStatusFilter,
        applicabilityMode: couponModeFilter === 'ALL' ? undefined : couponModeFilter,
      });
      if (res.success && res.data) {
        setCoupons(res.data.items);
      }
    } catch (err: any) {
      notify('error', 'Failed to load coupons');
    }
  }, [couponSearch, couponStatusFilter, couponModeFilter, notify]);

  // Load Redemptions
  const loadRedemptions = useCallback(async (page = 1) => {
    try {
      const res = await window.rsInventory.listCouponRedemptions({ page, limit: 20 });
      if (res.success && res.data) {
        setRedemptions(res.data.items);
        setRedemptionsTotal(res.data.total);
        setRedemptionsPage(res.data.page);
      }
    } catch (err: any) {
      notify('error', 'Failed to load redemption history');
    }
  }, [notify]);

  // Load Reports
  const loadReports = useCallback(async () => {
    try {
      const [campRes, nextRes] = await Promise.all([
        window.rsInventory.getCampaignPerformanceReport(),
        window.rsInventory.getNextBillCouponReport(),
      ]);
      if (campRes.success && campRes.data) {
        setCampaignPerfReport(campRes.data);
      }
      if (nextRes.success && nextRes.data) {
        setNextBillReport(nextRes.data);
      }
    } catch (err: any) {
      notify('error', 'Failed to load promotional reports');
    }
  }, [notify]);

  // Tab switcher effect
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadKPIs();
    } else if (activeTab === 'campaigns') {
      loadCampaigns();
      // Load templates & coupons for dropdowns
      window.rsInventory.listMessageTemplates().then((r) => r.success && setAvailableTemplates(r.data || []));
      window.rsInventory.listCoupons({ status: 'ACTIVE' }).then((r) => r.success && setAvailableCoupons(r.data?.items || []));
    } else if (activeTab === 'coupons') {
      loadCoupons();
    } else if (activeTab === 'redemptions') {
      loadRedemptions();
    } else if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, loadKPIs, loadCampaigns, loadCoupons, loadRedemptions, loadReports]);

  // -------------------------------------------------------------
  // CAMPAIGN ACTIONS
  // -------------------------------------------------------------
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCampaign) {
        const res = await window.rsInventory.updateCampaign(editingCampaign.id, campaignForm);
        if (res.success) {
          notify('success', 'Campaign updated successfully');
          setIsCampaignModalOpen(false);
          loadCampaigns();
        }
      } else {
        const res = await window.rsInventory.createCampaign(campaignForm);
        if (res.success) {
          notify('success', 'Campaign created successfully');
          setIsCampaignModalOpen(false);
          loadCampaigns();
        }
      }
    } catch (err: any) {
      notify('error', err.message || 'Error saving campaign');
    }
  };

  const handleStatusChange = async (id: string, status: CampaignStatus) => {
    try {
      const res = await window.rsInventory.updateCampaignStatus(id, status);
      if (res.success) {
        notify('success', `Campaign status changed to ${status}`);
        loadCampaigns();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to update campaign status');
    }
  };

  const handleDispatchCampaign = async (id: string) => {
    if (!confirm('Launch and dispatch campaign messages to eligible consented customers now?')) return;
    setDispatchingCampaignId(id);
    try {
      const res = await window.rsInventory.dispatchCampaign(id);
      if (res.success && res.data) {
        notify('success', `Dispatched: ${res.data.dispatched} messages sent successfully (${res.data.failed} failed)`);
        loadCampaigns();
      }
    } catch (err: any) {
      notify('error', err.message || 'Dispatch failed');
    } finally {
      setDispatchingCampaignId(null);
    }
  };

  // -------------------------------------------------------------
  // COUPON ACTIONS
  // -------------------------------------------------------------
  const handleGenerateCode = async () => {
    try {
      const res = await window.rsInventory.generateCouponCode('SAVE');
      if (res.success && res.data) {
        setCouponForm((prev) => ({ ...prev, code: res.data! }));
      }
    } catch {
      notify('error', 'Failed to generate code');
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await window.rsInventory.createCoupon(couponForm);
      if (res.success) {
        notify('success', `Coupon ${res.data?.code} created successfully!`);
        setIsCouponModalOpen(false);
        loadCoupons();
      } else {
        notify('error', res.error?.message || 'Failed to create coupon');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error creating coupon');
    }
  };

  const handleCancelCoupon = async (id: string) => {
    if (!confirm('Deactivate and cancel this coupon? It will no longer be redeemable at checkout.')) return;
    try {
      const res = await window.rsInventory.cancelCoupon(id, 'Deactivated by user');
      if (res.success) {
        notify('success', 'Coupon deactivated');
        loadCoupons();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to cancel coupon');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    notify('success', `Code ${code} copied!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Sub-Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-amber-400" />
            <span>Promotional Campaigns & Coupons</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create promotional campaigns, configure discount coupons, issue next-bill vouchers, and track redemption ROI.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-900 border border-surface-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'campaigns'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'coupons'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="h-3.5 w-3.5 text-amber-400" />
            <span>Coupons</span>
          </button>
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'redemptions'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Redemptions</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>ROI Reports</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. DASHBOARD & KPIS TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Campaigns</span>
              <div className="text-2xl font-black text-white font-mono">{kpis?.activeCampaignsCount ?? 0}</div>
              <span className="text-[10px] text-brand-400 font-medium">
                {kpis?.scheduledCampaignsCount ?? 0} scheduled
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Coupons Issued</span>
              <div className="text-2xl font-black text-amber-400 font-mono">{kpis?.totalCouponsIssued ?? 0}</div>
              <span className="text-[10px] text-slate-400 font-medium">
                {kpis?.couponsRemainingUnused ?? 0} available for use
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Coupons Redeemed</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">{kpis?.couponsRedeemed ?? 0}</div>
              <span className="text-[10px] text-emerald-400/80 font-medium">
                {kpis?.redemptionRate ?? 0}% redemption rate
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attributed Sales</span>
              <div className="text-2xl font-black text-white font-mono">
                {formatCurrency(kpis?.totalAttributedSales ?? 0)}
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">
                Discount Given: {formatCurrency(kpis?.totalDiscountRedeemed ?? 0)}
              </span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setActiveTab('campaigns');
                setIsCampaignModalOpen(true);
              }}
              className="p-5 rounded-2xl bg-gradient-to-br from-brand-950/40 to-surface-900 border border-brand-500/20 hover:border-brand-500/40 text-left transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Create Promotional Campaign</div>
              <div className="text-xs text-slate-400 mt-1">Schedule SMS or WhatsApp blasts to customer segments</div>
            </button>

            <button
              onClick={() => {
                setActiveTab('coupons');
                handleGenerateCode();
                setIsCouponModalOpen(true);
              }}
              className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-surface-900 border border-amber-500/20 hover:border-amber-500/40 text-left transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Create Coupon Code</div>
              <div className="text-xs text-slate-400 mt-1">Generate % or flat discount codes with custom limits</div>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-surface-900 border border-emerald-500/20 hover:border-emerald-500/40 text-left transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white">Next-Bill Voucher ROI</div>
              <div className="text-xs text-slate-400 mt-1">View repeat customer visits & sales driven by coupons</div>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. CAMPAIGNS TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCampaigns()}
                placeholder="Search campaigns..."
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500 w-52"
              />
              <select
                value={campaignStatusFilter}
                onChange={(e) => setCampaignStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingCampaign(null);
                setCampaignForm({
                  name: '',
                  description: '',
                  campaignType: 'GENERAL',
                  startAt: new Date().toISOString().slice(0, 10),
                  endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                  targetCustomerGroup: 'ALL',
                  channels: ['SMS', 'WHATSAPP'],
                });
                setIsCampaignModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 shadow-lg shadow-brand-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          </div>

          {/* Campaigns Table */}
          <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-surface-800">
                <tr>
                  <th className="p-3.5">Campaign Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Target Group</th>
                  <th className="p-3.5">Channels</th>
                  <th className="p-3.5">Dates</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Sent / Target</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 font-mono">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                      No campaigns found. Click &quot;Create Campaign&quot; to launch your first promotion.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white font-sans">{c.name}</td>
                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded bg-surface-950 border border-surface-800 text-[10px] font-semibold">
                          {c.campaignType}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-slate-400">{c.targetCustomerGroup}</td>
                      <td className="p-3.5 font-sans">
                        <div className="flex items-center gap-1">
                          {c.channels.map((ch) => (
                            <span
                              key={ch}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                ch === 'EMAIL'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : ch === 'SMS'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-emerald-500/10 text-emerald-400'
                              }`}
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(c.startAt).toLocaleDateString()} - {new Date(c.endAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : c.status === 'DRAFT'
                              ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                              : c.status === 'PAUSED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {c.messagesSent} / {c.totalRecipients || '—'}
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status === 'DRAFT' && (
                            <button
                              onClick={() => handleDispatchCampaign(c.id)}
                              disabled={dispatchingCampaignId === c.id}
                              className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow"
                            >
                              <Play className="w-3 h-3" />
                              <span>{dispatchingCampaignId === c.id ? 'Sending...' : 'Dispatch'}</span>
                            </button>
                          )}
                          {c.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusChange(c.id, 'PAUSED')}
                              className="px-2 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-amber-400 text-[11px]"
                            >
                              <Pause className="w-3 h-3" />
                            </button>
                          )}
                          {c.status === 'PAUSED' && (
                            <button
                              onClick={() => handleStatusChange(c.id, 'ACTIVE')}
                              className="px-2 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-emerald-400 text-[11px]"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. COUPONS TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCoupons()}
                placeholder="Search coupon code or name..."
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500 w-56 font-mono"
              />
              <select
                value={couponModeFilter}
                onChange={(e) => setCouponModeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Modes</option>
                <option value="ANY_ELIGIBLE_PURCHASE">Standard Coupons</option>
                <option value="NEXT_ELIGIBLE_PURCHASE">Next-Bill Vouchers Only</option>
              </select>
              <select
                value={couponStatusFilter}
                onChange={(e) => setCouponStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <button
              onClick={() => {
                handleGenerateCode();
                setIsCouponModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-surface-950 font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>

          {/* Coupons Table */}
          <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-surface-800">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Coupon Name</th>
                  <th className="p-3.5">Discount</th>
                  <th className="p-3.5">Min. Bill</th>
                  <th className="p-3.5">Validity Range</th>
                  <th className="p-3.5">Redemptions</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 font-mono">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">
                      No coupons created yet.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-amber-400 flex items-center gap-1.5">
                        <span>{c.code}</span>
                        <button
                          onClick={() => handleCopyCode(c.code)}
                          title="Copy Code"
                          className="p-1 text-slate-500 hover:text-white"
                        >
                          {copiedCode === c.code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="p-3.5 font-sans font-semibold text-white">{c.name}</td>
                      <td className="p-3.5 font-bold text-emerald-400">
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue.toFixed(2)}`}
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {c.minimumPurchase > 0 ? `₹${c.minimumPurchase.toFixed(2)}` : 'None'}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(c.validFrom).toLocaleDateString()} - {new Date(c.validUntil).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {c.currentRedemptionsCount} / {c.maximumRedemptions || '∞'}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            c.applicabilityMode === 'NEXT_ELIGIBLE_PURCHASE'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-surface-950 text-slate-400 border border-surface-800'
                          }`}
                        >
                          {c.applicabilityMode === 'NEXT_ELIGIBLE_PURCHASE' ? 'Next-Bill' : 'Standard'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        {c.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCancelCoupon(c.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. REDEMPTIONS TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'redemptions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Audited Coupon Redemptions ({redemptionsTotal})</span>
            <button
              onClick={() => loadRedemptions(redemptionsPage)}
              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-surface-800">
                <tr>
                  <th className="p-3.5">Redeemed At</th>
                  <th className="p-3.5">Coupon Code</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5 text-right">Bill Before Disc</th>
                  <th className="p-3.5 text-right">Discount Given</th>
                  <th className="p-3.5 text-right">Final Bill Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 font-mono">
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      No coupon redemptions recorded yet.
                    </td>
                  </tr>
                ) : (
                  redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="p-3.5 text-slate-400">{new Date(r.redeemedAt).toLocaleString()}</td>
                      <td className="p-3.5 font-bold text-amber-400">{r.coupon?.code}</td>
                      <td className="p-3.5 font-sans text-white">{r.customer?.name || 'Walk-in Customer'}</td>
                      <td className="p-3.5 text-slate-300 font-semibold">{r.salesInvoice?.invoiceNumber}</td>
                      <td className="p-3.5 text-right text-slate-400">{formatCurrency(r.billAmountBeforeDiscount)}</td>
                      <td className="p-3.5 text-right text-emerald-400 font-bold">-{formatCurrency(r.discountAmount)}</td>
                      <td className="p-3.5 text-right text-white font-bold">{formatCurrency(r.billAmountAfterDiscount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. ROI REPORTS & NEXT-BILL ANALYTICS TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-surface-800 pb-3">
            <button
              onClick={() => setActiveReportSubTab('next_bill')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeReportSubTab === 'next_bill'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Next-Bill Voucher Conversion Analytics
            </button>
            <button
              onClick={() => setActiveReportSubTab('campaign_perf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeReportSubTab === 'campaign_perf'
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Campaign Performance & ROI
            </button>
          </div>

          {activeReportSubTab === 'next_bill' && nextBillReport && (
            <div className="space-y-5">
              {/* Next Bill Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Next-Bill Vouchers Issued</span>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">{nextBillReport.totalIssued}</div>
                </div>
                <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Redeemed on Future Visit</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{nextBillReport.totalRedeemed}</div>
                </div>
                <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Repeat Conversion Rate</span>
                  <div className="text-2xl font-black text-brand-400 font-mono mt-1">{nextBillReport.conversionRate}%</div>
                </div>
                <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Repeat Sales Generated</span>
                  <div className="text-2xl font-black text-white font-mono mt-1">
                    {formatCurrency(nextBillReport.totalRepeatSalesAmount)}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-surface-800">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Issued Date</th>
                      <th className="p-3.5">Valid Until</th>
                      <th className="p-3.5">Redeemed?</th>
                      <th className="p-3.5 text-right">Repeat Bill Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/60 font-mono">
                    {nextBillReport.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-amber-400">{item.couponCode}</td>
                        <td className="p-3.5 font-sans text-white">{item.customerName}</td>
                        <td className="p-3.5 text-slate-400">{new Date(item.issuedAt).toLocaleDateString()}</td>
                        <td className="p-3.5 text-slate-400">{new Date(item.validUntil).toLocaleDateString()}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.isRedeemed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                            }`}
                          >
                            {item.isRedeemed ? 'Redeemed' : 'Unused'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-400">
                          {item.repeatBillAmount ? formatCurrency(item.repeatBillAmount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeReportSubTab === 'campaign_perf' && (
            <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-surface-800">
                  <tr>
                    <th className="p-3.5">Campaign</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Sent</th>
                    <th className="p-3.5">Coupon</th>
                    <th className="p-3.5">Redemptions</th>
                    <th className="p-3.5 text-right">Discounts Given</th>
                    <th className="p-3.5 text-right">Sales Driven</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 font-mono">
                  {campaignPerfReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                        No campaign performance data available yet.
                      </td>
                    </tr>
                  ) : (
                    campaignPerfReport.map((c: any) => (
                      <tr key={c.campaignId} className="hover:bg-surface-800/40 transition-colors">
                        <td className="p-3.5 font-bold font-sans text-white">{c.campaignName}</td>
                        <td className="p-3.5 font-sans">{c.campaignType}</td>
                        <td className="p-3.5 text-slate-300">{c.messagesSent}</td>
                        <td className="p-3.5 font-bold text-amber-400">{c.couponCode || '—'}</td>
                        <td className="p-3.5 text-slate-200">{c.couponRedemptionsCount}</td>
                        <td className="p-3.5 text-right text-rose-400">-{formatCurrency(c.totalDiscountGiven)}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-400">{formatCurrency(c.totalAttributedSales)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CREATE / EDIT CAMPAIGN MODAL
         ───────────────────────────────────────────────────────────── */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-950 border border-surface-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h3 className="text-sm font-bold text-white">Create Promotional Campaign</h3>
              <button onClick={() => setIsCampaignModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="e.g. Diwali Super Savings 2026"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Campaign Type</label>
                  <select
                    value={campaignForm.campaignType}
                    onChange={(e) => setCampaignForm({ ...campaignForm, campaignType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="GENERAL">General Promotion</option>
                    <option value="FESTIVAL">Festival Blast</option>
                    <option value="CLEARANCE">Clearance Sale</option>
                    <option value="VIP_MEMBERS">VIP Customer Exclusive</option>
                    <option value="NEW_LAUNCH">New Product Launch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Customer Group</label>
                  <select
                    value={campaignForm.targetCustomerGroup}
                    onChange={(e) => setCampaignForm({ ...campaignForm, targetCustomerGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="ALL">All Active Customers</option>
                    <option value="INDIVIDUAL">Individual Retail Walk-ins</option>
                    <option value="BUSINESS">Business Accounts</option>
                    <option value="WITH_KHATA">Khata / Credit Customers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={campaignForm.startAt}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startAt: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={campaignForm.endAt}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endAt: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Link Message Template</label>
                  <select
                    value={campaignForm.templateId || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, templateId: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Select a message template...</option>
                    {availableTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.channel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Attach Promotional Coupon</label>
                  <select
                    value={campaignForm.couponId || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, couponId: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                  >
                    <option value="">No coupon attached</option>
                    {availableCoupons.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.code} — {cp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-900 text-slate-300 border border-surface-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/20"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CREATE COUPON MODAL
         ───────────────────────────────────────────────────────────── */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-950 border border-surface-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" />
                <span>Create Discount Coupon</span>
              </h3>
              <button onClick={() => setIsCouponModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Coupon Code</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. FESTIVAL20"
                      required
                      className="flex-1 px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white font-mono uppercase tracking-wider focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="px-3 py-2 rounded-xl bg-surface-900 border border-surface-700 text-amber-400 hover:bg-surface-800"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Applicability</label>
                  <select
                    value={couponForm.applicabilityMode}
                    onChange={(e) => setCouponForm({ ...couponForm, applicabilityMode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ANY_ELIGIBLE_PURCHASE">Any Bill</option>
                    <option value="NEXT_ELIGIBLE_PURCHASE">Next-Bill Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Coupon Title / Display Name</label>
                <input
                  type="text"
                  value={couponForm.name}
                  onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                  placeholder="e.g. Festival Season 10% Discount"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Discount Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {couponForm.discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={couponForm.discountType === 'PERCENTAGE' ? '100' : '100000'}
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Min. Bill Total (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = No minimum"
                    value={couponForm.minimumPurchase || ''}
                    onChange={(e) => setCouponForm({ ...couponForm, minimumPurchase: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={couponForm.maximumDiscount || ''}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, maximumDiscount: e.target.value ? Number(e.target.value) : null })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Valid From</label>
                  <input
                    type="date"
                    value={couponForm.validFrom}
                    onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={couponForm.validUntil}
                    onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Overall Redemptions Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={couponForm.maximumRedemptions}
                    onChange={(e) => setCouponForm({ ...couponForm, maximumRedemptions: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Limit Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    value={couponForm.maximumRedemptionsPerCustomer}
                    onChange={(e) => setCouponForm({ ...couponForm, maximumRedemptionsPerCustomer: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-900 text-slate-300 border border-surface-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-surface-950 font-bold shadow-lg shadow-amber-500/20"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
