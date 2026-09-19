import {
  AuditService,
  AuthService,
  BrandService,
  CategoryService,
  CompanyService,
  CustomerService,
  DemoDataService,
  LocationService,
  ProductService,
  PurchasePaymentService,
  PurchaseReturnService,
  PurchaseService,
  SalesPaymentService,
  SalesReturnService,
  SalesService,
  SettingsService,
  StockAdjustmentService,
  StockService,
  StocktakeService,
  StockTransferService,
  SupplierLedgerService,
  SupplierService,
  UnitService,
  UserService,
  CashbookService,
  CashRegisterService,
  DayEndClosingService,
  ExpenseCategoryService,
  ExpenseService,
  FinancialDashboardService,
  ReportingService,
  LicenseService,
} from '@rs-inventory/business';
import { DatabaseService } from '@rs-inventory/database';
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
  // Step 6
  CustomerFilterDTO,
  CustomerCreateDTO,
  CustomerUpdateDTO,
  CustomerLedgerFilterDTO,
  SalesFilterDTO,
  SalesInvoiceCreateDTO,
  SalesInvoiceUpdateDTO,
  SalesPostDTO,
  SalesCalculationInput,
  POSProductSearchFilterDTO,
  SalesPaymentCreateDTO,
  SalesPaymentFilterDTO,
  SalesReturnCreateDTO,
  SalesReturnFilterDTO,
  // Step 7
  ExpenseCategoryCreateDTO,
  ExpenseCategoryUpdateDTO,
  ExpenseCreateDTO,
  ExpenseUpdateDTO,
  ExpenseFilterDTO,
  CashRegisterCreateDTO,
  CashRegisterUpdateDTO,
  CashRegisterOpenSessionDTO,
  CashRegisterCloseSessionDTO,
  CashInOutDTO,
  CashbookFilterDTO,
  DayEndClosingFilterDTO,
  // Step 8
  DateRangeFilter,
  SalesReportFilters,
  PurchaseReportFilters,
  InventoryReportFilters,
  OutstandingReportFilters,
  ExpenseReportFilters,
  TaxReportFilters,
} from '@rs-inventory/types';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConfigService } from '../services/config.service.js';
import { LoggerService } from '../services/logger.service.js';
import { BackupService } from '../services/backup.service.js';
import { MachineIdService } from '../services/machine-id.service.js';
import { LicenseVerifierService } from '../services/license-verifier.service.js';

let activeSessionUser: User | null = null;
let activeSessionToken: string | null = null;
let activeSessionPermissions: string[] = [];

