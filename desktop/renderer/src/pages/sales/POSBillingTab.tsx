import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  DollarSign,
  QrCode,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Receipt,
  X,
  Loader2,
} from 'lucide-react';
import {
  Customer,
  Product,
  SalesInvoice,
  SalesInvoiceCreateDTO,
  SalesPostDTO,
} from '@rs-inventory/types';
import { formatCurrency, formatDate } from '@rs-inventory/business';
import { useNotificationStore } from '../../store/notificationStore';
import { CustomerModal } from '../customers/CustomerModal';
import { PrintSalesReceiptModal } from './PrintSalesReceiptModal';

export interface POSCartItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  unitCode: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  discountPercentage: number;
  discountAmount: number;
  availableStock: number;
}

interface POSBillingTabProps {
  initialCustomerId?: string;
}

export const POSBillingTab: React.FC<POSBillingTabProps> = ({
  initialCustomerId,
}) => {
  const { notify } = useNotificationStore();

  // Active Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Barcode & Product Search
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Cart State
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [isInterstate, setIsInterstate] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [processingOrder, setProcessingOrder] = useState(false);

  // Completed Invoice & Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<SalesInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // On-hold drafts modal
  const [onHoldDrafts, setOnHoldDrafts] = useState<SalesInvoice[]>([]);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadDrafts();
    if (barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  const loadCustomers = async () => {
    try {
      const res = await window.rsInventory.listCustomers({ pageSize: 100, isActive: true });
      if (res.success && res.data) {
        setCustomers(res.data.items);
      }
    } catch {
      // ignore
    }
  };

  const loadDrafts = async () => {
    try {
      const res = await window.rsInventory.listSales({ status: 'DRAFT', pageSize: 20 });
      if (res.success && res.data) {
        setOnHoldDrafts(res.data.items);
      }
    } catch {
      // ignore
    }
  };

  // Keyboard Shortcuts (F2: Barcode focus, F4: Clear cart, F8: Hold Bill, F9: Cash Tender)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === 'F4' && cart.length > 0) {
        e.preventDefault();
        if (window.confirm('Clear all items from current cart?')) {
          clearCart();
        }
      } else if (e.key === 'F8' && cart.length > 0) {
        e.preventDefault();
        handleHoldBill();
      } else if ((e.key === 'F9' || e.key === 'F10') && cart.length > 0) {
        e.preventDefault();
        openPaymentModal('CASH');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Product Search live
  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await window.rsInventory.searchProducts(productSearch.trim());
        if (res.success && res.data) {
          setSearchResults(res.data.slice(0, 8));
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Barcode Lookup on Enter
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    try {
      // 1. Try exact barcode match
      let product: Product | null = null;
      const bcRes = await window.rsInventory.getProductByBarcode(code);
      if (bcRes.success && bcRes.data) {
        product = bcRes.data;
      } else {
        // 2. Try SKU match
        const skuRes = await window.rsInventory.getProductBySku(code);
        if (skuRes.success && skuRes.data) {
          product = skuRes.data;
        } else {
          // 3. Try general search
          const searchRes = await window.rsInventory.searchProducts(code);
          if (searchRes.success && searchRes.data && searchRes.data.length > 0) {
            product = searchRes.data[0];
          }
        }
      }

      if (product) {
        addProductToCart(product);
        setBarcodeInput('');
      } else {
        notify('error', `No product found matching barcode/SKU "${code}"`);
      }
    } catch (err: any) {
      notify('error', err.message || 'Barcode scan error');
    }
  };

  const addProductToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + 1;
      updated[existingIndex].quantity = newQty;
      setCart(updated);
      notify('success', `Added ${product.name} (Qty: ${newQty})`);
    } else {
      const newItem: POSCartItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku || '',
        barcode: product.barcode,
        unitCode: (product as any).unit?.code || 'PCS',
        quantity: 1,
        unitPrice: Number(product.sellingPrice) || 0,
        costPrice: Number(product.purchasePrice) || 0,
        taxRate: Number(product.taxRate) || 0,
        discountPercentage: 0,
        discountAmount: 0,
        availableStock: (product as any).currentStock || 0,
      };
      setCart([newItem, ...cart]);
      notify('success', `Added ${product.name} to cart`);
    }
    setProductSearch('');
    setSearchResults([]);
    barcodeRef.current?.focus();
  };

  const updateCartItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  const updateCartItemDiscount = (index: number, discountPct: number) => {
    const updated = [...cart];
    const safePct = Math.min(100, Math.max(0, discountPct));
    updated[index].discountPercentage = safePct;
    setCart(updated);
  };

  const updateCartItemPrice = (index: number, newPrice: number) => {
    const updated = [...cart];
    updated[index].unitPrice = Math.max(0, newPrice);
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  const clearCart = () => {
    setCart([]);
    setBillDiscountValue(0);
    setNotes('');
    barcodeRef.current?.focus();
  };

  // Local Fast Totals Calculation
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;
    let totalTax = 0;

    cart.forEach((item) => {
      const gross = item.quantity * item.unitPrice;
      const lineDisc = (gross * (item.discountPercentage || 0)) / 100;
      const taxable = gross - lineDisc;
      const tax = (taxable * (item.taxRate || 0)) / 100;

      subtotal += gross;
      itemDiscounts += lineDisc;
      totalTax += tax;
    });

    // Bill-level discount
    let billDiscount = 0;
    const taxableBeforeBillDisc = subtotal - itemDiscounts;
    if (discountType === 'PERCENTAGE') {
      billDiscount = (taxableBeforeBillDisc * (billDiscountValue || 0)) / 100;
    } else {
      billDiscount = Math.min(taxableBeforeBillDisc, billDiscountValue || 0);
    }

    const totalDiscount = itemDiscounts + billDiscount;
    const taxableTotal = Math.max(0, subtotal - totalDiscount);
    const unroundedGrandTotal = taxableTotal + totalTax;
    const grandTotal = Math.round(unroundedGrandTotal);
    const roundOff = Number((grandTotal - unroundedGrandTotal).toFixed(2));

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    if (isInterstate) {
      igst = totalTax;
    } else {
      cgst = Number((totalTax / 2).toFixed(2));
      sgst = Number((totalTax / 2).toFixed(2));
    }

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      taxableTotal: Number(taxableTotal.toFixed(2)),
      cgst,
      sgst,
      igst,
      totalTax: Number(totalTax.toFixed(2)),
      roundOff,
      grandTotal,
    };
  };

  const totals = calculateTotals();

  // Customer selection helper
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Open Payment Modal
  const openPaymentModal = (mode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT') => {
    if (cart.length === 0) {
      notify('error', 'Cart is empty. Add products to bill.');
      return;
    }
    setPaymentMode(mode);
    setCashTendered(totals.grandTotal);
    setPaymentReference('');
    setIsPaymentModalOpen(true);
  };

  // Hold Bill as Draft
  const handleHoldBill = async () => {
    if (cart.length === 0) return;

    try {
      const draftDto: SalesInvoiceCreateDTO = {
        customerId: selectedCustomerId || undefined,
        invoiceDate: new Date().toISOString(),
        invoiceDiscount: totals.totalDiscount,
        notes: notes ? `[ON-HOLD] ${notes}` : '[ON-HOLD]',
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          sellingRate: item.unitPrice,
          discountPercentage: item.discountPercentage,
          taxRate: item.taxRate,
        })),
      };

      const res = await window.rsInventory.createSalesDraft(draftDto);
      if (res.success) {
        notify('success', `Bill held as draft: ${res.data?.invoiceNumber}`);
        clearCart();
        loadDrafts();
      } else {
        notify('error', res.error?.message || 'Failed to hold bill');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error holding bill');
    }
  };

  // Resume a held draft
  const handleResumeDraft = (draft: SalesInvoice) => {
    if (cart.length > 0) {
      if (!window.confirm('Current cart will be replaced with held bill. Continue?')) {
        return;
      }
    }

    setSelectedCustomerId(draft.customerId || '');
    setIsInterstate(Boolean(draft.igstAmount && draft.igstAmount > 0));
    setBillDiscountValue(draft.invoiceDiscount || 0);
    setDiscountType('FLAT');
    setNotes(draft.notes || '');

    const resumedCart: POSCartItem[] = (draft.items || []).map((item) => ({
      productId: item.productId,
      name: item.productNameSnapshot,
      sku: item.skuSnapshot || '',
      barcode: null,
      unitCode: item.unitNameSnapshot || 'PCS',
      quantity: item.quantity,
      unitPrice: item.sellingRate,
      costPrice: item.unitCostSnapshot || 0,
      taxRate: item.taxRate,
      discountPercentage: item.discountPercentage || 0,
      discountAmount: item.discountAmount || 0,
      availableStock: 999,
    }));

    setCart(resumedCart);
    setIsHoldModalOpen(false);
    notify('success', `Resumed draft ${draft.invoiceNumber}`);
  };

  // Complete Payment & Post Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    // Credit check
    if (paymentMode === 'CREDIT' && !selectedCustomerId) {
      notify('error', 'Registered customer required for Khata / Credit sale');
      return;
    }

    setProcessingOrder(true);
    try {
      // 1. Create Draft
      const draftDto: SalesInvoiceCreateDTO = {
        customerId: selectedCustomerId || undefined,
        invoiceDate: new Date().toISOString(),
        invoiceDiscount: totals.totalDiscount,
        notes: notes.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          sellingRate: item.unitPrice,
          discountPercentage: item.discountPercentage,
          taxRate: item.taxRate,
        })),
      };

      const draftRes = await window.rsInventory.createSalesDraft(draftDto);
      if (!draftRes.success || !draftRes.data) {
        throw new Error(draftRes.error?.message || 'Failed to create sales draft');
      }

      const draftId = draftRes.data.id;

      // 2. Post Sale with Payment
      const isPaid = paymentMode !== 'CREDIT';
      const postDto: SalesPostDTO = {
        payments: isPaid
          ? [
              {
                amount: totals.grandTotal,
                paymentMode,
                referenceNo: paymentReference.trim() || undefined,
                paymentDate: new Date().toISOString(),
              },
            ]
          : [],
      };

      const postRes = await window.rsInventory.postSale(draftId, postDto);
      if (postRes.success && postRes.data) {
        notify('success', `Invoice #${postRes.data.invoiceNumber} billed successfully!`);
        setCompletedInvoice(postRes.data);
        setIsPaymentModalOpen(false);
        setIsPrintModalOpen(true);
        clearCart();
        loadDrafts();
        loadCustomers();
      } else {
        throw new Error(postRes.error?.message || 'Failed to post sales invoice');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error processing sales order');
    } finally {
      setProcessingOrder(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT COLUMN: Barcode, Live Search & Cart Items Table (65% width) */}
      <div className="w-full lg:w-[63%] space-y-4">
        {/* Search & Barcode Scan Header */}
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <div className="absolute left-3 top-2.5 text-brand-400">
                <Barcode className="h-4 w-4" />
              </div>
              <input
                ref={barcodeRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode / Enter SKU (F2)..."
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-surface-950 border border-brand-500/40 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 shadow-inner"
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-500 bg-surface-800 px-1.5 py-0.5 rounded">
                ENTER
              </span>
            </form>

            {/* Live Search Products Autocomplete */}
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by product name..."
                className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              {isSearching && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 absolute right-3 top-3" />
              )}

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-surface-800">
                  {searchResults.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => addProductToCart(prod)}
                      className="p-3 hover:bg-surface-800/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-white">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {prod.sku} • Stock: {(prod as any).currentStock || 0}
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(prod.sellingPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Hints */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 border-t border-surface-800/80">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 font-mono text-slate-300">
                  F2
                </kbd>{' '}
                Scan
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 font-mono text-slate-300">
                  F4
                </kbd>{' '}
                Clear
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 font-mono text-slate-300">
                  F8
                </kbd>{' '}
                Hold Bill
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 font-mono text-slate-300">
                  F9
                </kbd>{' '}
                Cash Pay
              </span>
            </div>
            {onHoldDrafts.length > 0 && (
              <button
                onClick={() => setIsHoldModalOpen(true)}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                <Clock className="h-3 w-3" />
                <span>{onHoldDrafts.length} Bills On Hold</span>
              </button>
            )}
          </div>
        </div>

        {/* Cart Items Table */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 border-b border-surface-800 flex items-center justify-between bg-surface-950/40">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-brand-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Billed Items ({cart.length})
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-950/70 border-b border-surface-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-center">Disc %</th>
                  <th className="py-2.5 px-3 text-center">GST %</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <Barcode className="h-10 w-10 mx-auto mb-2 opacity-30 text-brand-400" />
                      <p className="text-sm font-medium text-slate-400">Cart is empty</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Scan a barcode or search products above to start billing
                      </p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => {
                    const gross = item.quantity * item.unitPrice;
                    const disc = (gross * (item.discountPercentage || 0)) / 100;
                    const taxable = gross - disc;
                    const tax = (taxable * (item.taxRate || 0)) / 100;
                    const lineTotal = taxable + tax;

                    return (
                      <tr key={index} className="hover:bg-surface-800/20 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white leading-tight">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>SKU: {item.sku}</span>
                            {item.availableStock !== undefined && (
                              <span
                                className={
                                  item.availableStock <= 5
                                    ? 'text-amber-400 font-semibold'
                                    : 'text-slate-400'
                                }
                              >
                                Stock: {item.availableStock}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quantity Spinner */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-surface-950 border border-surface-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                              className="p-1 rounded hover:bg-surface-800 text-slate-400 hover:text-white transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateCartItemQuantity(index, parseInt(e.target.value) || 1)
                              }
                              className="w-10 text-center font-mono font-bold bg-transparent text-white focus:outline-none text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                              className="p-1 rounded hover:bg-surface-800 text-slate-400 hover:text-white transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateCartItemPrice(index, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 text-right font-mono px-1.5 py-1 rounded bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500 text-xs"
                          />
                        </td>

                        {/* Item Discount % */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercentage || ''}
                            placeholder="0"
                            onChange={(e) =>
                              updateCartItemDiscount(index, parseFloat(e.target.value) || 0)
                            }
                            className="w-12 text-center font-mono px-1 py-1 rounded bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500 text-xs"
                          />
                        </td>

                        {/* GST % */}
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-300">
                          {item.taxRate}%
                        </td>

                        {/* Line Total */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white text-xs">
                          {formatCurrency(lineTotal)}
                        </td>

                        {/* Remove Action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCart(index)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
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
      </div>

      {/* RIGHT COLUMN: Customer Card, Bill Settings, Totals & Pay Tender (37% width) */}
      <div className="w-full lg:w-[37%] space-y-4">
        {/* Customer Selector Card */}
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-brand-400" />
              <span>Customer / Khata</span>
            </h4>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold"
            >
              <Plus className="h-3 w-3" />
              <span>New Customer</span>
            </button>
          </div>

          <div className="space-y-2">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Walk-in Customer (Retail Cash)</option>
              {customers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} ({cust.customerCode}) • Bal: ₹{cust.currentBalance?.toFixed(2) || '0.00'}
                </option>
              ))}
            </select>

            {/* Selected customer quick badge */}
            {selectedCustomer && (
              <div className="p-2.5 rounded-xl bg-surface-950/60 border border-surface-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{selectedCustomer.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Phone: {selectedCustomer.phone || 'N/A'} • GST: {selectedCustomer.gstin || 'None'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Khata Bal:</span>
                  <span
                    className={`font-mono font-bold ${
                      selectedCustomer.currentBalance > 0
                        ? 'text-rose-400'
                        : selectedCustomer.currentBalance < 0
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {formatCurrency(selectedCustomer.currentBalance || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Discount & Tax Options */}
        <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Bill Discount</span>
            <div className="flex items-center gap-1.5">
              <div className="flex bg-surface-950 p-0.5 rounded-lg border border-surface-700 text-[10px]">
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENTAGE')}
                  className={`px-2 py-0.5 rounded ${
                    discountType === 'PERCENTAGE'
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('FLAT')}
                  className={`px-2 py-0.5 rounded ${
                    discountType === 'FLAT'
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ₹ Flat
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={billDiscountValue || ''}
                onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-16 px-2 py-1 text-right font-mono rounded-lg bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-800">
            <span className="text-slate-400 font-medium">GST Supply Type</span>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isInterstate}
                onChange={(e) => setIsInterstate(e.target.checked)}
                className="rounded bg-surface-950 border-surface-700 text-brand-500 focus:ring-0"
              />
              <span>Interstate (IGST)</span>
            </label>
          </div>
        </div>

        {/* Grand Total Summary Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Gross Subtotal:</span>
              <span className="text-slate-200">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discounts:</span>
                <span>-{formatCurrency(totals.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Taxable Total:</span>
              <span className="text-slate-200">{formatCurrency(totals.taxableTotal)}</span>
            </div>
            {isInterstate ? (
              <div className="flex justify-between">
                <span>IGST:</span>
                <span className="text-slate-200">+{formatCurrency(totals.igst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span className="text-slate-200">+{formatCurrency(totals.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span className="text-slate-200">+{formatCurrency(totals.sgst)}</span>
                </div>
              </>
            )}
            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Round Off:</span>
                <span>
                  {totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}
                </span>
              </div>
            )}
          </div>

          {/* Big Grand Total Display */}
          <div className="pt-3 border-t border-surface-800/80 flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-300">Total Payable</span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {formatCurrency(totals.grandTotal)}
            </span>
          </div>
        </div>

        {/* Quick Tender / Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => openPaymentModal('CASH')}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 disabled:opacity-40 transition-all"
          >
            <DollarSign className="h-5 w-5" />
            <span>CASH PAY (F9)</span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => openPaymentModal('UPI')}
              className="py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 disabled:opacity-40 transition-all"
            >
              <QrCode className="h-4 w-4" />
              <span>UPI / QR</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => openPaymentModal('CARD')}
              className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-40 transition-all"
            >
              <CreditCard className="h-4 w-4" />
              <span>Card</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => openPaymentModal('CREDIT')}
              className="py-2.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 disabled:opacity-40 transition-all"
            >
              <Tag className="h-4 w-4" />
              <span>Khata / Credit</span>
            </button>
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleHoldBill}
            className="w-full py-2 px-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-surface-700 disabled:opacity-40 transition-colors"
          >
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Hold Bill / Save Draft (F8)</span>
          </button>
        </div>
      </div>

      {/* Quick Tender Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Complete Sale Checkout</h3>
                  <p className="text-xs text-slate-400">
                    {paymentMode} Tender • Net: {formatCurrency(totals.grandTotal)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-4 gap-1.5 bg-surface-950 p-1 rounded-xl border border-surface-800 text-xs">
              {(['CASH', 'UPI', 'CARD', 'CREDIT'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 rounded-lg font-semibold transition-colors ${
                    paymentMode === mode
                      ? 'bg-brand-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Cash Tender & Change Due Calculator */}
            {paymentMode === 'CASH' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cash Received (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl bg-surface-950 border border-surface-700 text-emerald-400 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Quick denomination buttons */}
                <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                  {[totals.grandTotal, 100, 200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt)}
                      className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {/* Change Return */}
                <div className="p-3 rounded-xl bg-surface-950/60 border border-surface-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Change Due to Customer:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      cashTendered - totals.grandTotal >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {cashTendered - totals.grandTotal >= 0
                      ? formatCurrency(cashTendered - totals.grandTotal)
                      : `Short ${formatCurrency(Math.abs(cashTendered - totals.grandTotal))}`}
                  </span>
                </div>
              </div>
            )}

            {/* UPI QR & Ref */}
            {paymentMode === 'UPI' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 text-center space-y-2">
                  <QrCode className="h-16 w-16 mx-auto text-indigo-400" />
                  <p className="text-xs text-slate-300 font-medium">
                    Show dynamic QR to customer
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Scan using any UPI app (GPay, PhonePe, Paytm)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    UPI UTR / Txn Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. 409812984124"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* Card Ref */}
            {paymentMode === 'CARD' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Card Slip / Auth Code (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. POS Auth / Machine Ref"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            {/* Khata / Credit warning */}
            {paymentMode === 'CREDIT' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <span>Billed to Customer Khata</span>
                </p>
                <p className="text-[11px] text-amber-200/80">
                  {selectedCustomer
                    ? `Will be debited to ${selectedCustomer.name}'s account. Outstanding will increase by ${formatCurrency(totals.grandTotal)}.`
                    : 'Error: You must select a registered customer to bill on credit.'}
                </p>
              </div>
            )}

            {/* Confirm Payment Button */}
            <div className="pt-2 border-t border-surface-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingOrder || (paymentMode === 'CREDIT' && !selectedCustomerId)}
                onClick={handleCompleteSale}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{processingOrder ? 'Processing...' : 'Complete & Print'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Hold Drafts Modal */}
      {isHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Held Draft Bills</h3>
              </div>
              <button
                onClick={() => setIsHoldModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-surface-800">
              {onHoldDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="py-3 flex items-center justify-between hover:bg-surface-800/30 px-2 rounded-xl transition-colors"
                >
                  <div>
                    <div className="font-mono font-semibold text-white">{draft.invoiceNumber}</div>
                    <div className="text-[11px] text-slate-400">
                      {draft.customerNameSnapshot || 'Walk-in'} • {draft.items?.length || 0} items • {formatDate(draft.invoiceDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {formatCurrency(draft.grandTotal)}
                    </span>
                    <button
                      onClick={() => handleResumeDraft(draft)}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Resume</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer Create Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={() => loadCustomers()}
      />

      {/* Print Receipt Modal */}
      <PrintSalesReceiptModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoice={completedInvoice}
      />
    </div>
  );
};
