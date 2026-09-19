import React, { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  History,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react';
import {
  InventoryLocation,
  StockMovement,
  StockMovementFilterDTO,
  StockMovementType,
} from '@rs-inventory/types';
import { formatCurrency, formatDateTime } from '@rs-inventory/business';

export const StockHistoryTab: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [movementType, setMovementType] = useState<StockMovementType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Options
  const [locations, setLocations] = useState<InventoryLocation[]>([]);

  const loadLocations = async () => {
    try {
      const res = await window.rsInventory.listLocations(false);
      if (res.success && res.data) setLocations(res.data);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const loadMovements = async () => {
    try {
      setLoading(true);
      const filter: StockMovementFilterDTO = {
        page,
        pageSize,
        search: search.trim() || undefined,
        locationId: locationId || undefined,
        movementType: movementType || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
      };

      const res = await window.rsInventory.getStockMovements(filter);
      if (res.success && res.data) {
        setMovements(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [page, pageSize, search, locationId, movementType, startDate, endDate]);

  const exportMovementsToCSV = () => {
    if (movements.length === 0) return;

    const headers = [
      'Date & Time',
      'Product Name',
      'SKU',
      'Location',
      'Movement Type',
      'Quantity',
      'Unit Cost',
      'Total Value',
      'Reference Type',
      'Reference Number',
      'Created By',
      'Notes',
    ];

    const rows = movements.map((m) => [
      `"${formatDateTime(m.movementDate)}"`,
      `"${m.product?.name?.replace(/"/g, '""') || ''}"`,
      `"${m.product?.sku || ''}"`,
      `"${m.location?.name || ''}"`,
      `"${m.movementType}"`,
      m.quantity,
      m.unitCost,
      Number((m.quantity * m.unitCost).toFixed(2)),
      `"${m.referenceType || ''}"`,
      `"${m.referenceNumber || ''}"`,
      `"${m.createdBy || ''}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stock_movement_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMovementTypeBadge = (type: StockMovementType, qty: number) => {
    const isIncrease = qty > 0;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
          isIncrease
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}
      >
        {isIncrease ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3 text-rose-400" />}
        <span>{type.replace(/_/g, ' ')}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product, SKU, reference, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={exportMovementsToCSV}
              disabled={movements.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={loadMovements}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Refresh ledger"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Location</label>
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Movement Type</label>
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value as any);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Movement Types</option>
              <option value="OPENING_STOCK">Opening Stock</option>
              <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
              <option value="SALE">Sale</option>
              <option value="SALES_RETURN">Sales Return</option>
              <option value="PURCHASE_RETURN">Purchase Return</option>
              <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
              <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
              <option value="TRANSFER_IN">Transfer In (+)</option>
              <option value="TRANSFER_OUT">Transfer Out (-)</option>
              <option value="STOCKTAKE_CORRECTION">Stocktake Correction</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Movements Ledger Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-right">Quantity Delta</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Notes / User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading stock movements ledger...</span>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <History className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <span>No stock movements found for the selected filters.</span>
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {formatDateTime(m.movementDate)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.product?.name || 'Unknown Product'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.product?.sku || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium">
                        {m.location?.name || 'Main Store'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getMovementTypeBadge(m.movementType, m.quantity)}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold text-sm ${
                          m.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400">
                        {m.product?.unit?.shortCode || 'PCS'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-medium">
                      {formatCurrency(m.unitCost)}
                    </td>
                    <td className="py-3 px-4">
                      {m.referenceNumber ? (
                        <span className="font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[11px]">
                          {m.referenceNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                      <div>{m.notes || '—'}</div>
                      {m.createdBy && (
                        <div className="text-[10px] text-slate-500">By: {m.createdBy}</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 border-t border-slate-800 text-xs text-slate-400 gap-3">
          <div>
            Showing <span className="font-semibold text-white">{movements.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> movement ledger entries
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-medium text-white">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
