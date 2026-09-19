import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  AlertCircle,
  X,
  Boxes,
} from 'lucide-react';
import {
  InventoryLocation,
  Product,
  StockAdjustment,
  StockAdjustmentCreateDTO,
  StockAdjustmentItemDTO,
  StockAdjustmentType,
} from '@rs-inventory/types';
import { formatCurrency, formatDateTime } from '@rs-inventory/business';

export const StockAdjustmentTab: React.FC = () => {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);

  // Form State
  const [locationId, setLocationId] = useState('');
  const [type, setType] = useState<StockAdjustmentType>('INCREASE');
  const [reason, setReason] = useState('Found Inventory / Physical Count Surplus');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<(StockAdjustmentItemDTO & { productName?: string; unitCode?: string; allowDecimals?: boolean; systemStock?: number })[]>([]);

  // Product Search State in Modal
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adjRes, locRes] = await Promise.all([
        window.rsInventory.listStockAdjustments(50),
        window.rsInventory.listLocations(false),
      ]);
      if (adjRes.success && adjRes.data) setAdjustments(adjRes.data);
      if (locRes.success && locRes.data) {
        setLocations(locRes.data);
        if (locRes.data.length > 0 && !locationId) {
          const defaultLoc = locRes.data.find((l) => l.isDefault) || locRes.data[0];
          setLocationId(defaultLoc.id);
        }
      }
    } catch (err) {
      console.error('Failed to load adjustments data:', err);
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
    // Check if already in items
    if (items.some((i) => i.productId === product.id)) {
      setFormError(`Product "${product.name}" is already in the adjustment list.`);
      return;
    }

    setItems([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        unitCode: product.unit?.shortCode || 'PCS',
        allowDecimals: product.unit?.allowDecimals || false,
        systemStock: product.currentStock,
        quantity: 1,
        unitCost: product.purchasePrice,
        reason: '',
      },
    ]);
    setProductQuery('');
    setSearchResults([]);
    setFormError(null);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQty = (index: number, val: number) => {
    const updated = [...items];
    updated[index].quantity = val;
    setItems(updated);
  };

  const updateItemCost = (index: number, val: number) => {
    const updated = [...items];
    updated[index].unitCost = val;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalReason = reason === 'OTHER' ? customReason.trim() : reason;
    if (!finalReason) {
      setFormError('Please select or specify a reason for adjustment.');
      return;
    }

    if (items.length === 0) {
      setFormError('Please add at least one product to adjust.');
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        setFormError(`Quantity for "${item.productName}" must be greater than 0.`);
        return;
      }
      if (!item.allowDecimals && !Number.isInteger(item.quantity)) {
        setFormError(`Product "${item.productName}" (${item.unitCode}) does not allow decimal quantities.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const dto: StockAdjustmentCreateDTO = {
        locationId: locationId || undefined,
        type,
        reason: finalReason,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: i.unitCost,
          reason: i.reason || null,
        })),
      };

      const res = await window.rsInventory.createStockAdjustment(dto);
      if (!res.success) {
        setFormError(res.error?.message || 'Failed to create adjustment.');
        return;
      }

      // Success
      setIsCreateOpen(false);
      setItems([]);
      setNotes('');
      setCustomReason('');
      loadData();
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
          <h2 className="text-sm font-bold text-white">Stock Adjustments</h2>
          <p className="text-xs text-slate-400">Record manual stock corrections, damages, expired items, and found stock.</p>
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
              setIsCreateOpen(true);
              setFormError(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Adjustment</span>
          </button>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Adjustment #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-center">Items Count</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading adjustments...</span>
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Boxes className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <span>No stock adjustments recorded yet.</span>
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr
                    key={adj.id}
                    onClick={() => setSelectedAdjustment(adj)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                      {adj.adjustmentNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {formatDateTime(adj.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {adj.location?.name || 'Main Store'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          adj.adjustmentType === 'INCREASE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {adj.adjustmentType === 'INCREASE' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        <span>{adj.adjustmentType}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-300">
                      {adj.reason}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-white">
                      {adj.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {adj.createdBy || 'SYSTEM'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {adj.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Adjustment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div>
                <h3 className="text-base font-bold text-white">Create Stock Adjustment</h3>
                <p className="text-xs text-slate-400">Post immediate signed inventory adjustments</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Top Controls: Location, Type & Reason */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Storage Location *
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adjustment Direction *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as StockAdjustmentType)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="INCREASE">Stock Increase (+ Addition)</option>
                    <option value="DECREASE">Stock Decrease (- Deduction)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reason *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {type === 'INCREASE' ? (
                      <>
                        <option value="Found Inventory / Physical Count Surplus">Found Inventory / Count Surplus</option>
                        <option value="Customer Return Without Bill">Customer Return Without Bill</option>
                        <option value="Sample / Free Stock Received">Sample / Free Stock Received</option>
                        <option value="Opening Balance Correction">Opening Balance Correction</option>
                        <option value="OTHER">Other Reason (Specify below)</option>
                      </>
                    ) : (
                      <>
                        <option value="Damaged Goods / Breakage">Damaged Goods / Breakage</option>
                        <option value="Expired / Past Expiry Date">Expired / Past Expiry Date</option>
                        <option value="Theft / Pilferage / Lost">Theft / Pilferage / Lost</option>
                        <option value="Store Display Sample Used">Store Display Sample Used</option>
                        <option value="Waste / Scrap / Spoilage">Waste / Scrap / Spoilage</option>
                        <option value="OTHER">Other Reason (Specify below)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {reason === 'OTHER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Specify Custom Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom adjustment reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Product Search & Line Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-white">
                  Add Products to Adjust
                </label>

                {/* Product Search Box */}
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
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                  />


                  {/* Search Autocomplete Dropdown */}
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
                              SKU: {prod.sku || '—'} | Barcode: {prod.barcode || '—'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-semibold">
                              Stock: {prod.currentStock} {prod.unit?.shortCode || 'PCS'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Line Items Table */}
                <div className="overflow-hidden rounded-xl border border-slate-800 mt-3">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">System Stock</th>
                        <th className="py-2.5 px-3 text-right w-32">Adjust Qty</th>
                        <th className="py-2.5 px-3 text-right w-32">Unit Cost</th>
                        <th className="py-2.5 px-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
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
                            <td className="py-2.5 px-3 text-right text-slate-400 font-medium">
                              {item.systemStock} {item.unitCode}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min={item.allowDecimals ? '0.001' : '1'}
                                step={item.allowDecimals ? '0.001' : '1'}
                                value={item.quantity}
                                onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                                className="w-24 bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-right text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) => updateItemCost(idx, Number(e.target.value))}
                                className="w-24 bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
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

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Reference number or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Confirm & Post Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Inspector Modal */}
      {selectedAdjustment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Adjustment: {selectedAdjustment.adjustmentNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedAdjustment.adjustmentType === 'INCREASE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {selectedAdjustment.adjustmentType}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {formatDateTime(selectedAdjustment.createdAt)} | {selectedAdjustment.location?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedAdjustment(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Reason:</span>
                  <div className="font-semibold text-white mt-0.5">{selectedAdjustment.reason}</div>
                </div>
                <div>
                  <span className="text-slate-400">Created By:</span>
                  <div className="font-semibold text-white mt-0.5">{selectedAdjustment.createdBy || 'SYSTEM'}</div>
                </div>
                {selectedAdjustment.notes && (
                  <div className="col-span-2">
                    <span className="text-slate-400">Notes:</span>
                    <div className="text-slate-300 mt-0.5">{selectedAdjustment.notes}</div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">Adjusted Items ({selectedAdjustment.items?.length || 0})</h4>
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">System Qty</th>
                        <th className="py-2.5 px-3 text-right">Difference</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedAdjustment.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{item.product?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.product?.sku}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {item.systemQuantity} {item.product?.unit?.shortCode || 'PCS'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                            {item.differenceQuantity > 0 ? `+${item.differenceQuantity}` : item.differenceQuantity}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
