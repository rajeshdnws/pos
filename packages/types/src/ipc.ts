import { ApiResponse, LogLevel } from './common.js';
import { AppConfig } from './config.js';
import {
  AuditLog,
  Brand,
  BrandCreateDTO,
  BrandUpdateDTO,
  Category,
  CategoryCreateDTO,
  CategoryUpdateDTO,
  ChangePasswordDTO,
  Company,
  CompanySetupDTO,
  CurrentStockFilterDTO,
  CurrentStockItem,
  DemoDataClearResult,
  DemoDataInstallResult,
  DemoDataStatus,
  InventoryKPIs,
  InventoryLocation,
  InventoryValuationReport,
  LocationCreateDTO,
  LocationUpdateDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  PaginatedResult,
  Product,
  ProductCreateDTO,
  ProductFilterDTO,
  ProductPriceHistory,
  ProductUpdateDTO,
  ResetPasswordDTO,
  Role,
  Setting,
  StockAdjustment,
  StockAdjustmentCreateDTO,
  StockMovement,
  StockMovementFilterDTO,
  StockReconciliationReport,
  Stocktake,
  StocktakeCreateDTO,
  StocktakeUpdateDTO,
  StockTransfer,
  StockTransferCreateDTO,
  Unit,
  UnitCreateDTO,
  UnitUpdateDTO,
  User,
  UserCreateDTO,
  UserUpdateDTO,
} from './domain.js';
import { DatabaseHealth, SystemInfo } from './system.js';

