import {
  ApiResponse,
  AppConfig,
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
  DatabaseHealth,
  DemoDataClearResult,
  DemoDataInstallResult,
  DemoDataStatus,
  InventoryKPIs,
  InventoryLocation,
  InventoryValuationReport,
  IPC_CHANNELS,
  LocationCreateDTO,
  LocationUpdateDTO,
  LogLevel,
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
  RsInventoryApi,
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
  SystemInfo,
  Unit,
  UnitCreateDTO,
  UnitUpdateDTO,
  User,
  UserCreateDTO,
  UserUpdateDTO,
  WindowAction,
} from '@rs-inventory/types';
import { contextBridge, ipcRenderer } from 'electron';

const api: RsInventoryApi = {
  // Base App & System
  getAppConfig: async (): Promise<ApiResponse<AppConfig>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_CONFIG);
  },

  getSystemInfo: async (): Promise<ApiResponse<SystemInfo>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_INFO);
  },

  checkDatabaseHealth: async (): Promise<ApiResponse<DatabaseHealth>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DATABASE_HEALTH_CHECK);
  },

  logMessage: async (
    level: LogLevel,
    message: string,
    meta?: unknown,
  ): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOGGER_LOG, { level, message, meta });
  },

  windowControl: async (action: WindowAction): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CONTROL, action);
  },

  // Auth
  login: async (credentials: LoginRequestDTO): Promise<ApiResponse<LoginResponseDTO>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, credentials);
  },

  logout: async (): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT);
  },

  getCurrentUser: async (): Promise<ApiResponse<LoginResponseDTO | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_CURRENT_USER);
  },

  changePassword: async (dto: ChangePasswordDTO): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, dto);
  },

  // Company
  checkCompanySetup: async (): Promise<
    ApiResponse<{ isSetup: boolean; company?: Company | null }>
  > => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_CHECK_SETUP);
  },

  getCompany: async (): Promise<ApiResponse<Company | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_GET);
  },

  setupCompany: async (dto: CompanySetupDTO): Promise<ApiResponse<LoginResponseDTO>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_SETUP, dto);
  },

  updateCompany: async (dto: Partial<Company>): Promise<ApiResponse<Company>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_UPDATE, dto);
  },

  selectCompanyLogo: async (): Promise<ApiResponse<string | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COMPANY_SELECT_LOGO);
  },

  // Users
  listUsers: async (): Promise<ApiResponse<User[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_LIST);
  },

  createUser: async (dto: UserCreateDTO): Promise<ApiResponse<User>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_CREATE, dto);
  },

  updateUser: async (id: string, dto: UserUpdateDTO): Promise<ApiResponse<User>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_UPDATE, { id, dto });
  },

  toggleUserActive: async (id: string): Promise<ApiResponse<User>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_TOGGLE_ACTIVE, id);
  },

  resetUserPassword: async (dto: ResetPasswordDTO): Promise<ApiResponse<void>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.USERS_RESET_PASSWORD, dto);
  },

  getRoles: async (): Promise<ApiResponse<Role[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ROLES_GET_ALL);
  },

  // Settings & Audits
  getSettings: async (): Promise<ApiResponse<Record<string, string>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL);
  },

  updateSettings: async (settingsMap: Record<string, string>): Promise<ApiResponse<Setting[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settingsMap);
  },

  getAuditLogs: async (limit?: number): Promise<ApiResponse<AuditLog[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.AUDIT_GET_LOGS, limit);
  },

  // Categories
  listCategories: async (includeInactive?: boolean): Promise<ApiResponse<Category[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_LIST, includeInactive);
  },

  getCategory: async (id: string): Promise<ApiResponse<Category | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET, id);
  },

  createCategory: async (dto: CategoryCreateDTO): Promise<ApiResponse<Category>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, dto);
  },

  updateCategory: async (id: string, dto: CategoryUpdateDTO): Promise<ApiResponse<Category>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, { id, dto });
  },

  toggleCategoryActive: async (id: string): Promise<ApiResponse<Category>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_TOGGLE_ACTIVE, id);
  },

  // Units
  listUnits: async (includeInactive?: boolean): Promise<ApiResponse<Unit[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UNITS_LIST, includeInactive);
  },

  getUnit: async (id: string): Promise<ApiResponse<Unit | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UNITS_GET, id);
  },

  createUnit: async (dto: UnitCreateDTO): Promise<ApiResponse<Unit>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UNITS_CREATE, dto);
  },

  updateUnit: async (id: string, dto: UnitUpdateDTO): Promise<ApiResponse<Unit>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UNITS_UPDATE, { id, dto });
  },

  toggleUnitActive: async (id: string): Promise<ApiResponse<Unit>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UNITS_TOGGLE_ACTIVE, id);
  },

  seedDefaultUnits: async (): Promise<ApiResponse<Unit[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UNITS_SEED_DEFAULTS);
  },

  // Brands
  listBrands: async (includeInactive?: boolean): Promise<ApiResponse<Brand[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BRANDS_LIST, includeInactive);
  },

  getBrand: async (id: string): Promise<ApiResponse<Brand | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BRANDS_GET, id);
  },

  createBrand: async (dto: BrandCreateDTO): Promise<ApiResponse<Brand>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BRANDS_CREATE, dto);
  },

  updateBrand: async (id: string, dto: BrandUpdateDTO): Promise<ApiResponse<Brand>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BRANDS_UPDATE, { id, dto });
  },

  toggleBrandActive: async (id: string): Promise<ApiResponse<Brand>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BRANDS_TOGGLE_ACTIVE, id);
  },

  // Products
  listProducts: async (filters?: ProductFilterDTO): Promise<ApiResponse<PaginatedResult<Product>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_LIST, filters);
  },

  getProduct: async (id: string): Promise<ApiResponse<Product | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET, id);
  },

  createProduct: async (dto: ProductCreateDTO): Promise<ApiResponse<Product>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_CREATE, dto);
  },

  updateProduct: async (id: string, dto: ProductUpdateDTO): Promise<ApiResponse<Product>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_UPDATE, { id, dto });
  },

  toggleProductActive: async (id: string): Promise<ApiResponse<Product>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_TOGGLE_ACTIVE, id);
  },

  searchProducts: async (query: string): Promise<ApiResponse<Product[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_SEARCH, query);
  },

  getProductByBarcode: async (barcode: string): Promise<ApiResponse<Product | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_BY_BARCODE, barcode);
  },

  getProductBySku: async (sku: string): Promise<ApiResponse<Product | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_BY_SKU, sku);
  },

  generateProductSku: async (): Promise<ApiResponse<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GENERATE_SKU);
  },

  getProductPriceHistory: async (productId: string): Promise<ApiResponse<ProductPriceHistory[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET_PRICE_HISTORY, productId);
  },

  // Locations
  listLocations: async (includeInactive?: boolean): Promise<ApiResponse<InventoryLocation[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOCATIONS_LIST, includeInactive);
  },

  getLocation: async (id: string): Promise<ApiResponse<InventoryLocation | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOCATIONS_GET, id);
  },

  createLocation: async (dto: LocationCreateDTO): Promise<ApiResponse<InventoryLocation>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOCATIONS_CREATE, dto);
  },

  updateLocation: async (id: string, dto: LocationUpdateDTO): Promise<ApiResponse<InventoryLocation>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOCATIONS_UPDATE, { id, dto });
  },

  toggleLocationActive: async (id: string): Promise<ApiResponse<InventoryLocation>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOCATIONS_TOGGLE_ACTIVE, id);
  },

  getDefaultLocation: async (): Promise<ApiResponse<InventoryLocation>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOCATIONS_GET_DEFAULT);
  },

  // Stock Management
  getCurrentStock: async (filters?: CurrentStockFilterDTO): Promise<ApiResponse<PaginatedResult<CurrentStockItem>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_CURRENT, filters);
  },

  getStockMovements: async (filters?: StockMovementFilterDTO): Promise<ApiResponse<PaginatedResult<StockMovement>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_MOVEMENTS, filters);
  },

  getProductStockSummary: async (productId: string): Promise<ApiResponse<{ currentStock: number; valuation: number; balances: { locationId: string; locationName: string; quantity: number }[] }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_PRODUCT_SUMMARY, productId);
  },

  getInventoryValuation: async (): Promise<ApiResponse<InventoryValuationReport>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_VALUATION);
  },

  getInventoryKPIs: async (): Promise<ApiResponse<InventoryKPIs>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_KPIS);
  },

  reconcileStock: async (): Promise<ApiResponse<StockReconciliationReport>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCK_RECONCILE);
  },

  repairStockDiscrepancies: async (): Promise<ApiResponse<{ repairedCount: number }>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCK_REPAIR_DISCREPANCIES);
  },

  // Stock Adjustments
  listStockAdjustments: async (limit?: number): Promise<ApiResponse<StockAdjustment[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ADJUSTMENTS_LIST, limit);
  },

  getStockAdjustment: async (id: string): Promise<ApiResponse<StockAdjustment | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ADJUSTMENTS_GET, id);
  },

  createStockAdjustment: async (dto: StockAdjustmentCreateDTO): Promise<ApiResponse<StockAdjustment>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ADJUSTMENTS_CREATE, dto);
  },

  // Stocktakes
  listStocktakes: async (limit?: number): Promise<ApiResponse<Stocktake[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCKTAKES_LIST, limit);
  },

  getStocktake: async (id: string): Promise<ApiResponse<Stocktake | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCKTAKES_GET, id);
  },

  createStocktake: async (dto: StocktakeCreateDTO): Promise<ApiResponse<Stocktake>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCKTAKES_CREATE, dto);
  },

  updateStocktake: async (id: string, dto: StocktakeUpdateDTO): Promise<ApiResponse<Stocktake>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCKTAKES_UPDATE, { id, dto });
  },

  startStocktake: async (id: string): Promise<ApiResponse<Stocktake>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCKTAKES_START, id);
  },

  completeStocktake: async (id: string): Promise<ApiResponse<Stocktake>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCKTAKES_COMPLETE, id);
  },

  cancelStocktake: async (id: string): Promise<ApiResponse<Stocktake>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOCKTAKES_CANCEL, id);
  },

  // Stock Transfers
  listStockTransfers: async (limit?: number): Promise<ApiResponse<StockTransfer[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRANSFERS_LIST, limit);
  },

  getStockTransfer: async (id: string): Promise<ApiResponse<StockTransfer | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRANSFERS_GET, id);
  },

  createStockTransfer: async (dto: StockTransferCreateDTO): Promise<ApiResponse<StockTransfer>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRANSFERS_CREATE, dto);
  },

  cancelStockTransfer: async (id: string): Promise<ApiResponse<StockTransfer>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRANSFERS_CANCEL, id);
  },

  // Demo Data Management
  getDemoDataStatus: async (): Promise<ApiResponse<DemoDataStatus>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEMO_DATA_STATUS);
  },

  installDemoData: async (): Promise<ApiResponse<DemoDataInstallResult>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEMO_DATA_INSTALL);
  },

  clearDemoData: async (): Promise<ApiResponse<DemoDataClearResult>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEMO_DATA_CLEAR);
  },

  // Step 5: Suppliers
  listSuppliers: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS_LIST, filters);
  },

  getSupplier: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS_GET, id);
  },

  createSupplier: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS_CREATE, dto);
  },

  updateSupplier: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS_UPDATE, { id, dto });
  },

  deleteSupplier: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS_DELETE, id);
  },

  toggleSupplierActive: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS_TOGGLE_ACTIVE, id);
  },

  generateSupplierCode: async (): Promise<ApiResponse<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS_GENERATE_CODE);
  },

  // Step 5: Purchases
  listPurchases: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_LIST, filters);
  },

  getPurchase: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_GET, id);
  },

  createPurchaseDraft: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_CREATE_DRAFT, dto);
  },

  updatePurchaseDraft: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_UPDATE_DRAFT, { id, dto });
  },

  postPurchase: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_POST, id);
  },

  cancelPurchase: async (id: string, reason?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_CANCEL, { id, reason });
  },

  getPurchaseSummary: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_GET_SUMMARY);
  },

  calculatePurchase: async (input: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_CALCULATE, input);
  },

  getPurchaseKPIs: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASES_GET_KPIS);
  },

  // Step 5: Purchase Payments
  listPurchasePayments: async (filtersOrPurchaseId?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASE_PAYMENTS_LIST, filtersOrPurchaseId);
  },

  createPurchasePayment: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASE_PAYMENTS_CREATE, dto);
  },

  recordPurchasePayment: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASE_PAYMENTS_CREATE, dto);
  },

  reversePurchasePayment: async (paymentIdOrDto: any, reason?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASE_PAYMENTS_REVERSE, paymentIdOrDto, reason);
  },

  // Step 5: Purchase Returns
  listPurchaseReturns: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASE_RETURNS_LIST, filters);
  },

  getPurchaseReturn: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASE_RETURNS_GET, id);
  },

  createPurchaseReturn: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PURCHASE_RETURNS_CREATE, dto);
  },

  // Step 5: Supplier Ledger
  getSupplierLedgerEntries: async (filters: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIER_LEDGER_GET_ENTRIES, filters);
  },

  getSupplierStatement: async (supplierId: string, startDateOrOptions?: any, endDate?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SUPPLIER_LEDGER_GET_STATEMENT, supplierId, startDateOrOptions, endDate);
  },

  // Step 6: Customers
  listCustomers: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS_LIST, filters);
  },

  getCustomer: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS_GET, id);
  },

  createCustomer: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS_CREATE, dto);
  },

  updateCustomer: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS_UPDATE, { id, dto });
  },

  toggleCustomerActive: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS_TOGGLE_ACTIVE, id);
  },

  generateCustomerCode: async (): Promise<ApiResponse<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS_GENERATE_CODE);
  },

  getCustomerLedger: async (filters: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS_GET_LEDGER, filters);
  },

  getCustomerStatement: async (customerId: string, startDate?: string, endDate?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS_GET_STATEMENT, { customerId, startDate, endDate });
  },

  // Step 6: Sales Invoices
  listSales: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_LIST, filters);
  },

  getSale: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_GET, id);
  },

  createSalesDraft: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_CREATE_DRAFT, dto);
  },

  updateSalesDraft: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_UPDATE_DRAFT, { id, dto });
  },

  cancelSalesDraft: async (id: string, reason?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_CANCEL_DRAFT, { id, reason });
  },

  postSale: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_POST, { id, dto });
  },

  calculateSales: async (input: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_CALCULATE, input);
  },

  getSalesSummary: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_GET_SUMMARY);
  },

  getSalesKPIs: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_GET_KPIS);
  },

  searchPOSProducts: async (filters: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_SEARCH_PRODUCTS, filters);
  },

  // Step 6: Sales Payments
  listSalesPayments: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_PAYMENTS_LIST, filters);
  },

  createSalesPayment: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_PAYMENTS_CREATE, dto);
  },

  reverseSalesPayment: async (paymentId: string, reason: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_PAYMENTS_REVERSE, { paymentId, reason });
  },

  // Step 6: Sales Returns
  listSalesReturns: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_RETURNS_LIST, filters);
  },

  getSalesReturn: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_RETURNS_GET, id);
  },

  createSalesReturn: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SALES_RETURNS_CREATE, dto);
  },

  // Step 7: Expense Categories
  listExpenseCategories: async (includeInactive?: boolean): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CATEGORIES_LIST, includeInactive);
  },

  createExpenseCategory: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CATEGORIES_CREATE, dto);
  },

  updateExpenseCategory: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CATEGORIES_UPDATE, { id, dto });
  },

  deleteExpenseCategory: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CATEGORIES_DELETE, id);
  },

  seedDefaultExpenseCategories: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CATEGORIES_SEED_DEFAULTS);
  },

  // Step 7: Expenses
  listExpenses: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_LIST, filters);
  },

  getExpense: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_GET, id);
  },

  createExpenseDraft: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_CREATE_DRAFT, dto);
  },

  updateExpenseDraft: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_UPDATE_DRAFT, { id, dto });
  },

  postExpense: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_POST, id);
  },

  cancelExpenseDraft: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPENSES_CANCEL, id);
  },

  // Step 7: Cash Registers & Sessions
  listCashRegisters: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_LIST);
  },

  createCashRegister: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_CREATE, dto);
  },

  updateCashRegister: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_UPDATE, { id, dto });
  },

  getActiveCashRegisterSession: async (cashRegisterId?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_GET_ACTIVE_SESSION, cashRegisterId);
  },

  openCashRegisterSession: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_OPEN_SESSION, dto);
  },

  recordCashIn: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_RECORD_CASH_IN, dto);
  },

  recordCashOut: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_RECORD_CASH_OUT, dto);
  },

  getSessionSummary: async (sessionId?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_GET_SESSION_SUMMARY, sessionId);
  },

  reopenCashRegisterSession: async (sessionId: string, reason: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASH_REGISTERS_REOPEN_SESSION, { sessionId, reason });
  },

  // Step 7: Cashbook
  getCashbookEntries: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASHBOOK_GET_ENTRIES, filters);
  },

  getCashbookSummary: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CASHBOOK_GET_SUMMARY, filters);
  },

  // Step 7: Day-End Closing
  previewDayEndClosing: async (sessionId?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DAY_END_CLOSING_PREVIEW, sessionId);
  },

  closeDayEndSession: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DAY_END_CLOSING_CLOSE, dto);
  },

  getDayEndClosing: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DAY_END_CLOSING_GET, id);
  },

  listDayEndClosings: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DAY_END_CLOSING_LIST, filters);
  },

  // Step 7: Financial Dashboard
  getFinancialDashboardKPIs: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FINANCIAL_DASHBOARD_KPIS);
  },

  // Step 8: Business Reports & Analytics
  getReportDashboardKPIs: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_DASHBOARD_KPIS, filters);
  },

  getReportChartsData: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_CHARTS_DATA, filters);
  },

  getSalesReportSummary: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_SALES_SUMMARY, filters);
  },

  getSalesInvoiceReportList: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_SALES_INVOICE_LIST, filters);
  },

  getProductSalesReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_PRODUCT_SALES, filters);
  },

  getCategorySalesReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_CATEGORY_SALES, filters);
  },

  getCustomerSalesReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_CUSTOMER_SALES, filters);
  },

  getPaymentCollectionReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_PAYMENT_COLLECTIONS, filters);
  },

  getPurchaseReportSummary: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_PURCHASE_SUMMARY, filters);
  },

  getPurchaseInvoiceReportList: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_PURCHASE_INVOICE_LIST, filters);
  },

  getProductPurchaseReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_PRODUCT_PURCHASES, filters);
  },

  getSupplierReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_SUPPLIER_REPORT, filters);
  },

  getInventoryCurrentStockReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_CURRENT_STOCK, filters);
  },

  getLowStockReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_LOW_STOCK, filters);
  },

  getOutOfStockReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_OUT_OF_STOCK, filters);
  },

  getStockMovementsReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_STOCK_MOVEMENTS, filters);
  },

  getInventoryValuationReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_INVENTORY_VALUATION, filters);
  },

  getStockAdjustmentsReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_STOCK_ADJUSTMENTS, filters);
  },

  getProfitLossReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_PROFIT_LOSS, filters);
  },

  getCustomerOutstandingReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_CUSTOMER_OUTSTANDING, filters);
  },

  getSupplierOutstandingReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_SUPPLIER_OUTSTANDING, filters);
  },

  getExpenseSummaryReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_EXPENSE_SUMMARY, filters);
  },

  getCashbookReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_CASHBOOK, filters);
  },

  getRegisterClosingReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_REGISTER_CLOSINGS, filters);
  },

  getTaxSummaryReport: async (filters?: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_TAX_SUMMARY, filters);
  },

  // Step 9: Roles & Permissions
  createRole: async (dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ROLES_CREATE, dto);
  },

  updateRole: async (id: string, dto: any): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ROLES_UPDATE, { id, dto });
  },

  deleteRole: async (id: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ROLES_DELETE, id);
  },

  getRolesMatrix: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ROLES_GET_MATRIX);
  },

  updateRolePermissions: async (roleId: string, permissionCodes: string[]): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ROLES_UPDATE_PERMISSIONS, { roleId, permissionCodes });
  },

  listAllPermissions: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_LIST_ALL);
  },

  // Step 9: Settings management
  resetDefaultSettings: async (): Promise<ApiResponse<Record<string, string>>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET_DEFAULTS);
  },

  // Step 9: Backup & Restore
  createBackup: async (destinationDir?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE, destinationDir);
  },

  restoreBackup: async (filePath: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RESTORE, filePath);
  },

  listBackups: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST);
  },

  chooseBackupDirectory: async (): Promise<ApiResponse<string | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CHOOSE_DIRECTORY);
  },

  chooseBackupFile: async (): Promise<ApiResponse<string | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CHOOSE_FILE);
  },

  // Step 9: System & Hardware
  getSystemInfoDetailed: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_INFO_DETAILED);
  },

  getLogsPath: async (): Promise<ApiResponse<string>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_LOGS_PATH);
  },

  openLogsFolder: async (): Promise<ApiResponse<boolean>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_LOGS_FOLDER);
  },

  listAvailablePrinters: async (): Promise<ApiResponse<string[]>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRINTER_LIST_AVAILABLE);
  },

  testPrint: async (printerName?: string, format?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRINTER_TEST_PRINT, { printerName, format });
  },

  // Step 10: Licensing & Activation
  getLicenseStatus: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LICENSE_GET_STATUS);
  },

  generateActivationRequest: async (customerName?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LICENSE_GENERATE_REQUEST, customerName);
  },

  exportActivationRequest: async (customerName?: string, targetPath?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LICENSE_EXPORT_REQUEST, customerName, targetPath);
  },

  importLicenseFile: async (filePath?: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LICENSE_IMPORT_FILE, filePath);
  },

  activateLicenseContent: async (licenseFileContent: string): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LICENSE_ACTIVATE_KEY, licenseFileContent);
  },

  deactivateLicense: async (): Promise<ApiResponse<any>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LICENSE_DEACTIVATE);
  },

  chooseLicenseFile: async (): Promise<ApiResponse<string | null>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LICENSE_CHOOSE_FILE);
  },
};

// Expose safe, strictly typed API to renderer via contextBridge
contextBridge.exposeInMainWorld('rsInventory', api);

