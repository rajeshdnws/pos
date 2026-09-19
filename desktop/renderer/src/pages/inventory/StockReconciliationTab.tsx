import React, { useEffect, useState } from 'react';
import {
  Wrench,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Search,
  Check,
  RotateCcw,
} from 'lucide-react';
import { StockReconciliationReport } from '@rs-inventory/types';

export const StockReconciliationTab: React.FC = () => {
  const [report, setReport] = useState<StockReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DISCREPANCIES'>('ALL');
  const [repairMessage, setRepairMessage] = useState<string | null>(null);

  const runReconciliation = async () => {
    try {
      setLoading(true);
      setRepairMessage(null);
      const res = await window.rsInventory.reconcileStock();
      if (res.success && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error('Failed to run stock reconciliation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReconciliation();
  }, []);

  const handleRepair = async () => {
    const confirm = window.confirm(
      'Are you sure you want to repair all stock balance discrepancies? The operational balance table will be overwritten with the true sum from the stock movement ledger.',
    );
    if (!confirm) return;

    try {
      setRepairing(true);
      const res = await window.rsInventory.repairStockDiscrepancies();
      if (res.success && res.data) {
        setRepairMessage(`Successfully repaired and synced ${res.data.repairedCount} discrepancies!`);
        await runReconciliation();
      }
    } catch (err) {
      console.error('Failed to repair stock discrepancies:', err);
    } finally {
      setRepairing(false);
    }
  };

  const filteredItems = (report?.items || []).filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.locationName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterMode === 'DISCREPANCIES') return !item.isSynced;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Status Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-400" />
              <span>Stock Ledger & Projection Reconciliation</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative validation comparing the signed transaction ledger (
              <code className="text-indigo-300 font-mono text-[11px]">stock_movements</code>) against the operational projection (
              <code className="text-indigo-300 font-mono text-[11px]">stock_balances</code>).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runReconciliation}
              disabled={loading || repairing}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-check Ledger</span>
            </button>

            {report && report.discrepancyCount > 0 && (
              <button
                onClick={handleRepair}
                disabled={repairing}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${repairing ? 'animate-spin' : ''}`} />
                <span>{repairing ? 'Repairing...' : `Repair ${report.discrepancyCount} Discrepancies`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Repair Success Notification */}
        {repairMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>{repairMessage}</span>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400">Total Checked Entities</span>
            <div className="text-xl font-black text-white mt-0.5">
              {report?.totalProductsChecked || 0} Products
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-[11px] font-medium text-emerald-400/80">In-Sync Records</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5 flex items-center gap-2">
              <span>{report?.inSyncCount || 0}</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div
            className={`p-3 rounded-lg border ${
              (report?.discrepancyCount || 0) > 0
                ? 'bg-rose-500/5 border-rose-500/20'
                : 'bg-slate-950/40 border-slate-800'
            }`}
          >
            <span className="text-[11px] font-medium text-rose-400/80">Discrepancies Detected</span>
            <div
              className={`text-xl font-black mt-0.5 flex items-center gap-2 ${
                (report?.discrepancyCount || 0) > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              <span>{report?.discrepancyCount || 0}</span>
              {(report?.discrepancyCount || 0) > 0 && <AlertTriangle className="h-4 w-4" />}
            </div>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search product, SKU, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded font-medium ${
              filterMode === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Entries ({report?.items.length || 0})
          </button>
          <button
            onClick={() => setFilterMode('DISCREPANCIES')}
            className={`px-3 py-1 rounded font-medium ${
              filterMode === 'DISCREPANCIES' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Discrepancies ({report?.items.filter((i) => !i.isSynced).length || 0})
          </button>
        </div>
      </div>

      {/* Comparator Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Ledger Sum (Authoritative)</th>
                <th className="py-3 px-4 text-right">Stored Balance (Projection)</th>
                <th className="py-3 px-4 text-right">Variance / Discrepancy</th>
                <th className="py-3 px-4 text-center">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Analyzing ledger movements and projections...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/80" />
                    <span>All stock projections are 100% in sync with the authoritative ledger!</span>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={`${item.productId}_${item.locationId}`}
                    className={`hover:bg-slate-800/40 transition ${
                      !item.isSynced ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-white">{item.productName}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{item.sku || '—'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.locationName}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {item.ledgerBalance} {item.unitSymbol}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-200">
                      {item.projectedBalance} {item.unitSymbol}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold ${
                          item.isSynced ? 'text-slate-500' : 'text-rose-400 font-mono text-sm'
                        }`}
                      >
                        {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}{' '}
                        {item.unitSymbol}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.isSynced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="h-3 w-3" />
                          <span>SYNCHRONIZED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <ShieldAlert className="h-3 w-3" />
                          <span>OUT OF SYNC</span>
                        </span>
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
  );
};