export const IPC_CHANNELS = {
  APP_GET_CONFIG: 'app:get-config',
  SYSTEM_GET_INFO: 'system:get-info',
  DATABASE_HEALTH_CHECK: 'database:health-check',
  LOGGER_LOG: 'logger:log',
  WINDOW_CONTROL: 'window:control',

  // Authentication & Session
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_CURRENT_USER: 'auth:get-current-user',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',

  // Company Setup & Profile
  COMPANY_CHECK_SETUP: 'company:check-setup',
  COMPANY_GET: 'company:get',
  COMPANY_SETUP: 'company:setup',
  COMPANY_UPDATE: 'company:update',
  COMPANY_SELECT_LOGO: 'company:select-logo',

  // Users & Roles
  USERS_LIST: 'users:list',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_TOGGLE_ACTIVE: 'users:toggle-active',
  USERS_RESET_PASSWORD: 'users:reset-password',
  ROLES_GET_ALL: 'roles:get-all',

  // Settings & Audits
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_UPDATE: 'settings:update',
  AUDIT_GET_LOGS: 'audit:get-logs',

  // Categories
  CATEGORIES_LIST: 'categories:list',
  CATEGORIES_GET: 'categories:get',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_UPDATE: 'categories:update',
  CATEGORIES_TOGGLE_ACTIVE: 'categories:toggle-active',

  // Units
  UNITS_LIST: 'units:list',
  UNITS_GET: 'units:get',
  UNITS_CREATE: 'units:create',
  UNITS_UPDATE: 'units:update',
  UNITS_TOGGLE_ACTIVE: 'units:toggle-active',
  UNITS_SEED_DEFAULTS: 'units:seed-defaults',

  // Brands
  BRANDS_LIST: 'brands:list',
  BRANDS_GET: 'brands:get',
  BRANDS_CREATE: 'brands:create',
  BRANDS_UPDATE: 'brands:update',
  BRANDS_TOGGLE_ACTIVE: 'brands:toggle-active',

  // Products
  PRODUCTS_LIST: 'products:list',
  PRODUCTS_GET: 'products:get',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_TOGGLE_ACTIVE: 'products:toggle-active',
  PRODUCTS_SEARCH: 'products:search',
  PRODUCTS_BY_BARCODE: 'products:by-barcode',
  PRODUCTS_BY_SKU: 'products:by-sku',
  PRODUCTS_GENERATE_SKU: 'products:generate-sku',
  PRODUCTS_GET_PRICE_HISTORY: 'products:get-price-history',

  // Locations
  LOCATIONS_LIST: 'locations:list',
  LOCATIONS_GET: 'locations:get',
  LOCATIONS_CREATE: 'locations:create',
  LOCATIONS_UPDATE: 'locations:update',
  LOCATIONS_TOGGLE_ACTIVE: 'locations:toggle-active',
  LOCATIONS_GET_DEFAULT: 'locations:get-default',

  // Inventory & Stock
  STOCK_GET_CURRENT: 'stock:get-current',
  STOCK_GET_MOVEMENTS: 'stock:get-movements',
  STOCK_GET_PRODUCT_SUMMARY: 'stock:get-product-summary',
  STOCK_GET_VALUATION: 'stock:get-valuation',
  STOCK_GET_KPIS: 'stock:get-kpis',
  STOCK_RECONCILE: 'stock:reconcile',
  STOCK_REPAIR_DISCREPANCIES: 'stock:repair-discrepancies',

  // Stock Adjustments
  ADJUSTMENTS_LIST: 'adjustments:list',
  ADJUSTMENTS_GET: 'adjustments:get',
  ADJUSTMENTS_CREATE: 'adjustments:create',

  // Stocktakes
  STOCKTAKES_LIST: 'stocktakes:list',
  STOCKTAKES_GET: 'stocktakes:get',
  STOCKTAKES_CREATE: 'stocktakes:create',
  STOCKTAKES_UPDATE: 'stocktakes:update',
  STOCKTAKES_START: 'stocktakes:start',
  STOCKTAKES_COMPLETE: 'stocktakes:complete',
  STOCKTAKES_CANCEL: 'stocktakes:cancel',

  // Stock Transfers
  TRANSFERS_LIST: 'transfers:list',
  TRANSFERS_GET: 'transfers:get',
  TRANSFERS_CREATE: 'transfers:create',
  TRANSFERS_CANCEL: 'transfers:cancel',

  // Demo Data Management
  DEMO_DATA_STATUS: 'demo:status',
  DEMO_DATA_INSTALL: 'demo:install',
  DEMO_DATA_CLEAR: 'demo:clear',

  // Step 5: Suppliers
  SUPPLIERS_LIST: 'suppliers:list',
  SUPPLIERS_GET: 'suppliers:get',
  SUPPLIERS_CREATE: 'suppliers:create',
  SUPPLIERS_UPDATE: 'suppliers:update',
  SUPPLIERS_DELETE: 'suppliers:delete',
  SUPPLIERS_TOGGLE_ACTIVE: 'suppliers:toggle-active',
  SUPPLIERS_GENERATE_CODE: 'suppliers:generate-code',

  // Step 5: Purchases
  PURCHASES_LIST: 'purchases:list',
  PURCHASES_GET: 'purchases:get',
  PURCHASES_CREATE_DRAFT: 'purchases:create-draft',
  PURCHASES_UPDATE_DRAFT: 'purchases:update-draft',
  PURCHASES_POST: 'purchases:post',
  PURCHASES_CANCEL: 'purchases:cancel',
  PURCHASES_GET_SUMMARY: 'purchases:get-summary',
  PURCHASES_CALCULATE: 'purchases:calculate',
  PURCHASES_GET_KPIS: 'purchases:get-kpis',

  // Step 5: Purchase Payments
  PURCHASE_PAYMENTS_LIST: 'purchase-payments:list',
  PURCHASE_PAYMENTS_CREATE: 'purchase-payments:create',
  PURCHASE_PAYMENTS_REVERSE: 'purchase-payments:reverse',

  // Step 5: Purchase Returns
  PURCHASE_RETURNS_LIST: 'purchase-returns:list',
  PURCHASE_RETURNS_GET: 'purchase-returns:get',
  PURCHASE_RETURNS_CREATE: 'purchase-returns:create',

  // Step 5: Supplier Ledger
  SUPPLIER_LEDGER_GET_ENTRIES: 'supplier-ledger:get-entries',
  SUPPLIER_LEDGER_GET_STATEMENT: 'supplier-ledger:get-statement',
} as const;

