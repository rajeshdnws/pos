import { PrismaClient } from '@prisma/client';
import { Setting } from '@rs-inventory/types';

export const DEFAULT_APP_SETTINGS: Record<string, string> = {
  // Appearance & Navigation
  theme: 'dark',
  startPage: '/dashboard',
  defaultSalesScreen: 'standard', // 'standard' | 'pos_touch'
  defaultCustomerId: '',
  confirmBeforePost: 'true',
  confirmBeforeDelete: 'true',
  soundOnScan: 'true',
  autoBackupOnClose: 'true',

  // Regional & Currency
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h', // '12h' | '24h'
  currency: 'INR',
  currencySymbol: '₹',
  currencySymbolPlacement: 'BEFORE', // 'BEFORE' | 'AFTER'
  currencyDecimalPlaces: '2',
  quantityDecimalPlaces: '2',
  thousandsSeparator: ',',
  decimalSeparator: '.',

  // Invoicing & Receipt Printing
  invoicePrefix: 'INV',
  purchasePrefix: 'PUR',
  salesReturnPrefix: 'SRET',
  purchaseReturnPrefix: 'PRET',
  expensePrefix: 'EXP',
  startingInvoiceNumber: '1',
  invoicePrintFormat: 'thermal', // 'thermal' | 'standard_a4'
  thermalPaperSize: '80mm', // '58mm' | '80mm'
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
  invoiceTermsAndConditions: '1. Goods once sold will not be taken back without valid bill.\n2. Warranty as per manufacturer terms.\n3. Subject to local jurisdiction.',

  // Tax & Pricing Preferences
  defaultTaxInclusive: 'false',
  defaultTaxRate: '18',
  defaultTaxDisplay: 'ITEMIZED', // 'ITEMIZED' | 'SUMMARY'
  priceDecimalPrecision: '2',
  discountDisplayPreference: 'PERCENTAGE', // 'PERCENTAGE' | 'FLAT'
  allowPriceOverride: 'true',
  allowInvoiceDiscount: 'true',
  allowSellBelowCost: 'false',

  // Inventory Preferences
  allowNegativeStock: 'false',
  defaultStockLocationId: '',
  defaultAdjustmentReason: 'Physical Stock Reconciliation',
  lowStockThresholdDefault: '10',
  showInactiveProductsInSearch: 'false',
  enableBarcodeScanning: 'true',
  showProductCostToCashiers: 'false',
};

export class SettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  public async getSettings(companyId: string): Promise<Record<string, string>> {
    const records = await this.prisma.setting.findMany({
      where: { companyId },
    });

    const settingsMap: Record<string, string> = { ...DEFAULT_APP_SETTINGS };
    for (const record of records) {
      settingsMap[record.key] = record.value;
    }
    return settingsMap;
  }

  public async updateSettings(
    companyId: string,
    updates: Record<string, string>,
    actorUserId?: string,
  ): Promise<Setting[]> {
    const updatedSettings: Setting[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        const item = await tx.setting.upsert({
          where: {
            companyId_key: {
              companyId,
              key,
            },
          },
          update: {
            value: String(value),
          },
          create: {
            companyId,
            key,
            value: String(value),
            type: 'STRING',
          },
        });
        updatedSettings.push(item as unknown as Setting);
      }

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actorUserId || null,
          action: 'SETTINGS_UPDATED',
          module: 'SETTINGS',
          newValue: JSON.stringify(updates),
          ipAddress: '127.0.0.1',
        },
      });
    });

    return updatedSettings;
  }

  public async resetDefaults(companyId: string, actorUserId?: string): Promise<Record<string, string>> {
    await this.prisma.$transaction(async (tx) => {
      // Delete existing overrides for this company
      await tx.setting.deleteMany({
        where: { companyId },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          userId: actorUserId || null,
          action: 'SETTINGS_RESET_DEFAULTS',
          module: 'SETTINGS',
          newValue: JSON.stringify(DEFAULT_APP_SETTINGS),
          ipAddress: '127.0.0.1',
        },
      });
    });

    return { ...DEFAULT_APP_SETTINGS };
  }
}
