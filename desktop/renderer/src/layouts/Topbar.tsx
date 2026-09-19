import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Database,
  ShieldCheck,
  User as UserIcon,
  Minus,
  Square,
  X,
  LogOut,
  Building2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useApplicationStore } from '../store/applicationStore';
import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import { useLicenseStore } from '../store/licenseStore';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { databaseHealth, config } = useApplicationStore();
  const { currentUser, logout } = useAuthStore();
  const { company } = useCompanyStore();
  const { status: licenseStatus, fetchStatus: fetchLicenseStatus } = useLicenseStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  React.useEffect(() => {
    fetchLicenseStatus();
  }, [fetchLicenseStatus]);

  const handleWindowAction = (action: 'minimize' | 'maximize' | 'close') => {
    if (typeof window !== 'undefined' && window.rsInventory) {
      window.rsInventory.windowControl(action);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isDbConnected = databaseHealth?.status === 'connected';

  return (
    <>
      <header className="h-16 border-b border-surface-800/80 bg-surface-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 select-none">
        {/* Left Title & Version & Company */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white truncate max-w-[200px] inline-block align-middle">
                {company?.name || 'RS Inventory'}
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
                v{config?.appVersion || '1.0.0'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls & Status */}
        <div className="flex items-center gap-3">
          {/* Database Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-surface-900 border border-surface-800">
            <Database
              className={`h-3.5 w-3.5 ${isDbConnected ? 'text-emerald-400' : 'text-rose-400'}`}
            />
            <span className="text-slate-300">SQLite</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${isDbConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}
            />
            {databaseHealth && (
              <span className="text-[10px] text-slate-500">{databaseHealth.latencyMs}ms</span>
            )}
          </div>

          {/* License Status Chip */}
          <Link
            to="/settings/license"
            className={`hidden md:flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
              licenseStatus?.status === 'VALID'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : licenseStatus?.isTrial
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : licenseStatus?.isExpired
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-surface-900 text-slate-300 border-surface-800 hover:bg-surface-800'
            }`}
            title="View Product License & Entitlements"
          >
            <KeyRound className="h-3 w-3" />
            <span>
              {licenseStatus?.status === 'VALID'
                ? 'Solo Licensed'
                : licenseStatus?.isTrial
                ? `Trial (${licenseStatus.daysRemaining ?? 'Active'})`
                : licenseStatus?.isExpired
                ? 'Expired'
                : 'Evaluation'}
            </span>
          </Link>

          {/* Security / Offline Badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-surface-900 px-3 py-1 rounded-full border border-surface-800">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
            <span>Offline Solo</span>
          </div>

          {/* User Profile Link */}
          <Link
            to="/settings/profile"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-surface-800/80 transition-colors border border-transparent hover:border-surface-700"
            title="Manage Profile"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300 font-semibold text-xs">
              {currentUser?.name ? (
                currentUser.name.charAt(0).toUpperCase()
              ) : (
                <UserIcon className="h-4 w-4" />
              )}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-medium text-slate-200 leading-tight">
                {currentUser?.name || 'User'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {typeof currentUser?.role === 'object'
                  ? currentUser?.role?.name
                  : currentUser?.role || 'ADMIN'}
              </div>
            </div>
          </Link>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>

          {/* Window Controls (Native or Frameless support) */}
          <div className="flex items-center gap-1 pl-2 border-l border-surface-800">
            <button
              onClick={() => handleWindowAction('minimize')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
              title="Minimize"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleWindowAction('maximize')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
              title="Maximize"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleWindowAction('close')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Sign Out</h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to logout of RS Inventory?
                </p>
              </div>
            </div>

            <div className="bg-surface-950 p-3 rounded-xl border border-surface-800 text-xs text-slate-400">
              Active user: <span className="font-semibold text-slate-200">{currentUser?.name}</span>{' '}
              ({currentUser?.username})
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoggingOut ? 'Signing out...' : 'Yes, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
