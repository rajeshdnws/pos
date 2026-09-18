import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  KeyRound,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit2,
  X,
  Lock,
  Loader2,
} from 'lucide-react';
import { Role, User, UserCreateDTO, UserUpdateDTO } from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

export const UserManagementPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add User Form State
  const [newUserData, setNewUserData] = useState<UserCreateDTO>({
    name: '',
    username: '',
    email: '',
    mobile: '',
    roleId: '',
    password: '',
    isActive: true,
  });

  // Edit User Form State
  const [editUserData, setEditUserData] = useState<UserUpdateDTO>({
    name: '',
    email: '',
    mobile: '',
    roleId: '',
  });

  // Reset Password State
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchUsersAndRoles = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const [usersRes, rolesRes] = await Promise.all([
          window.rsInventory.listUsers(),
          window.rsInventory.getRoles(),
        ]);

        if (usersRes.success && usersRes.data) {
          setUsers(usersRes.data);
        }
        if (rolesRes.success && rolesRes.data) {
          const rolesList = rolesRes.data;
          setRoles(rolesList);
          if (rolesList.length > 0 && !newUserData.roleId) {
            setNewUserData((prev) => ({ ...prev, roleId: rolesList[0]?.id || '' }));
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newUserData.name.trim()) {
      setModalError('Full Name is required.');
      return;
    }
    if (!newUserData.username.trim() || newUserData.username.length < 3) {
      setModalError('Username must be at least 3 characters.');
      return;
    }
    if (!newUserData.password || newUserData.password.length < 8) {
      setModalError('Password must be at least 8 characters long.');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.createUser(newUserData);
        if (res.success) {
          notify('success', `User '${newUserData.username}' created successfully.`);
          setShowAddModal(false);
          setNewUserData({
            name: '',
            username: '',
            email: '',
            mobile: '',
            roleId: roles[0]?.id || '',
            password: '',
            isActive: true,
          });
          fetchUsersAndRoles();
        } else {
          setModalError(res.error?.message || 'Failed to create user.');
        }
      }
    } catch (err) {
      setModalError((err as Error).message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalError(null);

    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.updateUser(selectedUser.id, editUserData);
        if (res.success) {
          notify('success', `User '${selectedUser.username}' updated successfully.`);
          setShowEditModal(false);
          fetchUsersAndRoles();
        } else {
          setModalError(res.error?.message || 'Failed to update user.');
        }
      }
    } catch (err) {
      setModalError((err as Error).message);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.toggleUserActive(user.id);
        if (res.success) {
          notify('success', `User '${user.username}' status updated.`);
          fetchUsersAndRoles();
        } else {
          notify('error', res.error?.message || 'Failed to toggle status.');
        }
      }
    } catch (err) {
      notify('error', (err as Error).message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalError(null);

    if (resetPasswordValue.length < 8) {
      setModalError('Password must be at least 8 characters long.');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.resetUserPassword({
          userId: selectedUser.id,
          newPassword: resetPasswordValue,
        });

        if (res.success) {
          notify('success', `Password reset for user '${selectedUser.username}'.`);
          setShowResetModal(false);
          setResetPasswordValue('');
        } else {
          setModalError(res.error?.message || 'Failed to reset password.');
        }
      }
    } catch (err) {
      setModalError((err as Error).message);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      name: user.name,
      email: user.email || '',
      mobile: user.mobile || '',
      roleId: user.roleId || '',
    });
    setModalError(null);
    setShowEditModal(true);
  };

  const openResetModal = (user: User) => {
    setSelectedUser(user);
    setResetPasswordValue('');
    setModalError(null);
    setShowResetModal(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create employee accounts, assign roles (Administrator, Manager, Cashier), and manage
            credentials.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 active:scale-95 transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* User Table */}
      <div className="rounded-2xl bg-surface-900/70 border border-surface-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/80 border-b border-surface-800 text-slate-400 font-medium">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last Login</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-500" />
                    Loading staff members...
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isAdmin = user.role?.name === 'ADMINISTRATOR';
                  return (
                    <tr key={user.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{user.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">@{user.username}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            isAdmin
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                              : user.role?.name === 'MANAGER'
                                ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          <span>{user.role?.name || 'CASHIER'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div>{user.mobile || '-'}</div>
                        <div className="text-[11px] text-slate-500">{user.email || ''}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            user.isActive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          />
                          <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString('en-IN')
                          : 'Never'}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => openResetModal(user)}
                          className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.isActive ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-brand-400" />
                Add New User Account
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Username *</label>
                <input
                  type="text"
                  value={newUserData.username}
                  onChange={(e) =>
                    setNewUserData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="e.g. skumar"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={newUserData.mobile || ''}
                    onChange={(e) =>
                      setNewUserData((prev) => ({ ...prev, mobile: e.target.value }))
                    }
                    maxLength={10}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Role *</label>
                  <select
                    value={newUserData.roleId}
                    onChange={(e) =>
                      setNewUserData((prev) => ({ ...prev, roleId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserData.email || ''}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="user@store.in"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Password * (Min 8 chars)</label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) =>
                    setNewUserData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-500"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h2 className="text-sm font-semibold text-white">
                Edit User: {selectedUser.username}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editUserData.name || ''}
                  onChange={(e) => setEditUserData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Role</label>
                <select
                  value={editUserData.roleId || ''}
                  onChange={(e) => setEditUserData((prev) => ({ ...prev, roleId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editUserData.email || ''}
                  onChange={(e) => setEditUserData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Mobile</label>
                <input
                  type="text"
                  value={editUserData.mobile || ''}
                  onChange={(e) => setEditUserData((prev) => ({ ...prev, mobile: e.target.value }))}
                  maxLength={10}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                Reset Password: @{selectedUser.username}
              </h2>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">
                  New Password (Min 8 chars, 1 upper, 1 lower, 1 number)
                </label>
                <input
                  type="password"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 font-semibold text-white hover:bg-amber-500"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