export type WindowAction = 'minimize' | 'maximize' | 'close' | 'restart';

export interface RsInventoryApi {
  // Base App & System
  getAppConfig: () => Promise<ApiResponse<AppConfig>>;
  getSystemInfo: () => Promise<ApiResponse<SystemInfo>>;
  checkDatabaseHealth: () => Promise<ApiResponse<DatabaseHealth>>;
  logMessage: (level: LogLevel, message: string, meta?: unknown) => Promise<ApiResponse<void>>;
  windowControl: (action: WindowAction) => Promise<ApiResponse<void>>;

  // Auth
  login: (credentials: LoginRequestDTO) => Promise<ApiResponse<LoginResponseDTO>>;
  logout: () => Promise<ApiResponse<void>>;
  getCurrentUser: () => Promise<ApiResponse<LoginResponseDTO | null>>;
  changePassword: (dto: ChangePasswordDTO) => Promise<ApiResponse<void>>;

  // Company
  checkCompanySetup: () => Promise<ApiResponse<{ isSetup: boolean; company?: Company | null }>>;
  getCompany: () => Promise<ApiResponse<Company | null>>;
  setupCompany: (dto: CompanySetupDTO) => Promise<ApiResponse<LoginResponseDTO>>;
  updateCompany: (dto: Partial<Company>) => Promise<ApiResponse<Company>>;
  selectCompanyLogo: () => Promise<ApiResponse<string | null>>;

  // Users
  listUsers: () => Promise<ApiResponse<User[]>>;
  createUser: (dto: UserCreateDTO) => Promise<ApiResponse<User>>;
  updateUser: (id: string, dto: UserUpdateDTO) => Promise<ApiResponse<User>>;
  toggleUserActive: (id: string) => Promise<ApiResponse<User>>;
  resetUserPassword: (dto: ResetPasswordDTO) => Promise<ApiResponse<void>>;
  getRoles: () => Promise<ApiResponse<Role[]>>;

  // Settings & Audits
  getSettings: () => Promise<ApiResponse<Record<string, string>>>;
  updateSettings: (settingsMap: Record<string, string>) => Promise<ApiResponse<Setting[]>>;
  getAuditLogs: (limit?: number) => Promise<ApiResponse<AuditLog[]>>;

  // Categories
  listCategories: (includeInactive?: boolean) => Promise<ApiResponse<Category[]>>;
  getCategory: (id: string) => Promise<ApiResponse<Category | null>>;
  createCategory: (dto: CategoryCreateDTO) => Promise<ApiResponse<Category>>;
  updateCategory: (id: string, dto: CategoryUpdateDTO) => Promise<ApiResponse<Category>>;
  toggleCategoryActive: (id: string) => Promise<ApiResponse<Category>>;

  // Units
  listUnits: (includeInactive?: boolean) => Promise<ApiResponse<Unit[]>>;
  getUnit: (id: string) => Promise<ApiResponse<Unit | null>>;
  createUnit: (dto: UnitCreateDTO) => Promise<ApiResponse<Unit>>;
  updateUnit: (id: string, dto: UnitUpdateDTO) => Promise<ApiResponse<Unit>>;
  toggleUnitActive: (id: string) => Promise<ApiResponse<Unit>>;
  seedDefaultUnits: () => Promise<ApiResponse<Unit[]>>;

  // Brands
  listBrands: (includeInactive?: boolean) => Promise<ApiResponse<Brand[]>>;
  getBrand: (id: string) => Promise<ApiResponse<Brand | null>>;
  createBrand: (dto: BrandCreateDTO) => Promise<ApiResponse<Brand>>;
  updateBrand: (id: string, dto: BrandUpdateDTO) => Promise<ApiResponse<Brand>>;
  toggleBrandActive: (id: string) => Promise<ApiResponse<Brand>>;

