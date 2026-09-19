import React, { useEffect, useState } from 'react';
import {
  Boxes,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Warehouse,
  History,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { CurrentStockItem, InventoryKPIs, InventoryValuationReport } from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';

interface InventoryDashboardTabProps {
  onNavigateTab: (tab: string) => void;
}

export const InventoryDashboardTab: React.FC<InventoryDashboardTabProps> = ({ onNavigateTab }) => {
  const [kpis, setKpis] = useState<InventoryKPIs | null>(null);
  const [valuation, setValuation] = useState<InventoryValuationReport | null>(null);
  const [criticalItems, setCriticalItems] = useState<CurrentStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [kpiRes, valRes, criticalRes] = await Promise.all([
        window.rsInventory.getInventoryKPIs(),
        window.rsInventory.getInventoryValuation(),
        window.rsInventory.getCurrentStock({ lowStock: true, pageSize: 8 }),
      ]);

      if (kpiRes.success && kpiRes.data) {
        setKpis(kpiRes.data);
      }
      if (valRes.success && valRes.data) {
        setValuation(valRes.data);
      }
      if (criticalRes.success && criticalRes.data) {
        setCriticalItems(criticalRes.data.items);
      }
    } catch (err) {
      console.error('Failed to load inventory dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
        <span>Loading inventory analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Inventory Overview & Valuation</h2>
          <p className="text-xs text-slate-400">Real-time stock valuation, movements, and alerts</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Valuation */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Stock Valuation (Cost)</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {formatCurrency(kpis?.totalStockValuation || 0)}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Potential Retail:</span>
            <span className="font-semibold text-slate-200">
              {formatCurrency(valuation?.totalRetailValuation || 0)}
            </span>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Units in Stock</p>
              <h3 className="text-2xl font-black text-white mt-1">
                {Number(kpis?.totalStockQuantity || 0).toLocaleString()}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Across</span>
            <span className="font-semibold text-slate-200">{kpis?.totalProducts || 0} active products</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigateTab('current')}
          className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 relative overflow-hidden cursor-pointer hover:border-amber-500/40 transition"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-amber-400/80">Low Stock Warnings</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">
                {kpis?.lowStockItemsCount || 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-amber-400/80">
            <span>Items below minimum threshold</span>
          </div>
        </div>

        {/* Out of Stock & Negative Stock */}
        <div
          onClick={() => onNavigateTab('current')}
          className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 relative overflow-hidden cursor-pointer hover:border-rose-500/40 transition"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-rose-400/80">Out of Stock Items</p>
              <h3 className="text-2xl font-black text-rose-400 mt-1">
                {kpis?.outOfStockItemsCount || 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-rose-400/80">
            <span>{kpis?.negativeStockItemsCount || 0} negative stock items</span>
          </div>
        </div>
      </div>

      {/* Quick Access Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateTab('adjustments')}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition text-left"
        >
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Stock Adjustment</div>
            <div className="text-xs text-slate-400">Increase / Decrease stock</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('stocktake')}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition text-left"
        >
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Physical Stocktake</div>
            <div className="text-xs text-slate-400">Inventory count & audit</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('transfers')}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition text-left"
        >
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Inter-Location Transfer</div>
            <div className="text-xs text-slate-400">Move stock between stores</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('movements')}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition text-left"
        >
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Stock Movement Ledger</div>
            <div className="text-xs text-slate-400">{kpis?.recentMovementsCount || 0} in last 7 days</div>
          </div>
        </button>
      </div>

      {/* Two Column Layout: Valuation by Category & Low Stock Attention Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Valuation Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🏷️</span> Valuation by Category
            </h3>
            <span className="text-xs font-medium text-slate-400">
              {valuation?.byCategory.length || 0} Categories
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Items</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Cost Value</th>
                  <th className="py-2.5 px-3 text-right">Retail Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {valuation?.byCategory && valuation.byCategory.length > 0 ? (
                  valuation.byCategory.map((cat) => (
                    <tr key={cat.categoryId} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-white font-semibold">{cat.categoryName}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{cat.productCount}</td>
                      <td className="py-2.5 px-3 text-right">{cat.totalQuantity}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">
                        {formatCurrency(cat.totalCostValuation)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {formatCurrency(cat.totalRetailValuation)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No stock valuation data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low / Critical Stock Items Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Attention Required: Low & Zero Stock
            </h3>
            <button
              onClick={() => onNavigateTab('current')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View All
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-right">Min Stock</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {criticalItems && criticalItems.length > 0 ? (
                  criticalItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <div className="text-white font-semibold">{item.productName}</div>
                        <div className="text-[11px] text-slate-400">{item.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {item.minimumStock} {item.unitSymbol}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                        {item.currentStock} {item.unitSymbol}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'OUT_OF_STOCK'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : item.status === 'NEGATIVE_STOCK'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      All products are adequately stocked!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
