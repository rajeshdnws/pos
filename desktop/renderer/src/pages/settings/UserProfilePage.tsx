import React, { useState } from 'react';
import { User, Lock, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

export const UserProfilePage: React.FC = () => {
  const { currentUser, updateCurrentUser } = useAuthStore();
  const { notify } = useNotificationStore();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [mobile, setMobile] = useState(currentUser?.mobile || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notify('error', 'Name cannot be empty.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory && currentUser) {
        const res = await window.rsInventory.updateUser(currentUser.id, {
          name: name.trim(),
          email: email.trim() || undefined,
          mobile: mobile.trim() || undefined,
        });

        if (res.success && res.data) {
          updateCurrentUser(res.data);
          notify('success', 'Profile updated successfully.');
        } else {
          notify('error', res.error?.message || 'Failed to update profile.');
        }
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError(
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
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
        } else {
          setPasswordError(res.error?.message || 'Failed to change password.');
        }
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">My Profile</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your account credentials and personal details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-surface-800">
            <div className="h-9 w-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Personal Information</h2>
              <p className="text-[11px] text-slate-400">
                Role:{' '}
                <span className="text-brand-300 font-semibold">
                  {currentUser?.role?.name || 'Administrator'}
                </span>
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Username (Permanent)
              </label>
              <input
                type="text"
                value={currentUser?.username || ''}
                disabled
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-800 text-slate-500 text-xs font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Number</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-medium text-white hover:bg-brand-500 active:scale-95 transition-all shadow-md shadow-brand-600/20"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-surface-800">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Security & Password</h2>
              <p className="text-[11px] text-slate-400">Update your login security credentials</p>
            </div>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-medium text-white hover:bg-amber-500 active:scale-95 transition-all shadow-md shadow-amber-600/20"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
