import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, Category, Brand, Unit, ProductFilterDTO, PaginatedResult } from '@rs-inventory/types';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailsModal } from './ProductDetailsModal';

export const ProductsListPage: React.FC = () => {
  // Data lists
  const [result, setResult] = useState<PaginatedResult<Product>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedTaxRate, setSelectedTaxRate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'sellingPrice' | 'purchasePrice' | 'createdAt' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Status & Feedback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load masters (categories, brands, units)
  const fetchMasters = useCallback(async () => {
    try {
      const [catRes, brandRes, unitRes] = await Promise.all([
        window.rsInventory.listCategories(true),
        window.rsInventory.listBrands(true),
        window.rsInventory.listUnits(true),
      ]);
      if (catRes.success && catRes.data) setCategories(catRes.data);
      if (brandRes.success && brandRes.data) setBrands(brandRes.data);
      if (unitRes.success && unitRes.data) setUnits(unitRes.data);
    } catch {
      // Ignored for masters fallback
    }
  }, []);

  // Fetch paginated products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: ProductFilterDTO = {
        search: search.trim() || undefined,
        categoryId: selectedCategory || undefined,
        brandId: selectedBrand || undefined,
        unitId: selectedUnit || undefined,
        productType: (selectedType as any) || undefined,
        taxRate: selectedTaxRate !== '' ? parseFloat(selectedTaxRate) : undefined,
        status: selectedStatus,
        lowStock: lowStockOnly || undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
      };

      const res = await window.rsInventory.listProducts(filter);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error?.message || 'Failed to load products');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching products');
    } finally {
      setLoading(false);
    }
  }, [
    search,
    selectedCategory,
    selectedBrand,
    selectedUnit,
    selectedType,
    selectedTaxRate,
    selectedStatus,
    lowStockOnly,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Global Ctrl+K hotkey for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };

  const [installingDemo, setInstallingDemo] = useState(false);
  const handleInstallDemoData = async () => {
    setInstallingDemo(true);
    try {
      const res = await window.rsInventory.installDemoData();
      if (res.success && res.data) {
        setSuccessMsg(res.data.message || 'Demo data installed successfully!');
        await fetchMasters();
        await fetchProducts();
      } else {
        setError(res.error?.message || 'Failed to install demo data.');
      }
    } catch {
      setError('Failed to install demo data.');
    } finally {
      setInstallingDemo(false);
    }
  };

  const handleEditProduct = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProduct(product);
    setIsFormModalOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
  };

  const handleToggleStatus = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await window.rsInventory.toggleProductActive(product.id);
      if (res.success) {
        setSuccessMsg(`Product ${!product.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchProducts();
      } else {
        setError(res.error?.message || 'Failed to change product status');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating status');
    }
  };

  const handleSort = (field: 'name' | 'sku' | 'sellingPrice' | 'purchasePrice') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedUnit('');
    setSelectedType('');
    setSelectedTaxRate('');
    setSelectedStatus('active');
    setLowStockOnly(false);
    setPage(1);
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return '₹0.00';
    return `₹${val.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Alert Banners */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm flex justify-between items-center shadow-lg">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold ml-4">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-sm flex justify-between items-center shadow-lg">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Top Actions & Search Bar */}
      <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Live Search Input with shortcut */}
          <div className="relative flex-1 max-w-lg w-full">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, SKU, barcode, HSN (Ctrl + K)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-16 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
            <span className="absolute left-3 top-3 text-slate-400">🔍</span>
            <span className="absolute right-3 top-2.5 px-2 py-0.5 text-xs bg-slate-700/80 text-slate-400 rounded-md border border-slate-600">
              Ctrl+K
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCreateProduct}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>+</span>
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-800/80 text-xs">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Unit Filter */}
          <select
            value={selectedUnit}
            onChange={(e) => {
              setSelectedUnit(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Units</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.shortCode})</option>
            ))}
          </select>

          {/* Product Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Types</option>
            <option value="PHYSICAL">Physical Product</option>
            <option value="SERVICE">Service</option>
            <option value="DIGITAL">Digital Item</option>
          </select>

          {/* Tax Rate Filter */}
          <select
            value={selectedTaxRate}
            onChange={(e) => {
              setSelectedTaxRate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All GST Rates</option>
            <option value="0">GST 0%</option>
            <option value="5">GST 5%</option>
            <option value="12">GST 12%</option>
            <option value="18">GST 18%</option>
            <option value="28">GST 28%</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as any);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Statuses</option>
          </select>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 font-medium transition-colors text-center"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading product catalog...
          </div>
        ) : result.items.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm space-y-3">
            <p className="text-base font-semibold text-slate-300">No products found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search || selectedCategory || selectedBrand || selectedUnit
                ? 'Try adjusting your search queries or clearing active filters.'
                : 'Get started by creating your first product item in the catalog.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleCreateProduct}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
              >
                + Create Product
              </button>
              <button
                onClick={handleInstallDemoData}
                disabled={installingDemo}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>{installingDemo ? 'Installing Demo Data...' : 'Install Demo Data'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-800/80 uppercase font-semibold text-slate-400 border-b border-slate-800 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-200"
                  >
                    Product Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    onClick={() => handleSort('sku')}
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-200"
                  >
                    SKU / Barcode {sortBy === 'sku' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-3.5">Category & Brand</th>
                  <th className="px-4 py-3.5">Unit</th>
                  <th
                    onClick={() => handleSort('purchasePrice')}
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-200 text-right"
                  >
                    Purchase {sortBy === 'purchasePrice' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    onClick={() => handleSort('sellingPrice')}
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-200 text-right"
                  >
                    Selling Price {sortBy === 'sellingPrice' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-3.5 text-right">MRP</th>
                  <th className="px-4 py-3.5 text-center">GST %</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {result.items.map((prod: Product) => {
                  const isSellingOverMRP = prod.mrp && prod.sellingPrice > prod.mrp;
                  return (
                    <tr
                      key={prod.id}
                      onClick={() => handleViewProduct(prod)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Name & Short Name */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                          {prod.name}
                        </div>
                        {prod.shortName && (
                          <div className="text-[11px] text-slate-400 truncate">{prod.shortName}</div>
                        )}
                      </td>

                      {/* SKU / Barcode */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-slate-300">{prod.sku}</div>
                        {prod.barcode && (
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <span>🏷️</span>
                            <span>{prod.barcode}</span>
                          </div>
                        )}
                      </td>

                      {/* Category & Brand */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-200">{prod.category?.name || '—'}</div>
                        <div className="text-[11px] text-indigo-400/80">{prod.brand?.name || '—'}</div>
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-[11px] text-slate-300">
                          {prod.unit?.shortCode || prod.unit?.name || '—'}
                        </span>
                      </td>

                      {/* Purchase Price */}
                      <td className="px-4 py-3.5 text-right font-medium text-slate-300">
                        {formatCurrency(prod.purchasePrice)}
                      </td>

                      {/* Selling Price with MRP Warning */}
                      <td className="px-4 py-3.5 text-right font-semibold">
                        <span className={isSellingOverMRP ? 'text-amber-400' : 'text-emerald-400'}>
                          {formatCurrency(prod.sellingPrice)}
                        </span>
                        {isSellingOverMRP && (
                          <div className="text-[10px] text-amber-400 font-normal">⚠️ &gt; MRP</div>
                        )}
                      </td>

                      {/* MRP */}
                      <td className="px-4 py-3.5 text-right text-slate-300">
                        {prod.mrp ? formatCurrency(prod.mrp) : '—'}
                      </td>

                      {/* Tax Rate */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[11px] text-slate-300">
                          {prod.taxRate}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            prod.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {prod.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProduct(prod);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                          title="View Details & Price History"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => handleEditProduct(prod, e)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                          title="Edit Product"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleToggleStatus(prod, e)}
                          className={`px-2 py-1 rounded border transition-colors ${
                            prod.isActive
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={prod.isActive ? 'Deactivate Product' : 'Activate Product'}
                        >
                          {prod.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Footer Controls */}
        <div className="bg-slate-800/60 px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>items per page (Total {result.total} products)</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Page {result.page} of {result.totalPages || 1}
            </span>
            <div className="flex gap-1">
              <button
                disabled={result.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded border border-slate-700 font-medium"
              >
                Prev
              </button>
              <button
                disabled={result.page >= result.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded border border-slate-700 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Form Modal (Create / Edit) */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        product={editingProduct}
        categories={categories}
        brands={brands}
        units={units}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          setIsFormModalOpen(false);
          fetchProducts();
          fetchMasters();
        }}
      />

      {/* Product Details Modal (View Details & Price History) */}
      <ProductDetailsModal
        isOpen={!!viewingProduct}
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
        onEdit={(prod) => {
          setViewingProduct(null);
          setEditingProduct(prod);
          setIsFormModalOpen(true);
        }}
      />
    </div>
  );
};
