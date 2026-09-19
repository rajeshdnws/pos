import {
  AuditService,
  AuthService,
  BrandService,
  CategoryService,
  CompanyService,
  DemoDataService,
  LocationService,
  ProductService,
  PurchasePaymentService,
  PurchaseReturnService,
  PurchaseService,
  SettingsService,
  StockAdjustmentService,
  StockService,
  StocktakeService,
  StockTransferService,
  SupplierLedgerService,
  SupplierService,
  UnitService,
  UserService,
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
} from '@rs-inventory/types';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConfigService } from '../services/config.service.js';
import { LoggerService } from '../services/logger.service.js';

let activeSessionUser: User | null = null;
let activeSessionToken: string | null = null;
let activeSessionPermissions: string[] = [];

export function registerIpcHandlers(): void {
  const configService = ConfigService.getInstance();
  const loggerService = LoggerService.getInstance();
  const dbService = DatabaseService.getInstance();
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
}


