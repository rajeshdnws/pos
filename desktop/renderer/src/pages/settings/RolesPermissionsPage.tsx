import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Save,
  Lock,
  Users,
  X,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  RoleWithPermissionsDTO,
  PermissionDefinition,
  RoleCreateDTO,
  RoleUpdateDTO,
} from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

export const RolesPermissionsPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [roles, setRoles] = useState<RoleWithPermissionsDTO[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionDefinition[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [assignedCodes, setAssignedCodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [roleForm, setRoleForm] = useState<{ name: string; description: string }>({
    name: '',
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const loadMatrix = async () => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const [rolesRes, permsRes] = await Promise.all([
          window.rsInventory.getRolesMatrix(),
          window.rsInventory.listAllPermissions(),
        ]);

        if (rolesRes.success && rolesRes.data) {
          setRoles(rolesRes.data);
          if (!selectedRoleId && rolesRes.data.length > 0) {
            const firstRole = rolesRes.data[0];
            if (firstRole) {
              setSelectedRoleId(firstRole.id);
              setAssignedCodes(new Set(firstRole.permissions.map((p) => p.permission.code)));
            }
          } else if (selectedRoleId) {
            const found = rolesRes.data.find((r) => r.id === selectedRoleId);
            if (found) {
              setAssignedCodes(new Set(found.permissions.map((p) => p.permission.code)));
            }
          }
        }

        if (permsRes.success && permsRes.data) {
          setAllPermissions(permsRes.data);
        }
      }
    } catch (err: any) {
      notify('error', err?.message || 'Failed to load roles matrix.');
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const handleSelectRole = (role: RoleWithPermissionsDTO) => {
    setSelectedRoleId(role.id);
    setAssignedCodes(new Set(role.permissions.map((p) => p.permission.code)));
  };

  const togglePermission = (code: string) => {
    if (selectedRole?.isSystemRole && selectedRole.name === 'Administrator') {
      notify('info', 'Administrator always has full unrestricted access.');
      return;
    }
    setAssignedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleModulePermissions = (modulePerms: PermissionDefinition[]) => {
    if (selectedRole?.isSystemRole && selectedRole.name === 'Administrator') return;

    const allAssigned = modulePerms.every((p) => assignedCodes.has(p.code));
    setAssignedCodes((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allAssigned) {
          next.delete(p.code);
        } else {
          next.add(p.code);
        }
      }
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.updateRolePermissions(
          selectedRoleId,
          Array.from(assignedCodes),
        );
        if (res.success) {
          notify('success', 'Role permissions updated successfully.');
          await loadMatrix();
        } else {
          notify('error', res.error?.message || 'Failed to update role permissions.');
        }
      }
    } catch (err: any) {
      notify('error', err?.message || 'Error updating permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!roleForm.name.trim()) {
      setFormError('Role Name is required.');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const dto: RoleCreateDTO = {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
          permissionCodes: [],
        };
        const res = await window.rsInventory.createRole(dto);
        if (res.success && res.data) {
          notify('success', `Role "${res.data.name}" created.`);
          setShowCreateModal(false);
          setRoleForm({ name: '', description: '' });
          await loadMatrix();
          setSelectedRoleId(res.data.id);
        } else {
          setFormError(res.error?.message || 'Failed to create role.');
        }
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error creating role.');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setFormError(null);
    if (!roleForm.name.trim()) {
      setFormError('Role Name is required.');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const dto: RoleUpdateDTO = {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
        };
        const res = await window.rsInventory.updateRole(selectedRole.id, dto);
        if (res.success) {
          notify('success', 'Role details updated.');
          setShowEditModal(false);
          await loadMatrix();
        } else {
          setFormError(res.error?.message || 'Failed to update role.');
        }
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error updating role.');
    }
  };

  const handleDeleteRole = async (role: RoleWithPermissionsDTO) => {
    if (role.isSystemRole) {
      notify('error', 'System default roles cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete custom role "${role.name}"?`)) {
      try {
        if (typeof window !== 'undefined' && window.rsInventory) {
          const res = await window.rsInventory.deleteRole(role.id);
          if (res.success) {
            notify('success', `Role "${role.name}" deleted.`);
            await loadMatrix();
          } else {
            notify('error', res.error?.message || 'Failed to delete role.');
          }
        }
      } catch (err: any) {
        notify('error', err?.message || 'Error deleting role.');
      }
    }
  };

  // Group permissions by module
  const permissionsByModule = React.useMemo(() => {
    const map: Record<string, PermissionDefinition[]> = {};
    for (const p of allPermissions) {
      if (
        searchQuery &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.module.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        continue;
      }
      if (!map[p.module]) {
        map[p.module] = [];
      }
      map[p.module]!.push(p);
    }
    return map;
  }, [allPermissions, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-brand-400" />
            Roles & Permission Matrix
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Define custom employee roles and configure granular access control permissions across all modules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRoleForm({ name: '', description: '' });
            setFormError(null);
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Custom Role
        </button>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {roles.map((role) => {
          const isSelected = role.id === selectedRoleId;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => handleSelectRole(role)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-brand-950/70 border-brand-500 shadow-md shadow-brand-500/10'
                  : 'bg-surface-900/70 border-surface-800 hover:border-surface-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold text-white truncate">{role.name}</span>
                {role.isSystemRole ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface-800 text-slate-300">
                    System
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                    Custom
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{role.description || 'Custom role'}</p>
              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{role.userCount || 0} Users</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Role Matrix Header */}
      {selectedRole && (
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{selectedRole.name}</h2>
              {selectedRole.isSystemRole ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-surface-800 px-2 py-0.5 rounded-full">
                  <Lock className="h-3 w-3" /> System Managed Role
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRoleForm({
                        name: selectedRole.name,
                        description: selectedRole.description || '',
                      });
                      setFormError(null);
                      setShowEditModal(true);
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" /> Edit Info
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(selectedRole)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {selectedRole.description || 'Assigned permissions determine access for this role.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search permissions..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-48 sm:w-64"
              />
            </div>
            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={isSaving || (selectedRole.isSystemRole && selectedRole.name === 'Administrator')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save Matrix'}
            </button>
          </div>
        </div>
      )}

      {/* Permission Modules Matrix */}
      <div className="space-y-4">
        {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
          const allAssigned = perms.every((p) => assignedCodes.has(p.code));
          const isAdmin = selectedRole?.isSystemRole && selectedRole.name === 'Administrator';

          return (
            <div
              key={moduleName}
              className="rounded-2xl bg-surface-900/50 border border-surface-800 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 bg-surface-850/60 border-b border-surface-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-white">{moduleName}</span>
                  <span className="text-[10px] text-slate-400">
                    ({perms.filter((p) => assignedCodes.has(p.code)).length}/{perms.length} granted)
                  </span>
                </div>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleModulePermissions(perms)}
                    className="text-[11px] font-medium text-brand-400 hover:text-brand-300 cursor-pointer flex items-center gap-1.5"
                  >
                    {allAssigned ? (
                      <>
                        <Square className="h-3 w-3" /> Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-3 w-3" /> Select All
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {perms.map((perm) => {
                  const isChecked = isAdmin || assignedCodes.has(perm.code);
                  return (
                    <label
                      key={perm.id}
                      onClick={() => !isAdmin && togglePermission(perm.code)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-brand-950/40 border-brand-500/40 text-slate-100'
                          : 'bg-surface-950/40 border-surface-800/80 text-slate-400 hover:border-surface-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isAdmin}
                        onChange={() => {}}
                        className="mt-0.5 h-4 w-4 rounded border-surface-700 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-200 block truncate">
                          {perm.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block line-clamp-2 mt-0.5">
                          {perm.description || perm.code}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Custom Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-surface-900 border border-surface-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand-400" />
                Create Custom Role
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={roleForm.name}
                  onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Senior Billing Executive"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the duties and intended responsibilities of this role..."
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-100 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 cursor-pointer"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-surface-900 border border-surface-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-brand-400" />
                Edit Custom Role
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={roleForm.name}
                  onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-100 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
