import React, { useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Warehouse,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  Star,
} from 'lucide-react';
import { InventoryLocation, LocationCreateDTO, LocationType, LocationUpdateDTO } from '@rs-inventory/types';

export const StorageLocationsTab: React.FC = () => {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<LocationType>('STORE');
  const [address, setAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const res = await window.rsInventory.listLocations(true);
      if (res.success && res.data) {
        setLocations(res.data);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const openCreateModal = () => {
    setEditingLocation(null);
    setName('');
    setCode('');
    setType('STORE');
    setAddress('');
    setIsDefault(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (loc: InventoryLocation) => {
    setEditingLocation(loc);
    setName(loc.name);
    setCode(loc.code);
    setType((loc.locationType as LocationType) || 'STORE');
    setAddress(loc.description || '');
    setIsDefault(loc.isDefault);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (loc: InventoryLocation) => {
    if (loc.isDefault && loc.isActive) {
      alert('Cannot deactivate the default storage location.');
      return;
    }

    try {
      setLoading(true);
      const res = await window.rsInventory.toggleLocationActive(loc.id);
      if (res.success) {
        await loadLocations();
      } else {
        alert(res.error?.message || 'Failed to toggle location status.');
      }
    } catch (err) {
      console.error('Failed to toggle location active:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Location name is required.');
      return;
    }
    if (!code.trim()) {
      setFormError('Location code is required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingLocation) {
        const dto: LocationUpdateDTO = {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          type,
          address: address.trim() || null,
          isDefault,
        };
        const res = await window.rsInventory.updateLocation(editingLocation.id, dto);
        if (!res.success) {
          setFormError(res.error?.message || 'Failed to update location.');
          return;
        }
      } else {
        const dto: LocationCreateDTO = {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          type,
          address: address.trim() || null,
          isDefault,
        };
        const res = await window.rsInventory.createLocation(dto);
        if (!res.success) {
          setFormError(res.error?.message || 'Failed to create location.');
          return;
        }
      }

      setIsModalOpen(false);
      await loadLocations();
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div>
          <h2 className="text-sm font-bold text-white">Storage Locations & Warehouses</h2>
          <p className="text-xs text-slate-400">Configure physical stock holding locations, display counters, and warehouse zones.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLocations}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Location</span>
          </button>
        </div>
      </div>

      {/* Locations Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Location Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Location Type</th>
                <th className="py-3 px-4">Description / Address</th>
                <th className="py-3 px-4 text-center">Default Store</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading storage locations...</span>
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Warehouse className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <span>No storage locations configured.</span>
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{loc.name}</span>
                        {loc.isDefault && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            <Star className="h-3 w-3 fill-amber-400" />
                            DEFAULT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                      {loc.code}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-medium">
                        {loc.locationType}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                      {loc.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {loc.isDefault ? (
                        <CheckCircle2 className="h-4 w-4 text-amber-400 mx-auto" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          loc.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {loc.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(loc)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition"
                          title="Edit location"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {!loc.isDefault && (
                          <button
                            onClick={() => handleToggleActive(loc)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
                            title={loc.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {loc.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <h3 className="text-base font-bold text-white">
                {editingLocation ? 'Edit Storage Location' : 'Add Storage Location'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Store / Warehouse A / Back Room"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Location Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MAIN, WH-A, DISPLAY"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 uppercase font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Location Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as LocationType)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="STORE">Retail Store / Counter (STORE)</option>
                  <option value="WAREHOUSE">Central Warehouse (WAREHOUSE)</option>
                  <option value="BACK_ROOM">Back Room / Godown (BACK_ROOM)</option>
                  <option value="DISPLAY">Display / Showroom (DISPLAY)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description / Physical Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Physical rack location, address or notes..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Set as Default Store Location</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-semibold shadow-lg shadow-indigo-600/20"
                >
                  {submitting ? 'Saving...' : editingLocation ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
