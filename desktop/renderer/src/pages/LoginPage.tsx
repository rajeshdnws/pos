import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, User, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useApplicationStore } from '../store/applicationStore';
import { useNotificationStore } from '../store/notificationStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { config } = useApplicationStore();
  const { notify } = useNotificationStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await login({
      username: username.trim(),
      password,
    });

    setIsLoading(false);

    if (res.success) {
      notify('success', `Welcome back, ${username}!`);
      navigate('/dashboard');
    } else {
      setErrorMessage(res.error || 'Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-surface-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-surface-900/90 border border-surface-800 rounded-3xl shadow-2xl p-8 backdrop-blur-xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 shadow-lg shadow-brand-500/10">
            <Store className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">RS Inventory</h1>
          <p className="text-xs text-slate-400">Offline Inventory & Billing Software</p>
        </div>

        {/* Error / Lockout Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                autoFocus
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Offline indicator & Version footer */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-surface-800/80">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Local Offline Active</span>
          </div>
          <span>Version {config?.appVersion || '1.0.0'}</span>
        </div>
      </div>
    </div>
  );
};
