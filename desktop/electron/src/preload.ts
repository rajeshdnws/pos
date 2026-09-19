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
};

// Expose safe, strictly typed API to renderer via contextBridge
contextBridge.exposeInMainWorld('rsInventory', api);

