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

export interface Customer extends BaseEntity {
  companyId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
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