  // Products
  listProducts: (filters?: ProductFilterDTO) => Promise<ApiResponse<PaginatedResult<Product>>>;
  getProduct: (id: string) => Promise<ApiResponse<Product | null>>;
  createProduct: (dto: ProductCreateDTO) => Promise<ApiResponse<Product>>;
  updateProduct: (id: string, dto: ProductUpdateDTO) => Promise<ApiResponse<Product>>;
  toggleProductActive: (id: string) => Promise<ApiResponse<Product>>;
  searchProducts: (query: string) => Promise<ApiResponse<Product[]>>;
  getProductByBarcode: (barcode: string) => Promise<ApiResponse<Product | null>>;
  getProductBySku: (sku: string) => Promise<ApiResponse<Product | null>>;
  generateProductSku: () => Promise<ApiResponse<string>>;
  getProductPriceHistory: (productId: string) => Promise<ApiResponse<ProductPriceHistory[]>>;

  // Locations
  listLocations: (includeInactive?: boolean) => Promise<ApiResponse<InventoryLocation[]>>;
  getLocation: (id: string) => Promise<ApiResponse<InventoryLocation | null>>;
  createLocation: (dto: LocationCreateDTO) => Promise<ApiResponse<InventoryLocation>>;
  updateLocation: (id: string, dto: LocationUpdateDTO) => Promise<ApiResponse<InventoryLocation>>;
  toggleLocationActive: (id: string) => Promise<ApiResponse<InventoryLocation>>;
  getDefaultLocation: () => Promise<ApiResponse<InventoryLocation>>;

  // Stock Management
  getCurrentStock: (filters?: CurrentStockFilterDTO) => Promise<ApiResponse<PaginatedResult<CurrentStockItem>>>;
  getStockMovements: (filters?: StockMovementFilterDTO) => Promise<ApiResponse<PaginatedResult<StockMovement>>>;
  getProductStockSummary: (productId: string) => Promise<ApiResponse<{ currentStock: number; valuation: number; balances: { locationId: string; locationName: string; quantity: number }[] }>>;
  getInventoryValuation: () => Promise<ApiResponse<InventoryValuationReport>>;
  getInventoryKPIs: () => Promise<ApiResponse<InventoryKPIs>>;
  reconcileStock: () => Promise<ApiResponse<StockReconciliationReport>>;
  repairStockDiscrepancies: () => Promise<ApiResponse<{ repairedCount: number }>>;

  // Stock Adjustments
  listStockAdjustments: (limit?: number) => Promise<ApiResponse<StockAdjustment[]>>;
  getStockAdjustment: (id: string) => Promise<ApiResponse<StockAdjustment | null>>;
  createStockAdjustment: (dto: StockAdjustmentCreateDTO) => Promise<ApiResponse<StockAdjustment>>;

  // Stocktakes
  listStocktakes: (limit?: number) => Promise<ApiResponse<Stocktake[]>>;
  getStocktake: (id: string) => Promise<ApiResponse<Stocktake | null>>;
  createStocktake: (dto: StocktakeCreateDTO) => Promise<ApiResponse<Stocktake>>;
  updateStocktake: (id: string, dto: StocktakeUpdateDTO) => Promise<ApiResponse<Stocktake>>;
  startStocktake: (id: string) => Promise<ApiResponse<Stocktake>>;
  completeStocktake: (id: string) => Promise<ApiResponse<Stocktake>>;
  cancelStocktake: (id: string) => Promise<ApiResponse<Stocktake>>;

  // Stock Transfers
  listStockTransfers: (limit?: number) => Promise<ApiResponse<StockTransfer[]>>;
  getStockTransfer: (id: string) => Promise<ApiResponse<StockTransfer | null>>;
  createStockTransfer: (dto: StockTransferCreateDTO) => Promise<ApiResponse<StockTransfer>>;
  cancelStockTransfer: (id: string) => Promise<ApiResponse<StockTransfer>>;

