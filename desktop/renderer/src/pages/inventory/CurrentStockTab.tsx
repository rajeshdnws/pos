import React, { useEffect, useState } from 'react';
import {
  Search,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Boxes,
} from 'lucide-react';
import {
  Brand,
  Category,
  CurrentStockFilterDTO,
  CurrentStockItem,
  InventoryLocation,
  StockStatus,
} from '@rs-inventory/types';
import { formatCurrency } from '@rs-inventory/business';
import { ProductDetailsModal } from '../products/ProductDetailsModal';

export const CurrentStockTab: React.FC = () => {
  const [items, setItems] = useState<CurrentStockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [brandId, setBrandId] = useState<string>('');
  const [status, setStatus] = useState<StockStatus | ''>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'currentStock' | 'valuation'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Master options
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Selected Product for Details Modal
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const loadFilterOptions = async () => {
    try {
      const [locRes, catRes, brandRes] = await Promise.all([
        window.rsInventory.listLocations(false),
        window.rsInventory.listCategories(false),
        window.rsInventory.listBrands(false),
      ]);
      if (locRes.success && locRes.data) setLocations(locRes.data);
      if (catRes.success && catRes.data) setCategories(catRes.data);
      if (brandRes.success && brandRes.data) setBrands(brandRes.data);
    } catch (err) {
      console.error('Failed to load filter metadata:', err);
    }
  };

  const loadStockData = async () => {
    try {
      setLoading(true);
      const filter: CurrentStockFilterDTO = {
        page,
        pageSize,
        search: search.trim() || undefined,
        locationId: locationId || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        status: status || undefined,
        lowStock: lowStockOnly || undefined,
        sortBy,
        sortOrder,
      };

      const res = await window.rsInventory.getCurrentStock(filter);
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load current stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadStockData();
  }, [page, pageSize, search, locationId, categoryId, brandId, status, lowStockOnly, sortBy, sortOrder]);

  const exportToCSV = () => {
    if (items.length === 0) return;

    const headers = [
      'Product Name',
      'SKU',
      'Barcode',
      'Category',
      'Brand',
      'Location',
      'Current Stock',
      'Unit',
      'Min Stock',
      'Purchase Price',
      'Selling Price',
      'Valuation (Cost)',
      'Status',
    ];

    const rows = items.map((item) => [
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.sku || ''}"`,
      `"${item.barcode || ''}"`,
      `"${item.categoryName || ''}"`,
      `"${item.brandName || ''}"`,
      `"${item.locationName}"`,
      item.currentStock,
      `"${item.unitSymbol}"`,
      item.minimumStock,
      item.purchasePrice,
      item.sellingPrice,
      item.valuation,
      item.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `current_stock_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (itemStatus: StockStatus) => {
    switch (itemStatus) {
      case 'IN_STOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            In Stock
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Low Stock
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Out of Stock
          </span>
        );
      case 'NEGATIVE_STOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Negative Stock
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product, SKU, barcode..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          {/* Quick Low Stock Toggle & Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg cursor-pointer hover:bg-amber-500/20 transition">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-amber-400 text-amber-500 focus:ring-amber-400"
              />
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock Alerts</span>
            </label>

            <button
              onClick={exportToCSV}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={loadStockData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Refresh stock"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-800/60">
          {/* Location */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Storage Location</label>
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Locations (Combined)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Brand</label>
            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Stock Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StockStatus | '');
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="NEGATIVE_STOCK">Negative Stock</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Sort By</label>
            <div className="flex gap-1.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="name">Product Name</option>
                <option value="sku">SKU Code</option>
                <option value="currentStock">Stock Quantity</option>
                <option value="valuation">Valuation (Cost)</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-700"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Product Info</th>
                <th className="py-3 px-4">Category / Brand</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Min Stock</th>
                <th className="py-3 px-4 text-right">Purchase Price</th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading current stock levels...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Boxes className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <span>No products found matching the current filters.</span>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => setSelectedProductId(item.productId)}
                  >
                    {/* Product Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{item.productName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        {item.sku && <span>SKU: {item.sku}</span>}
                        {item.barcode && <span>Bar: {item.barcode}</span>}
                      </div>
                    </td>

                    {/* Category / Brand */}
                    <td className="py-3 px-4">
                      <div className="text-slate-300">{item.categoryName || '—'}</div>
                      <div className="text-[11px] text-slate-500">{item.brandName || '—'}</div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium">
                        {item.locationName}
                      </span>
                    </td>

                    {/* Current Stock */}
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold text-sm ${
                          item.currentStock < 0
                            ? 'text-purple-400'
                            : item.currentStock === 0
                            ? 'text-rose-400'
                            : item.currentStock <= item.minimumStock
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.currentStock}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400">{item.unitSymbol}</span>
                    </td>

                    {/* Min Stock */}
                    <td className="py-3 px-4 text-right text-slate-400">
                      {item.minimumStock} {item.unitSymbol}
                    </td>

                    {/* Purchase Price */}
                    <td className="py-3 px-4 text-right text-slate-300 font-medium">
                      {formatCurrency(item.purchasePrice)}
                    </td>

                    {/* Stock Valuation */}
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {formatCurrency(item.valuation)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">{getStatusBadge(item.status)}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedProductId(item.productId)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition"
                        title="View stock history & details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 border-t border-slate-800 text-xs text-slate-400 gap-3">
          <div>
            Showing <span className="font-semibold text-white">{items.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> total stock records
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
                <option value={20}>20</option>
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

      {/* Product Details & Stock Inspector Modal */}
      {selectedProductId && (
        <ProductDetailsModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onUpdated={loadStockData}
        />
      )}
    </div>
  );
};
