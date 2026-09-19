import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle,
  Edit2,
  Loader2,
  Plus,
  Ruler,
  Search,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { Unit, UnitCreateDTO } from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

export const UnitsPage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [formData, setFormData] = useState<UnitCreateDTO>({
    name: '',
    shortCode: '',
    allowDecimals: false,
    isActive: true,
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.listUnits(true);
        if (res.success && res.data) {
          setUnits(res.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const openAddModal = () => {
    setEditingUnit(null);
    setFormData({ name: '', shortCode: '', allowDecimals: false, isActive: true });
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (u: Unit) => {
    setEditingUnit(u);
    setFormData({
      name: u.name,
      shortCode: u.shortCode,
      allowDecimals: u.allowDecimals,
      isActive: u.isActive,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.seedDefaultUnits();
        if (res.success && res.data) {
          setUnits(res.data);
          notify('success', 'Standard retail units (PCS, KG, LTR, etc.) seeded successfully.');
        } else {
          notify('error', res.error?.message || 'Failed to seed default units.');
        }
      }
    } catch (err) {
      notify('error', (err as Error).message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.name.trim()) {
      setModalError('Unit name is required.');
      return;
    }
    if (!formData.shortCode.trim()) {
      setModalError('Unit symbol / short code is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        let res;
        if (editingUnit) {
          res = await window.rsInventory.updateUnit(editingUnit.id, formData);
        } else {
          res = await window.rsInventory.createUnit(formData);
        }

        if (res.success) {
          notify(
            'success',
            `Unit '${formData.name}' (${formData.shortCode.toUpperCase()}) saved successfully.`,
          );
          setShowModal(false);
          fetchUnits();
        } else {
          setModalError(res.error?.message || 'Failed to save unit.');
        }
      }
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (u: Unit) => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.toggleUnitActive(u.id);
        if (res.success) {
          notify(
            'success',
            `Unit '${u.name}' ${res.data?.isActive ? 'activated' : 'deactivated'}.`,
          );
          fetchUnits();
        } else {
          notify('error', res.error?.message || 'Failed to toggle status.');
        }
      }
    } catch (err) {
      notify('error', (err as Error).message);
    }
  };

  const filteredUnits = units.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.shortCode.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search units (e.g. PCS, Kilogram)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-950 border border-surface-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
            title="Seed standard Indian retail units (Piece, KG, Gram, Liter, Box, etc.)"
          >
            {isSeeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
            )}
            <span>Seed Standard Units</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      {/* Units Table */}
      <div className="rounded-2xl bg-surface-900/70 border border-surface-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-950/80 border-b border-surface-800 text-slate-400 font-medium">
              <tr>
                <th className="px-5 py-3.5">Unit Name</th>
                <th className="px-4 py-3.5">Short Code / Symbol</th>
                <th className="px-4 py-3.5">Decimal Allowed</th>
                <th className="px-4 py-3.5">Products Linked</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {isLoading && units.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-500" />
                    Loading measurement units...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    <Ruler className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <div className="font-semibold text-slate-300">No measurement units found</div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {searchQuery
                        ? 'No units match your query'
                        : 'Seed standard units or add your custom retail measurement unit'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={handleSeedDefaults}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 text-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Seed Standard Units</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u) => {
                  const productCount = u._count?.products || 0;
                  return (
                    <tr key={u.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-white">{u.name}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-brand-400">
                        {u.shortCode}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.allowDecimals
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                              : 'bg-slate-800 text-slate-400 border-surface-700'
                          }`}
                        >
                          {u.allowDecimals ? 'Yes (e.g. 1.5 KG)' : 'No (Whole Numbers)'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-surface-800 text-slate-300 border border-surface-700">
                          {productCount} {productCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          />
                          <span>{u.isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
                          title="Edit Unit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={u.isActive ? 'Deactivate Unit' : 'Activate Unit'}
                        >
                          {u.isActive ? (
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

      {/* Add / Edit Unit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Ruler className="h-4 w-4 text-brand-400" />
                <span>{editingUnit ? 'Edit Unit' : 'Add Measurement Unit'}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Unit Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Kilogram, Piece, Liter"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Short Code / Symbol <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.shortCode}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, shortCode: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. KG, PCS, LTR, BOX"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.allowDecimals)}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, allowDecimals: e.target.checked }))
                    }
                    className="h-4 w-4 rounded bg-surface-900 border-surface-700 text-brand-600 focus:ring-0 mt-0.5"
                  />
                  <div>
                    <span className="text-slate-200 font-medium block">
                      Allow Decimal Quantities
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Enable for weighted or volume items (e.g. 1.5 KG, 2.75 LTR). Disable for
                      discrete counts (Piece, Box).
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isActive)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded bg-surface-950 border-surface-700 text-brand-600 focus:ring-0"
                  />
                  <span className="text-slate-300 font-medium">Unit Active</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-slate-300 hover:bg-surface-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{editingUnit ? 'Save Changes' : 'Create Unit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
