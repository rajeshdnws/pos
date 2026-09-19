import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  FileKey,
  Search,
  RefreshCw,
  Lock,
  Laptop,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { AuditLog, SystemInfo } from '@rs-inventory/types';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

export const SecurityAuditPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { notify } = useNotificationStore();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [limit, setLimit] = useState(100);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchLogsAndSystem = async () => {
    setIsLoadingLogs(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const [logsRes, sysRes] = await Promise.all([
          window.rsInventory.getAuditLogs(limit),
          window.rsInventory.getSystemInfo(),
        ]);

        if (logsRes.success && logsRes.data) {
          setLogs(logsRes.data);
        }
        if (sysRes.success && sysRes.data) {
          setSystemInfo(sysRes.data);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogsAndSystem();
  }, [limit]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      notify('error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      notify('error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('error', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.changePassword({
          currentPassword,
          newPassword,
        });

        if (res.success) {
          notify('success', 'Password changed successfully.');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          await fetchLogsAndSystem();
        } else {
          notify('error', res.error?.message || 'Failed to change password.');
        }
      }
    } catch (err: any) {
      notify('error', err?.message || 'Error changing password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedModule !== 'ALL' && log.module?.toLowerCase() !== selectedModule.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchModule = log.module?.toLowerCase().includes(q);
      const matchDetails = ((log.newValue || '') + (log.oldValue || '')).toLowerCase().includes(q);
      const matchUser = (
        log.userId ||
        log.user?.username ||
        log.user?.name ||
        ''
      ).toLowerCase().includes(q);
      if (!matchAction && !matchModule && !matchDetails && !matchUser) {
        return false;
      }
    }
    return true;
  });

  const uniqueModules = Array.from(new Set(logs.map((l) => l.module).filter(Boolean)));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileKey className="h-6 w-6 text-brand-400" />
            Security, Session & Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor active operator sessions, manage password credentials, and inspect immutable system audit trail records.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogsAndSystem}
          disabled={isLoadingLogs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold border border-surface-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Session Card */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-surface-800 pb-3">
            <Laptop className="h-4 w-4 text-brand-400" />
            Active Session Context
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-800/50">
              <span className="text-slate-400">Operator Name:</span>
              <span className="font-semibold text-white">{currentUser?.name || 'Active Operator'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-800/50">
              <span className="text-slate-400">Username:</span>
              <span className="font-mono text-slate-200">@{currentUser?.username || 'user'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-800/50">
              <span className="text-slate-400">Assigned Role:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-950 text-brand-300 border border-brand-800/40">
                {currentUser?.role?.name || 'Authorized Role'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-800/50">
              <span className="text-slate-400">Environment:</span>
              <span className="text-slate-200 uppercase">{systemInfo?.platform || 'windows'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-800/50">
              <span className="text-slate-400">Process RAM:</span>
              <span className="text-slate-200">{systemInfo?.memoryUsageMb || 120} MB</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Connection:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Offline Direct (IPC)
              </span>
            </div>
          </div>
        </div>

        {/* Change Own Password Form */}
        <div className="lg:col-span-2 rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-surface-800 pb-3">
            <KeyRound className="h-4 w-4 text-brand-400" />
            Update Account Credentials
          </div>

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                {isChangingPassword ? 'Changing Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-surface-900/70 border border-surface-800 overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-white">Immutable Security Audit Trail</h2>
            <span className="text-[11px] text-slate-400">({filteredLogs.length} events logged)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit trail..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-44 sm:w-56"
              />
            </div>

            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Modules</option>
              {uniqueModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="200">Last 200</option>
              <option value="500">Last 500</option>
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No audit records matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Details / Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-800 text-slate-300 border border-surface-700">
                        {log.module || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{log.action}</td>
                    <td className="px-4 py-3 font-medium text-slate-300">
                      {log.user?.name || log.user?.username || (log.userId ? log.userId.slice(0, 8) + '...' : 'SYSTEM')}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300 truncate max-w-md">
                      {log.newValue || log.oldValue || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
