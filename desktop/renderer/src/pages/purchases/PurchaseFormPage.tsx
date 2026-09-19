import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  IndianRupee,
  Save,
  CheckCircle2,
  ArrowLeft,
  Layers,
  FileText,
} from 'lucide-react';
import {
  Supplier,
  Product,
  InventoryLocation,
  PurchaseDraftCreateDTO,
  PurchaseCalculationInput,
  PurchaseCalculationResult,
  Purchase,
  DiscountType,
} from '@rs-inventory/types';
import { formatCurrency, PurchaseCalculationService } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { SupplierModal } from '../suppliers/SupplierModal';

interface PurchaseFormPageProps {
  editPurchaseId?: string | null;
  initialSupplierId?: string | null;
  onBack: () => void;
  onSaved: (purchase: Purchase) => void;
}

interface FormLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  unitName?: string;
}

const GST_RATES = [0, 5, 12, 18, 28];

export const PurchaseFormPage: React.FC<PurchaseFormPageProps> = ({
  editPurchaseId,
  initialSupplierId,
  onBack,
  onSaved,
}) => {
  const { notify } = useNotificationStore();

  // Masters
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);

  // Form Header State
  const [supplierId, setSupplierId] = useState<string>(initialSupplierId || '');
  const [locationId, setLocationId] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [dueDate, setDueDate] = useState<string>('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState('');
  const [isInterState, setIsInterState] = useState(false);
  const [extraDiscountType, setExtraDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [extraDiscountValue, setExtraDiscountValue] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Line Items State
  const [items, setItems] = useState<FormLineItem[]>([]);

  // Product Search / Barcode in Table
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Modals & Flags
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    if (editPurchaseId) {
      loadEditData(editPurchaseId);
    }
  }, [editPurchaseId]);

  const loadMasters = async () => {
    try {
      const [suppRes, prodRes, locRes] = await Promise.all([
        window.rsInventory.listSuppliers({ pageSize: 500, isActive: true }),
        window.rsInventory.listProducts({ pageSize: 1000, isActive: true }),
        window.rsInventory.listLocations(false),
      ]);

      if (suppRes.success && suppRes.data) {
        setSuppliers(suppRes.data.items);
      }
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data.items);
      }
      if (locRes.success && locRes.data) {
        setLocations(locRes.data);
        const def = locRes.data.find((l) => l.isDefault) || locRes.data[0];
        if (def && !locationId) {
          setLocationId(def.id);
        }
      }
    } catch (err) {
      console.error('Failed to load masters for purchase form:', err);
    }
  };

  const loadEditData = async (id: string) => {
    setLoading(true);
    try {
      const res = await window.rsInventory.getPurchase(id);
      if (res.success && res.data) {
        const p = res.data;
        setSupplierId(p.supplierId);
        setLocationId(p.locationId || '');
        setPurchaseDate(new Date(p.purchaseDate).toISOString().split('T')[0]);
        setDueDate(p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '');
        setSupplierInvoiceNumber(p.supplierInvoiceNumber || '');
        setSupplierInvoiceDate('');
        setIsInterState(p.isInterState ?? false);
        setExtraDiscountType(p.extraDiscountType ?? 'PERCENTAGE');
        setExtraDiscountValue(p.extraDiscountValue ?? 0);
        setOtherCharges(p.otherCharges ?? 0);
        setNotes(p.notes || '');

        if (p.items) {
          setItems(
            p.items.map((i) => ({
              id: i.id,
              productId: i.productId,
              productName: i.product?.name || i.productNameSnapshot || 'Product',
              sku: i.product?.sku || i.skuSnapshot || '',
              barcode: i.product?.barcode || i.barcodeSnapshot || '',
              batchNumber: '',
              expiryDate: '',
              quantity: i.quantity,
              freeQuantity: i.freeQuantity || 0,
              purchaseRate: i.purchaseRate,
              discountType: 'PERCENTAGE',
              discountValue: i.discountPercentage || 0,
              taxRate: i.taxRate,
              unitName: i.product?.unit?.name || i.unitNameSnapshot || '',
            })),
          );
        }
      } else {
        notify('error', res.error?.message || 'Failed to load purchase draft');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error loading purchase');
    } finally {
      setLoading(false);
    }
  };

  // Check supplier changes to auto-detect inter-state
  const handleSupplierChange = (sId: string) => {
    setSupplierId(sId);
  };

  // Product Search filter
  const handleProductSearch = (query: string) => {
    setProductSearch(query);
    if (!query.trim()) {
      setFilteredProducts([]);
      setShowProductDropdown(false);
      return;
    }
    const q = query.toLowerCase();
    const matches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)),
    );
    setFilteredProducts(matches.slice(0, 10));
    setShowProductDropdown(true);
  };

  const handleSelectProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      const newItem: FormLineItem = {
        id: Math.random().toString(36).substring(2, 9),
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        quantity: 1,
        freeQuantity: 0,
        purchaseRate: product.purchasePrice || 0,
        discountType: 'PERCENTAGE',
        discountValue: 0,
        taxRate: product.taxRate || 18,
        unitName: product.unit?.name || 'PCS',
      };
      setItems([...items, newItem]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleUpdateLine = (id: string, field: keyof FormLineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    );
  };

  const handleRemoveLine = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Live Calculations via authoritative business function
  const calculatedTotals: PurchaseCalculationResult = useMemo(() => {
    const rawSubtotal = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.purchaseRate) || 0), 0);
    const invoiceDiscount =
      extraDiscountType === 'PERCENTAGE'
        ? (rawSubtotal * (Number(extraDiscountValue) || 0)) / 100
        : Number(extraDiscountValue) || 0;

    const calcInput: PurchaseCalculationInput = {
      isInterState,
      invoiceDiscount,
      additionalCharges: Number(otherCharges) || 0,
      items: items.map((i) => ({
        quantity: Number(i.quantity) || 0,
        freeQuantity: Number(i.freeQuantity) || 0,
        purchaseRate: Number(i.purchaseRate) || 0,
        discountPercentage: i.discountType === 'PERCENTAGE' ? Number(i.discountValue) || 0 : undefined,
        discountAmount: i.discountType === 'FIXED' ? Number(i.discountValue) || 0 : undefined,
        taxRate: Number(i.taxRate) || 0,
      })),
    };
    return PurchaseCalculationService.calculateInvoice(calcInput);
  }, [items, isInterState, extraDiscountType, extraDiscountValue, otherCharges]);

  const validateForm = (): boolean => {
    if (!supplierId) {
      notify('warning', 'Please select a supplier');
      return false;
    }
    if (!locationId) {
      notify('warning', 'Please select a receiving storage location');
      return false;
    }
    if (items.length === 0) {
      notify('warning', 'Please add at least one product line item');
      return false;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.quantity <= 0) {
        notify('warning', `Row #${i + 1} (${item.productName}) must have quantity > 0`);
        return false;
      }
      if (item.purchaseRate < 0) {
        notify('warning', `Row #${i + 1} (${item.productName}) purchase rate cannot be negative`);
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const dto: PurchaseDraftCreateDTO = {
        supplierId,
        locationId: locationId || undefined,
        purchaseDate: purchaseDate,
        dueDate: dueDate || undefined,
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        invoiceDiscount: Number(extraDiscountValue) || 0,
        additionalCharges: Number(otherCharges) || 0,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          freeQuantity: Number(i.freeQuantity) || 0,
          purchaseRate: Number(i.purchaseRate),
          discountPercentage: i.discountType === 'PERCENTAGE' ? Number(i.discountValue) || 0 : undefined,
          discountAmount: i.discountType === 'FIXED' ? Number(i.discountValue) || 0 : undefined,
          taxRate: Number(i.taxRate) || 0,
        })),
      };

      if (editPurchaseId) {
        const res = await window.rsInventory.updatePurchaseDraft(editPurchaseId, dto);
        if (res.success && res.data) {
          notify('success', 'Purchase draft updated successfully');
          onSaved(res.data);
        } else {
          notify('error', res.error?.message || 'Failed to update draft');
        }
      } else {
        const res = await window.rsInventory.createPurchaseDraft(dto);
        if (res.success && res.data) {
          notify('success', 'Purchase draft created successfully');
          onSaved(res.data);
        } else {
          notify('error', res.error?.message || 'Failed to save draft');
        }
      }
    } catch (err: any) {
      notify('error', err.message || 'Error saving purchase');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPost = async () => {
    if (!validateForm()) return;
    if (
      !window.confirm(
        'Are you sure you want to Post this Purchase directly to Stock?\nThis will increment stock quantities in the authoritative stock ledger and increase supplier liability balance.',
      )
    ) {
      return;
    }

    setPosting(true);
    try {
      // First save draft if new or edited
      const dto: PurchaseDraftCreateDTO = {
        supplierId,
        locationId: locationId || undefined,
        purchaseDate: purchaseDate,
        dueDate: dueDate || undefined,
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        invoiceDiscount: Number(extraDiscountValue) || 0,
        additionalCharges: Number(otherCharges) || 0,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          freeQuantity: Number(i.freeQuantity) || 0,
          purchaseRate: Number(i.purchaseRate),
          discountPercentage: i.discountType === 'PERCENTAGE' ? Number(i.discountValue) || 0 : undefined,
          discountAmount: i.discountType === 'FIXED' ? Number(i.discountValue) || 0 : undefined,
          taxRate: Number(i.taxRate) || 0,
        })),
      };

      let targetId = editPurchaseId;
      if (editPurchaseId) {
        await window.rsInventory.updatePurchaseDraft(editPurchaseId, dto);
      } else {
        const draftRes = await window.rsInventory.createPurchaseDraft(dto);
        if (!draftRes.success || !draftRes.data) {
          throw new Error(draftRes.error?.message || 'Failed to create draft prior to posting');
        }
        targetId = draftRes.data.id;
      }

      // Now post to stock
      const postRes = await window.rsInventory.postPurchase(targetId!);
      if (postRes.success && postRes.data) {
        notify('success', `Purchase #${postRes.data.purchaseNumber} posted to stock successfully!`);
        onSaved(postRes.data);
      } else {
        notify('error', postRes.error?.message || 'Failed to post purchase');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error posting purchase');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3" />
        <span>Loading purchase details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-900/80 p-4 rounded-2xl border border-surface-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-surface-800 hover:bg-surface-700 text-slate-300 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-indigo-400" />
              <span>{editPurchaseId ? 'Edit Purchase Invoice / Draft' : 'New Purchase Invoice'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Record incoming goods, vendor taxes, discounts, and update inventory receipts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={saving || posting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-200 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 rounded-xl border border-surface-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>
          <button
            onClick={handleSaveAndPost}
            disabled={saving || posting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{posting ? 'Posting to Stock...' : 'Save & Post to Stock'}</span>
          </button>
        </div>
      </div>

      {/* Invoice Header Details Box */}
      <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Supplier Selector */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Supplier <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add New Supplier</span>
              </button>
            </div>
            <select
              value={supplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) {s.gstin ? `[GSTIN: ${s.gstin}]` : ''} - Bal: {formatCurrency(s.currentBalance || 0)}
                </option>
              ))}
            </select>
          </div>

          {/* Receiving Location */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Receiving Storage Location <span className="text-rose-400">*</span>
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Purchase Entry Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Supplier Invoice # */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Supplier Invoice / Bill No
            </label>
            <input
              type="text"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-904"
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Supplier Invoice Date */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Supplier Bill Date
            </label>
            <input
              type="date"
              value={supplierInvoiceDate}
              onChange={(e) => setSupplierInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Payment Due Date */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* GST Tax Type Toggle (Intra-state vs Inter-state) */}
          <div className="flex flex-col justify-end">
            <label className="block text-xs font-medium text-slate-300 mb-1">GST Tax Type</label>
            <div className="flex items-center gap-4 py-1.5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                <input
                  type="radio"
                  name="gstType"
                  checked={!isInterState}
                  onChange={() => setIsInterState(false)}
                  className="text-indigo-600 focus:ring-0"
                />
                <span>Intra-State (CGST + SGST)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                <input
                  type="radio"
                  name="gstType"
                  checked={isInterState}
                  onChange={() => setIsInterState(true)}
                  className="text-indigo-600 focus:ring-0"
                />
                <span>Inter-State (IGST)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table & Product Search */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Purchase Line Items ({items.length})</span>
          </h3>

          {/* Barcode & Search Product Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => handleProductSearch(e.target.value)}
              onFocus={() => {
                if (productSearch) setShowProductDropdown(true);
              }}
              placeholder="Scan barcode or type SKU / Name..."
              className="w-full pl-9 pr-4 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />

            {/* Dropdown search results */}
            {showProductDropdown && filteredProducts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-surface-800">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod)}
                    className="p-3 hover:bg-surface-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{prod.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        SKU: {prod.sku} {prod.barcode ? `| Barcode: ${prod.barcode}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-indigo-300 font-medium">
                        {formatCurrency(prod.purchasePrice || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500">Tax: {prod.taxRate}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Grid */}
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-950 text-slate-400 border-b border-surface-800 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10">#</th>
                <th className="py-2.5 px-3 min-w-[180px]">Product / Item</th>
                <th className="py-2.5 px-3 w-28">Batch / Exp</th>
                <th className="py-2.5 px-3 w-24 text-right">Qty</th>
                <th className="py-2.5 px-3 w-20 text-right">Free</th>
                <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 w-28 text-right">Discount</th>
                <th className="py-2.5 px-3 w-24 text-right">GST %</th>
                <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60 bg-surface-900">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    No products added. Scan a barcode or search products above to add items.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const lineCalc = calculatedTotals.items[idx];
                  return (
                    <tr key={item.id} className="hover:bg-surface-800/30">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.sku} {item.unitName ? `(${item.unitName})` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 space-y-1">
                        <input
                          type="text"
                          placeholder="Batch"
                          value={item.batchNumber || ''}
                          onChange={(e) => handleUpdateLine(item.id, 'batchNumber', e.target.value)}
                          className="w-full px-2 py-1 bg-surface-950 border border-surface-700 rounded text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={(e) => handleUpdateLine(item.id, 'expiryDate', e.target.value)}
                          className="w-full px-2 py-0.5 bg-surface-950 border border-surface-700 rounded text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateLine(item.id, 'quantity', Number(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 bg-surface-950 border border-surface-700 rounded text-xs text-right font-mono text-white focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.freeQuantity}
                          onChange={(e) =>
                            handleUpdateLine(item.id, 'freeQuantity', Number(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 bg-surface-950 border border-surface-700 rounded text-xs text-right font-mono text-white focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.purchaseRate}
                          onChange={(e) =>
                            handleUpdateLine(item.id, 'purchaseRate', Number(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 bg-surface-950 border border-surface-700 rounded text-xs text-right font-mono text-white focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discountValue}
                            onChange={(e) =>
                              handleUpdateLine(
                                item.id,
                                'discountValue',
                                Number(e.target.value) || 0,
                              )
                            }
                            className="w-full px-1.5 py-1 bg-surface-950 border border-surface-700 rounded text-xs text-right font-mono text-white focus:outline-none focus:border-indigo-500"
                          />
                          <select
                            value={item.discountType}
                            onChange={(e) =>
                              handleUpdateLine(
                                item.id,
                                'discountType',
                                e.target.value as DiscountType,
                              )
                            }
                            className="px-1 bg-surface-950 border border-surface-700 rounded text-[10px] text-slate-300 focus:outline-none"
                          >
                            <option value="PERCENTAGE">%</option>
                            <option value="FIXED">₹</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <select
                          value={item.taxRate}
                          onChange={(e) =>
                            handleUpdateLine(item.id, 'taxRate', Number(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 bg-surface-950 border border-surface-700 rounded text-xs text-right text-white focus:outline-none focus:border-indigo-500"
                        >
                          {GST_RATES.map((rate) => (
                            <option key={rate} value={rate}>
                              {rate}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {formatCurrency(lineCalc ? lineCalc.lineTotal : 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleRemoveLine(item.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Bottom Calculations & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes & Extra Adjustments */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Additional Adjustments & Notes</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Extra Invoice Discount
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraDiscountValue}
                  onChange={(e) => setExtraDiscountValue(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-right font-mono text-white focus:border-indigo-500 focus:outline-none"
                />
                <select
                  value={extraDiscountType}
                  onChange={(e) => setExtraDiscountType(e.target.value as DiscountType)}
                  className="px-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-slate-300 focus:outline-none"
                >
                  <option value="PERCENTAGE">%</option>
                  <option value="FIXED">₹</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Other Charges (Freight / Packaging)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={otherCharges}
                onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-right font-mono text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Internal Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Terms, transport details, vehicle number, or inward remarks..."
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Tax Summary Breakdown Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-3">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            <span>Tax & Invoice Summary</span>
          </h3>

          <div className="space-y-2 text-xs divide-y divide-surface-800/80">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Subtotal (Gross Item Amount)</span>
              <span className="text-slate-200 font-mono font-medium">
                {formatCurrency(calculatedTotals.subtotal)}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-400">Item Discounts</span>
              <span className="text-emerald-400 font-mono font-medium">
                - {formatCurrency(calculatedTotals.lineDiscountTotal)}
              </span>
            </div>

            {calculatedTotals.invoiceDiscount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Extra Invoice Discount</span>
                <span className="text-emerald-400 font-mono font-medium">
                  - {formatCurrency(calculatedTotals.invoiceDiscount)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1 font-semibold">
              <span className="text-slate-300">Taxable Amount</span>
              <span className="text-white font-mono">{formatCurrency(calculatedTotals.taxableAmount)}</span>
            </div>

            {!isInterState ? (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">CGST (Central Tax)</span>
                  <span className="text-indigo-300 font-mono">{formatCurrency(calculatedTotals.cgstAmount)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">SGST (State Tax)</span>
                  <span className="text-indigo-300 font-mono">{formatCurrency(calculatedTotals.sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1">
                <span className="text-slate-400">IGST (Integrated Tax)</span>
                <span className="text-indigo-300 font-mono">{formatCurrency(calculatedTotals.igstAmount)}</span>
              </div>
            )}

            {calculatedTotals.additionalCharges > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Other Charges</span>
                <span className="text-slate-200 font-mono font-medium">
                  + {formatCurrency(calculatedTotals.additionalCharges)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1">
              <span className="text-slate-400">Round Off</span>
              <span className="text-slate-300 font-mono">
                {calculatedTotals.roundOff >= 0 ? '+' : ''}
                {calculatedTotals.roundOff.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-baseline pt-3 border-t-2 border-indigo-500/30">
              <span className="text-sm font-bold text-white uppercase tracking-wide">Grand Total</span>
              <span className="text-2xl font-black font-mono text-indigo-400">
                {formatCurrency(calculatedTotals.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Supplier Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSaved={(newSupp) => {
          setSuppliers((prev) => [newSupp, ...prev]);
          setSupplierId(newSupp.id);
        }}
      />
    </div>
  );
};
