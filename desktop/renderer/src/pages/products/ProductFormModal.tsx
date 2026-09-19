import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  Boxes,
  Check,
  Hash,
  Loader2,
  PackagePlus,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import {
  Brand,
  Category,
  Product,
  ProductCreateDTO,
  ProductUpdateDTO,
  Unit,
} from '@rs-inventory/types';

interface ProductFormModalProps {
  product?: Product | null;
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
}

const TAX_RATE_OPTIONS = [
  { label: '0% (Exempt / Nil)', value: 0 },
  { label: '5% (GST 5%)', value: 5 },
  { label: '12% (GST 12%)', value: 12 },
  { label: '18% (GST 18% Standard)', value: 18 },
  { label: '28% (GST 28% Luxury)', value: 28 },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  categories,
  brands,
  units,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isEdit = Boolean(product);

  const [formData, setFormData] = useState<ProductCreateDTO>({
    name: '',
    shortName: '',
    description: '',
    sku: '',
    barcode: '',
    hsnCode: '',
    categoryId: '',
    brandId: '',
    unitId: '',
    productType: 'PHYSICAL',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    taxRate: 18,
    minimumStock: 0,
    maximumStock: null,
    openingStock: 0,
    openingStockRate: 0,
    trackStock: true,
    isActive: true,
  });

  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        shortName: product.shortName || '',
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        hsnCode: product.hsnCode || '',
        categoryId: product.categoryId || '',
        brandId: product.brandId || '',
        unitId: product.unitId || '',
        productType: product.productType || 'PHYSICAL',
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        taxRate: product.taxRate,
        minimumStock: product.minimumStock,
        maximumStock: product.maximumStock !== undefined ? product.maximumStock : null,
        openingStock: product.openingStock,
        openingStockRate: product.openingStockRate,
        trackStock: product.trackStock,
        isActive: product.isActive,
      });
    } else {
      setFormData({
        name: '',
        shortName: '',
        description: '',
        sku: '',
        barcode: '',
        hsnCode: '',
        categoryId: categories.find((c) => c.isActive)?.id || '',
        brandId: '',
        unitId: units.find((u) => u.isActive)?.id || '',
        productType: 'PHYSICAL',
        purchasePrice: 0,
        sellingPrice: 0,
        mrp: 0,
        taxRate: 18,
        minimumStock: 0,
        maximumStock: null,
        openingStock: 0,
        openingStockRate: 0,
        trackStock: true,
        isActive: true,
      });
    }
    setErrorMessage(null);
  }, [product, isOpen, categories, units]);

  if (!isOpen) return null;

  const selectedUnit = units.find((u) => u.id === formData.unitId);
  const isSellingGreaterThanMrp =
    Number(formData.sellingPrice) > 0 &&
    Number(formData.mrp) > 0 &&
    Number(formData.sellingPrice) > Number(formData.mrp);

  const handleGenerateSku = async () => {
    setIsGeneratingSku(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.generateProductSku();
        if (res.success && res.data) {
          setFormData((prev) => ({ ...prev, sku: res.data }));
        }
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingSku(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick checks
    if (!formData.name.trim()) {
      setErrorMessage('Product Name is required.');
      return;
    }
    if (!formData.categoryId) {
      setErrorMessage('Please select a Category.');
      return;
    }
    if (!formData.unitId) {
      setErrorMessage('Please select a measurement Unit.');
      return;
    }

    if (
      selectedUnit &&
      !selectedUnit.allowDecimals &&
      Number(formData.openingStock || 0) % 1 !== 0
    ) {
      setErrorMessage(
        `Unit "${selectedUnit.name}" (${selectedUnit.shortCode}) does not allow decimal opening stock quantities.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        let res;
        if (isEdit && product) {
          const updatePayload: ProductUpdateDTO = {
            name: formData.name.trim(),
            shortName: formData.shortName?.trim() || null,
            description: formData.description?.trim() || null,
            sku: formData.sku?.trim() || null,
            barcode: formData.barcode?.trim() || null,
            hsnCode: formData.hsnCode?.trim() || null,
            categoryId: formData.categoryId || null,
            brandId: formData.brandId || null,
            unitId: formData.unitId || null,
            productType: formData.productType,
            purchasePrice: Number(formData.purchasePrice) || 0,
            sellingPrice: Number(formData.sellingPrice) || 0,
            mrp: Number(formData.mrp) || 0,
            taxRate: Number(formData.taxRate) || 0,
            minimumStock: Number(formData.minimumStock) || 0,
            maximumStock:
              formData.maximumStock !== undefined && formData.maximumStock !== null && formData.maximumStock !== ('' as any)
                ? Number(formData.maximumStock)
                : null,
            trackStock: Boolean(formData.trackStock),
            isActive: Boolean(formData.isActive),
          };
          res = await window.rsInventory.updateProduct(product.id, updatePayload);
        } else {
          const createPayload: ProductCreateDTO = {
            name: formData.name.trim(),
            shortName: formData.shortName?.trim() || null,
            description: formData.description?.trim() || null,
            sku: formData.sku?.trim() || null,
            barcode: formData.barcode?.trim() || null,
            hsnCode: formData.hsnCode?.trim() || null,
            categoryId: formData.categoryId,
            brandId: formData.brandId || null,
            unitId: formData.unitId,
            productType: formData.productType,
            purchasePrice: Number(formData.purchasePrice) || 0,
            sellingPrice: Number(formData.sellingPrice) || 0,
            mrp: Number(formData.mrp) || 0,
            taxRate: Number(formData.taxRate) || 0,
            minimumStock: Number(formData.minimumStock) || 0,
            maximumStock:
              formData.maximumStock !== undefined && formData.maximumStock !== null && formData.maximumStock !== ('' as any)
                ? Number(formData.maximumStock)
                : null,
            openingStock: Number(formData.openingStock) || 0,
            openingStockRate: Number(formData.openingStockRate) || Number(formData.purchasePrice) || 0,
            trackStock: Boolean(formData.trackStock),
            isActive: Boolean(formData.isActive),
          };
          res = await window.rsInventory.createProduct(createPayload);
        }

        if (res.success && res.data) {
          onSuccess(res.data);
          onClose();
        } else {
          setErrorMessage(res.error?.message || 'Failed to save product.');
        }
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <PackagePlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isEdit ? 'Edit Product Item' : 'Add New Product'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isEdit
                  ? `Updating catalog specifications for ${product?.name}`
                  : 'Configure product master, pricing, units, barcodes and opening stock'}
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

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* MRP Warning Alert */}
        {isSellingGreaterThanMrp && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Warning:</strong> Selling price (₹{formData.sellingPrice}) exceeds Maximum
              Retail Price (₹{formData.mrp}). Please confirm if intentional.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Section 1: General Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Coca Cola 500ml or Basmati Rice 5kg"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 text-xs"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  SKU (Stock Keeping Unit)
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Hash className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={formData.sku || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                      placeholder="e.g. CC-500 or PROD-000001"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    disabled={isGeneratingSku}
                    className="px-2.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 shrink-0"
                    title="Generate next available SKU"
                  >
                    {isGeneratingSku ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                    )}
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Barcode (EAN / UPC / Custom)
                </label>
                <div className="relative">
                  <Barcode className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                    placeholder="Scan with scanner or enter numbers"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {!c.isActive ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Brand (Optional)</label>
                <select
                  value={formData.brandId || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, brandId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                >
                  <option value="">-- No Brand / Generic --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {!b.isActive ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Unit <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.unitId || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unitId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                >
                  <option value="">-- Select Unit --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.shortCode}) {u.allowDecimals ? '[Decimals Allowed]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-surface-800/80 pt-4" />

          {/* Section 2: Pricing & Tax */}
          <div>
            <div className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              <span>Pricing & Taxation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Purchase Cost (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.purchasePrice ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.sellingPrice ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">MRP (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.mrp ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mrp: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tax Rate (%)</label>
                <select
                  value={formData.taxRate ?? 18}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                >
                  {TAX_RATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-surface-800/80 pt-4" />

          {/* Section 3: Inventory Levels & Opening Stock */}
          <div>
            <div className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5" />
              <span>Stock Control & Thresholds</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Minimum Alert Qty</label>
                <input
                  type="number"
                  step={selectedUnit?.allowDecimals ? 'any' : '1'}
                  min="0"
                  value={formData.minimumStock ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, minimumStock: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Stock Limit</label>
                <input
                  type="number"
                  step={selectedUnit?.allowDecimals ? 'any' : '1'}
                  min="0"
                  value={formData.maximumStock !== null && formData.maximumStock !== undefined ? formData.maximumStock : ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maximumStock: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Opening Stock {!isEdit ? '' : '(Initial)'}
                </label>
                <input
                  type="number"
                  step={selectedUnit?.allowDecimals ? 'any' : '1'}
                  min="0"
                  disabled={isEdit}
                  value={formData.openingStock ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, openingStock: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Opening Cost Rate (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  disabled={isEdit}
                  value={formData.openingStockRate ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      openingStockRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Flags */}
          <div className="pt-2 flex flex-wrap items-center gap-6 text-slate-300">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(formData.trackStock)}
                onChange={(e) => setFormData((prev) => ({ ...prev, trackStock: e.target.checked }))}
                className="h-4 w-4 rounded bg-surface-950 border-surface-700 text-brand-600 focus:ring-0 focus:ring-offset-0"
              />
              <span className="font-medium">Track Inventory Stock Level</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(formData.isActive)}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded bg-surface-950 border-surface-700 text-brand-600 focus:ring-0 focus:ring-offset-0"
              />
              <span className="font-medium">Active (Available for sales & purchases)</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-surface-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-semibold shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>{isEdit ? 'Save Changes' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