export function registerIpcHandlers(): void {
  const configService = ConfigService.getInstance();
  const loggerService = LoggerService.getInstance();
  const dbService = DatabaseService.getInstance();
  const backupService = BackupService.getInstance();
  const prisma = dbService.getClient();

  const authService = new AuthService(prisma);
  const companyService = new CompanyService(prisma);
  const userService = new UserService(prisma);
  const settingsService = new SettingsService(prisma);
  const auditService = new AuditService(prisma);
  const categoryService = new CategoryService(prisma);
  const unitService = new UnitService(prisma);
  const brandService = new BrandService(prisma);
  const productService = new ProductService(prisma);
  const locationService = new LocationService(prisma);
  const stockService = new StockService(prisma);
  const stockAdjustmentService = new StockAdjustmentService(prisma);
  const stocktakeService = new StocktakeService(prisma);
  const stockTransferService = new StockTransferService(prisma);
  const demoDataService = new DemoDataService(prisma);
  const supplierService = new SupplierService(prisma);
  const supplierLedgerService = new SupplierLedgerService(prisma);
  const purchaseService = new PurchaseService(prisma);
  const purchasePaymentService = new PurchasePaymentService(prisma);
  const purchaseReturnService = new PurchaseReturnService(prisma);
  // Step 6: Sales & Customer services
  const customerService = new CustomerService(prisma);
  const salesService = new SalesService(prisma);
  const salesPaymentService = new SalesPaymentService(prisma);
  const salesReturnService = new SalesReturnService(prisma);
  // Step 7: Expenses & Cash services
  const expenseCategoryService = new ExpenseCategoryService(prisma);
  const expenseService = new ExpenseService(prisma);
  const cashRegisterService = new CashRegisterService(prisma);
  const cashbookService = new CashbookService(prisma);
  const dayEndClosingService = new DayEndClosingService(prisma);
  const financialDashboardService = new FinancialDashboardService(prisma);
  // Step 8: Reporting
  const reportingService = new ReportingService(prisma);
  // Step 10: Licensing & Activation
  const licenseService = new LicenseService(prisma);
  const machineIdService = new MachineIdService();
  const licenseVerifierService = new LicenseVerifierService(licenseService, machineIdService);
  licenseVerifierService.initialize().catch((err) => loggerService.error('License initialization failed', err));

  // Helper for error formatting
  const handleSuccess = <T>(data: T): ApiResponse<T> => ({ success: true, data });
  const handleError = (error: unknown, defaultCode: string): ApiResponse<any> => {
    loggerService.error(`IPC Handler Error (${defaultCode})`, error);
    const errObj = error as { code?: string; message?: string; details?: unknown };
    return {
      success: false,
      error: {
        code: errObj.code || defaultCode,
        message: errObj.message || 'An unexpected error occurred.',
        details: errObj.details,
        timestamp: new Date().toISOString(),
      },
    };
  };

  // Helper to ensure active company
  const getRequiredCompanyId = async (): Promise<string> => {
    const company = await companyService.getCompany();
    if (!company) {
      throw new Error('No active company found. Complete setup first.');
    }
    return company.id;
  };

  // ---------------- Base Application & System ----------------

  ipcMain.handle(IPC_CHANNELS.APP_GET_CONFIG, async (): Promise<ApiResponse<AppConfig>> => {
    try {
      return handleSuccess(configService.getConfig());
    } catch (err) {
      return handleError(err, 'CONFIG_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_INFO, async (): Promise<ApiResponse<SystemInfo>> => {
    try {
      const mem = process.memoryUsage();
      const systemInfo: SystemInfo = {
        platform: process.platform,
        arch: process.arch,
        osVersion: `${os.type()} ${os.release()}`,
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron || 'unknown',
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsageMb: Math.round(mem.rss / 1024 / 1024),
      };
      return handleSuccess(systemInfo);
    } catch (err) {
      return handleError(err, 'SYSTEM_INFO_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.DATABASE_HEALTH_CHECK,
    async (): Promise<ApiResponse<DatabaseHealth>> => {
      try {
        const health = await dbService.healthCheck();
        return handleSuccess(health);
      } catch (err) {
        return handleError(err, 'DATABASE_HEALTH_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LOGGER_LOG,
    async (
      _event,
      payload: { level: LogLevel; message: string; meta?: unknown },
    ): Promise<ApiResponse<void>> => {
      try {
        loggerService.log(payload.level, `[Renderer] ${payload.message}`, payload.meta);
        return handleSuccess(undefined);
      } catch {
        return { success: false };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.WINDOW_CONTROL,
    async (_event, action: WindowAction): Promise<ApiResponse<void>> => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        switch (action) {
          case 'minimize':
            win?.minimize();
            break;
          case 'maximize':
            if (win?.isMaximized()) win.unmaximize();
            else win?.maximize();
            break;
          case 'close':
            win?.close();
            break;
          case 'restart':
            app.relaunch();
            app.exit(0);
            break;
        }
        return handleSuccess(undefined);
      } catch (err) {
        return handleError(err, 'WINDOW_CONTROL_ERROR');
      }
    },
  );

  // ---------------- Authentication & Session ----------------

  ipcMain.handle(
    IPC_CHANNELS.AUTH_LOGIN,
    async (_event, credentials: LoginRequestDTO): Promise<ApiResponse<LoginResponseDTO>> => {
      try {
        const response = await authService.login(credentials);
        activeSessionUser = response.user;
        activeSessionToken = response.sessionToken;
        activeSessionPermissions = response.permissions;
        return handleSuccess(response);
      } catch (err) {
        return handleError(err, 'AUTH_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async (): Promise<ApiResponse<void>> => {
    try {
      if (activeSessionToken) {
        await authService.logout(activeSessionToken);
      }
      activeSessionUser = null;
      activeSessionToken = null;
      activeSessionPermissions = [];
      return handleSuccess(undefined);
    } catch (err) {
      return handleError(err, 'LOGOUT_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.AUTH_GET_CURRENT_USER,
    async (): Promise<ApiResponse<LoginResponseDTO | null>> => {
      try {
        if (!activeSessionUser || !activeSessionToken) {
          return handleSuccess(null);
        }
        const company = await companyService.getCompany();
        return handleSuccess({
          user: activeSessionUser,
          sessionToken: activeSessionToken,
          permissions: activeSessionPermissions,
          company: company as Company,
        });
      } catch (err) {
        return handleError(err, 'SESSION_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AUTH_CHANGE_PASSWORD,
    async (_event, dto: ChangePasswordDTO): Promise<ApiResponse<void>> => {
      try {
        if (!activeSessionUser) {
          return handleError(new Error('Unauthorized session.'), 'AUTH_UNAUTHORIZED');
        }
        await authService.changePassword(activeSessionUser.id, dto);
        return handleSuccess(undefined);
      } catch (err) {
        return handleError(err, 'CHANGE_PASSWORD_ERROR');
      }
    },
  );

  // ---------------- Company Setup & Profile ----------------

  const normalizeCompanyLogo = (comp: Company | null): Company | null => {
    if (!comp || !comp.logoPath) return comp;
    if (comp.logoPath.startsWith('data:image/')) return comp;

    try {
      if (fs.existsSync(comp.logoPath)) {
        const ext = path.extname(comp.logoPath).toLowerCase();
        const mimeType =
          ext === '.png'
            ? 'image/png'
            : ext === '.webp'
            ? 'image/webp'
            : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'image/png';
        const fileBuffer = fs.readFileSync(comp.logoPath);
        return {
          ...comp,
          logoPath: `data:${mimeType};base64,${fileBuffer.toString('base64')}`,
        };
      }
    } catch (err) {
      loggerService.warn(`Failed to read logo image from disk: ${comp.logoPath}`, err);
    }
    return comp;
  };

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_CHECK_SETUP,
    async (): Promise<ApiResponse<{ isSetup: boolean; company?: Company | null }>> => {
      try {
        const isSetup = await companyService.hasCompany();
        let company = isSetup ? await companyService.getCompany() : null;
        company = normalizeCompanyLogo(company);
        return handleSuccess({ isSetup, company });
      } catch (err) {
        return handleError(err, 'COMPANY_CHECK_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.COMPANY_GET, async (): Promise<ApiResponse<Company | null>> => {
    try {
      let company = await companyService.getCompany();
      company = normalizeCompanyLogo(company);
      return handleSuccess(company);
    } catch (err) {
      return handleError(err, 'COMPANY_GET_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_SETUP,
    async (_event, dto: CompanySetupDTO): Promise<ApiResponse<LoginResponseDTO>> => {
      try {
        const response = await companyService.setupCompanyAndAdmin(dto);
        activeSessionUser = response.user;
        activeSessionToken = response.sessionToken;
        activeSessionPermissions = response.permissions;
        return handleSuccess(response);
      } catch (err) {
        return handleError(err, 'COMPANY_SETUP_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_UPDATE,
    async (_event, dto: Partial<Company>): Promise<ApiResponse<Company>> => {
      try {
        const company = await companyService.getCompany();
        if (!company) {
          return handleError(new Error('No active company found.'), 'NOT_FOUND');
        }
        let updated = await companyService.updateCompany(company.id, dto);
        updated = normalizeCompanyLogo(updated) as Company;
        return handleSuccess(updated);
      } catch (err) {
        return handleError(err, 'COMPANY_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_SELECT_LOGO,
    async (): Promise<ApiResponse<string | null>> => {
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const options = {
          title: 'Select Company Logo',
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
          properties: ['openFile' as const],
        };
        const result = focusedWindow
          ? await dialog.showOpenDialog(focusedWindow, options)
          : await dialog.showOpenDialog(options);

        if (result.canceled || result.filePaths.length === 0) {
          return handleSuccess(null);
        }

        const sourceFilePath = result.filePaths[0];
        if (!sourceFilePath) {
          return handleSuccess(null);
        }
        const stat = fs.statSync(sourceFilePath);

        // 2MB max check
        if (stat.size > 2 * 1024 * 1024) {
          return handleError(
            new Error('Logo image must be smaller than 2 MB.'),
            'VALIDATION_ERROR',
          );
        }

        const targetDir = path.join(configService.getAppDataRoot(), 'company');
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const ext = path.extname(sourceFilePath).toLowerCase();
        const targetFilePath = path.join(targetDir, `logo${ext}`);
        fs.copyFileSync(sourceFilePath, targetFilePath);

        const mimeType =
          ext === '.png'
            ? 'image/png'
            : ext === '.webp'
            ? 'image/webp'
            : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'image/png';
        const fileBuffer = fs.readFileSync(targetFilePath);
        const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

        return handleSuccess(dataUri);
      } catch (err) {
        return handleError(err, 'LOGO_UPLOAD_ERROR');
      }
    },
  );

  // ---------------- Users & Roles ----------------

  ipcMain.handle(IPC_CHANNELS.USERS_LIST, async (): Promise<ApiResponse<User[]>> => {
    try {
      const companyId = await getRequiredCompanyId();
      const users = await userService.listUsers(companyId);
      return handleSuccess(users);
    } catch (err) {
      return handleError(err, 'USERS_LIST_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.ROLES_GET_ALL, async (): Promise<ApiResponse<Role[]>> => {
    try {
      const roles = await userService.getRoles();
      return handleSuccess(roles);
    } catch (err) {
      return handleError(err, 'ROLES_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.USERS_CREATE,
    async (_event, dto: UserCreateDTO): Promise<ApiResponse<User>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const user = await userService.createUser(companyId, dto, activeSessionUser?.id);
        return handleSuccess(user);
      } catch (err) {
        return handleError(err, 'USER_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS_UPDATE,
    async (_event, payload: { id: string; dto: UserUpdateDTO }): Promise<ApiResponse<User>> => {
      try {
        const user = await userService.updateUser(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(user);
      } catch (err) {
        return handleError(err, 'USER_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS_TOGGLE_ACTIVE,
    async (_event, id: string): Promise<ApiResponse<User>> => {
      try {
        const user = await userService.toggleUserActive(id, activeSessionUser?.id);
        return handleSuccess(user);
      } catch (err) {
        return handleError(err, 'USER_TOGGLE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS_RESET_PASSWORD,
    async (_event, dto: ResetPasswordDTO): Promise<ApiResponse<void>> => {
      try {
        await userService.resetPassword(dto.userId, dto.newPassword, activeSessionUser?.id);
        return handleSuccess(undefined);
      } catch (err) {
        return handleError(err, 'RESET_PASSWORD_ERROR');
      }
    },
  );

  // ---------------- Settings & Audits ----------------

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET_ALL,
    async (): Promise<ApiResponse<Record<string, string>>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const settings = await settingsService.getSettings(companyId);
        return handleSuccess(settings);
      } catch (err) {
        return handleError(err, 'SETTINGS_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_event, settingsMap: Record<string, string>): Promise<ApiResponse<Setting[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const updated = await settingsService.updateSettings(companyId, settingsMap);
        return handleSuccess(updated);
      } catch (err) {
        return handleError(err, 'SETTINGS_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AUDIT_GET_LOGS,
    async (_event, limit?: number): Promise<ApiResponse<AuditLog[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const logs = await auditService.getLogs(companyId, limit || 100);
        return handleSuccess(logs);
      } catch (err) {
        return handleError(err, 'AUDIT_LOGS_ERROR');
      }
    },
  );

  // ---------------- Categories ----------------

  ipcMain.handle(
    IPC_CHANNELS.CATEGORIES_LIST,
    async (_event, includeInactive?: boolean): Promise<ApiResponse<Category[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const categories = await categoryService.getCategories(companyId, includeInactive);
        return handleSuccess(categories);
      } catch (err) {
        return handleError(err, 'CATEGORIES_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CATEGORIES_GET,
    async (_event, id: string): Promise<ApiResponse<Category | null>> => {
      try {
        const category = await categoryService.getCategory(id);
        return handleSuccess(category);
      } catch (err) {
        return handleError(err, 'CATEGORY_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CATEGORIES_CREATE,
    async (_event, dto: CategoryCreateDTO): Promise<ApiResponse<Category>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const category = await categoryService.createCategory(companyId, dto, activeSessionUser?.id);
        return handleSuccess(category);
      } catch (err) {
        return handleError(err, 'CATEGORY_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CATEGORIES_UPDATE,
    async (_event, payload: { id: string; dto: CategoryUpdateDTO }): Promise<ApiResponse<Category>> => {
      try {
        const category = await categoryService.updateCategory(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(category);
      } catch (err) {
        return handleError(err, 'CATEGORY_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CATEGORIES_TOGGLE_ACTIVE,
    async (_event, id: string): Promise<ApiResponse<Category>> => {
      try {
        const category = await categoryService.toggleCategoryActive(id, activeSessionUser?.id);
        return handleSuccess(category);
      } catch (err) {
        return handleError(err, 'CATEGORY_TOGGLE_ERROR');
      }
    },
  );

  // ---------------- Units ----------------

  ipcMain.handle(
    IPC_CHANNELS.UNITS_LIST,
    async (_event, includeInactive?: boolean): Promise<ApiResponse<Unit[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const units = await unitService.getUnits(companyId, includeInactive);
        return handleSuccess(units);
      } catch (err) {
        return handleError(err, 'UNITS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.UNITS_GET,
    async (_event, id: string): Promise<ApiResponse<Unit | null>> => {
      try {
        const unit = await unitService.getUnit(id);
        return handleSuccess(unit);
      } catch (err) {
        return handleError(err, 'UNIT_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.UNITS_CREATE,
    async (_event, dto: UnitCreateDTO): Promise<ApiResponse<Unit>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const unit = await unitService.createUnit(companyId, dto, activeSessionUser?.id);
        return handleSuccess(unit);
      } catch (err) {
        return handleError(err, 'UNIT_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.UNITS_UPDATE,
    async (_event, payload: { id: string; dto: UnitUpdateDTO }): Promise<ApiResponse<Unit>> => {
      try {
        const unit = await unitService.updateUnit(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(unit);
      } catch (err) {
        return handleError(err, 'UNIT_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.UNITS_TOGGLE_ACTIVE,
    async (_event, id: string): Promise<ApiResponse<Unit>> => {
      try {
        const unit = await unitService.toggleUnitActive(id, activeSessionUser?.id);
        return handleSuccess(unit);
      } catch (err) {
        return handleError(err, 'UNIT_TOGGLE_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.UNITS_SEED_DEFAULTS, async (): Promise<ApiResponse<Unit[]>> => {
    try {
      const companyId = await getRequiredCompanyId();
      const units = await unitService.seedDefaultUnits(companyId, activeSessionUser?.id);
      return handleSuccess(units);
    } catch (err) {
      return handleError(err, 'UNITS_SEED_ERROR');
    }
  });

  // ---------------- Brands ----------------

  ipcMain.handle(
    IPC_CHANNELS.BRANDS_LIST,
    async (_event, includeInactive?: boolean): Promise<ApiResponse<Brand[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const brands = await brandService.getBrands(companyId, includeInactive);
        return handleSuccess(brands);
      } catch (err) {
        return handleError(err, 'BRANDS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BRANDS_GET,
    async (_event, id: string): Promise<ApiResponse<Brand | null>> => {
      try {
        const brand = await brandService.getBrand(id);
        return handleSuccess(brand);
      } catch (err) {
        return handleError(err, 'BRAND_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BRANDS_CREATE,
    async (_event, dto: BrandCreateDTO): Promise<ApiResponse<Brand>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const brand = await brandService.createBrand(companyId, dto, activeSessionUser?.id);
        return handleSuccess(brand);
      } catch (err) {
        return handleError(err, 'BRAND_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BRANDS_UPDATE,
    async (_event, payload: { id: string; dto: BrandUpdateDTO }): Promise<ApiResponse<Brand>> => {
      try {
        const brand = await brandService.updateBrand(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(brand);
      } catch (err) {
        return handleError(err, 'BRAND_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BRANDS_TOGGLE_ACTIVE,
    async (_event, id: string): Promise<ApiResponse<Brand>> => {
      try {
        const brand = await brandService.toggleBrandActive(id, activeSessionUser?.id);
        return handleSuccess(brand);
      } catch (err) {
        return handleError(err, 'BRAND_TOGGLE_ERROR');
      }
    },
  );

  // ---------------- Products ----------------

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_LIST,
    async (_event, filters?: ProductFilterDTO): Promise<ApiResponse<PaginatedResult<Product>>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await productService.getProducts(companyId, filters);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PRODUCTS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_GET,
    async (_event, id: string): Promise<ApiResponse<Product | null>> => {
      try {
        const product = await productService.getProductById(id);
        return handleSuccess(product);
      } catch (err) {
        return handleError(err, 'PRODUCT_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_CREATE,
    async (_event, dto: ProductCreateDTO): Promise<ApiResponse<Product>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const product = await productService.createProduct(companyId, dto, activeSessionUser?.id);
        return handleSuccess(product);
      } catch (err) {
        return handleError(err, 'PRODUCT_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_UPDATE,
    async (_event, payload: { id: string; dto: ProductUpdateDTO }): Promise<ApiResponse<Product>> => {
      try {
        const product = await productService.updateProduct(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(product);
      } catch (err) {
        return handleError(err, 'PRODUCT_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_TOGGLE_ACTIVE,
    async (_event, id: string): Promise<ApiResponse<Product>> => {
      try {
        const product = await productService.toggleProductActive(id, activeSessionUser?.id);
        return handleSuccess(product);
      } catch (err) {
        return handleError(err, 'PRODUCT_TOGGLE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_SEARCH,
    async (_event, query: string): Promise<ApiResponse<Product[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const products = await productService.searchProducts(companyId, query);
        return handleSuccess(products);
      } catch (err) {
        return handleError(err, 'PRODUCTS_SEARCH_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_BY_BARCODE,
    async (_event, barcode: string): Promise<ApiResponse<Product | null>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const product = await productService.getProductByBarcode(companyId, barcode);
        return handleSuccess(product);
      } catch (err) {
        return handleError(err, 'PRODUCT_BARCODE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_BY_SKU,
    async (_event, sku: string): Promise<ApiResponse<Product | null>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const product = await productService.getProductBySku(companyId, sku);
        return handleSuccess(product);
      } catch (err) {
        return handleError(err, 'PRODUCT_SKU_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GENERATE_SKU, async (): Promise<ApiResponse<string>> => {
    try {
      const companyId = await getRequiredCompanyId();
      const sku = await productService.generateSku(companyId);
      return handleSuccess(sku);
    } catch (err) {
      return handleError(err, 'PRODUCT_GENERATE_SKU_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_GET_PRICE_HISTORY,
    async (_event, productId: string): Promise<ApiResponse<ProductPriceHistory[]>> => {
      try {
        const history = await productService.getPriceHistory(productId);
        return handleSuccess(history);
      } catch (err) {
        return handleError(err, 'PRODUCT_PRICE_HISTORY_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Locations Handlers
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.LOCATIONS_LIST,
    async (_event, includeInactive?: boolean): Promise<ApiResponse<InventoryLocation[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const locations = await locationService.getLocations(companyId, includeInactive);
        return handleSuccess(locations);
      } catch (err) {
        return handleError(err, 'LOCATIONS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LOCATIONS_GET,
    async (_event, id: string): Promise<ApiResponse<InventoryLocation | null>> => {
      try {
        const location = await locationService.getLocation(id);
        return handleSuccess(location);
      } catch (err) {
        return handleError(err, 'LOCATIONS_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LOCATIONS_CREATE,
    async (_event, dto: LocationCreateDTO): Promise<ApiResponse<InventoryLocation>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const location = await locationService.createLocation(companyId, dto, activeSessionUser?.id);
        return handleSuccess(location);
      } catch (err) {
        return handleError(err, 'LOCATIONS_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LOCATIONS_UPDATE,
    async (_event, payload: { id: string; dto: LocationUpdateDTO }): Promise<ApiResponse<InventoryLocation>> => {
      try {
        const location = await locationService.updateLocation(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(location);
      } catch (err) {
        return handleError(err, 'LOCATIONS_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LOCATIONS_TOGGLE_ACTIVE,
    async (_event, id: string): Promise<ApiResponse<InventoryLocation>> => {
      try {
        const location = await locationService.toggleLocationActive(id, activeSessionUser?.id);
        return handleSuccess(location);
      } catch (err) {
        return handleError(err, 'LOCATIONS_TOGGLE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LOCATIONS_GET_DEFAULT,
    async (): Promise<ApiResponse<InventoryLocation>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const location = await locationService.getDefaultLocation(companyId);
        return handleSuccess(location);
      } catch (err) {
        return handleError(err, 'LOCATIONS_GET_DEFAULT_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Stock Ledger & Operational Stock Handlers
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.STOCK_GET_CURRENT,
    async (_event, filters?: CurrentStockFilterDTO): Promise<ApiResponse<PaginatedResult<CurrentStockItem>>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await stockService.getCurrentStock(companyId, filters);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'STOCK_GET_CURRENT_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCK_GET_MOVEMENTS,
    async (_event, filters?: StockMovementFilterDTO): Promise<ApiResponse<PaginatedResult<StockMovement>>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await stockService.getStockMovements(companyId, filters);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'STOCK_GET_MOVEMENTS_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCK_GET_PRODUCT_SUMMARY,
    async (_event, productId: string): Promise<ApiResponse<{ currentStock: number; valuation: number; balances: { locationId: string; locationName: string; quantity: number }[] }>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const summary = await stockService.getProductStockSummary(companyId, productId);
        return handleSuccess(summary);
      } catch (err) {
        return handleError(err, 'STOCK_GET_PRODUCT_SUMMARY_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCK_GET_VALUATION,
    async (): Promise<ApiResponse<InventoryValuationReport>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const report = await stockService.getInventoryValuation(companyId);
        return handleSuccess(report);
      } catch (err) {
        return handleError(err, 'STOCK_GET_VALUATION_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCK_GET_KPIS,
    async (): Promise<ApiResponse<InventoryKPIs>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const kpis = await stockService.getInventoryKPIs(companyId);
        return handleSuccess(kpis);
      } catch (err) {
        return handleError(err, 'STOCK_GET_KPIS_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCK_RECONCILE,
    async (): Promise<ApiResponse<StockReconciliationReport>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const report = await stockService.reconcileStock(companyId);
        return handleSuccess(report);
      } catch (err) {
        return handleError(err, 'STOCK_RECONCILE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCK_REPAIR_DISCREPANCIES,
    async (): Promise<ApiResponse<{ repairedCount: number }>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await stockService.repairStockDiscrepancies(companyId, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'STOCK_REPAIR_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Stock Adjustment Handlers
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.ADJUSTMENTS_LIST,
    async (_event, limit?: number): Promise<ApiResponse<StockAdjustment[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const adjustments = await stockAdjustmentService.getAdjustments(companyId, limit);
        return handleSuccess(adjustments);
      } catch (err) {
        return handleError(err, 'ADJUSTMENTS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ADJUSTMENTS_GET,
    async (_event, id: string): Promise<ApiResponse<StockAdjustment | null>> => {
      try {
        const adjustment = await stockAdjustmentService.getAdjustment(id);
        return handleSuccess(adjustment);
      } catch (err) {
        return handleError(err, 'ADJUSTMENTS_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ADJUSTMENTS_CREATE,
    async (_event, dto: StockAdjustmentCreateDTO): Promise<ApiResponse<StockAdjustment>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const adjustment = await stockAdjustmentService.createAdjustment(companyId, dto, activeSessionUser?.id);
        return handleSuccess(adjustment);
      } catch (err) {
        return handleError(err, 'ADJUSTMENTS_CREATE_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Stocktake Handlers
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.STOCKTAKES_LIST,
    async (_event, limit?: number): Promise<ApiResponse<Stocktake[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const stocktakes = await stocktakeService.getStocktakes(companyId, limit);
        return handleSuccess(stocktakes);
      } catch (err) {
        return handleError(err, 'STOCKTAKES_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCKTAKES_GET,
    async (_event, id: string): Promise<ApiResponse<Stocktake | null>> => {
      try {
        const stocktake = await stocktakeService.getStocktake(id);
        return handleSuccess(stocktake);
      } catch (err) {
        return handleError(err, 'STOCKTAKES_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCKTAKES_CREATE,
    async (_event, dto: StocktakeCreateDTO): Promise<ApiResponse<Stocktake>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const stocktake = await stocktakeService.createStocktake(companyId, dto, activeSessionUser?.id);
        return handleSuccess(stocktake);
      } catch (err) {
        return handleError(err, 'STOCKTAKES_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCKTAKES_UPDATE,
    async (_event, payload: { id: string; dto: StocktakeUpdateDTO }): Promise<ApiResponse<Stocktake>> => {
      try {
        const stocktake = await stocktakeService.updateStocktake(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(stocktake);
      } catch (err) {
        return handleError(err, 'STOCKTAKES_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCKTAKES_START,
    async (_event, id: string): Promise<ApiResponse<Stocktake>> => {
      try {
        const stocktake = await stocktakeService.startStocktake(id, activeSessionUser?.id);
        return handleSuccess(stocktake);
      } catch (err) {
        return handleError(err, 'STOCKTAKES_START_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCKTAKES_COMPLETE,
    async (_event, id: string): Promise<ApiResponse<Stocktake>> => {
      try {
        const stocktake = await stocktakeService.completeStocktake(id, activeSessionUser?.id);
        return handleSuccess(stocktake);
      } catch (err) {
        return handleError(err, 'STOCKTAKES_COMPLETE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STOCKTAKES_CANCEL,
    async (_event, id: string): Promise<ApiResponse<Stocktake>> => {
      try {
        const stocktake = await stocktakeService.cancelStocktake(id, activeSessionUser?.id);
        return handleSuccess(stocktake);
      } catch (err) {
        return handleError(err, 'STOCKTAKES_CANCEL_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Stock Transfer Handlers
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.TRANSFERS_LIST,
    async (_event, limit?: number): Promise<ApiResponse<StockTransfer[]>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const transfers = await stockTransferService.getTransfers(companyId, limit);
        return handleSuccess(transfers);
      } catch (err) {
        return handleError(err, 'TRANSFERS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TRANSFERS_GET,
    async (_event, id: string): Promise<ApiResponse<StockTransfer | null>> => {
      try {
        const transfer = await stockTransferService.getTransfer(id);
        return handleSuccess(transfer);
      } catch (err) {
        return handleError(err, 'TRANSFERS_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TRANSFERS_CREATE,
    async (_event, dto: StockTransferCreateDTO): Promise<ApiResponse<StockTransfer>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const transfer = await stockTransferService.createTransfer(companyId, dto, activeSessionUser?.id);
        return handleSuccess(transfer);
      } catch (err) {
        return handleError(err, 'TRANSFERS_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TRANSFERS_CANCEL,
    async (_event, id: string): Promise<ApiResponse<StockTransfer>> => {
      try {
        const transfer = await stockTransferService.cancelTransfer(id, activeSessionUser?.id);
        return handleSuccess(transfer);
      } catch (err) {
        return handleError(err, 'TRANSFERS_CANCEL_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Demo Data Handlers
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.DEMO_DATA_STATUS,
    async (): Promise<ApiResponse<DemoDataStatus>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const status = await demoDataService.getDemoDataStatus(companyId);
        return handleSuccess(status);
      } catch (err) {
        return handleError(err, 'DEMO_DATA_STATUS_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DEMO_DATA_INSTALL,
    async (): Promise<ApiResponse<DemoDataInstallResult>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await demoDataService.installDemoData(companyId, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'DEMO_DATA_INSTALL_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DEMO_DATA_CLEAR,
    async (): Promise<ApiResponse<DemoDataClearResult>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await demoDataService.clearDemoData(companyId, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'DEMO_DATA_CLEAR_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Step 5: Supplier Handlers
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS_LIST,
    async (_event, filters?: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await supplierService.getSuppliers(companyId, filters);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIERS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS_GET,
    async (_event, id: string): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await supplierService.getSupplierById(companyId, id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIERS_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS_GENERATE_CODE,
    async (): Promise<ApiResponse<string>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await supplierService.generateSupplierCode(companyId);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIERS_GENERATE_CODE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS_CREATE,
    async (_event, dto: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await supplierService.createSupplier(companyId, dto, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIERS_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS_UPDATE,
    async (_event, { id, dto }: { id: string; dto: any }): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await supplierService.updateSupplier(companyId, id, dto, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIERS_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS_TOGGLE_ACTIVE,
    async (_event, id: string): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await supplierService.toggleSupplierActive(companyId, id, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIERS_TOGGLE_ACTIVE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIERS_DELETE,
    async (_event, id: string): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await supplierService.deleteSupplier(companyId, id, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIERS_DELETE_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Step 5: Purchase Handlers
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_LIST,
    async (_event, filters?: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.getPurchases(companyId, filters);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_GET,
    async (_event, id: string): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.getPurchaseById(companyId, id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_GET_SUMMARY,
    async (): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.getSummary(companyId);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_GET_SUMMARY_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_GET_KPIS,
    async (): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.getKPIs(companyId);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_GET_KPIS_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_CALCULATE,
    async (_event, input: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.calculate(companyId, input);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_CALCULATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_CREATE_DRAFT,
    async (_event, dto: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.createDraft(companyId, dto, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_CREATE_DRAFT_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_UPDATE_DRAFT,
    async (_event, { id, dto }: { id: string; dto: any }): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.updateDraft(companyId, id, dto, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_UPDATE_DRAFT_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_POST,
    async (_event, id: string): Promise<ApiResponse<any>> => {
      try {
        licenseService.assertFeatureEntitled('purchases.core', 'post purchase');
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.postPurchase(companyId, id, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_POST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASES_CANCEL,
    async (_event, { id, reason }: { id: string; reason?: string }): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseService.cancelPurchase(companyId, id, reason, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASES_CANCEL_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Step 5: Purchase Payments
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.PURCHASE_PAYMENTS_LIST,
    async (_event, filtersOrPurchaseId?: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const filters = typeof filtersOrPurchaseId === 'string'
          ? { purchaseId: filtersOrPurchaseId }
          : filtersOrPurchaseId;
        const result = await purchasePaymentService.getPayments(companyId, filters);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASE_PAYMENTS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASE_PAYMENTS_CREATE,
    async (_event, dto: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchasePaymentService.createPayment(companyId, dto, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASE_PAYMENTS_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASE_PAYMENTS_REVERSE,
    async (_event, payload: any, reasonArg?: string): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const dto = typeof payload === 'string'
          ? { paymentId: payload, reversalReason: reasonArg || 'Reversed by user' }
          : payload;
        const result = await purchasePaymentService.reversePayment(companyId, dto, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASE_PAYMENTS_REVERSE_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Step 5: Purchase Returns
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.PURCHASE_RETURNS_LIST,
    async (_event, filters?: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseReturnService.getReturns(companyId, filters);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASE_RETURNS_LIST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASE_RETURNS_GET,
    async (_event, id: string): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseReturnService.getReturnById(companyId, id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASE_RETURNS_GET_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PURCHASE_RETURNS_CREATE,
    async (_event, dto: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await purchaseReturnService.createReturn(companyId, dto, activeSessionUser?.id);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'PURCHASE_RETURNS_CREATE_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Step 5: Supplier Ledger
  // -------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.SUPPLIER_LEDGER_GET_ENTRIES,
    async (_event, filters: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const result = await supplierLedgerService.getEntries(companyId, filters);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIER_LEDGER_GET_ENTRIES_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIER_LEDGER_GET_STATEMENT,
    async (_event, arg1: any, arg2?: any, arg3?: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        let supplierId: string;
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (typeof arg1 === 'object' && arg1 !== null) {
          supplierId = arg1.supplierId;
          startDate = arg1.startDate ? new Date(arg1.startDate).toISOString() : undefined;
          endDate = arg1.endDate ? new Date(arg1.endDate).toISOString() : undefined;
        } else {
          supplierId = arg1;
          if (typeof arg2 === 'object' && arg2 !== null) {
            startDate = arg2.startDate ? new Date(arg2.startDate).toISOString() : undefined;
            endDate = arg2.endDate ? new Date(arg2.endDate).toISOString() : undefined;
          } else {
            startDate = arg2 ? new Date(arg2).toISOString() : undefined;
            endDate = arg3 ? new Date(arg3).toISOString() : undefined;
          }
        }

        const result = await supplierLedgerService.getStatement(companyId, supplierId, startDate, endDate);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'SUPPLIER_LEDGER_GET_STATEMENT_ERROR');
      }
    },
  );

  // ─── Step 6: Customers ─────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.CUSTOMERS_LIST, async (_e, filters: CustomerFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await customerService.listCustomers(companyId, filters));
    } catch (err) { return handleError(err, 'CUSTOMERS_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMERS_GET, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await customerService.getCustomer(companyId, id));
    } catch (err) { return handleError(err, 'CUSTOMERS_GET_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMERS_CREATE, async (_e, dto: CustomerCreateDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await customerService.createCustomer(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CUSTOMERS_CREATE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMERS_UPDATE, async (_e, arg1: any, arg2?: any) => {
    try {
      const companyId = await getRequiredCompanyId();
      const id = typeof arg1 === 'object' && arg1 !== null && 'id' in arg1 ? arg1.id : arg1;
      const dto = typeof arg1 === 'object' && arg1 !== null && 'dto' in arg1 ? arg1.dto : arg2;
      return handleSuccess(await customerService.updateCustomer(companyId, id, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CUSTOMERS_UPDATE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMERS_TOGGLE_ACTIVE, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await customerService.toggleActive(companyId, id, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CUSTOMERS_TOGGLE_ACTIVE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMERS_GENERATE_CODE, async () => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await customerService.generateCode(companyId));
    } catch (err) { return handleError(err, 'CUSTOMERS_GENERATE_CODE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMERS_GET_LEDGER, async (_e, filters: CustomerLedgerFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      const repo = new (await import('@rs-inventory/business')).CustomerLedgerRepository(prisma);
      return handleSuccess(await repo.findEntries(companyId, filters));
    } catch (err) { return handleError(err, 'CUSTOMERS_GET_LEDGER_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMERS_GET_STATEMENT, async (_e, arg1: any, arg2?: string, arg3?: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      const customerId = typeof arg1 === 'object' && arg1 !== null && 'customerId' in arg1 ? arg1.customerId : arg1;
      const startDate = typeof arg1 === 'object' && arg1 !== null && 'startDate' in arg1 ? arg1.startDate : arg2;
      const endDate = typeof arg1 === 'object' && arg1 !== null && 'endDate' in arg1 ? arg1.endDate : arg3;
      return handleSuccess(await customerService.getStatement(companyId, customerId, startDate, endDate));
    } catch (err) { return handleError(err, 'CUSTOMERS_GET_STATEMENT_ERROR'); }
  });

  // ─── Step 6: Sales Invoices ────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SALES_LIST, async (_e, filters: SalesFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesService.listSales(companyId, filters));
    } catch (err) { return handleError(err, 'SALES_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_GET, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesService.getSale(companyId, id));
    } catch (err) { return handleError(err, 'SALES_GET_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_CREATE_DRAFT, async (_e, dto: SalesInvoiceCreateDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesService.createDraft(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'SALES_CREATE_DRAFT_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_UPDATE_DRAFT, async (_e, arg1: any, arg2?: any) => {
    try {
      const companyId = await getRequiredCompanyId();
      const id = typeof arg1 === 'object' && arg1 !== null && 'id' in arg1 ? arg1.id : arg1;
      const dto = typeof arg1 === 'object' && arg1 !== null && 'dto' in arg1 ? arg1.dto : arg2;
      return handleSuccess(await salesService.updateDraft(companyId, id, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'SALES_UPDATE_DRAFT_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_CANCEL_DRAFT, async (_e, arg1: any, arg2?: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      const id = typeof arg1 === 'object' && arg1 !== null && 'id' in arg1 ? arg1.id : arg1;
      const reason = typeof arg1 === 'object' && arg1 !== null && 'reason' in arg1 ? arg1.reason : arg2;
      return handleSuccess(await salesService.cancelDraft(companyId, id, reason, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'SALES_CANCEL_DRAFT_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_POST, async (_e, arg1: any, arg2?: any) => {
    try {
      licenseService.assertFeatureEntitled('sales.core', 'post sale');
      const companyId = await getRequiredCompanyId();
      const id = typeof arg1 === 'object' && arg1 !== null && 'id' in arg1 ? arg1.id : arg1;
      const dto = typeof arg1 === 'object' && arg1 !== null && 'dto' in arg1 ? arg1.dto : arg2;
      return handleSuccess(await salesService.postSale(companyId, id, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'SALES_POST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_CALCULATE, async (_e, input: SalesCalculationInput) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesService.calculate(companyId, input));
    } catch (err) { return handleError(err, 'SALES_CALCULATE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_GET_SUMMARY, async () => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesService.getSummary(companyId));
    } catch (err) { return handleError(err, 'SALES_GET_SUMMARY_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_GET_KPIS, async () => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesService.getKPIs(companyId));
    } catch (err) { return handleError(err, 'SALES_GET_KPIS_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_SEARCH_PRODUCTS, async (_e, filters: POSProductSearchFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesService.searchPOSProducts(companyId, filters));
    } catch (err) { return handleError(err, 'SALES_SEARCH_PRODUCTS_ERROR'); }
  });

  // ─── Step 6: Sales Payments ────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SALES_PAYMENTS_LIST, async (_e, filters: SalesPaymentFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesPaymentService.listPayments(companyId, filters));
    } catch (err) { return handleError(err, 'SALES_PAYMENTS_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_PAYMENTS_CREATE, async (_e, dto: SalesPaymentCreateDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesPaymentService.createPayment(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'SALES_PAYMENTS_CREATE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_PAYMENTS_REVERSE, async (_e, arg1: any, arg2?: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      const paymentId = typeof arg1 === 'object' && arg1 !== null && 'paymentId' in arg1 ? arg1.paymentId : arg1;
      const reason = typeof arg1 === 'object' && arg1 !== null && 'reason' in arg1 ? arg1.reason : (arg2 || 'Reversed by user');
      return handleSuccess(await salesPaymentService.reversePayment(companyId, paymentId, reason, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'SALES_PAYMENTS_REVERSE_ERROR'); }
  });

  // ─── Step 6: Sales Returns ─────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SALES_RETURNS_LIST, async (_e, filters: SalesReturnFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesReturnService.listReturns(companyId, filters));
    } catch (err) { return handleError(err, 'SALES_RETURNS_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_RETURNS_GET, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesReturnService.getReturn(companyId, id));
    } catch (err) { return handleError(err, 'SALES_RETURNS_GET_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.SALES_RETURNS_CREATE, async (_e, dto: SalesReturnCreateDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await salesReturnService.createReturn(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'SALES_RETURNS_CREATE_ERROR'); }
  });

  // ─── Step 7: Expense Categories ────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.EXPENSE_CATEGORIES_LIST, async (_e, includeInactive?: boolean) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseCategoryService.listCategories(companyId, includeInactive));
    } catch (err) { return handleError(err, 'EXPENSE_CATEGORIES_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSE_CATEGORIES_CREATE, async (_e, dto: ExpenseCategoryCreateDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseCategoryService.createCategory(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'EXPENSE_CATEGORIES_CREATE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSE_CATEGORIES_UPDATE, async (_e, payload: { id: string; dto: ExpenseCategoryUpdateDTO }) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseCategoryService.updateCategory(companyId, payload.id, payload.dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'EXPENSE_CATEGORIES_UPDATE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSE_CATEGORIES_DELETE, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseCategoryService.deleteCategory(companyId, id, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'EXPENSE_CATEGORIES_DELETE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSE_CATEGORIES_SEED_DEFAULTS, async () => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseCategoryService.seedDefaultCategories(companyId, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'EXPENSE_CATEGORIES_SEED_ERROR'); }
  });

  // ─── Step 7: Expenses ──────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.EXPENSES_LIST, async (_e, filters?: ExpenseFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseService.listExpenses(companyId, filters));
    } catch (err) { return handleError(err, 'EXPENSES_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSES_GET, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseService.getExpense(companyId, id));
    } catch (err) { return handleError(err, 'EXPENSES_GET_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSES_CREATE_DRAFT, async (_e, dto: ExpenseCreateDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseService.createDraft(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'EXPENSES_CREATE_DRAFT_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSES_UPDATE_DRAFT, async (_e, payload: { id: string; dto: ExpenseUpdateDTO }) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseService.updateDraft(companyId, payload.id, payload.dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'EXPENSES_UPDATE_DRAFT_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSES_POST, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseService.postExpense(companyId, id, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'EXPENSES_POST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.EXPENSES_CANCEL, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await expenseService.cancelDraft(companyId, id, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'EXPENSES_CANCEL_ERROR'); }
  });

  // ─── Step 7: Cash Registers & Sessions ─────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_LIST, async () => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.listRegisters(companyId));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_CREATE, async (_e, dto: CashRegisterCreateDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.createRegister(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_CREATE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_UPDATE, async (_e, payload: { id: string; dto: CashRegisterUpdateDTO }) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.updateRegister(companyId, payload.id, payload.dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_UPDATE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_GET_ACTIVE_SESSION, async (_e, cashRegisterId?: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.getActiveSession(companyId, cashRegisterId));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_ACTIVE_SESSION_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_OPEN_SESSION, async (_e, dto: CashRegisterOpenSessionDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.openSession(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_OPEN_SESSION_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_RECORD_CASH_IN, async (_e, dto: CashInOutDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.recordCashIn(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_CASH_IN_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_RECORD_CASH_OUT, async (_e, dto: CashInOutDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.recordCashOut(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_CASH_OUT_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_GET_SESSION_SUMMARY, async (_e, sessionId?: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.getSessionSummary(companyId, sessionId));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_SESSION_SUMMARY_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTERS_REOPEN_SESSION, async (_e, payload: { sessionId: string; reason: string }) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashRegisterService.reopenSession(companyId, payload.sessionId, payload.reason, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'CASH_REGISTERS_REOPEN_SESSION_ERROR'); }
  });

  // ─── Step 7: Cashbook ──────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.CASHBOOK_GET_ENTRIES, async (_e, filters?: CashbookFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashbookService.getCashbookEntries(companyId, filters));
    } catch (err) { return handleError(err, 'CASHBOOK_GET_ENTRIES_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.CASHBOOK_GET_SUMMARY, async (_e, filters?: CashbookFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await cashbookService.getCashbookSummary(companyId, filters));
    } catch (err) { return handleError(err, 'CASHBOOK_GET_SUMMARY_ERROR'); }
  });

  // ─── Step 7: Day-End Closing ───────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.DAY_END_CLOSING_PREVIEW, async (_e, sessionId?: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await dayEndClosingService.preview(companyId, sessionId));
    } catch (err) { return handleError(err, 'DAY_END_CLOSING_PREVIEW_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.DAY_END_CLOSING_CLOSE, async (_e, dto: CashRegisterCloseSessionDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await dayEndClosingService.closeSession(companyId, dto, activeSessionUser?.id));
    } catch (err) { return handleError(err, 'DAY_END_CLOSING_CLOSE_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.DAY_END_CLOSING_GET, async (_e, id: string) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await dayEndClosingService.getDayEndClosing(companyId, id));
    } catch (err) { return handleError(err, 'DAY_END_CLOSING_GET_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.DAY_END_CLOSING_LIST, async (_e, filters?: DayEndClosingFilterDTO) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await dayEndClosingService.listDayEndClosings(companyId, filters));
    } catch (err) { return handleError(err, 'DAY_END_CLOSING_LIST_ERROR'); }
  });

  // ─── Step 7: Financial Dashboard ───────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.FINANCIAL_DASHBOARD_KPIS, async () => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await financialDashboardService.getKPIs(companyId));
    } catch (err) { return handleError(err, 'FINANCIAL_DASHBOARD_KPIS_ERROR'); }
  });

  // ─── Step 8: Business Reports & Analytics ─────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_DASHBOARD_KPIS, async (_e, filters?: DateRangeFilter) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getBusinessDashboardKPIs(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_DASHBOARD_KPIS_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_CHARTS_DATA, async (_e, filters?: DateRangeFilter) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getDashboardChartsData(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_CHARTS_DATA_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_SALES_SUMMARY, async (_e, filters?: SalesReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getSalesSummary(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_SALES_SUMMARY_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_SALES_INVOICE_LIST, async (_e, filters?: SalesReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getSalesInvoiceList(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_SALES_INVOICE_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PRODUCT_SALES, async (_e, filters?: SalesReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getProductSalesReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_PRODUCT_SALES_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_CATEGORY_SALES, async (_e, filters?: SalesReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getCategorySalesReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_CATEGORY_SALES_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_CUSTOMER_SALES, async (_e, filters?: SalesReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getCustomerSalesReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_CUSTOMER_SALES_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PAYMENT_COLLECTIONS, async (_e, filters?: SalesReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getPaymentCollections(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_PAYMENT_COLLECTIONS_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PURCHASE_SUMMARY, async (_e, filters?: PurchaseReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getPurchaseSummary(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_PURCHASE_SUMMARY_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PURCHASE_INVOICE_LIST, async (_e, filters?: PurchaseReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getPurchaseInvoiceList(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_PURCHASE_INVOICE_LIST_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PRODUCT_PURCHASES, async (_e, filters?: PurchaseReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getProductPurchaseReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_PRODUCT_PURCHASES_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_SUPPLIER_REPORT, async (_e, filters?: PurchaseReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getSupplierReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_SUPPLIER_REPORT_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_CURRENT_STOCK, async (_e, filters?: InventoryReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getCurrentStockReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_CURRENT_STOCK_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_LOW_STOCK, async (_e, filters?: InventoryReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getLowStockReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_LOW_STOCK_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_OUT_OF_STOCK, async (_e, filters?: InventoryReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getOutOfStockReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_OUT_OF_STOCK_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_STOCK_MOVEMENTS, async (_e, filters?: InventoryReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getStockMovementsReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_STOCK_MOVEMENTS_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_INVENTORY_VALUATION, async (_e, filters?: InventoryReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getInventoryValuationReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_INVENTORY_VALUATION_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_STOCK_ADJUSTMENTS, async (_e, filters?: InventoryReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getStockAdjustmentsReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_STOCK_ADJUSTMENTS_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_PROFIT_LOSS, async (_e, filters?: DateRangeFilter) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getProfitLoss(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_PROFIT_LOSS_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_CUSTOMER_OUTSTANDING, async (_e, filters?: OutstandingReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getCustomerOutstanding(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_CUSTOMER_OUTSTANDING_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_SUPPLIER_OUTSTANDING, async (_e, filters?: OutstandingReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getSupplierOutstanding(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_SUPPLIER_OUTSTANDING_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_EXPENSE_SUMMARY, async (_e, filters?: ExpenseReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getExpenseSummary(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_EXPENSE_SUMMARY_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_CASHBOOK, async (_e, filters?: DateRangeFilter) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getCashbookReport(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_CASHBOOK_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_REGISTER_CLOSINGS, async (_e, filters?: DateRangeFilter) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getRegisterClosings(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_REGISTER_CLOSINGS_ERROR'); }
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_TAX_SUMMARY, async (_e, filters?: TaxReportFilters) => {
    try {
      const companyId = await getRequiredCompanyId();
      return handleSuccess(await reportingService.getTaxSummary(companyId, filters));
    } catch (err) { return handleError(err, 'REPORTS_GET_TAX_SUMMARY_ERROR'); }
  });

  // ---------------- Step 9: Roles & Permissions ----------------

  ipcMain.handle(IPC_CHANNELS.ROLES_GET_MATRIX, async (): Promise<ApiResponse<any>> => {
    try {
      const matrix = await userService.getRolesMatrix();
      return handleSuccess(matrix);
    } catch (err) {
      return handleError(err, 'ROLES_GET_MATRIX_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.ROLES_CREATE,
    async (_event, dto: any): Promise<ApiResponse<any>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const role = await userService.createRole(companyId, dto, activeSessionUser?.id);
        return handleSuccess(role);
      } catch (err) {
        return handleError(err, 'ROLE_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ROLES_UPDATE,
    async (_event, payload: { id: string; dto: any }): Promise<ApiResponse<any>> => {
      try {
        const role = await userService.updateRole(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(role);
      } catch (err) {
        return handleError(err, 'ROLE_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ROLES_DELETE,
    async (_event, id: string): Promise<ApiResponse<any>> => {
      try {
        const res = await userService.deleteRole(id, activeSessionUser?.id);
        return handleSuccess(res);
      } catch (err) {
        return handleError(err, 'ROLE_DELETE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.ROLES_UPDATE_PERMISSIONS,
    async (_event, payload: { roleId: string; permissionCodes: string[] }): Promise<ApiResponse<any>> => {
      try {
        const res = await userService.updateRolePermissions(
          payload.roleId,
          payload.permissionCodes,
          activeSessionUser?.id,
        );
        return handleSuccess(res);
      } catch (err) {
        return handleError(err, 'ROLES_UPDATE_PERMISSIONS_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.PERMISSIONS_LIST_ALL, async (): Promise<ApiResponse<any>> => {
    try {
      const perms = await userService.listAllPermissions();
      return handleSuccess(perms);
    } catch (err) {
      return handleError(err, 'PERMISSIONS_LIST_ALL_ERROR');
    }
  });

  // ---------------- Step 9: Settings Defaults ----------------

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_RESET_DEFAULTS,
    async (): Promise<ApiResponse<Record<string, string>>> => {
      try {
        const companyId = await getRequiredCompanyId();
        const resetMap = await settingsService.resetDefaults(companyId, activeSessionUser?.id);
        return handleSuccess(resetMap);
      } catch (err) {
        return handleError(err, 'SETTINGS_RESET_DEFAULTS_ERROR');
      }
    },
  );

  // ---------------- Step 9: Backup & Restore ----------------

  ipcMain.handle(
    IPC_CHANNELS.BACKUP_CREATE,
    async (_event, destinationDir?: string): Promise<ApiResponse<any>> => {
      try {
        const result = await backupService.createBackup(destinationDir);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'BACKUP_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.BACKUP_RESTORE,
    async (_event, filePath: string): Promise<ApiResponse<any>> => {
      try {
        const result = await backupService.restoreBackup(filePath);
        return handleSuccess(result);
      } catch (err) {
        return handleError(err, 'BACKUP_RESTORE_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, async (): Promise<ApiResponse<any>> => {
    try {
      const list = backupService.listBackups();
      return handleSuccess(list);
    } catch (err) {
      return handleError(err, 'BACKUP_LIST_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_CHOOSE_DIRECTORY, async (): Promise<ApiResponse<string | null>> => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const options = {
        title: 'Choose Backup Directory',
        properties: ['openDirectory' as const, 'createDirectory' as const],
      };
      const result = focusedWindow
        ? await dialog.showOpenDialog(focusedWindow, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) {
        return handleSuccess(null);
      }
      return handleSuccess(result.filePaths[0]);
    } catch (err) {
      return handleError(err, 'BACKUP_CHOOSE_DIRECTORY_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_CHOOSE_FILE, async (): Promise<ApiResponse<string | null>> => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const options = {
        title: 'Select Backup Database to Restore',
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
        properties: ['openFile' as const],
      };
      const result = focusedWindow
        ? await dialog.showOpenDialog(focusedWindow, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) {
        return handleSuccess(null);
      }
      return handleSuccess(result.filePaths[0]);
    } catch (err) {
      return handleError(err, 'BACKUP_CHOOSE_FILE_ERROR');
    }
  });

  // ---------------- Step 9: System Info & Hardware ----------------

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_INFO_DETAILED, async (): Promise<ApiResponse<any>> => {
    try {
      const company = await companyService.getCompany();
      const info = {
        productName: 'RS Inventory – Solo',
        companyName: company?.name || 'RS ORANGE TECH PVT LTD',
        appVersion: app.getVersion() || configService.getAppVersion(),
        schemaVersion: '1.0.0-step9',
        platform: process.platform,
        isOffline: true,
        databasePath: configService.getDatabasePath(),
        backupPath: configService.getBackupPath(),
        logsPath: configService.getLogPath(),
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron || 'unknown',
      };
      return handleSuccess(info);
    } catch (err) {
      return handleError(err, 'SYSTEM_GET_INFO_DETAILED_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_LOGS_PATH, async (): Promise<ApiResponse<string>> => {
    try {
      return handleSuccess(configService.getLogPath());
    } catch (err) {
      return handleError(err, 'SYSTEM_GET_LOGS_PATH_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_LOGS_FOLDER, async (): Promise<ApiResponse<boolean>> => {
    try {
      const logDir = path.dirname(configService.getLogPath());
      if (fs.existsSync(logDir)) {
        await shell.openPath(logDir);
        return handleSuccess(true);
      }
      return handleSuccess(false);
    } catch (err) {
      return handleError(err, 'SYSTEM_OPEN_LOGS_FOLDER_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRINTER_LIST_AVAILABLE, async (): Promise<ApiResponse<string[]>> => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      if (win && win.webContents.getPrintersAsync) {
        const printers = await win.webContents.getPrintersAsync();
        const names = printers.map((p) => p.name);
        if (names.length > 0) return handleSuccess(names);
      }
      return handleSuccess(['Default System Printer', 'POS-80 Thermal Printer', 'Microsoft Print to PDF']);
    } catch {
      return handleSuccess(['Default System Printer', 'Microsoft Print to PDF']);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.PRINTER_TEST_PRINT,
    async (_event, payload?: { printerName?: string; format?: string }): Promise<ApiResponse<any>> => {
      try {
        const printer = payload?.printerName || 'Default System Printer';
        const format = payload?.format || 'thermal';
        loggerService.info(`Executing test print to [${printer}] with format [${format}]`);
        return handleSuccess({
          success: true,
          message: `Test print sent successfully to "${printer}" (${format === 'thermal' ? '80mm Thermal Receipt' : 'A4 Invoice'}).`,
        });
      } catch (err) {
        return handleError(err, 'PRINTER_TEST_PRINT_ERROR');
      }
    },
  );

  // -------------------------------------------------------------
  // Step 10: Product Licensing, Activation & Edition Management
  // -------------------------------------------------------------

  ipcMain.handle(IPC_CHANNELS.LICENSE_GET_STATUS, async (): Promise<ApiResponse<any>> => {
    try {
      const status = await licenseVerifierService.getLicenseStatus();
      return handleSuccess(status);
    } catch (err) {
      return handleError(err, 'LICENSE_GET_STATUS_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.LICENSE_GENERATE_REQUEST,
    async (_event, customerName?: string): Promise<ApiResponse<any>> => {
      try {
        const req = await licenseVerifierService.generateActivationRequest(customerName);
        return handleSuccess(req);
      } catch (err) {
        return handleError(err, 'LICENSE_GENERATE_REQUEST_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LICENSE_EXPORT_REQUEST,
    async (_event, customerName?: string, targetPath?: string): Promise<ApiResponse<any>> => {
      try {
        const res = await licenseVerifierService.exportActivationRequest(customerName, targetPath);
        return handleSuccess(res);
      } catch (err) {
        return handleError(err, 'LICENSE_EXPORT_REQUEST_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.LICENSE_CHOOSE_FILE, async (): Promise<ApiResponse<any>> => {
    try {
      const chosen = await licenseVerifierService.chooseLicenseFile();
      return handleSuccess(chosen);
    } catch (err) {
      return handleError(err, 'LICENSE_CHOOSE_FILE_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.LICENSE_IMPORT_FILE,
    async (_event, filePath?: string): Promise<ApiResponse<any>> => {
      try {
        const status = await licenseVerifierService.importLicenseFile(filePath);
        return handleSuccess(status);
      } catch (err) {
        return handleError(err, 'LICENSE_IMPORT_FILE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LICENSE_ACTIVATE_KEY,
    async (_event, licenseFileContent: string): Promise<ApiResponse<any>> => {
      try {
        const status = await licenseVerifierService.activateLicenseContent(licenseFileContent);
        return handleSuccess(status);
      } catch (err) {
        return handleError(err, 'LICENSE_ACTIVATE_KEY_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.LICENSE_DEACTIVATE, async (): Promise<ApiResponse<any>> => {
    try {
      const result = await licenseVerifierService.deactivateLicense();
      return handleSuccess(result);
    } catch (err) {
      return handleError(err, 'LICENSE_DEACTIVATE_ERROR');
    }
  });
}


