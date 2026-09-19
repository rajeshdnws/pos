import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Laptop,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Building,
  FileKey,
  FileCheck,
  Sparkles,
  Info,
  Lock,
} from 'lucide-react';
import { useLicenseStore } from '../../store/licenseStore';
import { useCompanyStore } from '../../store/companyStore';

export const LicenseActivationPage: React.FC = () => {
  const {
    status,
    isLoading,
    isActionLoading,
    error,
    successMessage,
    fetchStatus,
    exportRequest,
    chooseFile,
    importLicenseFile,
    activateContent,
    deactivateLicense,
    clearMessages,
  } = useLicenseStore();

  const { company } = useCompanyStore();

  const [customerNameInput, setCustomerNameInput] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [pastedJson, setPastedJson] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<'file' | 'text'>('file');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (company && company.name && !customerNameInput) {
      setCustomerNameInput(company.name);
    }
  }, [company, customerNameInput]);

  const handleCopyInstallationId = () => {
    if (status?.installationId) {
      navigator.clipboard.writeText(status.installationId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleExportRequest = async () => {
    clearMessages();
    await exportRequest(customerNameInput || company?.name || 'Valued Customer');
  };

  const handleSelectFile = async () => {
    clearMessages();
    const chosen = await chooseFile();
    if (chosen) {
      setSelectedFilePath(chosen);
    }
  };

  const handleApplyFile = async () => {
    if (!selectedFilePath) return;
    clearMessages();
    const success = await importLicenseFile(selectedFilePath);
    if (success) {
      setSelectedFilePath('');
    }
  };

  const handleApplyPastedJson = async () => {
    if (!pastedJson.trim()) return;
    clearMessages();
    const success = await activateContent(pastedJson.trim());
    if (success) {
      setPastedJson('');
    }
  };

  const handleDeactivate = async () => {
    clearMessages();
    await deactivateLicense();
    setShowDeactivateConfirm(false);
  };

  // Status visual badge resolution
  const isPerpetual = status?.licenseType === 'PERPETUAL' && !status.expiresAt;
  const isTrial = status?.isTrial || status?.licenseType === 'TRIAL';
  const isExpired = status?.isExpired || status?.status === 'EXPIRED';
  const isValid = status?.status === 'VALID' || (status?.status === 'TRIAL' && !isExpired);

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface-900 via-surface-900 to-surface-850 p-6 rounded-2xl border border-surface-800/80 shadow-xl shadow-black/20">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>RS ORANGE TECH PVT LTD • Cryptographic Licensing</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Product Licensing & Edition Management
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Manage your offline workstation activation, cryptographic RSA digital certificate, and feature entitlements for RS Inventory – Solo.
          </p>
        </div>
        <button
          onClick={() => fetchStatus()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-surface-800 hover:bg-surface-700 hover:text-white border border-surface-700/60 transition-all cursor-pointer shadow-sm self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3 text-rose-300 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
          <button onClick={clearMessages} className="text-rose-400 hover:text-rose-200">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3 text-emerald-300 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
          <button onClick={clearMessages} className="text-emerald-400 hover:text-emerald-200">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Current License Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-900 border border-surface-800 rounded-2xl p-6 space-y-5 shadow-lg relative overflow-hidden">
          {/* Subtle background glow */}
          <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15 ${
            isExpired ? 'bg-rose-500' : isTrial ? 'bg-amber-500' : isValid ? 'bg-emerald-500' : 'bg-brand-500'
          }`} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl border ${
                isExpired
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : isTrial
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : isValid
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
              }`}>
                {isExpired ? (
                  <ShieldAlert className="h-6 w-6" />
                ) : isTrial ? (
                  <Clock className="h-6 w-6" />
                ) : isValid ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <KeyRound className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {status?.status === 'VALID'
                      ? 'Activated & Licensed'
                      : status?.status === 'TRIAL'
                      ? 'Evaluation Trial'
                      : status?.status === 'EXPIRED'
                      ? 'License Expired'
                      : 'Unactivated Evaluation'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    isExpired
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : isTrial
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : isValid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}>
                    {status?.licenseType || 'EVALUATION'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {status?.message || 'Offline retail POS station'}
                </p>
              </div>
            </div>

            {isValid && (
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition-colors"
              >
                Deactivate Workstation
              </button>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-surface-950/60 p-3.5 rounded-xl border border-surface-800/60 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Current Edition</span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>RS Inventory – {status?.edition || 'Solo'}</span>
                <span className="text-[10px] font-normal px-2 py-0.5 bg-brand-500/20 text-brand-300 rounded-md border border-brand-500/30">
                  Single-PC Offline POS
                </span>
              </div>
            </div>

            <div className="bg-surface-950/60 p-3.5 rounded-xl border border-surface-800/60 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Registered Customer</span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-400" />
                <span>{status?.customerName || 'Evaluation Customer'}</span>
              </div>
            </div>

            <div className="bg-surface-950/60 p-3.5 rounded-xl border border-surface-800/60 space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">Workstation Installation ID (Hardware Locked)</span>
                <button
                  onClick={handleCopyInstallationId}
                  className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 cursor-pointer font-medium"
                >
                  {copiedId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>
              <div className="font-mono text-xs font-semibold text-brand-300 bg-surface-900 px-3 py-2 rounded-lg border border-surface-800 flex items-center gap-2">
                <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{status?.installationId || 'RS-INST-SOLO-UNKNOWN'}</span>
              </div>
            </div>

            <div className="bg-surface-950/60 p-3.5 rounded-xl border border-surface-800/60 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Validity & Expiration</span>
              <div className="text-sm font-semibold text-white">
                {isPerpetual ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Perpetual (Never Expires)
                  </span>
                ) : status?.expiresAt ? (
                  <div>
                    <span>Expires: {new Date(status.expiresAt).toLocaleDateString()}</span>
                    {status.daysRemaining !== null && status.daysRemaining !== undefined && (
                      <span className={`block text-[11px] font-bold ${
                        (status.daysRemaining ?? 0) < 5 ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        ({status.daysRemaining} days remaining)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">Standard Evaluation Mode</span>
                )}
              </div>
            </div>

            <div className="bg-surface-950/60 p-3.5 rounded-xl border border-surface-800/60 space-y-1">
              <span className="text-[11px] font-medium text-slate-400">Software Updates & Support</span>
              <div className="text-sm font-semibold text-white">
                {status?.updateEntitlementUntil ? (
                  <span>Until {new Date(status.updateEntitlementUntil).toLocaleDateString()}</span>
                ) : (
                  <span>Standard Community Support</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edition Summary Card */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 space-y-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">
              <Info className="h-4 w-4 text-brand-400" />
              <span>Edition Tiers</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/30">
                <div className="flex items-center justify-between font-bold text-brand-300">
                  <span>RS Inventory – Solo</span>
                  <span className="text-[10px] px-2 py-0.5 bg-brand-500/30 rounded text-brand-200">ACTIVE</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Single-workstation offline POS, inventory, barcode billing, and full financial ledgers.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-950/40 border border-surface-800/60 opacity-80">
                <div className="flex items-center justify-between font-bold text-slate-300">
                  <span>RS Inventory – LAN</span>
                  <span className="text-[10px] px-2 py-0.5 bg-surface-800 rounded text-slate-400">RESERVED</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Multi-counter LAN synchronization for supermarkets with multiple cashier checkouts.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-950/40 border border-surface-800/60 opacity-80">
                <div className="flex items-center justify-between font-bold text-slate-300">
                  <span>RS Inventory – Business</span>
                  <span className="text-[10px] px-2 py-0.5 bg-surface-800 rounded text-slate-400">RESERVED</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Multi-branch centralized consolidation, HQ reporting, and franchise management.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
            <span>Digital signatures verified with 2048-bit RSA-SHA256 asymmetric keys.</span>
          </div>
        </div>
      </div>

      {/* 3-Step Offline Activation Workflow */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 space-y-6 shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileKey className="h-5 w-5 text-brand-400" />
            <span>Offline Workstation Activation Workflow</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            RS Inventory is 100% offline-first. Activation requires no active internet connection on this PC.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-surface-950/80 border border-surface-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <h3 className="text-sm font-bold text-white">Generate Request</h3>
              </div>
              <p className="text-xs text-slate-400">
                Create a hardware activation request file (<code className="text-brand-300 font-mono">.rsreq</code>) containing your installation ID.
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-medium text-slate-400">Business / Customer Name</label>
                <input
                  type="text"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  placeholder="e.g., Sri Laxmi Supermarket"
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              onClick={handleExportRequest}
              disabled={isActionLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Request (.rsreq)</span>
            </button>
          </div>

          {/* Step 2 */}
          <div className="bg-surface-950/80 border border-surface-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-700 text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <h3 className="text-sm font-bold text-white">Submit to RS ORANGE TECH</h3>
              </div>
              <p className="text-xs text-slate-400">
                Send the exported <code className="text-brand-300 font-mono">.rsreq</code> file to RS ORANGE TECH PVT LTD via email or authorized dealer.
              </p>

              <div className="bg-surface-900 p-3 rounded-lg border border-surface-800 space-y-2 text-[11px] text-slate-300">
                <div className="font-semibold text-white">Official Licensing Desk:</div>
                <div>📧 <span className="text-brand-400">licensing@rsorangetech.com</span></div>
                <div>📞 <span className="text-slate-200">+91 98765 43210 / WhatsApp</span></div>
                <div className="text-[10px] text-slate-500 pt-1">
                  We issue an authentic signed license file (<code className="text-slate-400">.rslic</code>).
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-500 py-1">
              Response time: Under 1 Business Hour
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-surface-950/80 border border-surface-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </div>
                <h3 className="text-sm font-bold text-white">Import & Activate</h3>
              </div>
              <p className="text-xs text-slate-400">
                Import the signed certificate file (<code className="text-emerald-400 font-mono">.rslic</code>) to unlock full functionality.
              </p>

              {/* Tabs for file vs paste */}
              <div className="flex gap-2 border-b border-surface-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveInputTab('file')}
                  className={`text-[11px] font-semibold pb-1 cursor-pointer transition-colors ${
                    activeInputTab === 'file'
                      ? 'text-brand-400 border-b-2 border-brand-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Import File (.rslic)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('text')}
                  className={`text-[11px] font-semibold pb-1 cursor-pointer transition-colors ${
                    activeInputTab === 'text'
                      ? 'text-brand-400 border-b-2 border-brand-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Paste JSON
                </button>
              </div>

              {activeInputTab === 'file' ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSelectFile}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-700/80 hover:border-brand-500/80 rounded-lg text-xs text-slate-300 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="truncate">
                      {selectedFilePath ? selectedFilePath.split('\\').pop() : 'Select .rslic file...'}
                    </span>
                    <Upload className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={pastedJson}
                    onChange={(e) => setPastedJson(e.target.value)}
                    placeholder="Paste signed license JSON here..."
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-700/80 rounded-lg text-[11px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}
            </div>

            <button
              onClick={activeInputTab === 'file' ? handleApplyFile : handleApplyPastedJson}
              disabled={isActionLoading || (activeInputTab === 'file' ? !selectedFilePath : !pastedJson.trim())}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Validate & Activate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Entitlements Checklist */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 space-y-4 shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span>Feature Entitlements Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status of modules enabled under your RS Inventory – Solo edition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {status?.features && status.features.map((feature) => {
            const isReserved = feature.code === 'lan.sync' || feature.code === 'business.multi_branch';
            return (
              <div
                key={feature.code}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                  feature.enabled
                    ? 'bg-surface-950/60 border-emerald-500/20'
                    : isReserved
                    ? 'bg-surface-950/30 border-surface-800/60'
                    : 'bg-surface-950/40 border-surface-800'
                }`}
              >
                <div className="mt-0.5">
                  {feature.enabled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isReserved ? (
                    <Lock className="h-4 w-4 text-slate-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${feature.enabled ? 'text-white' : 'text-slate-400'}`}>
                      {feature.name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      feature.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isReserved
                        ? 'bg-surface-800 text-slate-400 border border-surface-700'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {feature.enabled ? 'ACTIVE' : isReserved ? 'RESERVED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety & Non-Destructive Guarantee Banner */}
      <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 flex items-start gap-3 text-slate-300 text-xs">
        <Info className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">RS ORANGE TECH Non-Destructive Expiration Policy:</span>{' '}
          In the event of license expiration, your business database remains 100% intact. You will never be locked out of past invoices, customer ledgers, inventory counts, reports, or database backups. Only new transaction posting is paused until license renewal.
        </div>
      </div>

      {/* Confirmation Modal for Deactivation */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Deactivate Workstation License?</h3>
            </div>
            <p className="text-xs text-slate-300">
              This will remove the active license certificate from this workstation and return RS Inventory to unactivated evaluation mode. You can re-activate at any time using your <code className="text-brand-300">.rslic</code> certificate file.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-surface-800 hover:bg-surface-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
