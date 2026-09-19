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
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_GET_MATRIX: 'roles:get-matrix',
  ROLES_UPDATE_PERMISSIONS: 'roles:update-permissions',
  PERMISSIONS_LIST_ALL: 'permissions:list-all',

  // Settings & Audits
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_RESET_DEFAULTS: 'settings:reset-defaults',
  AUDIT_GET_LOGS: 'audit:get-logs',

  // Step 9: Database Backup & Restore
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',
  BACKUP_CHOOSE_DIRECTORY: 'backup:choose-directory',
  BACKUP_CHOOSE_FILE: 'backup:choose-file',

  // Step 9: System & Hardware
  SYSTEM_GET_INFO_DETAILED: 'system:get-info-detailed',
  SYSTEM_GET_LOGS: 'system:get-logs',
  SYSTEM_GET_LOGS_PATH: 'system:get-logs-path',
  SYSTEM_OPEN_LOGS_FOLDER: 'system:open-logs-folder',
  PRINTER_LIST_AVAILABLE: 'printer:list-available',
  PRINTER_TEST_PRINT: 'printer:test-print',

  // Step 10: Licensing & Activation
  LICENSE_GET_STATUS: 'license:get-status',
  LICENSE_GENERATE_REQUEST: 'license:generate-request',
  LICENSE_EXPORT_REQUEST: 'license:export-request',
  LICENSE_IMPORT_FILE: 'license:import-file',
  LICENSE_ACTIVATE_KEY: 'license:activate-key',
  LICENSE_DEACTIVATE: 'license:deactivate',
  LICENSE_CHOOSE_FILE: 'license:choose-file',

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

  // Step 6: Customers
  CUSTOMERS_LIST: 'customers:list',
  CUSTOMERS_GET: 'customers:get',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_TOGGLE_ACTIVE: 'customers:toggle-active',
  CUSTOMERS_GENERATE_CODE: 'customers:generate-code',
  CUSTOMERS_GET_LEDGER: 'customers:get-ledger',
  CUSTOMERS_GET_STATEMENT: 'customers:get-statement',

  // Step 6: Sales Invoices
  SALES_LIST: 'sales:list',
  SALES_GET: 'sales:get',
  SALES_CREATE_DRAFT: 'sales:create-draft',
  SALES_UPDATE_DRAFT: 'sales:update-draft',
  SALES_CANCEL_DRAFT: 'sales:cancel-draft',
  SALES_POST: 'sales:post',
  SALES_CALCULATE: 'sales:calculate',
  SALES_GET_SUMMARY: 'sales:get-summary',
  SALES_GET_KPIS: 'sales:get-kpis',
  SALES_SEARCH_PRODUCTS: 'sales:search-products',

  // Step 6: Sales Payments
  SALES_PAYMENTS_LIST: 'sales-payments:list',
  SALES_PAYMENTS_CREATE: 'sales-payments:create',
  SALES_PAYMENTS_REVERSE: 'sales-payments:reverse',

  // Step 6: Sales Returns
  SALES_RETURNS_LIST: 'sales-returns:list',
  SALES_RETURNS_GET: 'sales-returns:get',
  SALES_RETURNS_CREATE: 'sales-returns:create',

  // Step 7: Expense Categories
  EXPENSE_CATEGORIES_LIST: 'expense-categories:list',
  EXPENSE_CATEGORIES_CREATE: 'expense-categories:create',
  EXPENSE_CATEGORIES_UPDATE: 'expense-categories:update',
  EXPENSE_CATEGORIES_DELETE: 'expense-categories:delete',
  EXPENSE_CATEGORIES_SEED_DEFAULTS: 'expense-categories:seed-defaults',

  // Step 7: Expenses
  EXPENSES_LIST: 'expenses:list',
  EXPENSES_GET: 'expenses:get',
  EXPENSES_CREATE_DRAFT: 'expenses:create-draft',
  EXPENSES_UPDATE_DRAFT: 'expenses:update-draft',
  EXPENSES_POST: 'expenses:post',
  EXPENSES_CANCEL: 'expenses:cancel',

  // Step 7: Cash Registers & Sessions
  CASH_REGISTERS_LIST: 'cash-registers:list',
  CASH_REGISTERS_CREATE: 'cash-registers:create',
  CASH_REGISTERS_UPDATE: 'cash-registers:update',
  CASH_REGISTERS_GET_ACTIVE_SESSION: 'cash-registers:get-active-session',
  CASH_REGISTERS_OPEN_SESSION: 'cash-registers:open-session',
  CASH_REGISTERS_RECORD_CASH_IN: 'cash-registers:record-cash-in',
  CASH_REGISTERS_RECORD_CASH_OUT: 'cash-registers:record-cash-out',
  CASH_REGISTERS_GET_SESSION_SUMMARY: 'cash-registers:get-session-summary',
  CASH_REGISTERS_REOPEN_SESSION: 'cash-registers:reopen-session',

  // Step 7: Cashbook
  CASHBOOK_GET_ENTRIES: 'cashbook:get-entries',
  CASHBOOK_GET_SUMMARY: 'cashbook:get-summary',

  // Step 7: Day-End Closing
  DAY_END_CLOSING_PREVIEW: 'day-end-closing:preview',
  DAY_END_CLOSING_CLOSE: 'day-end-closing:close',
  DAY_END_CLOSING_GET: 'day-end-closing:get',
  DAY_END_CLOSING_LIST: 'day-end-closing:list',

  // Step 7: Financial Dashboard
  FINANCIAL_DASHBOARD_KPIS: 'financial:dashboard-kpis',

  // Step 8: Business Reports & Analytics
  REPORTS_GET_DASHBOARD_KPIS: 'reports:get-dashboard-kpis',
  REPORTS_GET_CHARTS_DATA: 'reports:get-charts-data',
  REPORTS_GET_SALES_SUMMARY: 'reports:get-sales-summary',
  REPORTS_GET_SALES_INVOICE_LIST: 'reports:get-sales-invoice-list',
  REPORTS_GET_PRODUCT_SALES: 'reports:get-product-sales',
  REPORTS_GET_CATEGORY_SALES: 'reports:get-category-sales',
  REPORTS_GET_CUSTOMER_SALES: 'reports:get-customer-sales',
  REPORTS_GET_PAYMENT_COLLECTIONS: 'reports:get-payment-collections',
  REPORTS_GET_PURCHASE_SUMMARY: 'reports:get-purchase-summary',
  REPORTS_GET_PURCHASE_INVOICE_LIST: 'reports:get-purchase-invoice-list',
  REPORTS_GET_PRODUCT_PURCHASES: 'reports:get-product-purchases',
  REPORTS_GET_SUPPLIER_REPORT: 'reports:get-supplier-report',
  REPORTS_GET_CURRENT_STOCK: 'reports:get-current-stock',
  REPORTS_GET_LOW_STOCK: 'reports:get-low-stock',
  REPORTS_GET_OUT_OF_STOCK: 'reports:get-out-of-stock',
  REPORTS_GET_STOCK_MOVEMENTS: 'reports:get-stock-movements',
  REPORTS_GET_INVENTORY_VALUATION: 'reports:get-inventory-valuation',
  REPORTS_GET_STOCK_ADJUSTMENTS: 'reports:get-stock-adjustments',
  REPORTS_GET_PROFIT_LOSS: 'reports:get-profit-loss',
  REPORTS_GET_CUSTOMER_OUTSTANDING: 'reports:get-customer-outstanding',
  REPORTS_GET_SUPPLIER_OUTSTANDING: 'reports:get-supplier-outstanding',
  REPORTS_GET_EXPENSE_SUMMARY: 'reports:get-expense-summary',
  REPORTS_GET_CASHBOOK: 'reports:get-cashbook',
  REPORTS_GET_REGISTER_CLOSINGS: 'reports:get-register-closings',
  REPORTS_GET_TAX_SUMMARY: 'reports:get-tax-summary',
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

  // Step 6: Customers
  listCustomers: (filters?: import('./domain.js').CustomerFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').Customer>>>;
  getCustomer: (id: string) => Promise<ApiResponse<import('./domain.js').Customer | null>>;
  createCustomer: (dto: import('./domain.js').CustomerCreateDTO) => Promise<ApiResponse<import('./domain.js').Customer>>;
  updateCustomer: (id: string, dto: import('./domain.js').CustomerUpdateDTO) => Promise<ApiResponse<import('./domain.js').Customer>>;
  toggleCustomerActive: (id: string) => Promise<ApiResponse<import('./domain.js').Customer>>;
  generateCustomerCode: () => Promise<ApiResponse<string>>;
  getCustomerLedger: (filters: import('./domain.js').CustomerLedgerFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').CustomerLedgerEntry>>>;
  getCustomerStatement: (customerId: string, startDate?: string, endDate?: string) => Promise<ApiResponse<import('./domain.js').CustomerStatementDTO>>;

  // Step 6: Sales Invoices
  listSales: (filters?: import('./domain.js').SalesFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').SalesInvoice>>>;
  getSale: (id: string) => Promise<ApiResponse<import('./domain.js').SalesInvoice | null>>;
  createSalesDraft: (dto: import('./domain.js').SalesInvoiceCreateDTO) => Promise<ApiResponse<import('./domain.js').SalesInvoice>>;
  updateSalesDraft: (id: string, dto: import('./domain.js').SalesInvoiceUpdateDTO) => Promise<ApiResponse<import('./domain.js').SalesInvoice>>;
  cancelSalesDraft: (id: string, reason?: string) => Promise<ApiResponse<import('./domain.js').SalesInvoice>>;
  postSale: (id: string, dto: import('./domain.js').SalesPostDTO) => Promise<ApiResponse<import('./domain.js').SalesInvoice>>;
  calculateSales: (input: import('./domain.js').SalesCalculationInput) => Promise<ApiResponse<import('./domain.js').SalesCalculationResult>>;
  getSalesSummary: () => Promise<ApiResponse<import('./domain.js').SalesSummaryDTO>>;
  getSalesKPIs: () => Promise<ApiResponse<import('./domain.js').SalesDashboardKPIs>>;
  searchPOSProducts: (filters: import('./domain.js').POSProductSearchFilterDTO) => Promise<ApiResponse<import('./domain.js').POSProductSearchResult[]>>;

  // Step 6: Sales Payments
  listSalesPayments: (filters?: import('./domain.js').SalesPaymentFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').SalesPayment>>>;
  createSalesPayment: (dto: import('./domain.js').SalesPaymentCreateDTO) => Promise<ApiResponse<import('./domain.js').SalesPayment>>;
  reverseSalesPayment: (paymentId: string, reason: string) => Promise<ApiResponse<import('./domain.js').SalesPayment>>;

  // Step 6: Sales Returns
  listSalesReturns: (filters?: import('./domain.js').SalesReturnFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').SalesReturn>>>;
  getSalesReturn: (id: string) => Promise<ApiResponse<import('./domain.js').SalesReturn | null>>;
  createSalesReturn: (dto: import('./domain.js').SalesReturnCreateDTO) => Promise<ApiResponse<import('./domain.js').SalesReturn>>;

  // Step 7: Expense Categories
  listExpenseCategories: (includeInactive?: boolean) => Promise<ApiResponse<import('./domain.js').ExpenseCategory[]>>;
  createExpenseCategory: (dto: import('./domain.js').ExpenseCategoryCreateDTO) => Promise<ApiResponse<import('./domain.js').ExpenseCategory>>;
  updateExpenseCategory: (id: string, dto: import('./domain.js').ExpenseCategoryUpdateDTO) => Promise<ApiResponse<import('./domain.js').ExpenseCategory>>;
  deleteExpenseCategory: (id: string) => Promise<ApiResponse<boolean>>;
  seedDefaultExpenseCategories: () => Promise<ApiResponse<number>>;

  // Step 7: Expenses
  listExpenses: (filters?: import('./domain.js').ExpenseFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').Expense>>>;
  getExpense: (id: string) => Promise<ApiResponse<import('./domain.js').Expense | null>>;
  createExpenseDraft: (dto: import('./domain.js').ExpenseCreateDTO) => Promise<ApiResponse<import('./domain.js').Expense>>;
  updateExpenseDraft: (id: string, dto: import('./domain.js').ExpenseUpdateDTO) => Promise<ApiResponse<import('./domain.js').Expense>>;
  postExpense: (id: string) => Promise<ApiResponse<import('./domain.js').Expense>>;
  cancelExpenseDraft: (id: string) => Promise<ApiResponse<import('./domain.js').Expense>>;

  // Step 7: Cash Registers & Sessions
  listCashRegisters: () => Promise<ApiResponse<import('./domain.js').CashRegister[]>>;
  createCashRegister: (dto: import('./domain.js').CashRegisterCreateDTO) => Promise<ApiResponse<import('./domain.js').CashRegister>>;
  updateCashRegister: (id: string, dto: import('./domain.js').CashRegisterUpdateDTO) => Promise<ApiResponse<import('./domain.js').CashRegister>>;
  getActiveCashRegisterSession: (cashRegisterId?: string) => Promise<ApiResponse<import('./domain.js').CashRegisterSession | null>>;
  openCashRegisterSession: (dto: import('./domain.js').CashRegisterOpenSessionDTO) => Promise<ApiResponse<import('./domain.js').CashRegisterSession>>;
  recordCashIn: (dto: import('./domain.js').CashInOutDTO) => Promise<ApiResponse<import('./domain.js').CashMovement>>;
  recordCashOut: (dto: import('./domain.js').CashInOutDTO) => Promise<ApiResponse<import('./domain.js').CashMovement>>;
  getSessionSummary: (sessionId?: string) => Promise<ApiResponse<import('./domain.js').DayEndClosingPreview>>;
  reopenCashRegisterSession: (sessionId: string, reason: string) => Promise<ApiResponse<import('./domain.js').CashRegisterSession>>;

  // Step 7: Cashbook
  getCashbookEntries: (filters?: import('./domain.js').CashbookFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').CashbookEntry>>>;
  getCashbookSummary: (filters?: import('./domain.js').CashbookFilterDTO) => Promise<ApiResponse<import('./domain.js').CashbookSummary>>;

  // Step 7: Day-End Closing
  previewDayEndClosing: (sessionId?: string) => Promise<ApiResponse<import('./domain.js').DayEndClosingPreview>>;
  closeDayEndSession: (dto: import('./domain.js').CashRegisterCloseSessionDTO) => Promise<ApiResponse<import('./domain.js').DayEndClosing>>;
  getDayEndClosing: (id: string) => Promise<ApiResponse<import('./domain.js').DayEndClosing | null>>;
  listDayEndClosings: (filters?: import('./domain.js').DayEndClosingFilterDTO) => Promise<ApiResponse<PaginatedResult<import('./domain.js').DayEndClosing>>>;

  // Step 7: Financial Dashboard
  getFinancialDashboardKPIs: () => Promise<ApiResponse<import('./domain.js').FinancialDashboardKPIs>>;

  // Step 8: Business Reports & Analytics
  getReportDashboardKPIs: (filters?: import('./domain.js').DateRangeFilter) => Promise<ApiResponse<import('./domain.js').BusinessDashboardKPIs>>;
  getReportChartsData: (filters?: import('./domain.js').DateRangeFilter) => Promise<ApiResponse<import('./domain.js').DashboardChartsData>>;
  getSalesReportSummary: (filters?: import('./domain.js').SalesReportFilters) => Promise<ApiResponse<import('./domain.js').SalesReportSummary>>;
  getSalesInvoiceReportList: (filters?: import('./domain.js').SalesReportFilters) => Promise<ApiResponse<PaginatedResult<import('./domain.js').SalesInvoiceReportRow>>>;
  getProductSalesReport: (filters?: import('./domain.js').SalesReportFilters) => Promise<ApiResponse<import('./domain.js').ProductSalesReportRow[]>>;
  getCategorySalesReport: (filters?: import('./domain.js').SalesReportFilters) => Promise<ApiResponse<import('./domain.js').CategorySalesReportRow[]>>;
  getCustomerSalesReport: (filters?: import('./domain.js').SalesReportFilters) => Promise<ApiResponse<import('./domain.js').CustomerSalesReportRow[]>>;
  getPaymentCollectionReport: (filters?: import('./domain.js').SalesReportFilters) => Promise<ApiResponse<PaginatedResult<import('./domain.js').PaymentCollectionRow>>>;
  getPurchaseReportSummary: (filters?: import('./domain.js').PurchaseReportFilters) => Promise<ApiResponse<import('./domain.js').PurchaseReportSummary>>;
  getPurchaseInvoiceReportList: (filters?: import('./domain.js').PurchaseReportFilters) => Promise<ApiResponse<PaginatedResult<import('./domain.js').PurchaseInvoiceReportRow>>>;
  getProductPurchaseReport: (filters?: import('./domain.js').PurchaseReportFilters) => Promise<ApiResponse<import('./domain.js').ProductPurchaseReportRow[]>>;
  getSupplierReport: (filters?: import('./domain.js').PurchaseReportFilters) => Promise<ApiResponse<import('./domain.js').SupplierReportRow[]>>;
  getInventoryCurrentStockReport: (filters?: import('./domain.js').InventoryReportFilters) => Promise<ApiResponse<PaginatedResult<import('./domain.js').InventoryCurrentStockRow>>>;
  getLowStockReport: (filters?: import('./domain.js').InventoryReportFilters) => Promise<ApiResponse<import('./domain.js').LowStockReportRow[]>>;
  getOutOfStockReport: (filters?: import('./domain.js').InventoryReportFilters) => Promise<ApiResponse<import('./domain.js').OutOfStockReportRow[]>>;
  getStockMovementsReport: (filters?: import('./domain.js').InventoryReportFilters) => Promise<ApiResponse<PaginatedResult<import('./domain.js').StockMovementReportRow>>>;
  getInventoryValuationReport: (filters?: import('./domain.js').InventoryReportFilters) => Promise<ApiResponse<import('./domain.js').InventoryValuationSummary>>;
  getStockAdjustmentsReport: (filters?: import('./domain.js').InventoryReportFilters) => Promise<ApiResponse<import('./domain.js').StockAdjustmentReportRow[]>>;
  getProfitLossReport: (filters?: import('./domain.js').DateRangeFilter) => Promise<ApiResponse<import('./domain.js').ProfitLossReport>>;
  getCustomerOutstandingReport: (filters?: import('./domain.js').OutstandingReportFilters) => Promise<ApiResponse<import('./domain.js').CustomerOutstandingRow[]>>;
  getSupplierOutstandingReport: (filters?: import('./domain.js').OutstandingReportFilters) => Promise<ApiResponse<import('./domain.js').SupplierOutstandingRow[]>>;
  getExpenseSummaryReport: (filters?: import('./domain.js').ExpenseReportFilters) => Promise<ApiResponse<import('./domain.js').ExpenseSummaryReport>>;
  getCashbookReport: (filters?: import('./domain.js').DateRangeFilter) => Promise<ApiResponse<import('./domain.js').CashbookReportSummary>>;
  getRegisterClosingReport: (filters?: import('./domain.js').DateRangeFilter) => Promise<ApiResponse<import('./domain.js').RegisterClosingReportRow[]>>;
  getTaxSummaryReport: (filters?: import('./domain.js').TaxReportFilters) => Promise<ApiResponse<import('./domain.js').TaxSummaryReport>>;

  // Step 9: Roles & Permissions
  createRole: (dto: import('./domain.js').RoleCreateDTO) => Promise<ApiResponse<import('./domain.js').Role>>;
  updateRole: (id: string, dto: import('./domain.js').RoleUpdateDTO) => Promise<ApiResponse<import('./domain.js').Role>>;
  deleteRole: (id: string) => Promise<ApiResponse<{ message: string }>>;
  getRolesMatrix: () => Promise<ApiResponse<import('./domain.js').RoleWithPermissionsDTO[]>>;
  updateRolePermissions: (roleId: string, permissionCodes: string[]) => Promise<ApiResponse<{ message: string }>>;
  listAllPermissions: () => Promise<ApiResponse<import('./domain.js').PermissionDefinition[]>>;

  // Step 9: Settings management
  resetDefaultSettings: () => Promise<ApiResponse<Record<string, string>>>;

  // Step 9: Backup & Restore
  createBackup: (destinationDir?: string) => Promise<ApiResponse<import('./domain.js').BackupCreateResult>>;
  restoreBackup: (filePath: string) => Promise<ApiResponse<import('./domain.js').RestoreResult>>;
  listBackups: () => Promise<ApiResponse<import('./domain.js').BackupFileInfo[]>>;
  chooseBackupDirectory: () => Promise<ApiResponse<string | null>>;
  chooseBackupFile: () => Promise<ApiResponse<string | null>>;

  // Step 9: System & Hardware
  getSystemInfoDetailed: () => Promise<ApiResponse<import('./domain.js').SystemInfoDTO>>;
  getLogsPath: () => Promise<ApiResponse<string>>;
  openLogsFolder: () => Promise<ApiResponse<boolean>>;
  listAvailablePrinters: () => Promise<ApiResponse<string[]>>;
  testPrint: (printerName?: string, format?: string) => Promise<ApiResponse<{ success: boolean; message: string }>>;

  // Step 10: Licensing & Activation
  getLicenseStatus: () => Promise<ApiResponse<import('./license.js').LicenseStatusDTO>>;
  generateActivationRequest: (customerName?: string) => Promise<ApiResponse<import('./license.js').ActivationRequestDTO>>;
  exportActivationRequest: (customerName?: string, targetPath?: string) => Promise<ApiResponse<{ filePath: string; fileName: string }>>;
  importLicenseFile: (filePath?: string) => Promise<ApiResponse<import('./license.js').LicenseStatusDTO>>;
  activateLicenseContent: (licenseFileContent: string) => Promise<ApiResponse<import('./license.js').LicenseStatusDTO>>;
  deactivateLicense: () => Promise<ApiResponse<{ success: boolean; message: string }>>;
  chooseLicenseFile: () => Promise<ApiResponse<string | null>>;
}

declare global {
  interface Window {
    rsInventory: RsInventoryApi;
  }
}


