import React, { useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  Save,
  X,
  Search,
} from 'lucide-react';
import {
  InventoryLocation,
  Stocktake,
  StocktakeCreateDTO,
  StocktakeStatus,
} from '@rs-inventory/types';
import { formatDateTime } from '@rs-inventory/business';

export const StocktakeTab: React.FC = () => {
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal / Active Session
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newLocationId, setNewLocationId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Active Counting Session Modal
  const [activeSession, setActiveSession] = useState<Stocktake | null>(null);
  const [sessionItems, setSessionItems] = useState<{ productId: string; name: string; sku: string; unitCode: string; systemQuantity: number; countedQuantity: number; differenceQuantity: number }[]>([]);
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'DISCREPANCY' | 'MATCHED'>('ALL');
  const [sessionSearch, setSessionSearch] = useState('');
  const [savingSession, setSavingSession] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stkRes, locRes] = await Promise.all([
        window.rsInventory.listStocktakes(50),
        window.rsInventory.listLocations(false),
      ]);
      if (stkRes.success && stkRes.data) setStocktakes(stkRes.data);
      if (locRes.success && locRes.data) {
        setLocations(locRes.data);
        if (locRes.data.length > 0 && !newLocationId) {
          const defaultLoc = locRes.data.find((l) => l.isDefault) || locRes.data[0];
          setNewLocationId(defaultLoc.id);
        }
      }
    } catch (err) {
      console.error('Failed to load stocktakes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openSessionModal = async (stocktake: Stocktake) => {
    try {
      const res = await window.rsInventory.getStocktake(stocktake.id);
      if (res.success && res.data) {
        setActiveSession(res.data);
        const mapped = (res.data.items || []).map((item) => ({
          productId: item.productId,
          name: item.product?.name || 'Unknown Product',
          sku: item.product?.sku || '—',
          unitCode: item.product?.unit?.shortCode || 'PCS',
          systemQuantity: item.systemQuantity,
          countedQuantity: item.countedQuantity !== null && item.countedQuantity !== undefined ? item.countedQuantity : item.systemQuantity,
          differenceQuantity: item.differenceQuantity,
        }));
        setSessionItems(mapped);
      }
    } catch (err) {
      console.error('Failed to open session:', err);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setSubmitting(true);
      const dto: StocktakeCreateDTO = {
        locationId: newLocationId || undefined,
        notes: newNotes.trim() || null,
      };

      const res = await window.rsInventory.createStocktake(dto);
      if (!res.success) {
        setFormError(res.error?.message || 'Failed to initialize stocktake.');
        return;
      }

      setIsNewModalOpen(false);
      setNewNotes('');
      await loadData();
      if (res.data) {
        openSessionModal(res.data);
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSession = async () => {
    if (!activeSession) return;
    try {
      setSavingSession(true);
      const res = await window.rsInventory.startStocktake(activeSession.id);
      if (res.success && res.data) {
        setActiveSession(res.data);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setSavingSession(false);
    }
  };

  const handleUpdateItemCount = (productId: string, val: number) => {
    setSessionItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const diff = Number((val - item.systemQuantity).toFixed(4));
          return { ...item, countedQuantity: val, differenceQuantity: diff };
        }
        return item;
      }),
    );
  };

  const handleSaveProgress = async () => {
    if (!activeSession) return;
    try {
      setSavingSession(true);
      await window.rsInventory.updateStocktake(activeSession.id, {
        items: sessionItems.map((i) => ({
          productId: i.productId,
          countedQuantity: i.countedQuantity,
        })),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to save progress:', err);
    } finally {
      setSavingSession(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;
    const confirm = window.confirm(
      'Are you sure you want to complete this stocktake session? This will post permanent stock correction movements for all items with discrepancies.',
    );
    if (!confirm) return;

    try {
      setSavingSession(true);
      // First save latest counts
      await window.rsInventory.updateStocktake(activeSession.id, {
        items: sessionItems.map((i) => ({
          productId: i.productId,
          countedQuantity: i.countedQuantity,
        })),
      });

      // Then complete & post
      const res = await window.rsInventory.completeStocktake(activeSession.id);
      if (res.success && res.data) {
        setActiveSession(null);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to complete stocktake:', err);
    } finally {
      setSavingSession(false);
    }
  };

  const handleCancelSession = async () => {
    if (!activeSession) return;
    const confirm = window.confirm('Are you sure you want to cancel this stocktake session?');
    if (!confirm) return;

    try {
      setSavingSession(true);
      const res = await window.rsInventory.cancelStocktake(activeSession.id);
      if (res.success) {
        setActiveSession(null);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to cancel stocktake:', err);
    } finally {
      setSavingSession(false);
    }
  };

  const filteredSessionItems = sessionItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(sessionSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (sessionFilter === 'DISCREPANCY') return item.differenceQuantity !== 0;
    if (sessionFilter === 'MATCHED') return item.differenceQuantity === 0;
    return true;
  });

  const getStatusBadge = (status: StocktakeStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            DRAFT
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            IN PROGRESS
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div>
          <h2 className="text-sm font-bold text-white">Physical Stocktake Sessions</h2>
          <p className="text-xs text-slate-400">Perform periodic full store or warehouse inventory count audits and reconcile variances.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setIsNewModalOpen(true);
              setFormError(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Count Session</span>
          </button>
        </div>
      </div>

      {/* Stocktake Sessions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Session #</th>
                <th className="py-3 px-4">Date Created</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Items Count</th>
                <th className="py-3 px-4">Conducted By</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading stocktake sessions...</span>
                  </td>
                </tr>
              ) : stocktakes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <span>No stocktake sessions conducted yet.</span>
                  </td>
                </tr>
              ) : (
                stocktakes.map((stk) => (
                  <tr
                    key={stk.id}
                    onClick={() => openSessionModal(stk)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                      {stk.stocktakeNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {formatDateTime(stk.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {stk.location?.name || 'Main Store'}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-white">
                      {stk.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {stk.completedBy || stk.createdBy || 'SYSTEM'}
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(stk.status)}</td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openSessionModal(stk)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
                      >
                        {stk.status === 'COMPLETED' ? 'View Results' : 'Open Session'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Stocktake Initializer Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <h3 className="text-base font-bold text-white">Start New Stocktake Session</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Target Storage Location *</label>
                <select
                  value={newLocationId}
                  onChange={(e) => setNewLocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  All active physical inventory products in this location will be loaded for counting.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Session Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Monthly stocktake / Q3 audit"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-semibold shadow-lg shadow-indigo-600/20"
                >
                  {submitting ? 'Creating...' : 'Initialize Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Stocktake Session Modal */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Session Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Stocktake Session: {activeSession.stocktakeNumber}</span>
                    {getStatusBadge(activeSession.status)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Location: <span className="text-slate-200 font-semibold">{activeSession.location?.name}</span> | Started: {formatDateTime(activeSession.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeSession.status === 'DRAFT' && (
                  <button
                    onClick={handleStartSession}
                    disabled={savingSession}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Start Count</span>
                  </button>
                )}

                {activeSession.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={handleSaveProgress}
                      disabled={savingSession}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Progress</span>
                    </button>

                    <button
                      onClick={handleCompleteSession}
                      disabled={savingSession}
                      className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Complete & Post Corrections</span>
                    </button>
                  </>
                )}

                {(activeSession.status === 'DRAFT' || activeSession.status === 'IN_PROGRESS') && (
                  <button
                    onClick={handleCancelSession}
                    disabled={savingSession}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancel Session</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveSession(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Session Toolbar */}
            <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter items in session..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
                <button
                  onClick={() => setSessionFilter('ALL')}
                  className={`px-3 py-1 rounded font-medium ${
                    sessionFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Items ({sessionItems.length})
                </button>
                <button
                  onClick={() => setSessionFilter('DISCREPANCY')}
                  className={`px-3 py-1 rounded font-medium ${
                    sessionFilter === 'DISCREPANCY' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Discrepancies ({sessionItems.filter((i) => i.differenceQuantity !== 0).length})
                </button>
                <button
                  onClick={() => setSessionFilter('MATCHED')}
                  className={`px-3 py-1 rounded font-medium ${
                    sessionFilter === 'MATCHED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Matched ({sessionItems.filter((i) => i.differenceQuantity === 0).length})
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Product</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4 text-right">System Qty</th>
                      <th className="py-2.5 px-4 text-right w-40">Counted Qty</th>
                      <th className="py-2.5 px-4 text-right">Variance / Difference</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSessionItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No items match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredSessionItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-semibold text-white">{item.name}</td>
                          <td className="py-2.5 px-4 text-slate-400 font-mono">{item.sku}</td>
                          <td className="py-2.5 px-4 text-right text-slate-300 font-medium">
                            {item.systemQuantity} {item.unitCode}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {activeSession.status === 'IN_PROGRESS' || activeSession.status === 'DRAFT' ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.countedQuantity}
                                onChange={(e) => handleUpdateItemCount(item.productId, Number(e.target.value))}
                                className="w-28 bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-right text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            ) : (
                              <span className="font-bold text-white">
                                {item.countedQuantity} {item.unitCode}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span
                              className={`font-bold ${
                                item.differenceQuantity === 0
                                  ? 'text-slate-400'
                                  : item.differenceQuantity > 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {item.differenceQuantity > 0 ? `+${item.differenceQuantity}` : item.differenceQuantity}{' '}
                              {item.unitCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {item.differenceQuantity === 0 ? (
                              <span className="text-emerald-400 text-[11px] font-semibold">Matched</span>
                            ) : (
                              <span className="text-amber-400 text-[11px] font-semibold">Variance</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
