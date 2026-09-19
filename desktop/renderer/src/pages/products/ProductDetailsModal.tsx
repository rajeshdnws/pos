import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Calendar,
  Clock,
  FileText,
  History,
  Layers,
  Loader2,
  Package,
  TrendingUp,
  X,
  Warehouse,
} from 'lucide-react';
import {
  Product,
  ProductPriceHistory,
  StockMovement,
} from '@rs-inventory/types';
import { formatCurrency, formatDateTime } from '@rs-inventory/business';

interface ProductDetailsModalProps {
  product?: Product | null;
  productId?: string | null;
  isOpen?: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onUpdated?: () => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product: initialProduct,
  productId,
  isOpen = true,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'movements' | 'priceHistory'>('overview');
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [priceHistory, setPriceHistory] = useState<ProductPriceHistory[]>([]);
  const [stockSummary, setStockSummary] = useState<{ currentStock: number; valuation: number; balances: { locationId: string; locationName: string; quantity: number }[] } | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const resolvedId = product?.id || productId;

  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
    }
  }, [initialProduct]);

  useEffect(() => {
    if (resolvedId && (isOpen || initialProduct || productId)) {
      loadAllProductData(resolvedId);
    }
  }, [resolvedId, isOpen]);

  const loadAllProductData = async (pId: string) => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        // Fetch product if not provided
        if (!product || product.id !== pId) {
          const prodRes = await window.rsInventory.getProduct(pId);
          if (prodRes.success && prodRes.data) {
            setProduct(prodRes.data);
          }
        }

        // Fetch price history
        const priceRes = await window.rsInventory.getProductPriceHistory(pId);
        if (priceRes.success && priceRes.data) {
          setPriceHistory(priceRes.data);
        }

        // Fetch stock summary by location
        const stockRes = await window.rsInventory.getProductStockSummary(pId);
        if (stockRes.success && stockRes.data) {
          setStockSummary(stockRes.data);
        }

        // Fetch stock movements
        const moveRes = await window.rsInventory.getStockMovements({ productId: pId, pageSize: 50 });
        if (moveRes.success && moveRes.data) {
          setMovements(moveRes.data.items);
        }
      }
    } catch (err) {
      console.error('Failed to load product details tabs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!product && loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span>Loading product details...</span>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const margin =
    product.sellingPrice > 0 && product.purchasePrice > 0
      ? (((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100).toFixed(1)
      : '0.0';

  const isLowStock = product.currentStock <= product.minimumStock && product.minimumStock > 0;
  const isOutOfStock = product.currentStock <= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{product.name}</h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    product.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${product.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  />
                  <span>{product.isActive ? 'Active' : 'Inactive'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                SKU: {product.sku || 'N/A'} {product.barcode ? `• Barcode: ${product.barcode}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-surface-800 bg-surface-950/40 flex gap-6 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Product Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'stock'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Warehouse className="h-4 w-4" />
            <span>Stock by Location ({stockSummary?.balances?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'movements'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Movement History ({movements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('priceHistory')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'priceHistory'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Price History ({priceHistory.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6 text-xs">
              {/* Top Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-surface-950/60 border border-surface-800 p-3.5">
                  <div className="text-[11px] font-medium text-slate-400 mb-1">Selling Price</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {formatCurrency(product.sellingPrice)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    MRP: {formatCurrency(product.mrp)}
                  </div>
                </div>

                <div className="rounded-xl bg-surface-950/60 border border-surface-800 p-3.5">
                  <div className="text-[11px] font-medium text-slate-400 mb-1">Purchase Cost</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {formatCurrency(product.purchasePrice)}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>Margin: {margin}%</span>
                  </div>
                </div>

                <div className="rounded-xl bg-surface-950/60 border border-surface-800 p-3.5">
                  <div className="text-[11px] font-medium text-slate-400 mb-1">Current Stock</div>
                  <div
                    className={`text-lg font-bold font-mono ${
                      isOutOfStock
                        ? 'text-rose-400'
                        : isLowStock
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {product.currentStock} {product.unit?.shortCode || ''}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Min Alert: {product.minimumStock}
                  </div>
                </div>

                <div className="rounded-xl bg-surface-950/60 border border-surface-800 p-3.5">
                  <div className="text-[11px] font-medium text-slate-400 mb-1">Tax Rate</div>
                  <div className="text-lg font-bold text-brand-400 font-mono">
                    {product.taxRate}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    HSN: {product.hsnCode || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-surface-950/40 border border-surface-800/80 p-4 space-y-2.5">
                  <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-surface-800">
                    <Layers className="h-3.5 w-3.5 text-brand-400" />
                    <span>Classification & Details</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Category</span>
                      <span className="font-medium text-slate-100">
                        {product.category?.name || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Brand</span>
                      <span className="font-medium text-slate-100">
                        {product.brand?.name || 'Generic / None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Measurement Unit</span>
                      <span className="font-medium text-slate-100">
                        {product.unit?.name || 'N/A'} ({product.unit?.shortCode || ''})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Product Type</span>
                      <span className="font-medium text-slate-100">
                        {product.productType || 'PHYSICAL'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-surface-950/40 border border-surface-800/80 p-4 space-y-2.5">
                  <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-surface-800">
                    <Boxes className="h-3.5 w-3.5 text-brand-400" />
                    <span>Stock & Inventory Settings</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Opening Stock</span>
                      <span className="font-medium text-slate-100 font-mono">
                        {product.openingStock} {product.unit?.shortCode || ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Opening Cost Rate</span>
                      <span className="font-medium text-slate-100 font-mono">
                        {formatCurrency(product.openingStockRate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Max Stock Limit</span>
                      <span className="font-medium text-slate-100 font-mono">
                        {product.maximumStock !== null && product.maximumStock !== undefined
                          ? product.maximumStock
                          : 'No Limit'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Track Inventory</span>
                      <span className="font-medium text-slate-100">
                        {product.trackStock ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="rounded-xl bg-surface-950/40 border border-surface-800/80 p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Description / Notes
                  </div>
                  <p className="text-slate-300 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Audit Timestamps */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-surface-800">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {formatDateTime(product.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated: {formatDateTime(product.updatedAt)}
                </span>
              </div>
            </div>
          )}

          {/* Stock by Location Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Total Stock Across All Locations:</span>
                  <span className="font-bold text-emerald-400 text-sm ml-2">
                    {stockSummary?.currentStock || 0} {product.unit?.shortCode || 'PCS'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Total Valuation (Cost):</span>
                  <span className="font-bold text-white text-sm ml-2">
                    {formatCurrency(stockSummary?.valuation || 0)}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Storage Location</th>
                      <th className="py-2.5 px-4 text-right">Available Quantity</th>
                      <th className="py-2.5 px-4 text-right">Cost Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stockSummary?.balances && stockSummary.balances.length > 0 ? (
                      stockSummary.balances.map((b) => (
                        <tr key={b.locationId} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-semibold text-white">{b.locationName}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                            {b.quantity} {product.unit?.shortCode || 'PCS'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-200">
                            {formatCurrency(b.quantity * product.purchasePrice)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-500">
                          No stock recorded in any location.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stock Movement History Tab */}
          {activeTab === 'movements' && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Cost</th>
                      <th className="py-2.5 px-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No stock movements recorded for this product.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                            {formatDateTime(m.movementDate)}
                          </td>
                          <td className="py-2 px-3 text-slate-300">{m.location?.name || 'Main'}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                m.quantity > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {m.movementType}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold">
                            <span className={m.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400">
                            {formatCurrency(m.unitCost)}
                          </td>
                          <td className="py-2 px-3 text-[11px] font-mono text-indigo-300">
                            {m.referenceNumber || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Price History Tab */}
          {activeTab === 'priceHistory' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Chronological record of price, MRP, and tax changes.
              </div>

              <div className="rounded-xl border border-surface-800 overflow-hidden bg-surface-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-medium">
                    <tr>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-3 py-3">Purchase Cost</th>
                      <th className="px-3 py-3">Selling Price</th>
                      <th className="px-3 py-3">MRP</th>
                      <th className="px-3 py-3">Tax</th>
                      <th className="px-4 py-3 text-right">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/60">
                    {priceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          No price history changes recorded yet.
                        </td>
                      </tr>
                    ) : (
                      priceHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-surface-800/30 transition-colors">
                          <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                            {formatDateTime(h.createdAt)}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            <span className="text-white font-semibold">
                              {formatCurrency(h.newPurchasePrice)}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono">
                            <span className="text-white font-semibold">
                              {formatCurrency(h.newSellingPrice)}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono">
                            <span className="text-slate-200">{formatCurrency(h.newMrp)}</span>
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-300">{h.newTaxRate}%</td>
                          <td className="px-4 py-3 text-right text-slate-400 text-[11px]">
                            {h.changedBy || 'Admin'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-surface-800 bg-surface-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
            >
              Edit Product
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
