import { BaseEntity } from './common.js';

export interface Company extends BaseEntity {
  name: string;
  businessName: string;
  businessType?: string | null;
  ownerName?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string;
  gstRegistered: boolean;
  gstin?: string | null;
  pan?: string | null;
  taxType: string;
  invoicePrefix: string;
  startingInvoiceNumber: number;
  financialYearStart?: Date | string | null;
  financialYearEnd?: Date | string | null;
  logoPath?: string | null;
  currency: string;
  isActive: boolean;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string | null;
  isSystemRole: boolean;
  permissions?: Permission[];
}

export interface Permission extends BaseEntity {
  code: string;
  name: string;
  description?: string | null;
  module: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date | string;
}

export interface User extends BaseEntity {
  companyId: string;
  username: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  roleId?: string | null;
  role?: Role | null;
  isActive: boolean;
  lastLoginAt?: Date | string | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | string | null;
}

export interface Setting extends BaseEntity {
  companyId: string;
  key: string;
  value: string;
  type: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId?: string | null;
  action: string;
  module: string;
  referenceId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
  user?: {
    name: string;
    username: string;
  } | null;
}

export interface Category extends BaseEntity {
  companyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  _count?: {
    products?: number;
  };
}

export interface Unit extends BaseEntity {
  companyId: string;
  name: string;
  shortCode: string;
  allowDecimals: boolean;
  isActive: boolean;
  _count?: {
    products?: number;
  };
}

export interface Brand extends BaseEntity {
  companyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  _count?: {
    products?: number;
  };
}

export type ProductType = 'PHYSICAL' | 'SERVICE' | 'NON_STOCK';

export interface ProductPriceHistory {
  id: string;
  productId: string;
  oldPurchasePrice?: number | null;
  newPurchasePrice: number;
  oldSellingPrice?: number | null;
  newSellingPrice: number;
  oldMrp?: number | null;
  newMrp: number;
  oldTaxRate?: number | null;
  newTaxRate: number;
  changedBy?: string | null;
  createdAt: Date | string;
}

export interface Product extends BaseEntity {
  companyId: string;
  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  name: string;
  shortName?: string | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  hsnCode?: string | null;
  productType: ProductType;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  minimumStock: number;
  maximumStock?: number | null;
  openingStock: number;
  openingStockRate: number;
  currentStock: number;
  trackStock: boolean;
  isActive: boolean;

  category?: Category | null;
  brand?: Brand | null;
  unit?: Unit | null;
  priceHistory?: ProductPriceHistory[];
}

export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';
export type CustomerOpeningBalanceType = 'RECEIVABLE' | 'ADVANCE';
export type CustomerRegistrationType = 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED' | 'CONSUMER';

export interface Customer extends BaseEntity {
  companyId: string;
  customerCode: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  customerType: CustomerType | string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country: string;
  gstin?: string | null;
  registrationType?: CustomerRegistrationType | string | null;
  openingBalance: number;
  openingBalanceType: CustomerOpeningBalanceType | string;
  openingBalanceDate?: Date | string | null;
  creditLimit: number;
  creditPeriodDays: number;
  notes?: string | null;
  currentBalance: number;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;

  // Step 11: Communication & Consent Preferences
  preferredChannel?: string;
  emailConsent?: boolean;
  smsConsent?: boolean;
  whatsappConsent?: boolean;
  consentStatus?: 'OPTED_IN' | 'OPTED_OUT' | 'PENDING' | string;
  consentDate?: Date | string | null;
  consentSource?: string | null;
  optedOutAt?: Date | string | null;
  communicationNotes?: string | null;

  _count?: {
    salesInvoices?: number;
    salesPayments?: number;
  };
}

export type SupplierRegistrationType = 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED' | 'OVERSEAS';
export type SupplierOpeningBalanceType = 'PAYABLE' | 'ADVANCE';

export type OpeningBalanceType = SupplierOpeningBalanceType;

export interface Supplier extends BaseEntity {
  companyId: string;
  supplierCode: string;
  code?: string;
  name: string;
  companyName?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pinCode?: string | null;
  pincode?: string | null;
  country: string;
  gstin?: string | null;
  pan?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  registrationType: SupplierRegistrationType | string;
  openingBalance: number;
  openingBalanceType: SupplierOpeningBalanceType | string;
  openingBalanceDate?: Date | string | null;
  creditLimit: number;
  creditPeriodDays: number;
  notes?: string | null;
  currentBalance: number;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  _count?: {
    purchases?: number;
    payments?: number;
  };
}

export type LocationType = 'STORE' | 'WAREHOUSE' | 'BACK_ROOM' | 'DISPLAY' | 'OTHER';

export interface InventoryLocation extends BaseEntity {
  companyId: string;
  name: string;
  code: string;
  description?: string | null;
  locationType: LocationType;
  isDefault: boolean;
  isActive: boolean;
  _count?: {
    stockMovements?: number;
    stockBalances?: number;
  };
}

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIPT'
  | 'SALE'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'STOCKTAKE_CORRECTION';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEGATIVE_STOCK';

export interface StockMovement extends BaseEntity {
  companyId: string;
  productId: string;
  locationId: string;
  movementType: StockMovementType;
  quantity: number;
  unitCost: number;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
  movementDate: Date | string;
  notes?: string | null;
  createdBy?: string | null;

  product?: Product | null;
  location?: InventoryLocation | null;
}

export interface StockBalance extends BaseEntity {
  companyId: string;
  productId: string;
  locationId: string;
  quantity: number;

  product?: Product | null;
  location?: InventoryLocation | null;
}

export type StockAdjustmentType = 'INCREASE' | 'DECREASE';
export type StockAdjustmentStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface StockAdjustmentItem extends BaseEntity {
  adjustmentId: string;
  productId: string;
  systemQuantity: number;
  countedQuantity?: number | null;
  differenceQuantity: number;
  unitCost: number;
  notes?: string | null;

  product?: Product | null;
}

export interface StockAdjustment extends BaseEntity {
  companyId: string;
  adjustmentNumber: string;
  locationId: string;
  adjustmentType: StockAdjustmentType;
  reason: string;
  status: StockAdjustmentStatus;
  notes?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;

  location?: InventoryLocation | null;
  items?: StockAdjustmentItem[];
}

export type StocktakeStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface StocktakeItem extends BaseEntity {
  stocktakeId: string;
  productId: string;
  systemQuantity: number;
  countedQuantity?: number | null;
  differenceQuantity: number;
  notes?: string | null;

  product?: Product | null;
}

export interface Stocktake extends BaseEntity {
  companyId: string;
  stocktakeNumber: string;
  locationId: string;
  status: StocktakeStatus;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdBy?: string | null;
  completedBy?: string | null;
  notes?: string | null;

  location?: InventoryLocation | null;
  items?: StocktakeItem[];
}

export type StockTransferStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface StockTransferItem extends BaseEntity {
  transferId: string;
  productId: string;
  quantity: number;
  unitCost: number;

  product?: Product | null;
}

export interface StockTransfer extends BaseEntity {
  companyId: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  status: StockTransferStatus;
  notes?: string | null;
  createdBy?: string | null;
  completedBy?: string | null;
  completedAt?: Date | string | null;

  sourceLocation?: InventoryLocation | null;
  destinationLocation?: InventoryLocation | null;
  items?: StockTransferItem[];
}

export interface CurrentStockItem {
  id: string;
  productId: string;
  productName: string;
  shortName?: string | null;
  sku: string;
  barcode?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  unitSymbol: string;
  allowDecimals: boolean;
  locationId: string;
  locationName: string;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number | null;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  valuation: number;
  status: StockStatus;
  trackStock: boolean;
}

// ----------------- DTOs -----------------

export interface CompanySetupDTO {
  businessName: string;
  businessType?: string;
  ownerName?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstRegistered: boolean;
  gstin?: string;
  pan?: string;
  taxType?: string;
  invoicePrefix?: string;
  startingInvoiceNumber?: number;
  financialYearStart?: string;
  financialYearEnd?: string;
  adminFullName: string;
  adminUsername: string;
  adminMobile?: string;
  adminEmail?: string;
  adminPassword: string;
}

export interface LoginRequestDTO {
  username: string;
  password: string;
}

export interface LoginResponseDTO {
  user: User;
  sessionToken: string;
  permissions: string[];
  company: Company;
}

export interface UserCreateDTO {
  name: string;
  username: string;
  email?: string;
  mobile?: string;
  roleId: string;
  password: string;
  isActive?: boolean;
}