  // Demo Data Management
  getDemoDataStatus: () => Promise<ApiResponse<DemoDataStatus>>;
  installDemoData: () => Promise<ApiResponse<DemoDataInstallResult>>;
  clearDemoData: () => Promise<ApiResponse<DemoDataClearResult>>;

  // Step 5: Suppliers
  listSuppliers: (filters?: import('./domain.js').SupplierFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').Supplier>>>;
  getSupplier: (id: string) => Promise<ApiResponse<import('./domain.js').Supplier | null>>;
  createSupplier: (dto: import('./domain.js').SupplierCreateDTO) => Promise<ApiResponse<import('./domain.js').Supplier>>;
  updateSupplier: (id: string, dto: import('./domain.js').SupplierUpdateDTO) => Promise<ApiResponse<import('./domain.js').Supplier>>;
  deleteSupplier: (id: string) => Promise<ApiResponse<boolean>>;
  toggleSupplierActive: (id: string) => Promise<ApiResponse<import('./domain.js').Supplier>>;
  generateSupplierCode: () => Promise<ApiResponse<string>>;

  // Step 5: Purchases
  listPurchases: (filters?: import('./domain.js').PurchaseFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').Purchase>>>;
  getPurchase: (id: string) => Promise<ApiResponse<import('./domain.js').Purchase | null>>;
  createPurchaseDraft: (dto: import('./domain.js').PurchaseDraftCreateDTO | any) => Promise<ApiResponse<import('./domain.js').Purchase>>;
  updatePurchaseDraft: (id: string, dto: import('./domain.js').PurchaseDraftUpdateDTO | any) => Promise<ApiResponse<import('./domain.js').Purchase>>;
  postPurchase: (id: string) => Promise<ApiResponse<import('./domain.js').Purchase>>;
  cancelPurchase: (id: string, reason?: string) => Promise<ApiResponse<import('./domain.js').Purchase>>;
  getPurchaseSummary: () => Promise<ApiResponse<import('./domain.js').PurchaseSummaryDTO>>;
  calculatePurchase: (input: import('./domain.js').PurchaseCalculationInput | any) => Promise<ApiResponse<import('./domain.js').PurchaseCalculationResult>>;
  getPurchaseKPIs: () => Promise<ApiResponse<import('./domain.js').PurchaseDashboardKPIs>>;

  // Step 5: Purchase Payments
  listPurchasePayments: (filtersOrPurchaseId?: any) => Promise<ApiResponse<any>>;
  createPurchasePayment: (dto: import('./domain.js').PurchasePaymentCreateDTO | any) => Promise<ApiResponse<import('./domain.js').PurchasePayment>>;
  recordPurchasePayment: (dto: any) => Promise<ApiResponse<import('./domain.js').PurchasePayment>>;
  reversePurchasePayment: (paymentIdOrDto: any, reason?: string) => Promise<ApiResponse<import('./domain.js').PurchasePayment>>;

  // Step 5: Purchase Returns
  listPurchaseReturns: (filters?: import('./domain.js').PurchaseReturnFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').PurchaseReturn>>>;
  getPurchaseReturn: (id: string) => Promise<ApiResponse<import('./domain.js').PurchaseReturn | null>>;
  createPurchaseReturn: (dto: import('./domain.js').PurchaseReturnCreateDTO | any) => Promise<ApiResponse<import('./domain.js').PurchaseReturn>>;

  // Step 5: Supplier Ledger
  getSupplierLedgerEntries: (filters: import('./domain.js').SupplierLedgerFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').SupplierLedgerEntry>>>;
  getSupplierStatement: (supplierId: string, startDateOrOptions?: any, endDate?: string) => Promise<ApiResponse<import('./domain.js').SupplierStatementDTO>>;
}

declare global {
  interface Window {
    rsInventory: RsInventoryApi;
  }
}


