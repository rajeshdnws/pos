import React, { useState, useEffect, useCallback } from 'react';
import {
  DateRangeFilter,
  KpiCard,
  ReportSection,
  ReportTable,
  LoadingSpinner,
  ErrorState,
  AlertBanner,
  formatCurrency,
  formatNumber,
  formatDate,
  Pagination,
  usePagination,
  ReportPeriod,
} from './report-utils';
import { Boxes, Scale } from 'lucide-react';

type InvTab = 'current' | 'low' | 'out' | 'movements' | 'valuation' | 'adjustments';

const TABS: { id: InvTab; label: string }[] = [
  { id: 'current', label: 'Current Stock' },
  { id: 'low', label: 'Low Stock' },
  { id: 'out', label: 'Out of Stock' },
  { id: 'movements', label: 'Movements' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'adjustments', label: 'Adjustments' },
];

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  PURCHASE: 'text-emerald-400',
  SALE: 'text-rose-400',
  ADJUSTMENT_IN: 'text-brand-400',
  ADJUSTMENT_OUT: 'text-amber-400',
  TRANSFER_IN: 'text-cyan-400',
  TRANSFER_OUT: 'text-orange-400',
  RETURN_IN: 'text-violet-400',
  RETURN_OUT: 'text-pink-400',
  OPENING: 'text-slate-400',
};