export interface UserUpdateDTO {
  name?: string;
  email?: string;
  mobile?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDTO {
  userId: string;
  newPassword: string;
}

// ----------------- Categories, Units, Brands & Products DTOs -----------------

export interface CategoryCreateDTO {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CategoryUpdateDTO {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UnitCreateDTO {
  name: string;
  shortCode: string;
  allowDecimals?: boolean;
  isActive?: boolean;
}

export interface UnitUpdateDTO {
  name?: string;
  shortCode?: string;
  allowDecimals?: boolean;
  isActive?: boolean;
}

export interface BrandCreateDTO {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface BrandUpdateDTO {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface ProductCreateDTO {
  name: string;
  shortName?: string | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  hsnCode?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  productType?: ProductType;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  taxRate?: number;
  minimumStock?: number;
  maximumStock?: number | null;
  openingStock?: number;
  openingStockRate?: number;
  trackStock?: boolean;
  isActive?: boolean;
}

export interface ProductUpdateDTO {
  name?: string;
  shortName?: string | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  hsnCode?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  productType?: ProductType;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  taxRate?: number;
  minimumStock?: number;
  maximumStock?: number | null;
  trackStock?: boolean;
  isActive?: boolean;
}

export interface ProductFilterDTO {
  search?: string;
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  productType?: ProductType;
  taxRate?: number;
  isActive?: boolean;
  status?: 'all' | 'active' | 'inactive';
  lowStock?: boolean;
  sortBy?: 'name' | 'sku' | 'sellingPrice' | 'purchasePrice' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  data?: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductImportRow {
  name: string;
  sku?: string;
  barcode?: string;
  categoryName?: string;
  brandName?: string;
  unitCode?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  taxRate?: number;
  openingStock?: number;
}

export interface ProductImportResult {
  totalRows: number;
  successful: number;
  failed: number;
  errors: ProductImportError[];
}

export interface ProductImportError {
  row: number;
  productName?: string;
  field: string;
  message: string;
}

// ----------------- Inventory & Stock Management DTOs -----------------

export interface LocationCreateDTO {
  name: string;
  code: string;
  type?: LocationType;
  address?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface LocationUpdateDTO {
  name?: string;
  code?: string;
  type?: LocationType;
  address?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface StockMovementFilterDTO {
  productId?: string;
  locationId?: string;
  movementType?: StockMovementType;
  startDate?: string;
  endDate?: string;
  referenceType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CurrentStockFilterDTO {
  search?: string;
  categoryId?: string;
  brandId?: string;
  locationId?: string;
  status?: StockStatus;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'sku' | 'currentStock' | 'valuation' | 'locationName';
  sortOrder?: 'asc' | 'desc';
}

export interface StockAdjustmentItemDTO {
  productId: string;
  quantity: number;
  unitCost?: number;
  reason?: string | null;
}

export interface StockAdjustmentCreateDTO {
  locationId?: string;
  type: StockAdjustmentType;
  reason: string;
  notes?: string | null;
  items: StockAdjustmentItemDTO[];
}

export interface StocktakeItemDTO {
  productId: string;
  countedQuantity: number;
  notes?: string | null;
}

export interface StocktakeCreateDTO {
  locationId?: string;
  notes?: string | null;
}

export interface StocktakeUpdateDTO {
  notes?: string | null;
  items?: StocktakeItemDTO[];
}

export interface StockTransferItemDTO {
  productId: string;
  quantity: number;
  unitCost?: number;
}

export interface StockTransferCreateDTO {
  sourceLocationId: string;
  destinationLocationId: string;
  notes?: string | null;
  items: StockTransferItemDTO[];
}

export interface StockReconciliationItem {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol: string;
  locationId: string;
  locationName: string;
  ledgerBalance: number;
  projectedBalance: number;
  discrepancy: number;
  isSynced: boolean;
}

export interface StockReconciliationReport {
  timestamp: string;
  totalProductsChecked: number;
  inSyncCount: number;
  discrepancyCount: number;
  items: StockReconciliationItem[];
}

export interface InventoryValuationByCategory {
  categoryId: string;
  categoryName: string;
  productCount: number;
  totalQuantity: number;
  totalCostValuation: number;
  totalRetailValuation: number;
}

export interface InventoryValuationReport {
  totalItems: number;
  totalQuantity: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  potentialProfit: number;
  byCategory: InventoryValuationByCategory[];
}

export interface InventoryKPIs {
  totalProducts: number;
  totalStockQuantity: number;
  totalStockValuation: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  negativeStockItemsCount: number;
  totalLocationsCount: number;
  recentMovementsCount: number;
}

export interface DemoDataStatus {
  hasDemoData: boolean;
  demoProductsCount: number;
  demoCategoriesCount: number;
  demoBrandsCount: number;
  demoLocationsCount: number;
  demoMovementsCount: number;
  demoSuppliersCount?: number;
  demoPurchasesCount?: number;
  demoPaymentsCount?: number;
  demoReturnsCount?: number;
  demoCustomersCount?: number;
  demoSalesCount?: number;
  demoSalesPaymentsCount?: number;
  demoSalesReturnsCount?: number;
  installedAt?: string | null;
}

export interface DemoDataInstallResult {
  success: boolean;
  categoriesCreated: number;
  brandsCreated: number;
  locationsCreated: number;
  productsCreated: number;
  movementsCreated: number;
  adjustmentsCreated: number;
  transfersCreated: number;
  stocktakesCreated: number;
  suppliersCreated?: number;
  purchasesCreated?: number;
  paymentsCreated?: number;
  returnsCreated?: number;
  customersCreated?: number;
  salesCreated?: number;
  salesPaymentsCreated?: number;
  salesReturnsCreated?: number;
  message: string;
}

export interface DemoDataClearResult {
  success: boolean;
  productsDeleted: number;
  categoriesDeleted: number;
  brandsDeleted: number;
  locationsDeleted: number;
  movementsDeleted: number;
  adjustmentsDeleted: number;
  transfersDeleted: number;
  stocktakesDeleted: number;
  suppliersDeleted?: number;
  purchasesDeleted?: number;
  paymentsDeleted?: number;
  returnsDeleted?: number;
  customersDeleted?: number;
  salesDeleted?: number;
  salesPaymentsDeleted?: number;
  salesReturnsDeleted?: number;
  message: string;
}

// ----------------- Step 5: Supplier DTOs -----------------

export interface SupplierCreateDTO {
  supplierCode?: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string;
  gstin?: string | null;
  pan?: string | null;
  registrationType?: SupplierRegistrationType | string;
  openingBalance?: number;
  openingBalanceType?: SupplierOpeningBalanceType | string;
  openingBalanceDate?: string | null;
  creditLimit?: number;
  creditPeriodDays?: number;
  notes?: string | null;
  isActive?: boolean;
}

export interface SupplierUpdateDTO {
  supplierCode?: string;
  name?: string;
  contactPerson?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string;
  gstin?: string | null;
  pan?: string | null;
  registrationType?: SupplierRegistrationType | string;
  openingBalance?: number;
  openingBalanceType?: SupplierOpeningBalanceType | string;
  openingBalanceDate?: string | null;
  creditLimit?: number;
  creditPeriodDays?: number;
  notes?: string | null;
  isActive?: boolean;
}

export type CreateSupplierDTO = SupplierCreateDTO;
export type UpdateSupplierDTO = SupplierUpdateDTO;

export interface SupplierFilterDTO {
  search?: string;
  isActive?: boolean;
  status?: 'all' | 'active' | 'inactive';
  city?: string;
  state?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'supplierCode' | 'currentBalance' | 'createdAt' | 'city';
  sortOrder?: 'asc' | 'desc';
}

// ----------------- Step 5: Purchase Calculation Types -----------------

export interface PurchaseCalculationInputItem {
  productId?: string;
  quantity: number;
  freeQuantity?: number;
  purchaseRate: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxRate?: number;
}

export interface PurchaseLineCalculationResult {
  productId?: string;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  grossAmount: number;
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  isInterstate: boolean;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PurchaseCalculationInput {
  isInterState?: boolean;
  isInterstate?: boolean;
  supplierState?: string | null;
  companyState?: string | null;
  invoiceDiscount?: number;
  additionalCharges?: number;
  roundOff?: number;
  items: PurchaseCalculationInputItem[];
}

export interface PurchaseCalculationResult {
  subtotal: number;
  lineDiscountTotal: number;
  invoiceDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  otherTaxAmount: number;
  additionalCharges: number;
  roundOff: number;
  grandTotal: number;
  isInterstate: boolean;
  items: PurchaseLineCalculationResult[];
}

// ----------------- Step 5: Purchase DTOs & Models -----------------

export type PurchaseStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type PurchasePaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface PurchaseItem extends BaseEntity {
  purchaseId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot?: string | null;
  barcodeSnapshot?: string | null;
  unitNameSnapshot?: string | null;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  taxAmount: number;
  lineTotal: number;

  product?: Product | null;
}

export interface Purchase extends BaseEntity {
  companyId: string;
  supplierId: string;
  purchaseNumber: string;
  supplierInvoiceNumber?: string | null;
  purchaseDate: Date | string;
  dueDate?: Date | string | null;
  locationId?: string | null;
  status: PurchaseStatus;
  subtotal: number;
  lineDiscountTotal: number;
  invoiceDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  otherTaxAmount: number;
  additionalCharges: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  amountReturned: number;
  balanceDue?: number;
  paymentStatus: PurchasePaymentStatus;
  isInterState?: boolean;
  extraDiscountType?: DiscountType;
  extraDiscountValue?: number;
  otherCharges?: number;
  notes?: string | null;
  internalReference?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  postedBy?: string | null;
  postedAt?: Date | string | null;

  supplier?: Supplier | null;
  location?: InventoryLocation | null;
  items?: PurchaseItem[];
  payments?: PurchasePayment[];
  purchaseReturns?: PurchaseReturn[];
}

export interface PurchaseItemDraftDTO {
  productId: string;
  quantity: number;
  freeQuantity?: number;
  purchaseRate: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxRate?: number;
}

export interface PurchaseDraftCreateDTO {
  supplierId: string;
  supplierInvoiceNumber?: string | null;
  purchaseDate?: string;
  dueDate?: string | null;
  locationId?: string | null;
  invoiceDiscount?: number;
  additionalCharges?: number;
  roundOff?: number;
  notes?: string | null;
  internalReference?: string | null;
  items: PurchaseItemDraftDTO[];
}

export interface PurchaseDraftUpdateDTO {
  supplierId?: string;
  supplierInvoiceNumber?: string | null;
  purchaseDate?: string;
  dueDate?: string | null;
  locationId?: string | null;
  invoiceDiscount?: number;
  additionalCharges?: number;
  roundOff?: number;
  notes?: string | null;
  internalReference?: string | null;
  items?: PurchaseItemDraftDTO[];
}

export interface PurchaseFilterDTO {
  search?: string;
  supplierId?: string;
  locationId?: string;
  status?: PurchaseStatus;
  paymentStatus?: PurchasePaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'purchaseNumber' | 'purchaseDate' | 'grandTotal' | 'amountPaid' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseSummaryDTO {
  totalPurchasesCount: number;
  totalGrandTotal: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  draftsCount: number;
  postedCount: number;
  cancelledCount: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  paidCount: number;
}

// ----------------- Step 5: Purchase Payments -----------------

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CARD' | 'OTHER';
export type PaymentStatus = 'POSTED' | 'REVERSED';

export interface PurchasePayment extends BaseEntity {
  companyId: string;
  supplierId: string;
  purchaseId?: string | null;
  paymentNumber: string;
  paymentDate: Date | string;
  amount: number;
  paymentMode: PaymentMethod | string;
  referenceNo?: string | null;
  status: PaymentStatus;
  reversedAt?: Date | string | null;
  reversedBy?: string | null;
  reversalReason?: string | null;
  notes?: string | null;
  createdBy?: string | null;

  supplier?: Supplier | null;
  purchase?: Purchase | null;
}

export interface PurchasePaymentCreateDTO {
  supplierId: string;
  purchaseId?: string | null;
  amount: number;
  paymentDate?: string;
  paymentMode: PaymentMethod;
  referenceNo?: string | null;
  notes?: string | null;
}

export interface PurchasePaymentReverseDTO {
  paymentId: string;
  reversalReason: string;
}

export interface PurchasePaymentFilterDTO {
  supplierId?: string;
  purchaseId?: string;
  startDate?: string;
  endDate?: string;
  paymentMode?: string;
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
}

// ----------------- Step 5: Purchase Returns -----------------

export type PurchaseReturnStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface PurchaseReturnItem extends BaseEntity {
  purchaseReturnId: string;
  purchaseItemId?: string | null;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  returnRate: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  reason?: string | null;

  product?: Product | null;
  purchaseItem?: PurchaseItem | null;
}

export interface PurchaseReturn extends BaseEntity {
  companyId: string;
  supplierId?: string | null;
  purchaseId: string;
  returnNumber: string;
  returnDate: Date | string;
  locationId?: string | null;
  status: PurchaseReturnStatus;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  otherTaxAmount: number;
  grandTotal: number;
  reason?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  postedBy?: string | null;
  postedAt?: Date | string | null;

  supplier?: Supplier | null;
  purchase?: Purchase | null;
  location?: InventoryLocation | null;
  items?: PurchaseReturnItem[];
}

export interface PurchaseReturnItemDTO {
  purchaseItemId?: string;
  productId: string;
  quantity: number;
  returnRate?: number;
  reason?: string;
}

export interface PurchaseReturnCreateDTO {
  purchaseId: string;
  locationId?: string | null;
  returnDate?: string;
  reason?: string | null;
  notes?: string | null;
  items: PurchaseReturnItemDTO[];
}

export interface PurchaseReturnFilterDTO {
  search?: string;
  purchaseId?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  status?: PurchaseReturnStatus;
  page?: number;
  pageSize?: number;
}

// ----------------- Step 5: Supplier Ledger -----------------

export type SupplierLedgerTransactionType =
  | 'OPENING_BALANCE'
  | 'PURCHASE'
  | 'PAYMENT'
  | 'PURCHASE_RETURN'
  | 'PAYMENT_REVERSAL'
  | 'ADJUSTMENT';

export interface SupplierLedgerEntry extends BaseEntity {
  companyId: string;
  supplierId: string;
  entryDate: Date | string;
  transactionType: SupplierLedgerTransactionType;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
  debitAmount: number; // Decreases payable (payment, return credit, advance)
  creditAmount: number; // Increases payable (purchase, opening payable)
  runningBalance: number;
  description?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface SupplierLedgerFilterDTO {
  supplierId: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  page?: number;
  pageSize?: number;
}

export interface SupplierStatementDTO {
  supplier: Supplier;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  totalDebits?: number;
  totalCredits?: number;
  closingBalance: number;
  entries: SupplierLedgerEntry[];
}

export type SupplierStatementResult = SupplierStatementDTO;

// ----------------- Step 5: Dashboard KPIs -----------------

export interface PurchaseDashboardKPIs {
  purchasesTodayAmount: number;
  purchasesTodayCount: number;
  purchasesThisMonthAmount: number;
  purchasesThisMonthCount: number;
  outstandingSupplierPayables: number;
  unpaidPurchasesCount: number;
  partiallyPaidPurchasesCount: number;
  purchaseReturnsThisMonthAmount: number;
  purchaseReturnsThisMonthCount: number;

  totalPurchases?: number;
  totalOutstanding?: number;
  totalPaid?: number;
  totalReturns?: number;
  postedInvoicesCount?: number;
  topSuppliersByPayable?: { name: string; code: string; balance: number }[];
}



// ========================================================
// Step 6: Sales Management, POS Billing & Customer Module
// ========================================================

// ----------------- Customer DTOs -----------------

export interface CustomerCreateDTO {
  customerCode?: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  customerType?: CustomerType | string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string;
  gstin?: string | null;
  registrationType?: CustomerRegistrationType | string | null;
  openingBalance?: number;
  openingBalanceType?: CustomerOpeningBalanceType | string;
  openingBalanceDate?: string | null;
  creditLimit?: number;
  creditPeriodDays?: number;
  notes?: string | null;
  isActive?: boolean;
  preferredChannel?: string;
  emailConsent?: boolean;
  smsConsent?: boolean;
  whatsappConsent?: boolean;
  consentStatus?: 'OPTED_IN' | 'OPTED_OUT' | 'PENDING' | string;
  consentSource?: string | null;
  communicationNotes?: string | null;
}

export interface CustomerUpdateDTO {
  customerCode?: string;
  name?: string;
  contactPerson?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  customerType?: CustomerType | string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string;
  gstin?: string | null;
  registrationType?: CustomerRegistrationType | string | null;
  creditLimit?: number;
  creditPeriodDays?: number;
  notes?: string | null;
  isActive?: boolean;
}

export interface CustomerFilterDTO {
  search?: string;
  isActive?: boolean;
  status?: 'all' | 'active' | 'inactive';
  city?: string;
  state?: string;
  customerType?: CustomerType | string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'customerCode' | 'currentBalance' | 'createdAt' | 'city';
  sortOrder?: 'asc' | 'desc';
}

// ----------------- Sales Invoice Types -----------------

export type SalesInvoiceStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type SalesPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type SalesInvoiceType = 'RETAIL' | 'TAX_INVOICE' | 'CREDIT_SALE';
export type RestockCondition = 'RESELLABLE' | 'DAMAGED' | 'DEFECTIVE' | 'EXPIRED' | 'REQUIRES_INSPECTION';
export type SalesReturnStatus = 'POSTED' | 'CANCELLED';

export interface SalesInvoiceItem extends BaseEntity {
  companyId: string;
  salesInvoiceId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot?: string | null;
  barcodeSnapshot?: string | null;
  unitNameSnapshot?: string | null;
  hsnCodeSnapshot?: string | null;
  quantity: number;
  sellingRate: number;
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  taxAmount: number;
  lineTotal: number;
  unitCostSnapshot: number;

  product?: Product | null;
}

export interface SalesInvoice extends BaseEntity {
  companyId: string;
  customerId?: string | null;
  invoiceNumber: string;
  invoiceType: SalesInvoiceType | string;
  invoiceDate: Date | string;
  dueDate?: Date | string | null;
  locationId?: string | null;
  status: SalesInvoiceStatus | string;
  customerNameSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  customerAddressSnapshot?: string | null;
  customerGstinSnapshot?: string | null;
  subtotal: number;
  lineDiscountTotal: number;
  invoiceDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  otherTaxAmount: number;
  additionalCharges: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  amountReturned: number;
  paymentStatus: SalesPaymentStatus | string;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  postedBy?: string | null;
  postedAt?: Date | string | null;

  // Step 11: Promotional Coupons
  couponId?: string | null;
  couponCodeSnapshot?: string | null;
  couponDiscount?: number;

  // Step 12: Customer Wallet & Loyalty Points
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;

  customer?: Customer | null;
  location?: InventoryLocation | null;
  items?: SalesInvoiceItem[];
  salesPayments?: SalesPayment[];
  salesReturns?: SalesReturn[];
}

// ----------------- Sales Payment Types -----------------

export interface SalesPayment extends BaseEntity {
  companyId: string;
  customerId?: string | null;
  salesInvoiceId?: string | null;
  paymentNumber: string;
  paymentDate: Date | string;
  amount: number;
  paymentMode: PaymentMethod | string;
  referenceNo?: string | null;
  status: PaymentStatus | string;
  reversedAt?: Date | string | null;
  reversedBy?: string | null;
  reversalReason?: string | null;
  notes?: string | null;
  createdBy?: string | null;

  customer?: Customer | null;
  salesInvoice?: SalesInvoice | null;
}

// ----------------- Sales Return Types -----------------

export interface SalesReturnItem extends BaseEntity {
  companyId: string;
  salesReturnId: string;
  originalSalesInvoiceItemId?: string | null;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  returnRate: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  restockCondition: RestockCondition | string;
  reason?: string | null;

  product?: Product | null;
}

export interface SalesReturn extends BaseEntity {
  companyId: string;
  returnNumber: string;
  originalSalesInvoiceId: string;
  customerId?: string | null;
  returnDate: Date | string;
  locationId?: string | null;
  status: SalesReturnStatus | string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  otherTaxAmount: number;
  grandTotal: number;
  refundAmount: number;
  creditAmount: number;
  reason?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  postedBy?: string | null;
  postedAt?: Date | string | null;

  // Step 12: Customer Wallet & Loyalty Points
  pointsReversed?: number;
  pointsRestored?: number;

  customer?: Customer | null;
  location?: InventoryLocation | null;
  originalSalesInvoice?: SalesInvoice | null;
  items?: SalesReturnItem[];
}

// ----------------- Customer Ledger Types -----------------

export type CustomerLedgerTransactionType =
  | 'OPENING_BALANCE'
  | 'SALE'
  | 'PAYMENT'
  | 'SALES_RETURN'
  | 'PAYMENT_REVERSAL'
  | 'ADJUSTMENT';

export interface CustomerLedgerEntry extends BaseEntity {
  companyId: string;
  customerId: string;
  entryDate: Date | string;
  transactionType: CustomerLedgerTransactionType;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
  debitAmount: number;  // Increases receivable (sale, opening receivable)
  creditAmount: number; // Decreases receivable (payment, return, advance)
  runningBalance: number;
  description?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

// ----------------- Sales Calculation Types -----------------

export interface SalesCalculationInputItem {
  productId?: string;
  quantity: number;
  sellingRate?: number;
  unitPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxRate?: number;
}

export interface SalesLineCalculationResult {
  productId?: string;
  quantity: number;
  sellingRate: number;
  grossAmount: number;
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  isInterstate: boolean;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface SalesCalculationInput {
  isInterstate?: boolean;
  customerState?: string | null;
  companyState?: string | null;
  invoiceDiscount?: number;
  discountValue?: number;
  discountType?: 'PERCENTAGE' | 'FLAT';
  additionalCharges?: number;
  roundOff?: number;
  items: SalesCalculationInputItem[];
}

export interface SalesCalculationResult {
  subtotal: number;
  lineDiscountTotal: number;
  invoiceDiscount: number;
  totalDiscount?: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  otherTaxAmount: number;
  additionalCharges: number;
  roundOff: number;
  grandTotal: number;
  isInterstate: boolean;
  items: SalesLineCalculationResult[];
}

// ----------------- Sales Invoice DTOs -----------------

export interface SalesInvoiceItemDraftDTO {
  productId: string;
  quantity: number;
  sellingRate?: number;  // If omitted, use product's current selling price
  unitPrice?: number;    // POS alias for sellingRate
  discountPercentage?: number;
  discountAmount?: number;
  taxRate?: number;
}

export interface SalesInvoiceCreateDTO {
  customerId?: string | null;
  invoiceType?: SalesInvoiceType | string;
  invoiceDate?: string;
  dueDate?: string | null;
  locationId?: string | null;
  isInterstate?: boolean;
  invoiceDiscount?: number;
  additionalCharges?: number;
  roundOff?: number;
  notes?: string | null;
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  items: SalesInvoiceItemDraftDTO[];
}

export interface SalesInvoiceUpdateDTO {
  customerId?: string | null;
  invoiceType?: SalesInvoiceType | string;
  invoiceDate?: string;
  dueDate?: string | null;
  locationId?: string | null;
  invoiceDiscount?: number;
  additionalCharges?: number;
  roundOff?: number;
  notes?: string | null;
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  items?: SalesInvoiceItemDraftDTO[];
}

export interface SalesPostDTO {
  payments: SalesPaymentInputDTO[];
}

export interface SalesPaymentInputDTO {
  amount: number;
  paymentMode: PaymentMethod | string;
  referenceNo?: string | null;
  notes?: string | null;
  paymentDate?: string;
}

export interface SalesFilterDTO {
  search?: string;
  customerId?: string;
  locationId?: string;
  status?: SalesInvoiceStatus;
  paymentStatus?: SalesPaymentStatus;
  invoiceType?: SalesInvoiceType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'invoiceNumber' | 'invoiceDate' | 'grandTotal' | 'amountPaid' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ----------------- Sales Payment DTOs -----------------

export interface SalesPaymentCreateDTO {
  customerId?: string | null;
  salesInvoiceId?: string | null;
  amount: number;
  paymentDate?: string;
  paymentMode: PaymentMethod | string;
  referenceNo?: string | null;
  notes?: string | null;
}

export interface SalesPaymentFilterDTO {
  customerId?: string;
  salesInvoiceId?: string;
  startDate?: string;
  endDate?: string;
  paymentMode?: string;
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
}

// ----------------- Sales Return DTOs -----------------

export interface SalesReturnItemDTO {
  originalSalesInvoiceItemId?: string;
  productId: string;
  quantity: number;
  restockCondition?: RestockCondition | string;
  reason?: string;
}

export interface SalesReturnCreateDTO {
  originalSalesInvoiceId: string;
  locationId?: string | null;
  returnDate?: string;
  refundMode?: string | null;
  reason?: string | null;
  notes?: string | null;
  items: SalesReturnItemDTO[];
}

export interface SalesReturnFilterDTO {
  search?: string;
  originalSalesInvoiceId?: string;
  customerId?: string;
  status?: SalesReturnStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// ----------------- Customer Ledger DTOs -----------------

export interface CustomerLedgerFilterDTO {
  customerId: string;
  startDate?: string;
  endDate?: string;
  transactionType?: CustomerLedgerTransactionType | string;
  page?: number;
  pageSize?: number;
}

export interface CustomerStatementDTO {
  customer: Customer;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: CustomerLedgerEntry[];
}

// ----------------- Sales Summary / KPI Types -----------------

export interface SalesSummaryDTO {
  totalSalesCount: number;
  totalGrandTotal: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  draftsCount: number;
  postedCount: number;
  cancelledCount: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  paidCount: number;
}

export interface SalesDashboardKPIs {
  salesTodayAmount: number;
  salesTodayCount: number;
  salesThisMonthAmount: number;
  salesThisMonthCount: number;
  outstandingReceivables: number;
  unpaidInvoicesCount: number;
  partiallyPaidInvoicesCount: number;
  salesReturnsThisMonthAmount: number;
  salesReturnsThisMonthCount: number;
  totalSales?: number;
  totalOutstanding?: number;
  totalCollected?: number;
  totalReturns?: number;
  postedInvoicesCount?: number;
  topCustomersByReceivable?: { name: string; code: string; balance: number }[];
}

export interface ProductSalesReportItem {
  productId: string;
  productName: string;
  sku?: string;
  quantitySold: number;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
}

export interface SalesReportFilterDTO {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
}

// POS product search result
export interface POSProductSearchResult {
  productId: string;
  name: string;
  shortName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  hsnCode?: string | null;
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  unitName?: string | null;
  unitShortCode?: string | null;
  allowDecimals: boolean;
  availableStock: number;
  locationId: string;
  locationName: string;
  isActive: boolean;
  trackStock: boolean;
}

export interface POSProductSearchFilterDTO {
  query: string;
  locationId?: string;
  exactBarcode?: boolean;
}

// ============================================================================
// STEP 7: EXPENSES, CASH REGISTER, CASHBOOK & DAY-END CLOSING
// ============================================================================

// ----------------- Enums & Constants -----------------

export const ExpenseStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED',
} as const;
export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus];

export const ExpensePaymentMethod = {
  CASH: 'CASH',
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD: 'CARD',
  CHEQUE: 'CHEQUE',
  OTHER: 'OTHER',
} as const;
export type ExpensePaymentMethod = (typeof ExpensePaymentMethod)[keyof typeof ExpensePaymentMethod];

export const CashRegisterSessionStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type CashRegisterSessionStatus = (typeof CashRegisterSessionStatus)[keyof typeof CashRegisterSessionStatus];

export const CashMovementType = {
  OPENING_CASH: 'OPENING_CASH',
  CASH_SALE: 'CASH_SALE',
  CUSTOMER_PAYMENT: 'CUSTOMER_PAYMENT',
  CASH_IN: 'CASH_IN',
  CASH_WITHDRAWAL: 'CASH_WITHDRAWAL',
  CASH_EXPENSE: 'CASH_EXPENSE',
  SUPPLIER_CASH_PAYMENT: 'SUPPLIER_CASH_PAYMENT',
  CASH_REFUND: 'CASH_REFUND',
  CASH_OUT: 'CASH_OUT',
  CASH_DEPOSIT: 'CASH_DEPOSIT',
  CASH_ADJUSTMENT: 'CASH_ADJUSTMENT',
} as const;
export type CashMovementType = (typeof CashMovementType)[keyof typeof CashMovementType];

// ----------------- Expense Category -----------------

export interface ExpenseCategory {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExpenseCategoryCreateDTO {
  name: string;
  description?: string | null;
}

export interface ExpenseCategoryUpdateDTO {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

// ----------------- Expense -----------------

export interface Expense {
  id: string;
  companyId: string;
  expenseNumber: string;
  categoryId: string;
  categoryNameSnapshot: string;
  expenseDate: Date | string;
  description: string;
  payee?: string | null;
  amount: number;
  paymentMethod: ExpensePaymentMethod | string;
  paymentAccountId?: string | null;
  cashRegisterSessionId?: string | null;
  referenceNumber?: string | null;
  receiptReference?: string | null;
  notes?: string | null;
  status: ExpenseStatus | string;
  createdBy?: string | null;
  updatedBy?: string | null;
  postedBy?: string | null;
  postedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: ExpenseCategory;
}

export interface ExpenseCreateDTO {
  categoryId: string;
  expenseDate?: string;
  description: string;
  payee?: string | null;
  amount: number;
  paymentMethod?: ExpensePaymentMethod | string;
  paymentAccountId?: string | null;
  cashRegisterSessionId?: string | null;
  referenceNumber?: string | null;
  receiptReference?: string | null;
  notes?: string | null;
  postImmediately?: boolean;
}

export interface ExpenseUpdateDTO {
  categoryId?: string;
  expenseDate?: string;
  description?: string;
  payee?: string | null;
  amount?: number;
  paymentMethod?: ExpensePaymentMethod | string;
  paymentAccountId?: string | null;
  cashRegisterSessionId?: string | null;
  referenceNumber?: string | null;
  receiptReference?: string | null;
  notes?: string | null;
}

export interface ExpenseFilterDTO {
  search?: string;
  categoryId?: string;
  paymentMethod?: string;
  status?: ExpenseStatus | string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// ----------------- Cash Register -----------------

export interface CashRegister {
  id: string;
  companyId: string;
  registerCode: string;
  name: string;
  locationId?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CashRegisterCreateDTO {
  registerCode?: string;
  name: string;
  locationId?: string | null;
}

export interface CashRegisterUpdateDTO {
  name?: string;
  locationId?: string | null;
  isActive?: boolean;
}

// ----------------- Cash Register Session -----------------

export interface CashRegisterSession {
  id: string;
  companyId: string;
  cashRegisterId: string;
  sessionNumber: string;
  openedBy?: string | null;
  openedAt: Date | string;
  openingCash: number;
  expectedCash: number;
  countedCash?: number | null;
  cashDifference?: number | null;
  status: CashRegisterSessionStatus | string;
  closedBy?: string | null;
  closedAt?: Date | string | null;
  closingNotes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  cashRegister?: CashRegister;
}

export interface CashRegisterOpenSessionDTO {
  cashRegisterId?: string;
  openingCash: number;
  openingNotes?: string | null;
}

export interface CashRegisterCloseSessionDTO {
  countedCash: number;
  closingNotes?: string | null;
}

export interface CashInOutDTO {
  amount: number;
  reason: string;
  notes?: string | null;
}

// ----------------- Cash Movement -----------------

export interface CashMovement {
  id: string;
  companyId: string;
  cashRegisterId: string;
  cashRegisterSessionId: string;
  movementNumber: string;
  movementType: CashMovementType | string;
  amount: number;
  movementDate: Date | string;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
  description?: string | null;
  expenseId?: string | null;
  createdBy?: string | null;
  createdAt: Date | string;
}

// ----------------- Cashbook -----------------

export interface CashbookEntry {
  id: string;
  date: Date | string;
  movementNumber: string;
  movementType: CashMovementType | string;
  referenceType?: string | null;
  referenceNumber?: string | null;
  description?: string | null;
  cashIn: number;
  cashOut: number;
  runningBalance: number;
}

export interface CashbookFilterDTO {
  cashRegisterId?: string;
  startDate?: string;
  endDate?: string;
  movementType?: string;
  page?: number;
  pageSize?: number;
}

export interface CashbookSummary {
  openingBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  closingBalance: number;
}

// ----------------- Day-End Closing -----------------

export interface DayEndClosing {
  id: string;
  companyId: string;
  cashRegisterId: string;
  cashRegisterSessionId: string;
  closingNumber: string;
  businessDate: Date | string;
  openingCash: number;
  cashSales: number;
  customerCashReceipts: number;
  supplierCashPayments: number;
  cashExpenses: number;
  cashRefunds: number;
  cashIn: number;
  cashOut: number;
  cashDeposits: number;
  cashWithdrawals: number;
  expectedCash: number;
  countedCash: number;
  cashDifference: number;
  nonCashSales: number;
  nonCashReceipts: number;
  nonCashExpenses: number;
  notes?: string | null;
  status: string;
  closedBy?: string | null;
  closedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  cashRegister?: CashRegister;
  cashRegisterSession?: CashRegisterSession;
}

export interface DayEndClosingFilterDTO {
  cashRegisterId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface DayEndClosingPreview {
  session: CashRegisterSession;
  cashRegister: CashRegister;
  openingCash: number;
  cashSales: number;
  customerCashReceipts: number;
  supplierCashPayments: number;
  cashExpenses: number;
  cashRefunds: number;
  cashIn: number;
  cashOut: number;
  cashDeposits: number;
  cashWithdrawals: number;
  expectedCash: number;
  nonCashSales: number;
  nonCashReceipts: number;
  nonCashExpenses: number;
  movementCount: number;
}

export interface FinancialDashboardKPIs {
  expensesToday: number;
  expensesThisMonth: number;
  cashReceivedToday: number;
  cashPaidToday: number;
  currentExpectedCash: number;
  unclosedSessionsCount: number;
  activeSessionId?: string | null;
  recentDifference: number;
}


// ─────────────────────────────────────────────────────────────────────────────
// Step 8: Business Reports & Analytics Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Date Range Filter ─────────────────────────────────────────────────────────

export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'prev_month'
  | 'this_year'
  | 'prev_year'
  | 'custom';

export interface DateRangeFilter {
  period?: ReportPeriod;
  startDate?: string; // ISO date string YYYY-MM-DD
  endDate?: string;   // ISO date string YYYY-MM-DD
  page?: number;
  pageSize?: number;
}

// ── Sales Reports ─────────────────────────────────────────────────────────────

export interface SalesReportSummary {
  invoiceCount: number;
  grossSales: number;
  lineDiscountTotal: number;
  invoiceDiscountTotal: number;
  totalDiscounts: number;
  salesReturns: number;
  netSales: number;
  totalTax: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  averageInvoiceValue: number;
  salesByPaymentMethod: { method: string; amount: number; count: number }[];
  returnCount: number;
  startDate: string;
  endDate: string;
}

export interface SalesInvoiceReportRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  customerName: string | null;
  subtotal: number;
  lineDiscountTotal: number;
  invoiceDiscount: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  outstanding: number;
  paymentStatus: string;
  status: string;
}

export interface ProductSalesReportRow {
  productId: string;
  productName: string;
  sku: string | null;
  barcode: string | null;
  quantitySold: number;
  returnedQuantity: number;
  netQuantitySold: number;
  grossSales: number;
  discountAmount: number;
  netSales: number;
  cogsSold: number | null;
  grossProfit: number | null;
  grossProfitMargin: number | null;
  hasCostData: boolean;
}

export interface CategorySalesReportRow {
  categoryId: string | null;
  categoryName: string;
  quantitySold: number;
  netSales: number;
  sharePercent: number;
}

export interface CustomerSalesReportRow {
  customerId: string | null;
  customerName: string;
  invoiceCount: number;
  grossSales: number;
  salesReturns: number;
  netSales: number;
  paymentsReceived: number;
  outstandingBalance: number;
}

export interface PaymentCollectionRow {
  id: string;
  paymentNumber: string;
  paymentDate: Date | string;
  customerName: string | null;
  invoiceNumber: string | null;
  paymentMode: string;
  amount: number;
  referenceNo: string | null;
  notes: string | null;
}

export interface SalesReportFilters extends DateRangeFilter {
  customerId?: string;
  paymentMode?: string;
  status?: string;
  productId?: string;
  categoryId?: string;
}

// ── Purchase Reports ──────────────────────────────────────────────────────────

export interface PurchaseReportSummary {
  invoiceCount: number;
  grossPurchases: number;
  lineDiscountTotal: number;
  invoiceDiscountTotal: number;
  totalDiscounts: number;
  purchaseReturns: number;
  netPurchases: number;
  totalTax: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalPaymentsMade: number;
  totalOutstanding: number;
  averageInvoiceValue: number;
  startDate: string;
  endDate: string;
}

export interface PurchaseInvoiceReportRow {
  id: string;
  purchaseNumber: string;
  purchaseDate: Date | string;
  supplierName: string;
  subtotal: number;
  lineDiscountTotal: number;
  invoiceDiscount: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  outstanding: number;
  paymentStatus: string;
  status: string;
}

export interface ProductPurchaseReportRow {
  productId: string;
  productName: string;
  sku: string | null;
  quantityPurchased: number;
  returnQuantity: number;
  netQuantityReceived: number;
  grossPurchaseValue: number;
  discountAmount: number;
  netPurchaseValue: number;
  avgUnitCost: number | null;
}

export interface SupplierReportRow {
  supplierId: string;
  supplierName: string;
  purchaseCount: number;
  grossPurchases: number;
  purchaseReturns: number;
  netPurchases: number;
  paymentsMade: number;
  outstandingBalance: number;
}

export interface PurchaseReportFilters extends DateRangeFilter {
  supplierId?: string;
  status?: string;
  productId?: string;
}

// ── Inventory Reports ─────────────────────────────────────────────────────────

export interface InventoryCurrentStockRow {
  productId: string;
  productName: string;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  unitName: string | null;
  brandName: string | null;
  currentStock: number;
  minimumStock: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEGATIVE';
  purchasePrice: number;
  sellingPrice: number;
  estimatedValue: number;
  hasCostData: boolean;
  trackStock: boolean;
}

export interface LowStockReportRow {
  productId: string;
  productName: string;
  sku: string | null;
  categoryName: string | null;
  unitName: string | null;
  currentStock: number;
  minimumStock: number;
  shortfall: number;
}

export interface OutOfStockReportRow {
  productId: string;
  productName: string;
  sku: string | null;
  categoryName: string | null;
  currentStock: number;
  isNegative: boolean;
  minimumStock: number;
}

export interface StockMovementReportRow {
  id: string;
  movementDate: Date | string;
  productName: string;
  sku: string | null;
  movementType: string;
  referenceType: string | null;
  referenceNumber: string | null;
  quantityIn: number;
  quantityOut: number;
  unitCost: number;
  notes: string | null;
  createdBy: string | null;
}

export interface InventoryValuationRow {
  productId: string;
  productName: string;
  sku: string | null;
  categoryName: string | null;
  unitName: string | null;
  currentStock: number;
  unitCost: number;
  estimatedValue: number;
  hasCostData: boolean;
  costSource: 'PURCHASE_PRICE' | 'OPENING_STOCK_RATE' | 'NONE';
}

export interface InventoryValuationSummary {
  rows: InventoryValuationRow[];
  totalEstimatedValue: number;
  totalProducts: number;
  productsWithCostData: number;
  productsWithoutCostData: number;
  valuationDate: string;
  methodology: string;
  limitation: string | null;
}

export interface StockAdjustmentReportRow {
  adjustmentId: string;
  adjustmentNumber: string;
  adjustmentDate: Date | string;
  productName: string;
  sku: string | null;
  locationName: string;
  adjustmentType: string;
  systemQuantity: number;
  differenceQuantity: number;
  reason: string;
  createdBy: string | null;
  unitCost: number;
}

export interface InventoryReportFilters extends DateRangeFilter {
  categoryId?: string;
  brandId?: string;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ALL';
  productId?: string;
  movementType?: string;
}

// ── Profit & Loss Report ──────────────────────────────────────────────────────

export interface ProfitLossReportSection {
  label: string;
  amount: number;
}

export interface ExpenseCategoryBreakdown {
  categoryName: string;
  amount: number;
  count: number;
}

export interface ProfitLossReport {
  // Revenue
  grossSales: number;
  salesDiscounts: number;
  salesReturns: number;
  netSales: number;

  // COGS
  grossCOGS: number;
  cogsReturnReversal: number;
  netCOGS: number;
  hasCostData: boolean;
  partialCostData: boolean;
  itemsWithMissingCost: number;
  totalItemsSold: number;

  // Gross Profit
  grossProfit: number;
  grossProfitMargin: number | null; // null if netSales === 0

  // Operating Expenses
  expensesByCategory: ExpenseCategoryBreakdown[];
  totalOperatingExpenses: number;

  // Estimated Operating Result
  estimatedOperatingResult: number;
  operatingMargin: number | null; // null if netSales === 0

  // Disclosures
  startDate: string;
  endDate: string;
  limitations: string[];
  isComplete: boolean; // false = missing cost data or partial
}

// ── Receivables & Payables Reports ───────────────────────────────────────────

export interface CustomerOutstandingRow {
  customerId: string;
  customerName: string;
  customerCode: string;
  phone: string | null;
  openingBalance: number;
  openingBalanceType: string;
  salesInPeriod: number;
  salesReturnsInPeriod: number;
  paymentsReceivedInPeriod: number;
  closingBalance: number;
  balanceType: 'RECEIVABLE' | 'ADVANCE' | 'ZERO';
}

export interface SupplierOutstandingRow {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  phone: string | null;
  openingBalance: number;
  openingBalanceType: string;
  purchasesInPeriod: number;
  purchaseReturnsInPeriod: number;
  paymentsMadeInPeriod: number;
  closingBalance: number;
  balanceType: 'PAYABLE' | 'ADVANCE' | 'ZERO';
}

export interface OutstandingReportFilters {
  asOfDate?: string; // ISO date string; defaults to today
  page?: number;
  pageSize?: number;
  search?: string;
}

// ── Cash & Expense Reports ────────────────────────────────────────────────────

export interface ExpenseSummaryRow {
  categoryId: string;
  categoryName: string;
  expenseCount: number;
  totalAmount: number;
  cashAmount: number;
  nonCashAmount: number;
}

export interface ExpenseSummaryReport {
  rows: ExpenseSummaryRow[];
  totalExpenses: number;
  totalCash: number;
  totalNonCash: number;
  startDate: string;
  endDate: string;
}

export interface CashbookReportRow {
  id: string;
  movementDate: Date | string;
  movementType: string;
  referenceNumber: string | null;
  description: string | null;
  cashIn: number;
  cashOut: number;
  runningBalance: number;
  sessionNumber: string | null;
}

export interface CashbookReportSummary {
  rows: CashbookReportRow[];
  openingBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  closingBalance: number;
  startDate: string;
  endDate: string;
}

export interface RegisterClosingReportRow {
  id: string;
  closingNumber: string;
  businessDate: Date | string;
  registerName: string;
  sessionNumber: string;
  openingCash: number;
  cashSales: number;
  customerCashReceipts: number;
  supplierCashPayments: number;
  cashExpenses: number;
  cashRefunds: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  countedCash: number;
  cashDifference: number;
  closedBy: string | null;
  closedAt: Date | string;
  status: 'MATCHED' | 'SURPLUS' | 'SHORTAGE';
}

export interface ExpenseReportFilters extends DateRangeFilter {
  categoryId?: string;
  paymentMethod?: string;
}

// ── Tax Summary Report ────────────────────────────────────────────────────────

export interface TaxRateBreakdown {
  taxRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  invoiceCount: number;
}

export interface TaxSummaryReport {
  // Sales
  taxableSales: number;
  salesCGST: number;
  salesSGST: number;
  salesIGST: number;
  salesCess: number;
  totalSalesTax: number;
  salesReturnTaxReversal: number;
  netSalesTax: number;

  // Purchases
  taxablePurchases: number;
  purchaseCGST: number;
  purchaseSGST: number;
  purchaseIGST: number;
  purchaseCess: number;
  totalPurchaseTax: number;
  purchaseReturnTaxReversal: number;
  netPurchaseTax: number;

  // Net
  netTaxLiability: number;

  // Breakdown by rate
  salesByRate: TaxRateBreakdown[];
  purchasesByRate: TaxRateBreakdown[];

  startDate: string;
  endDate: string;
  disclaimer: string;
}

export interface TaxReportFilters extends DateRangeFilter {
  taxRate?: number;
}

// ── Business Dashboard KPIs ───────────────────────────────────────────────────

export interface BusinessDashboardKPIs {
  // Period info
  startDate: string;
  endDate: string;
  period: string;

  // Sales
  grossSales: number;
  salesReturns: number;
  netSales: number;
  salesInvoiceCount: number;
  averageInvoiceValue: number;

  // Purchases
  grossPurchases: number;
  purchaseReturns: number;
  netPurchases: number;
  purchaseInvoiceCount: number;

  // Expenses
  totalExpenses: number;
  expensesByCategory: { categoryName: string; amount: number }[];

  // Profitability
  grossCOGS: number;
  grossProfit: number;
  grossProfitMargin: number | null;
  hasCostData: boolean;

  // Receivables (as-of end date)
  totalReceivables: number;
  customersWithBalance: number;

  // Payables (as-of end date)
  totalPayables: number;
  suppliersWithBalance: number;

  // Inventory (current snapshot)
  totalStockValue: number;
  totalStockItems: number;
  lowStockCount: number;
  outOfStockCount: number;

  // Cash (from register)
  cashSalesInPeriod: number;
  cashExpensesInPeriod: number;
  cashCollectionsInPeriod: number;
  currentCashInDrawer: number | null;
  activeSessionId: string | null;
}

// ── Chart Data Types ──────────────────────────────────────────────────────────

export interface TrendDataPoint {
  date: string;       // 'YYYY-MM-DD' or 'MMM YYYY'
  sales: number;
  purchases: number;
  expenses: number;
  grossProfit: number | null;
}

export interface CategoryShareDataPoint {
  name: string;
  value: number;
  percent: number;
}

export interface TopProductDataPoint {
  productName: string;
  sku: string | null;
  quantity: number;
  netSales: number;
  grossProfit: number | null;
}

export interface PaymentMethodDataPoint {
  method: string;
  amount: number;
  count: number;
  percent: number;
}

export interface DashboardChartsData {
  salesTrend: TrendDataPoint[];
  categoryShare: CategoryShareDataPoint[];
  topProductsByQuantity: TopProductDataPoint[];
  topProductsByValue: TopProductDataPoint[];
  paymentMethodDistribution: PaymentMethodDataPoint[];
  lowStockProducts: LowStockReportRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 9: Settings, Users, Permissions & Business Configuration Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CompanyProfileDTO {
  businessName: string;
  businessType?: string | null;
  ownerName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  gstRegistered: boolean;
  gstin?: string | null;
  pan?: string | null;
  taxType?: string | null;
  invoicePrefix?: string | null;
  logoPath?: string | null;
  defaultInvoiceFooter?: string | null;
  defaultTerms?: string | null;
}

export interface InvoiceReceiptSettingsDTO {
  invoicePrefix: string;
  purchasePrefix: string;
  salesReturnPrefix: string;
  purchaseReturnPrefix: string;
  expensePrefix: string;
  startingInvoiceNumber: number;
  invoicePrintFormat: 'thermal' | 'standard_a4';
  thermalPaperSize: '58mm' | '80mm';
  selectedPrinter?: string;
  printCopies: number;
  showLogoOnInvoice: boolean;
  showAddressOnInvoice: boolean;
  showGstinOnInvoice: boolean;
  showCustomerContactOnInvoice: boolean;
  showSkuBarcodeOnInvoice: boolean;
  showDiscountOnInvoice: boolean;
  showTaxBreakdownOnInvoice: boolean;
  showPaymentInfoOnInvoice: boolean;
  showTermsOnInvoice: boolean;
  invoiceFooterText: string;
  invoiceTermsAndConditions: string;
}

export interface CurrencyFormattingSettingsDTO {
  currency: string;
  currencySymbol: string;
  currencySymbolPlacement: 'BEFORE' | 'AFTER';
  currencyDecimalPlaces: number;
  quantityDecimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface TaxPricingSettingsDTO {
  defaultTaxInclusive: boolean;
  defaultTaxRate: number;
  defaultTaxDisplay: 'ITEMIZED' | 'SUMMARY';
  priceDecimalPrecision: number;
  discountDisplayPreference: 'PERCENTAGE' | 'FLAT';
  allowPriceOverride: boolean;
  allowInvoiceDiscount: boolean;
  allowSellBelowCost: boolean;
}

export interface InventorySettingsDTO {
  allowNegativeStock: boolean;
  defaultStockLocationId?: string;
  defaultAdjustmentReason: string;
  lowStockThresholdDefault: number;
  showInactiveProductsInSearch: boolean;
  enableBarcodeScanning: boolean;
  showProductCostToCashiers: boolean;
}

export interface ApplicationPreferencesDTO {
  theme: 'dark' | 'light' | 'system';
  startPage: string;
  defaultSalesScreen: 'standard' | 'pos_touch';
  defaultCustomerId?: string;
  confirmBeforePost: boolean;
  confirmBeforeDelete: boolean;
  soundOnScan: boolean;
  autoBackupOnClose: boolean;
}

export interface RoleCreateDTO {
  name: string;
  description?: string;
  permissionCodes: string[];
}

export interface RoleUpdateDTO {
  name?: string;
  description?: string;
  permissionCodes?: string[];
}

export interface PermissionDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
}

export interface RoleWithPermissionsDTO {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  permissions: {
    id: string;
    permission: PermissionDefinition;
  }[];
  userCount?: number;
}

export interface PermissionMatrixModule {
  module: string;
  permissions: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    assigned: boolean;
  }[];
}

export interface BackupFileInfo {
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackupCreateResult {
  success: boolean;
  filePath: string;
  sizeBytes: number;
  timestamp: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  safetyBackupPath?: string;
  restoredTablesCount?: number;
  timestamp: string;
  error?: string;
}

export interface SystemInfoDTO {
  productName: string;
  companyName: string;
  appVersion: string;
  schemaVersion: string;
  platform: string;
  isOffline: boolean;
  databasePath: string;
  backupPath: string;
  logsPath: string;
  nodeVersion: string;
  electronVersion: string;
}

// ----------------- Step 11: Communication & Promotions Types -----------------

export type CommunicationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';
export type CommunicationSecurityMode = 'STARTTLS' | 'TLS' | 'PLAIN';
export type CommunicationTestStatus = 'SUCCESS' | 'FAILED' | 'UNTESTED';
export type MessageTemplateType = 'PROMOTIONAL' | 'COUPON_ISSUED' | 'COUPON_REMINDER' | 'EXPIRY_REMINDER' | 'WELCOME';
export type CommunicationLogStatus = 'PENDING' | 'PROCESSING' | 'ACCEPTED' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type CampaignType = 'FESTIVAL' | 'CLEARANCE' | 'VIP_MEMBERS' | 'NEW_LAUNCH' | 'GENERAL';
export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type CouponApplicabilityMode = 'ANY_ELIGIBLE_PURCHASE' | 'NEXT_ELIGIBLE_PURCHASE';
export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'CANCELLED';
export type CouponDeliveryChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PRINTED' | 'MANUAL';
export type CouponDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'NOT_REQUESTED';

export interface CommunicationProviderConfigDTO {
  id: string;
  companyId: string;
  channel: CommunicationChannel;
  providerName: string;
  isEnabled: boolean;
  configPayload: Record<string, any>;
  hasSecrets: boolean;
  lastTestStatus?: CommunicationTestStatus | null;
  lastTestMessage?: string | null;
  lastTestedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SaveSMTPConfigDTO {
  providerName: string;
  host: string;
  port: number;
  securityMode: CommunicationSecurityMode;
  username: string;
  password?: string;
  senderDisplayName: string;
  senderEmail: string;
  replyToEmail?: string;
  timeoutSeconds?: number;
  isEnabled: boolean;
}

export interface SaveSMSConfigDTO {
  providerName: string;
  apiEndpoint?: string;
  accountSid?: string;
  authToken?: string;
  senderId?: string;
  region?: string;
  isEnabled: boolean;
}

export interface SaveWhatsAppConfigDTO {
  providerName: string;
  businessAccountId?: string;
  phoneNumberId?: string;
  senderPhoneNumber?: string;
  accessToken?: string;
  apiEndpoint?: string;
  isEnabled: boolean;
}

export interface TestCommunicationResultDTO {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface MessageTemplateDTO extends BaseEntity {
  companyId: string;
  name: string;
  channel: CommunicationChannel;
  templateType: MessageTemplateType;
  subject?: string | null;
  body: string;
  isActive: boolean;
  placeholders?: string[] | null;
}

export interface MessageTemplateCreateDTO {
  name: string;
  channel: CommunicationChannel;
  templateType: MessageTemplateType;
  subject?: string | null;
  body: string;
  isActive?: boolean;
}

export interface MessageTemplateUpdateDTO {
  name?: string;
  templateType?: MessageTemplateType;
  subject?: string | null;
  body?: string;
  isActive?: boolean;
}

export interface CommunicationLogDTO extends BaseEntity {
  companyId: string;
  channel: CommunicationChannel;
  recipientReference: string;
  messageType: 'TRANSACTIONAL' | 'MARKETING' | 'TEST';
  templateId?: string | null;
  campaignId?: string | null;
  couponId?: string | null;
  customerId?: string | null;
  providerMessageId?: string | null;
  status: CommunicationLogStatus;
  submittedAt: Date | string;
  deliveredAt?: Date | string | null;
  failureReason?: string | null;
  retryCount: number;
  template?: { name: string } | null;
  campaign?: { name: string } | null;
  customer?: { name: string; phone?: string | null; email?: string | null } | null;
}

export interface CommunicationLogFilterDTO {
  channel?: CommunicationChannel;
  status?: CommunicationLogStatus;
  messageType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PromotionCampaignDTO extends BaseEntity {
  companyId: string;
  name: string;
  description?: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  startAt: Date | string;
  endAt: Date | string;
  targetCustomerGroup: string;
  channels: CommunicationChannel[];
  templateId?: string | null;
  couponId?: string | null;
  totalRecipients: number;
  messagesSent: number;
  messagesFailed: number;
  createdBy?: string | null;
  template?: MessageTemplateDTO | null;
  coupon?: CouponDTO | null;
}

export interface PromotionCampaignCreateDTO {
  name: string;
  description?: string;
  campaignType?: CampaignType;
  startAt: string;
  endAt: string;
  targetCustomerGroup?: string;
  channels: CommunicationChannel[];
  templateId?: string;
  couponId?: string;
}

export interface PromotionCampaignUpdateDTO {
  name?: string;
  description?: string;
  campaignType?: CampaignType;
  startAt?: string;
  endAt?: string;
  targetCustomerGroup?: string;
  channels?: CommunicationChannel[];
  templateId?: string | null;
  couponId?: string | null;
  status?: CampaignStatus;
}

export interface CouponDTO extends BaseEntity {
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumPurchase: number;
  maximumDiscount?: number | null;
  validFrom: Date | string;
  validUntil: Date | string;
  applicabilityMode: CouponApplicabilityMode;
  customerId?: string | null;
  campaignId?: string | null;
  applicableProductIds?: string[] | null;
  applicableCategoryIds?: string[] | null;
  excludedProductIds?: string[] | null;
  maximumRedemptions: number;
  maximumRedemptionsPerCustomer: number;
  currentRedemptionsCount: number;
  status: CouponStatus;
  createdBy?: string | null;
  customer?: { id: string; name: string; customerCode: string } | null;
  campaign?: { id: string; name: string } | null;
}

export interface CouponCreateDTO {
  code?: string;
  name: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number | null;
  validFrom: string;
  validUntil: string;
  applicabilityMode?: CouponApplicabilityMode;
  customerId?: string | null;
  campaignId?: string | null;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  excludedProductIds?: string[];
  maximumRedemptions?: number;
  maximumRedemptionsPerCustomer?: number;
}

export interface NextBillCouponCreateDTO {
  discountType: CouponDiscountType;
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number | null;
  validityDays: number;
  customerId: string;
  issuingSalesInvoiceId?: string;
  deliveryChannel?: CouponDeliveryChannel;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
}

export interface CouponValidationInputDTO {
  code: string;
  customerId?: string | null;
  subtotal: number;
  items: Array<{
    productId: string;
    quantity: number;
    sellingRate: number;
    categoryId?: string | null;
  }>;
}

export interface CouponValidationResultDTO {
  isValid: boolean;
  coupon?: CouponDTO;
  discountAmount: number;
  message: string;
  code: string;
}

export interface CouponRedemptionDTO extends BaseEntity {
  companyId: string;
  couponId: string;
  customerId?: string | null;
  salesInvoiceId: string;
  discountAmount: number;
  billAmountBeforeDiscount: number;
  billAmountAfterDiscount: number;
  redeemedBy?: string | null;
  redeemedAt: Date | string;
  coupon?: CouponDTO | null;
  customer?: Customer | null;
  salesInvoice?: { id: string; invoiceNumber: string } | null;
}

export interface CouponIssuanceDTO extends BaseEntity {
  companyId: string;
  couponId: string;
  customerId?: string | null;
  issuingSalesInvoiceId?: string | null;
  issuedBy?: string | null;
  issuedAt: Date | string;
  deliveryChannel: CouponDeliveryChannel;
  deliveryStatus: CouponDeliveryStatus;
  deliveryFailureReason?: string | null;
  coupon?: CouponDTO | null;
  customer?: Customer | null;
}

export interface PromotionsKPIsDTO {
  activeCampaignsCount: number;
  scheduledCampaignsCount: number;
  totalCouponsIssued: number;
  couponsRedeemed: number;
  couponsExpired: number;
  couponsRemainingUnused: number;
  totalDiscountRedeemed: number;
  redemptionRate: number;
  totalAttributedSales: number;
}

// =============================================================================
// STEP 12: CUSTOMER WALLET & LOYALTY POINTS SYSTEM
// =============================================================================

export type LoyaltyEarningMethod = 'AMOUNT_SPENT' | 'FLAT_PER_ORDER';
export type LoyaltyNegativeBalancePolicy = 'ALLOW_NEGATIVE' | 'DEDUCT_FROM_REFUND' | 'CLAMP_TO_ZERO';
export type LoyaltyWalletStatus = 'ACTIVE' | 'FROZEN' | 'SUSPENDED';
export type LoyaltyTransactionType =
  | 'EARN'
  | 'REDEEM'
  | 'EXPIRE'
  | 'RETURN_REVERSAL'
  | 'RETURN_RESTORE'
  | 'MANUAL_CREDIT'
  | 'MANUAL_DEBIT'
  | 'ADMIN_REVERSAL';

export type LoyaltyLotStatus = 'ACTIVE' | 'FULLY_REDEEMED' | 'EXPIRED' | 'REVERSED';

export interface LoyaltySettingsDTO {
  id?: string;
  companyId: string;
  enabled: boolean;
  earningMethod: LoyaltyEarningMethod;
  eligibleAmount: number;
  pointsPerEligibleAmount: number;
  redemptionValue: number;
  minimumRedemptionPoints: number;
  maximumRedemptionPercentage: number;
  minimumBillAmount: number;
  minimumRedemptionIncrement: number;
  pointExpiryDays: number;
  allowEarningOnDiscountedBills: boolean;
  allowEarningOnBillsWithRedemption: boolean;
  allowEarningOnTax: boolean;
  allowEarningOnAdditionalCharges: boolean;
  negativeBalancePolicy: LoyaltyNegativeBalancePolicy;
  termsAndConditions?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LoyaltySettingsUpdateDTO {
  enabled?: boolean;
  earningMethod?: LoyaltyEarningMethod;
  eligibleAmount?: number;
  pointsPerEligibleAmount?: number;
  redemptionValue?: number;
  minimumRedemptionPoints?: number;
  maximumRedemptionPercentage?: number;
  minimumBillAmount?: number;
  minimumRedemptionIncrement?: number;
  pointExpiryDays?: number;
  allowEarningOnDiscountedBills?: boolean;
  allowEarningOnBillsWithRedemption?: boolean;
  allowEarningOnTax?: boolean;
  allowEarningOnAdditionalCharges?: boolean;
  negativeBalancePolicy?: LoyaltyNegativeBalancePolicy;
  termsAndConditions?: string | null;
}

export interface CustomerWalletDTO extends BaseEntity {
  companyId: string;
  customerId: string;
  cachedAvailablePoints: number;
  cachedLifetimeEarned: number;
  cachedLifetimeRedeemed: number;
  cachedLifetimeExpired: number;
  cachedLifetimeReversed: number;
  status: LoyaltyWalletStatus;
  customer?: Customer | null;
}

export interface LoyaltyTransactionDTO {
  id: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  companyId: string;
  customerId: string;
  walletId: string;
  transactionType: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  salesInvoiceId?: string | null;
  salesReturnId?: string | null;
  invoiceNumberSnapshot?: string | null;
  description?: string | null;
  reason?: string | null;
  idempotencyKey?: string | null;
  reversalOfTransactionId?: string | null;
  createdBy?: string | null;
  customer?: Customer | null;
  salesInvoice?: { id: string; invoiceNumber: string } | null;
}

export interface LoyaltyPointLotDTO extends BaseEntity {
  companyId: string;
  customerId: string;
  walletId: string;
  sourceTransactionId: string;
  originalPoints: number;
  remainingPoints: number;
  earnedAt: Date | string;
  expiresAt?: Date | string | null;
  status: LoyaltyLotStatus;
}

export interface LoyaltyTransactionFilterDTO {
  customerId?: string;
  transactionType?: LoyaltyTransactionType | 'ALL';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface LoyaltyRedemptionValidationInputDTO {
  customerId: string;
  billSubtotal: number;
  requestedPoints: number;
}

export interface LoyaltyRedemptionValidationResultDTO {
  isValid: boolean;
  availablePoints: number;
  maxRedeemablePoints: number;
  pointsToRedeem: number;
  redemptionValue: number;
  discountAmount: number;
  remainingPoints: number;
  message?: string;
}

export interface ManualPointsAdjustmentDTO {
  customerId: string;
  adjustmentType: 'CREDIT' | 'DEBIT';
  points: number;
  reason: string;
}

export interface LoyaltyKPIsDTO {
  totalEnrolledCustomers: number;
  totalActivePoints: number;
  estimatedLiabilityAmount: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  lifetimePointsExpired: number;
  redemptionRate: number;
}

export interface LoyaltyReportFilterDTO {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  transactionType?: LoyaltyTransactionType | 'ALL';
  page?: number;
  pageSize?: number;
}



