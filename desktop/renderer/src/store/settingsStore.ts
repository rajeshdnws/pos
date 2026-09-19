import { create } from 'zustand';

export interface AppSettingsMap extends Record<string, string> {
  // General & Display
  theme: string;
  startPage: string;
  defaultSalesScreen: string;
  defaultCustomerId: string;
  confirmBeforePost: string;
  confirmBeforeDelete: string;
  soundOnScan: string;
  autoBackupOnClose: string;

  // Regional & Currency
  dateFormat: string;
  timeFormat: string;
  currency: string;
  currencySymbol: string;
  currencySymbolPlacement: string;
  currencyDecimalPlaces: string;
  quantityDecimalPlaces: string;
  thousandsSeparator: string;
  decimalSeparator: string;

  // Invoicing & Receipt Printing
  invoicePrefix: string;
  purchasePrefix: string;
  salesReturnPrefix: string;
  purchaseReturnPrefix: string;
  expensePrefix: string;
  startingInvoiceNumber: string;
  invoicePrintFormat: string;
  thermalPaperSize: string;
  selectedPrinter: string;
  printCopies: string;
  showLogoOnInvoice: string;
  showAddressOnInvoice: string;
  showGstinOnInvoice: string;
  showCustomerContactOnInvoice: string;
  showSkuBarcodeOnInvoice: string;
  showDiscountOnInvoice: string;
  showTaxBreakdownOnInvoice: string;
  showPaymentInfoOnInvoice: string;
  showTermsOnInvoice: string;
  invoiceFooterText: string;
  invoiceTermsAndConditions: string;

  // Tax & Pricing Preferences
  defaultTaxInclusive: string;
  defaultTaxRate: string;
  defaultTaxDisplay: string;
  priceDecimalPrecision: string;
  discountDisplayPreference: string;
  allowPriceOverride: string;
  allowInvoiceDiscount: string;
  allowSellBelowCost: string;

  // Inventory Preferences
  allowNegativeStock: string;
  defaultStockLocationId: string;
  defaultAdjustmentReason: string;
  lowStockThresholdDefault: string;
  showInactiveProductsInSearch: string;
  enableBarcodeScanning: string;
  showProductCostToCashiers: string;
}

const DEFAULT_SETTINGS: AppSettingsMap = {
  theme: 'dark',
  startPage: '/dashboard',
  defaultSalesScreen: 'standard',
  defaultCustomerId: '',
  confirmBeforePost: 'true',
  confirmBeforeDelete: 'true',
  soundOnScan: 'true',
  autoBackupOnClose: 'true',

  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  currency: 'INR',
  currencySymbol: '₹',
  currencySymbolPlacement: 'BEFORE',
  currencyDecimalPlaces: '2',
  quantityDecimalPlaces: '2',
  thousandsSeparator: ',',
  decimalSeparator: '.',

  invoicePrefix: 'INV',
  purchasePrefix: 'PUR',
  salesReturnPrefix: 'SRET',
  purchaseReturnPrefix: 'PRET',
  expensePrefix: 'EXP',
  startingInvoiceNumber: '1',
  invoicePrintFormat: 'thermal',
  thermalPaperSize: '80mm',
  selectedPrinter: '',
  printCopies: '1',
  showLogoOnInvoice: 'true',
  showAddressOnInvoice: 'true',
  showGstinOnInvoice: 'true',
  showCustomerContactOnInvoice: 'true',
  showSkuBarcodeOnInvoice: 'true',
  showDiscountOnInvoice: 'true',
  showTaxBreakdownOnInvoice: 'true',
  showPaymentInfoOnInvoice: 'true',
  showTermsOnInvoice: 'true',
  invoiceFooterText: 'Thank you for your business! Visit again.',
  invoiceTermsAndConditions:
    '1. Goods once sold will not be taken back without valid bill.\n2. Warranty as per manufacturer terms.\n3. Subject to local jurisdiction.',

  defaultTaxInclusive: 'false',
  defaultTaxRate: '18',
  defaultTaxDisplay: 'ITEMIZED',
  priceDecimalPrecision: '2',
  discountDisplayPreference: 'PERCENTAGE',
  allowPriceOverride: 'true',
  allowInvoiceDiscount: 'true',
  allowSellBelowCost: 'false',

  allowNegativeStock: 'false',
  defaultStockLocationId: '',
  defaultAdjustmentReason: 'Physical Stock Reconciliation',
  lowStockThresholdDefault: '10',
  showInactiveProductsInSearch: 'false',
  enableBarcodeScanning: 'true',
  showProductCostToCashiers: 'false',
};

interface SettingsState {
  settings: AppSettingsMap;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (
    updates: Partial<AppSettingsMap> | Record<string, string>,
  ) => Promise<{ success: boolean; error?: string }>;
  resetDefaults: () => Promise<{ success: boolean; error?: string }>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.getSettings();
        if (res.success && res.data) {
          set({ settings: { ...DEFAULT_SETTINGS, ...res.data }, isLoading: false });
          return;
        }
      }
      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<AppSettingsMap> | Record<string, string>) => {
    try {
      const current = get().settings;
      const stringUpdates: Record<string, string> = {};
      for (const [k, v] of Object.entries(updates)) {
        stringUpdates[k] = String(v);
      }
      const merged = { ...current, ...stringUpdates };

      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.updateSettings(stringUpdates);
        if (res.success) {
          set({ settings: merged });
          return { success: true };
        }
        return { success: false, error: res.error?.message || 'Failed to save settings.' };
      }
      set({ settings: merged });
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  resetDefaults: async () => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.resetDefaultSettings();
        if (res.success && res.data) {
          set({ settings: { ...DEFAULT_SETTINGS, ...res.data } });
          return { success: true };
        }
        return { success: false, error: res.error?.message || 'Failed to reset settings.' };
      }
      set({ settings: DEFAULT_SETTINGS });
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
}));