export const InventoryReport: React.FC = () => {
  const [tab, setTab] = useState<InvTab>('current');
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentStock, setCurrentStock] = useState<any[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTotalPages, setCurrentTotalPages] = useState(1);

  const [lowStock, setLowStock] = useState<any[]>([]);
  const [outOfStock, setOutOfStock] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [movTotal, setMovTotal] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(1);
  const [valuation, setValuation] = useState<any>(null);
  const [adjustments, setAdjustments] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lowPag = usePagination(lowStock, 25);
  const outPag = usePagination(outOfStock, 25);
  const adjPag = usePagination(adjustments, 25);

  const getFilters = () => ({
    period,
    ...(period === 'custom' ? { startDate, endDate } : {}),
    page: tab === 'current' ? currentPage : tab === 'movements' ? movPage : 1,
    pageSize: 25,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters = getFilters();
    try {
      if (tab === 'current') {
        const res = await window.rsInventory.getInventoryCurrentStockReport(filters);
        if (res.success && res.data) {
          setCurrentStock(res.data.items ?? (res.data as any).data ?? []);
          setCurrentTotal(res.data.total);
          setCurrentTotalPages(res.data.totalPages);
        }
      } else if (tab === 'low') {
        const res = await window.rsInventory.getLowStockReport({});
        if (res.success) setLowStock(res.data ?? []);
      } else if (tab === 'out') {
        const res = await window.rsInventory.getOutOfStockReport({});
        if (res.success) setOutOfStock(res.data ?? []);
      } else if (tab === 'movements') {
        const res = await window.rsInventory.getStockMovementsReport(filters);
        if (res.success && res.data) {
          setMovements(res.data.items ?? (res.data as any).data ?? []);
          setMovTotal(res.data.total);
          setMovTotalPages(res.data.totalPages);
        }
      } else if (tab === 'valuation') {
        const res = await window.rsInventory.getInventoryValuationReport({});
        if (res.success) setValuation(res.data);
      } else if (tab === 'adjustments') {
        const res = await window.rsInventory.getStockAdjustmentsReport(filters);
        if (res.success) setAdjustments(res.data ?? []);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [tab, period, startDate, endDate, currentPage, movPage]);

  useEffect(() => {
    if (period !== 'custom') load();
  }, [tab, period, currentPage, movPage]);

  const renderContent = () => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={load} />;

    if (tab === 'current') {
      return (
        <ReportSection title="Current Stock Levels" subtitle={`${currentTotal.toLocaleString()} products`}>
          <ReportTable
            headers={['Product', 'Category', 'Unit', 'In Stock', 'Min Stock', 'Status', 'Purchase Price', 'Selling Price', 'Est. Value']}
            rows={currentStock.map((p: any) => {
              const statusStyle: Record<string, string> = {
                IN_STOCK: 'bg-emerald-500/10 text-emerald-400',
                LOW_STOCK: 'bg-amber-500/10 text-amber-400',
                OUT_OF_STOCK: 'bg-rose-500/10 text-rose-400',
                NEGATIVE: 'bg-red-500/20 text-red-400',
              };
              return [
                <span className="font-medium text-slate-200">{p.productName}</span>,
                p.categoryName ?? '—',
                p.unitName ?? '—',
                <span className={`font-semibold ${p.currentStock <= 0 ? 'text-rose-400' : p.stockStatus === 'LOW_STOCK' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatNumber(p.currentStock, 2)}
                </span>,
                p.minimumStock > 0 ? formatNumber(p.minimumStock, 0) : '—',
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyle[p.stockStatus] ?? ''}`}>
                  {p.stockStatus.replace('_', ' ')}
                </span>,
                formatCurrency(p.purchasePrice),
                formatCurrency(p.sellingPrice),
                p.hasCostData ? (
                  <span className="font-semibold text-white">{formatCurrency(p.estimatedValue)}</span>
                ) : <span className="text-slate-500 text-[10px]">N/A</span>,
              ];
            })}
          />
          <Pagination page={currentPage} totalPages={currentTotalPages} total={currentTotal} onPage={setCurrentPage} />
        </ReportSection>
      );
    }

    if (tab === 'low') {
      return (
        <div className="space-y-3">
          {lowStock.length > 0 && (
            <AlertBanner type="warning" message={`${lowStock.length} products are running low. Reorder recommended.`} />
          )}
          <ReportSection title="Low Stock Products" subtitle={`${lowStock.length} products at or below minimum stock`}>
            <ReportTable
              headers={['Product', 'Category', 'Unit', 'In Stock', 'Min Stock', 'Shortfall']}
              rows={lowPag.paginated.map((p: any) => [
                <span className="font-medium text-slate-200">{p.productName}</span>,
                p.categoryName ?? '—',
                p.unitName ?? '—',
                <span className="text-amber-400 font-semibold">{formatNumber(p.currentStock, 2)}</span>,
                formatNumber(p.minimumStock, 0),
                <span className="text-rose-400 font-semibold">-{formatNumber(p.shortfall, 2)}</span>,
              ])}
              emptyMessage="No low stock products — great job!"
            />
            <Pagination page={lowPag.page} totalPages={lowPag.totalPages} total={lowStock.length} onPage={lowPag.setPage} />
          </ReportSection>
        </div>
      );
    }

    if (tab === 'out') {
      return (
        <div className="space-y-3">
          {outOfStock.length > 0 && (
            <AlertBanner type="error" message={`${outOfStock.length} products are out of stock. Immediate restocking needed.`} />
          )}
          <ReportSection title="Out of Stock Products" subtitle={`${outOfStock.length} products`}>
            <ReportTable
              headers={['Product', 'Category', 'In Stock', 'Min Stock', 'Note']}
              rows={outPag.paginated.map((p: any) => [
                <span className="font-medium text-slate-200">{p.productName}</span>,
                p.categoryName ?? '—',
                <span className="text-rose-400 font-semibold">{formatNumber(p.currentStock, 2)}</span>,
                p.minimumStock > 0 ? formatNumber(p.minimumStock, 0) : '—',
                p.isNegative ? <span className="text-[10px] text-red-400 font-semibold">⚠ Negative Stock</span> : '—',
              ])}
              emptyMessage="No out-of-stock products"
            />
            <Pagination page={outPag.page} totalPages={outPag.totalPages} total={outOfStock.length} onPage={outPag.setPage} />
          </ReportSection>
        </div>
      );
    }

    if (tab === 'movements') {
      return (
        <ReportSection title="Stock Movements" subtitle={`${movTotal.toLocaleString()} records`}>
          <ReportTable
            headers={['Date', 'Product', 'SKU', 'Type', 'Reference', 'Qty In', 'Qty Out', 'Unit Cost']}
            rows={movements.map((m: any) => [
              formatDate(m.movementDate),
              <span className="font-medium text-slate-200">{m.productName}</span>,
              <span className="font-mono text-slate-500 text-[10px]">{m.sku ?? '—'}</span>,
              <span className={`font-semibold ${MOVEMENT_TYPE_COLORS[m.movementType] ?? 'text-slate-400'}`}>
                {m.movementType.replace(/_/g, ' ')}
              </span>,
              m.referenceNumber ?? '—',
              m.quantityIn > 0 ? <span className="text-emerald-400 font-semibold">+{formatNumber(m.quantityIn, 2)}</span> : '—',
              m.quantityOut > 0 ? <span className="text-rose-400 font-semibold">-{formatNumber(m.quantityOut, 2)}</span> : '—',
              m.unitCost > 0 ? formatCurrency(m.unitCost) : '—',
            ])}
          />
          <Pagination page={movPage} totalPages={movTotalPages} total={movTotal} onPage={setMovPage} />
        </ReportSection>
      );
    }

    if (tab === 'valuation' && valuation) {
      return (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
              label="Total Est. Value"
              value={formatCurrency(valuation.totalEstimatedValue)}
              sub={`Valued on: ${valuation.valuationDate}`}
              icon={<Scale className="h-4 w-4" />}
              iconBg="bg-amber-500/10 border-amber-500/20 text-amber-400"
            />
            <KpiCard
              label="Total Products"
              value={String(valuation.totalProducts)}
              sub={`${valuation.productsWithCostData} with cost data`}
              icon={<Boxes className="h-4 w-4" />}
              iconBg="bg-brand-500/10 border-brand-500/20 text-brand-400"
            />
            <div className="col-span-2">
              <AlertBanner type="info" message={valuation.methodology} />
            </div>
          </div>
          {valuation.limitation && (
            <AlertBanner type="warning" message={valuation.limitation} />
          )}
          <ReportSection title="Inventory Valuation Detail">
            <ReportTable
              headers={['Product', 'SKU', 'Category', 'Unit', 'In Stock', 'Unit Cost', 'Est. Value', 'Cost Source']}
              rows={(valuation.rows ?? []).map((p: any) => [
                <span className="font-medium text-slate-200">{p.productName}</span>,
                <span className="font-mono text-slate-500 text-[10px]">{p.sku ?? '—'}</span>,
                p.categoryName ?? '—',
                p.unitName ?? '—',
                <span className={`font-semibold ${p.currentStock <= 0 ? 'text-rose-400' : 'text-white'}`}>{formatNumber(p.currentStock, 2)}</span>,
                p.hasCostData ? formatCurrency(p.unitCost) : <span className="text-slate-500 text-[10px]">N/A</span>,
                p.hasCostData ? <span className="font-semibold text-amber-400">{formatCurrency(p.estimatedValue)}</span> : '—',
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.costSource === 'PURCHASE_PRICE' ? 'bg-emerald-500/10 text-emerald-400' : p.costSource === 'OPENING_STOCK_RATE' ? 'bg-amber-500/10 text-amber-400' : 'bg-surface-700 text-slate-500'}`}>
                  {p.costSource === 'PURCHASE_PRICE' ? 'Purchase' : p.costSource === 'OPENING_STOCK_RATE' ? 'Opening Rate' : 'None'}
                </span>,
              ])}
            />
          </ReportSection>
        </div>
      );
    }

    if (tab === 'adjustments') {
      return (
        <ReportSection title="Stock Adjustments" subtitle={`${adjustments.length} adjustment lines`}>
          <ReportTable
            headers={['Adj. #', 'Date', 'Product', 'SKU', 'Location', 'Type', 'System Qty', 'Difference', 'Reason']}
            rows={adjPag.paginated.map((a: any) => [
              <span className="font-mono text-brand-400 text-[10px]">{a.adjustmentNumber}</span>,
              formatDate(a.adjustmentDate),
              <span className="font-medium text-slate-200">{a.productName}</span>,
              <span className="font-mono text-slate-500 text-[10px]">{a.sku ?? '—'}</span>,
              a.locationName,
              <span className="px-1.5 py-0.5 bg-surface-800 rounded text-[10px] text-slate-300 border border-surface-700">{a.adjustmentType}</span>,
              formatNumber(a.systemQuantity, 2),
              <span className={`font-semibold ${a.differenceQuantity > 0 ? 'text-emerald-400' : a.differenceQuantity < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {a.differenceQuantity > 0 ? '+' : ''}{formatNumber(a.differenceQuantity, 2)}
              </span>,
              <span className="text-slate-400 max-w-[120px] truncate block">{a.reason ?? '—'}</span>,
            ])}
          />
          <Pagination page={adjPag.page} totalPages={adjPag.totalPages} total={adjustments.length} onPage={adjPag.setPage} />
        </ReportSection>
      );
    }

    return null;
  };

  const needsDateRange = ['movements', 'adjustments'].includes(tab);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-surface-900 border border-surface-700 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {needsDateRange && (
          <DateRangeFilter
            period={period}
            startDate={startDate}
            endDate={endDate}
            onPeriodChange={setPeriod}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onApply={load}
            loading={loading}
          />
        )}
      </div>
      {renderContent()}
    </div>
  );
};
