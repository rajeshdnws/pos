import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Send,
  FileText,
  History,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';
import {
  CommunicationChannel,
  MessageTemplateDTO,
  MessageTemplateType,
  CommunicationLogDTO,
} from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

export const CommunicationIndexPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'smtp' | 'sms' | 'whatsapp' | 'templates' | 'logs'>('smtp');

  // -------------------------------------------------------------
  // 1. SMTP EMAIL STATE
  // -------------------------------------------------------------
  const [smtpConfig, setSmtpConfig] = useState<any>({
    host: '',
    port: 587,
    secureMode: 'STARTTLS',
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    isEnabled: false,
  });
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestRecipient, setSmtpTestRecipient] = useState('');

  // -------------------------------------------------------------
  // 2. SMS STATE
  // -------------------------------------------------------------
  const [smsConfig, setSmsConfig] = useState<any>({
    providerName: 'MOCK_SMS',
    accountSid: '',
    authToken: '',
    fromPhoneNumber: '',
    isEnabled: false,
  });
  const [smsStatus, setSmsStatus] = useState<any>(null);
  const [showSmsToken, setShowSmsToken] = useState(false);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [smsTestRecipient, setSmsTestRecipient] = useState('');

  // -------------------------------------------------------------
  // 3. WHATSAPP STATE
  // -------------------------------------------------------------
  const [whatsAppConfig, setWhatsAppConfig] = useState<any>({
    providerName: 'MOCK_WHATSAPP',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    isEnabled: false,
  });
  const [whatsAppStatus, setWhatsAppStatus] = useState<any>(null);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [whatsAppTestRecipient, setWhatsAppTestRecipient] = useState('');

  // -------------------------------------------------------------
  // 4. MESSAGE TEMPLATES STATE
  // -------------------------------------------------------------
  const [templates, setTemplates] = useState<MessageTemplateDTO[]>([]);
  const [templateChannelFilter, setTemplateChannelFilter] = useState<CommunicationChannel | 'ALL'>('ALL');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplateDTO | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    name: string;
    channel: CommunicationChannel;
    templateType: MessageTemplateType;
    subject: string;
    body: string;
  }>({
    name: '',
    channel: 'SMS' as CommunicationChannel,
    templateType: 'PROMOTIONAL',
    subject: '',
    body: '',
  });
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ subject?: string; body: string } | null>(null);

  // -------------------------------------------------------------
  // 5. COMMUNICATION LOGS STATE
  // -------------------------------------------------------------
  const [logs, setLogs] = useState<CommunicationLogDTO[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logChannelFilter, setLogChannelFilter] = useState<string>('ALL');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Load configs on mount
  useEffect(() => {
    loadAllConfigs();
  }, []);

  const loadAllConfigs = async () => {
    try {
      // 1. Email Config
      const emailRes = await window.rsInventory.getCommunicationConfig('EMAIL');
      if (emailRes.success && emailRes.data) {
        setSmtpStatus(emailRes.data);
        const p = emailRes.data.configPayload || {};
        setSmtpConfig({
          host: p.host || '',
          port: p.port || 587,
          secureMode: p.secureMode || 'STARTTLS',
          username: p.username || '',
          password: p.password || '',
          fromEmail: p.fromEmail || '',
          fromName: p.fromName || '',
          isEnabled: emailRes.data.isEnabled,
        });
      }

      // 2. SMS Config
      const smsRes = await window.rsInventory.getCommunicationConfig('SMS');
      if (smsRes.success && smsRes.data) {
        setSmsStatus(smsRes.data);
        const p = smsRes.data.configPayload || {};
        setSmsConfig({
          providerName: smsRes.data.providerName || 'MOCK_SMS',
          accountSid: p.accountSid || '',
          authToken: p.authToken || '',
          fromPhoneNumber: p.fromPhoneNumber || '',
          isEnabled: smsRes.data.isEnabled,
        });
      }

      // 3. WhatsApp Config
      const waRes = await window.rsInventory.getCommunicationConfig('WHATSAPP');
      if (waRes.success && waRes.data) {
        setWhatsAppStatus(waRes.data);
        const p = waRes.data.configPayload || {};
        setWhatsAppConfig({
          providerName: waRes.data.providerName || 'MOCK_WHATSAPP',
          phoneNumberId: p.phoneNumberId || '',
          businessAccountId: p.businessAccountId || '',
          accessToken: p.accessToken || '',
          isEnabled: waRes.data.isEnabled,
        });
      }
    } catch (err: any) {
      notify('error', 'Failed to load communication configurations');
    }
  };

  // Load Templates
  const loadTemplates = async () => {
    try {
      const channel = templateChannelFilter === 'ALL' ? undefined : templateChannelFilter;
      const res = await window.rsInventory.listMessageTemplates(channel);
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch (err: any) {
      notify('error', 'Failed to load templates');
    }
  };

  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates();
    } else if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, templateChannelFilter]);

  const loadLogs = async (page = 1) => {
    try {
      const res = await window.rsInventory.listCommunicationLogs({
        page,
        pageSize: 20,
        channel: logChannelFilter === 'ALL' ? undefined : (logChannelFilter as any),
        status: logStatusFilter === 'ALL' ? undefined : (logStatusFilter as any),
        search: logSearch.trim() || undefined,
      });
      if (res.success && res.data) {
        setLogs(res.data.items);
        setLogTotal(res.data.total);
        setLogPage(res.data.page);
      }
    } catch (err: any) {
      notify('error', 'Failed to load communication history');
    }
  };

  // -------------------------------------------------------------
  // SAVE HANDLERS
  // -------------------------------------------------------------
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    try {
      const res = await window.rsInventory.saveCommunicationConfig('EMAIL', smtpConfig);
      if (res.success && res.data) {
        setSmtpStatus(res.data);
        notify('success', 'SMTP Email configuration saved successfully');
      } else {
        notify('error', res.error?.message || 'Failed to save SMTP configuration');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error saving SMTP config');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    try {
      const res = await window.rsInventory.testCommunicationConfig('EMAIL', smtpTestRecipient.trim() || undefined);
      if (res.success && res.data) {
        if (res.data.success) {
          notify('success', res.data.message || 'SMTP Connection Verified!');
        } else {
          notify('error', res.data.message || 'SMTP Test Failed');
        }
        loadAllConfigs();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error testing SMTP connection');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSaveSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSms(true);
    try {
      const res = await window.rsInventory.saveCommunicationConfig('SMS', smsConfig);
      if (res.success && res.data) {
        setSmsStatus(res.data);
        notify('success', 'SMS configuration saved successfully');
      } else {
        notify('error', res.error?.message || 'Failed to save SMS config');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error saving SMS config');
    } finally {
      setIsSavingSms(false);
    }
  };

  const handleTestSms = async () => {
    setIsTestingSms(true);
    try {
      const res = await window.rsInventory.testCommunicationConfig('SMS', smsTestRecipient.trim() || undefined);
      if (res.success && res.data) {
        if (res.data.success) {
          notify('success', res.data.message || 'SMS test message sent!');
        } else {
          notify('error', res.data.message || 'SMS test failed');
        }
        loadAllConfigs();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error testing SMS');
    } finally {
      setIsTestingSms(false);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsApp(true);
    try {
      const res = await window.rsInventory.saveCommunicationConfig('WHATSAPP', whatsAppConfig);
      if (res.success && res.data) {
        setWhatsAppStatus(res.data);
        notify('success', 'WhatsApp configuration saved successfully');
      } else {
        notify('error', res.error?.message || 'Failed to save WhatsApp config');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error saving WhatsApp config');
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTestingWhatsApp(true);
    try {
      const res = await window.rsInventory.testCommunicationConfig('WHATSAPP', whatsAppTestRecipient.trim() || undefined);
      if (res.success && res.data) {
        if (res.data.success) {
          notify('success', res.data.message || 'WhatsApp test message verified!');
        } else {
          notify('error', res.data.message || 'WhatsApp test failed');
        }
        loadAllConfigs();
      }
    } catch (err: any) {
      notify('error', err.message || 'Error testing WhatsApp');
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  // -------------------------------------------------------------
  // TEMPLATE CRUD
  // -------------------------------------------------------------
  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      channel: 'SMS',
      templateType: 'PROMOTIONAL',
      subject: '',
      body: 'Hello {{customer_name}}, enjoy our special offers at {{business_name}}! Use code {{coupon_code}} for {{discount_value}} off.',
    });
    setIsTemplateModalOpen(true);
  };

  const openEditTemplateModal = (t: MessageTemplateDTO) => {
    setEditingTemplate(t);
    setTemplateForm({
      name: t.name,
      channel: t.channel,
      templateType: t.templateType,
      subject: t.subject || '',
      body: t.body,
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        const res = await window.rsInventory.updateMessageTemplate(editingTemplate.id, templateForm);
        if (res.success) {
          notify('success', 'Template updated successfully');
          setIsTemplateModalOpen(false);
          loadTemplates();
        }
      } else {
        const res = await window.rsInventory.createMessageTemplate(templateForm);
        if (res.success) {
          notify('success', 'Template created successfully');
          setIsTemplateModalOpen(false);
          loadTemplates();
        }
      }
    } catch (err: any) {
      notify('error', err.message || 'Error saving template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await window.rsInventory.deleteMessageTemplate(id);
      if (res.success) {
        notify('success', 'Template deleted');
        loadTemplates();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to delete template');
    }
  };

  const handlePreviewTemplate = async (t: MessageTemplateDTO) => {
    try {
      const res = await window.rsInventory.previewMessageTemplate(t.id);
      if (res.success && res.data) {
        setPreviewContent(res.data);
        setPreviewModalOpen(true);
      }
    } catch (err: any) {
      notify('error', 'Failed to generate preview');
    }
  };

  // -------------------------------------------------------------
  // LOG RETRY
  // -------------------------------------------------------------
  const handleRetryLog = async (id: string) => {
    setRetryingLogId(id);
    try {
      const res = await window.rsInventory.retryCommunicationLog(id);
      if (res.success) {
        notify('success', 'Message re-queued for delivery');
        loadLogs(logPage);
      } else {
        notify('error', res.error?.message || 'Failed to retry message');
      }
    } catch (err: any) {
      notify('error', err.message || 'Retry error');
    } finally {
      setRetryingLogId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-brand-400" />
            <span>Communication & Messaging Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure SMTP email, SMS, and WhatsApp integrations, manage message templates, and track delivery history.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-900 border border-surface-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('smtp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'smtp'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email (SMTP)</span>
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'sms'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>SMS</span>
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. SMTP EMAIL CONFIGURATION TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'smtp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-800">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Custom SMTP Server Settings</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smtpConfig.isEnabled}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, isEnabled: e.target.checked })}
                  className="rounded bg-surface-950 border-surface-700 text-brand-500 focus:ring-0"
                />
                <span className="text-xs font-semibold text-slate-300">Enable Email Dispatch</span>
              </label>
            </div>

            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    placeholder="e.g. smtp.gmail.com"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Port</label>
                  <input
                    type="number"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                    placeholder="587"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Security / Encryption</label>
                  <select
                    value={smtpConfig.secureMode}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, secureMode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="STARTTLS">STARTTLS (Port 587 - Recommended)</option>
                    <option value="TLS">TLS / SSL (Port 465)</option>
                    <option value="PLAIN">Plain / No Encryption (Port 25)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    value={smtpConfig.username}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                    placeholder="billing@company.com"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  SMTP Password / App Password
                </label>
                <div className="relative">
                  <input
                    type={showSmtpPassword ? 'text' : 'password'}
                    value={smtpConfig.password}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  🔒 Stored securely with AES-256-GCM encryption. Never exposed in cleartext.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">From Email Address</label>
                  <input
                    type="email"
                    value={smtpConfig.fromEmail}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                    placeholder="sales@company.com"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">From Display Name</label>
                  <input
                    type="text"
                    value={smtpConfig.fromName}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                    placeholder="RS Inventory Store"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSmtp}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-lg shadow-brand-600/20 disabled:opacity-50"
                >
                  {isSavingSmtp ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>

          {/* Test & Status Sidebar Card */}
          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Connection Status</h4>

            {smtpStatus?.lastTestStatus ? (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  smtpStatus.lastTestStatus === 'SUCCESS'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {smtpStatus.lastTestStatus === 'SUCCESS' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-bold">
                    {smtpStatus.lastTestStatus === 'SUCCESS' ? 'Connection Verified' : 'Connection Failed'}
                  </div>
                  <div className="text-slate-300">{smtpStatus.lastTestMessage}</div>
                  {smtpStatus.lastTestedAt && (
                    <div className="text-[10px] text-slate-500">
                      Tested: {new Date(smtpStatus.lastTestedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 text-slate-400 text-xs text-center">
                Not tested yet. Save settings and test connection below.
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-300">Test Email Recipient</label>
              <input
                type="email"
                value={smtpTestRecipient}
                onChange={(e) => setSmtpTestRecipient(e.target.value)}
                placeholder="test@yourdomain.com"
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="w-full py-2 px-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-surface-700 transition-colors disabled:opacity-50"
              >
                {isTestingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isTestingSmtp ? 'Verifying...' : 'Test Connection & Send Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. SMS CONFIGURATION TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'sms' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-800">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-brand-400" />
                <h3 className="text-sm font-bold text-white">SMS Provider Settings</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsConfig.isEnabled}
                  onChange={(e) => setSmsConfig({ ...smsConfig, isEnabled: e.target.checked })}
                  className="rounded bg-surface-950 border-surface-700 text-brand-500 focus:ring-0"
                />
                <span className="text-xs font-semibold text-slate-300">Enable SMS Dispatch</span>
              </label>
            </div>

            <form onSubmit={handleSaveSms} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">SMS Provider</label>
                <select
                  value={smsConfig.providerName}
                  onChange={(e) => setSmsConfig({ ...smsConfig, providerName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="MOCK_SMS">Mock SMS (Simulation for Offline / Testing)</option>
                  <option value="TWILIO">Twilio SMS Gateway</option>
                </select>
              </div>

              {smsConfig.providerName === 'TWILIO' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Twilio Account SID</label>
                      <input
                        type="text"
                        value={smsConfig.accountSid}
                        onChange={(e) => setSmsConfig({ ...smsConfig, accountSid: e.target.value })}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">From Phone Number</label>
                      <input
                        type="text"
                        value={smsConfig.fromPhoneNumber}
                        onChange={(e) => setSmsConfig({ ...smsConfig, fromPhoneNumber: e.target.value })}
                        placeholder="+1234567890"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Twilio Auth Token</label>
                    <div className="relative">
                      <input
                        type={showSmsToken ? 'text' : 'password'}
                        value={smsConfig.authToken}
                        onChange={(e) => setSmsConfig({ ...smsConfig, authToken: e.target.value })}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-10 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmsToken(!showSmsToken)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showSmsToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      🔒 Auth token is stored encrypted using AES-256-GCM.
                    </span>
                  </div>
                </>
              )}

              {smsConfig.providerName === 'MOCK_SMS' && (
                <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-200">Mock SMS Mode Active</div>
                  <div>
                    Messages are simulated and recorded directly to communication logs with mock delivery receipts.
                    Ideal for offline testing and development without cellular gateway charges.
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSms}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-lg shadow-brand-600/20 disabled:opacity-50"
                >
                  {isSavingSms ? 'Saving...' : 'Save SMS Configuration'}
                </button>
              </div>
            </form>
          </div>

          {/* Test Sidebar Card */}
          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">SMS Verification</h4>

            {smsStatus?.lastTestStatus && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  smsStatus.lastTestStatus === 'SUCCESS'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {smsStatus.lastTestStatus === 'SUCCESS' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-bold">
                    {smsStatus.lastTestStatus === 'SUCCESS' ? 'SMS Gateway Verified' : 'Test Failed'}
                  </div>
                  <div className="text-slate-300">{smsStatus.lastTestMessage}</div>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-300">Test Phone Number</label>
              <input
                type="text"
                value={smsTestRecipient}
                onChange={(e) => setSmsTestRecipient(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestSms}
                disabled={isTestingSms}
                className="w-full py-2 px-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-surface-700 transition-colors disabled:opacity-50"
              >
                {isTestingSms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isTestingSms ? 'Sending...' : 'Send Test SMS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. WHATSAPP CONFIGURATION TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">WhatsApp Integration Settings</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsAppConfig.isEnabled}
                  onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, isEnabled: e.target.checked })}
                  className="rounded bg-surface-950 border-surface-700 text-brand-500 focus:ring-0"
                />
                <span className="text-xs font-semibold text-slate-300">Enable WhatsApp Dispatch</span>
              </label>
            </div>

            <form onSubmit={handleSaveWhatsApp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp Provider</label>
                <select
                  value={whatsAppConfig.providerName}
                  onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, providerName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="MOCK_WHATSAPP">Mock WhatsApp (Simulation for Offline / Testing)</option>
                  <option value="WHATSAPP_CLOUD">Meta WhatsApp Cloud API (Official)</option>
                </select>
              </div>

              {whatsAppConfig.providerName === 'WHATSAPP_CLOUD' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number ID</label>
                      <input
                        type="text"
                        value={whatsAppConfig.phoneNumberId}
                        onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, phoneNumberId: e.target.value })}
                        placeholder="e.g. 1048291029384"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Business Account ID</label>
                      <input
                        type="text"
                        value={whatsAppConfig.businessAccountId}
                        onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, businessAccountId: e.target.value })}
                        placeholder="e.g. 1928374659283"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">System User Access Token</label>
                    <div className="relative">
                      <input
                        type={showWhatsAppToken ? 'text' : 'password'}
                        value={whatsAppConfig.accessToken}
                        onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, accessToken: e.target.value })}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-10 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showWhatsAppToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      🔒 Meta Access Token is encrypted using AES-256-GCM.
                    </span>
                  </div>
                </>
              )}

              {whatsAppConfig.providerName === 'MOCK_WHATSAPP' && (
                <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-emerald-400">Mock WhatsApp Mode Active</div>
                  <div>
                    Simulates WhatsApp messaging and records delivered status to communication history without needing Meta Developer accounts.
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingWhatsApp}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-lg shadow-brand-600/20 disabled:opacity-50"
                >
                  {isSavingWhatsApp ? 'Saving...' : 'Save WhatsApp Configuration'}
                </button>
              </div>
            </form>
          </div>

          {/* Test WhatsApp Sidebar Card */}
          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">WhatsApp Verification</h4>

            {whatsAppStatus?.lastTestStatus && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  whatsAppStatus.lastTestStatus === 'SUCCESS'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {whatsAppStatus.lastTestStatus === 'SUCCESS' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-bold">
                    {whatsAppStatus.lastTestStatus === 'SUCCESS' ? 'WhatsApp Verified' : 'Test Failed'}
                  </div>
                  <div className="text-slate-300">{whatsAppStatus.lastTestMessage}</div>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-300">Test WhatsApp Number</label>
              <input
                type="text"
                value={whatsAppTestRecipient}
                onChange={(e) => setWhatsAppTestRecipient(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-800 text-white focus:outline-none focus:border-brand-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestWhatsApp}
                disabled={isTestingWhatsApp}
                className="w-full py-2 px-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-surface-700 transition-colors disabled:opacity-50"
              >
                {isTestingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isTestingWhatsApp ? 'Verifying...' : 'Send Test WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MESSAGE TEMPLATES TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={templateChannelFilter}
                onChange={(e) => setTemplateChannelFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Channels</option>
                <option value="EMAIL">Email Templates</option>
                <option value="SMS">SMS Templates</option>
                <option value="WHATSAPP">WhatsApp Templates</option>
              </select>
            </div>

            <button
              type="button"
              onClick={openCreateTemplateModal}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 shadow-lg shadow-brand-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-surface-900 border border-surface-800 flex flex-col justify-between space-y-4 hover:border-surface-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        t.channel === 'EMAIL'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : t.channel === 'SMS'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {t.channel}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase">{t.templateType}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white truncate">{t.name}</h4>
                  {t.subject && <div className="text-xs text-slate-400 truncate">Sub: {t.subject}</div>}

                  <p className="text-xs text-slate-400 line-clamp-3 bg-surface-950 p-3 rounded-xl border border-surface-850 font-mono whitespace-pre-wrap">
                    {t.body}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-surface-800 text-xs">
                  <button
                    type="button"
                    onClick={() => handlePreviewTemplate(t)}
                    className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditTemplateModal(t)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. COMMUNICATION LOGS & HISTORY TAB
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadLogs(1)}
                placeholder="Search recipient phone/email..."
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500 w-56"
              />
              <select
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Channels</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DELIVERED">Delivered</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
              <button
                type="button"
                onClick={() => loadLogs(1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200"
              >
                Filter
              </button>
            </div>

            <div className="text-xs text-slate-400">Total logs: {logTotal}</div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-surface-800">
                <tr>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Channel</th>
                  <th className="p-3.5">Recipient</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Reason / Error</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 font-mono">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      No communication records found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="p-3.5 text-slate-400">{new Date(log.submittedAt).toLocaleTimeString()}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.channel === 'EMAIL'
                              ? 'bg-blue-500/10 text-blue-400'
                              : log.channel === 'SMS'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {log.channel}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-white">{log.recipientReference}</td>
                      <td className="p-3.5 text-slate-400 text-[11px] font-sans">{log.messageType}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : log.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-xs font-sans max-w-xs truncate">
                        {log.failureReason || '—'}
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        {log.status === 'FAILED' && (
                          <button
                            type="button"
                            disabled={retryingLogId === log.id}
                            onClick={() => handleRetryLog(log.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-surface-800 hover:bg-surface-700 text-brand-400 transition-colors"
                          >
                            {retryingLogId === log.id ? 'Retrying...' : 'Retry'}
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
          TEMPLATE CREATE / EDIT MODAL
         ───────────────────────────────────────────────────────────── */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-950 border border-surface-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h3 className="text-sm font-bold text-white">
                {editingTemplate ? 'Edit Message Template' : 'Create Message Template'}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Template Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    required
                    placeholder="e.g. Festival Offer SMS"
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Channel</label>
                  <select
                    value={templateForm.channel}
                    onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
              </div>

              {templateForm.channel === 'EMAIL' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    placeholder="Special Coupon for you from {{business_name}}"
                    className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Message Body</label>
                <textarea
                  rows={5}
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-surface-900 border border-surface-800 text-white font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Supported Placeholders helper */}
              <div className="p-3 rounded-xl bg-surface-900 border border-surface-850 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Available Placeholders</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{{customer_name}}',
                    '{{business_name}}',
                    '{{coupon_code}}',
                    '{{discount_value}}',
                    '{{minimum_purchase}}',
                    '{{valid_until}}',
                  ].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setTemplateForm({ ...templateForm, body: `${templateForm.body} ${ph}` })}
                      className="px-2 py-0.5 rounded bg-surface-950 hover:bg-surface-800 text-[10px] font-mono text-brand-400 border border-surface-800"
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-900 text-slate-300 border border-surface-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/20"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TEMPLATE PREVIEW MODAL
         ───────────────────────────────────────────────────────────── */}
      {previewModalOpen && previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-950 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-400" />
                <span>Message Live Preview</span>
              </h3>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 space-y-3 font-sans text-xs">
              {previewContent.subject && (
                <div className="pb-2 border-b border-surface-800 text-slate-300 font-semibold">
                  <span className="text-slate-500">Subject: </span>
                  {previewContent.subject}
                </div>
              )}
              <div className="text-white whitespace-pre-wrap leading-relaxed">
                {previewContent.body}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
