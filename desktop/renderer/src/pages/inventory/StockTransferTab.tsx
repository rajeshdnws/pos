import React, { useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  X,
  Search,
  Warehouse,
  XCircle,
} from 'lucide-react';
import {
  InventoryLocation,
  Product,
  StockTransfer,
  StockTransferCreateDTO,
  StockTransferItemDTO,
} from '@rs-inventory/types';
import { formatCurrency, formatDateTime } from '@rs-inventory/business';

export const StockTransferTab: React.FC = () => {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // Form State
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<(StockTransferItemDTO & { productName: string; unitCode: string; allowDecimals: boolean; sourceStock: number })[]>([]);

  // Product Search in Modal
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trfRes, locRes] = await Promise.all([
        window.rsInventory.listStockTransfers(50),
        window.rsInventory.listLocations(false),
      ]);
      if (trfRes.success && trfRes.data) setTransfers(trfRes.data);
      if (locRes.success && locRes.data) {
        setLocations(locRes.data);
        if (locRes.data.length >= 2 && !sourceLocationId) {
          setSourceLocationId(locRes.data[0].id);
          setDestinationLocationId(locRes.data[1].id);
        }
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const searchProducts = async (q: string) => {
    setProductQuery(q);
    if (!q || q.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const res = await window.rsInventory.searchProducts(q);
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch (err) {
      console.error('Failed to search products:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const addItem = (product: Product) => {
    if (items.some((i) => i.productId === product.id)) {
      setFormError(`Product "${product.name}" is already in the transfer list.`);
      return;
    }

    setItems([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        unitCode: product.unit?.shortCode || 'PCS',
        allowDecimals: product.unit?.allowDecimals || false,
        sourceStock: product.currentStock,
        quantity: 1,
        unitCost: product.purchasePrice,
      },
    ]);
    setProductQuery('');
    setSearchResults([]);
    setFormError(null);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateQty = (idx: number, qty: number) => {
    const updated = [...items];
    updated[idx].quantity = qty;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!sourceLocationId || !destinationLocationId) {
      setFormError('Both source and destination locations are required.');
      return;
    }

    if (sourceLocationId === destinationLocationId) {
      setFormError('Source and destination locations cannot be identical.');
      return;
    }

    if (items.length === 0) {
      setFormError('Please add at least one product to transfer.');
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        setFormError(`Quantity for "${item.productName}" must be greater than 0.`);
        return;
      }
      if (!item.allowDecimals && !Number.isInteger(item.quantity)) {
        setFormError(`Product "${item.productName}" does not allow decimal quantities.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const dto: StockTransferCreateDTO = {
        sourceLocationId,
        destinationLocationId,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: i.unitCost,
        })),
      };

      const res = await window.rsInventory.createStockTransfer(dto);
      if (!res.success) {
        setFormError(res.error?.message || 'Failed to complete stock transfer.');
        return;
      }

      setIsNewOpen(false);
      setItems([]);
      setNotes('');
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    const confirm = window.confirm(
      'Are you sure you want to cancel and reverse this stock transfer? This will return the stock back to the original source location.',
    );
    if (!confirm) return;

    try {
      setLoading(true);
      const res = await window.rsInventory.cancelStockTransfer(transferId);
      if (res.success) {
        setSelectedTransfer(null);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to cancel transfer:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div>
          <h2 className="text-sm font-bold text-white">Inter-Location Stock Transfers</h2>
          <p className="text-xs text-slate-400">Transfer items between stores, warehouses, and storage rooms with automatic cost preservation.</p>
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
              setIsNewOpen(true);
              setFormError(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Transfer</span>
          </button>
        </div>
      </div>

      {/* Transfers List Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transfer #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">From (Source)</th>
                <th className="py-3 px-4">To (Destination)</th>
                <th className="py-3 px-4 text-center">Items Count</th>
                <th className="py-3 px-4">Conducted By</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading stock transfers...</span>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Warehouse className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <span>No stock transfers recorded yet.</span>
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr
                    key={trf.id}
                    onClick={() => setSelectedTransfer(trf)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                      {trf.transferNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {formatDateTime(trf.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {trf.sourceLocation?.name}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {trf.destinationLocation?.name}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-white">
                      {trf.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {trf.createdBy || 'SYSTEM'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          trf.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {trf.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div>
                <h3 className="text-base font-bold text-white">New Stock Transfer</h3>
                <p className="text-xs text-slate-400">Transfer inventory between distinct locations</p>
              </div>
              <button onClick={() => setIsNewOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Source & Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Source Location (From) *
                  </label>
                  <select
                    value={sourceLocationId}
                    onChange={(e) => setSourceLocationId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id} disabled={loc.id === destinationLocationId}>
                        {loc.name} {loc.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Destination Location (To) *
                  </label>
                  <select
                    value={destinationLocationId}
                    onChange={(e) => setDestinationLocationId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id} disabled={loc.id === sourceLocationId}>
                        {loc.name} {loc.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Search & Line Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-white">
                  Add Products to Transfer
                </label>

                <div className="relative">
                  {searchLoading ? (
                    <RefreshCw className="absolute left-3 top-2.5 h-4 w-4 text-indigo-400 animate-spin" />
                  ) : (
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  )}
                  <input
                    type="text"
                    placeholder="Type product name, SKU, or barcode to add..."
                    value={productQuery}
                    onChange={(e) => searchProducts(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />


                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-700/60">
                      {searchResults.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => addItem(prod)}
                          className="px-4 py-2.5 hover:bg-slate-700/80 cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">{prod.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              SKU: {prod.sku || '—'}
                            </div>
                          </div>
                          <div className="text-right text-emerald-400 font-semibold">
                            Total Stock: {prod.currentStock} {prod.unit?.shortCode || 'PCS'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-800 mt-3">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right w-32">Transfer Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">
                            No products added yet. Use the search box above to add items.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={item.productId} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-white">{item.productName}</div>
                              <div className="text-[10px] text-slate-400">Unit: {item.unitCode}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min={item.allowDecimals ? '0.001' : '1'}
                                step={item.allowDecimals ? '0.001' : '1'}
                                value={item.quantity}
                                onChange={(e) => updateQty(idx, Number(e.target.value))}
                                className="w-24 bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-right text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-300 font-medium">
                              {formatCurrency(item.unitCost || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Transfer Notes / Vehicle # (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Van dispatch / internal transfer"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Transferring...' : 'Execute Stock Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Inspector Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Transfer: {selectedTransfer.transferNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedTransfer.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {selectedTransfer.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {formatDateTime(selectedTransfer.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">From Location:</span>
                  <div className="font-semibold text-white mt-0.5">
                    {selectedTransfer.sourceLocation?.name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">To Location:</span>
                  <div className="font-semibold text-white mt-0.5">
                    {selectedTransfer.destinationLocation?.name}
                  </div>
                </div>
                {selectedTransfer.notes && (
                  <div className="col-span-2">
                    <span className="text-slate-400">Notes:</span>
                    <div className="text-slate-300 mt-0.5">{selectedTransfer.notes}</div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">Transferred Items ({selectedTransfer.items?.length || 0})</h4>
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedTransfer.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{item.product?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.product?.sku}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {item.quantity} {item.product?.unit?.shortCode || 'PCS'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {formatCurrency(item.unitCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedTransfer.status === 'COMPLETED' && (
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleCancelTransfer(selectedTransfer.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Cancel & Reverse Transfer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
