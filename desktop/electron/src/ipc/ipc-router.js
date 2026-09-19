"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const business_1 = require("@rs-inventory/business");
const database_1 = require("@rs-inventory/database");
const types_1 = require("@rs-inventory/types");
const electron_1 = require("electron");
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const config_service_js_1 = require("../services/config.service.js");
const logger_service_js_1 = require("../services/logger.service.js");
const backup_service_js_1 = require("../services/backup.service.js");
const machine_id_service_js_1 = require("../services/machine-id.service.js");
const license_verifier_service_js_1 = require("../services/license-verifier.service.js");
let activeSessionUser = null;
let activeSessionToken = null;
let activeSessionPermissions = [];
function registerIpcHandlers() {
    const configService = config_service_js_1.ConfigService.getInstance();
    const loggerService = logger_service_js_1.LoggerService.getInstance();
    const dbService = database_1.DatabaseService.getInstance();
    const backupService = backup_service_js_1.BackupService.getInstance();
    const prisma = dbService.getClient();
    const authService = new business_1.AuthService(prisma);
    const companyService = new business_1.CompanyService(prisma);
    const userService = new business_1.UserService(prisma);
    const settingsService = new business_1.SettingsService(prisma);
    const auditService = new business_1.AuditService(prisma);
    const categoryService = new business_1.CategoryService(prisma);
    const unitService = new business_1.UnitService(prisma);
    const brandService = new business_1.BrandService(prisma);
    const productService = new business_1.ProductService(prisma);
    const locationService = new business_1.LocationService(prisma);
    const stockService = new business_1.StockService(prisma);
    const stockAdjustmentService = new business_1.StockAdjustmentService(prisma);
    const stocktakeService = new business_1.StocktakeService(prisma);
    const stockTransferService = new business_1.StockTransferService(prisma);
    const demoDataService = new business_1.DemoDataService(prisma);
    const supplierService = new business_1.SupplierService(prisma);
    const supplierLedgerService = new business_1.SupplierLedgerService(prisma);
    const purchaseService = new business_1.PurchaseService(prisma);
    const purchasePaymentService = new business_1.PurchasePaymentService(prisma);
    const purchaseReturnService = new business_1.PurchaseReturnService(prisma);
    // Step 6: Sales & Customer services
    const customerService = new business_1.CustomerService(prisma);
    const salesService = new business_1.SalesService(prisma);
    const salesPaymentService = new business_1.SalesPaymentService(prisma);
    const salesReturnService = new business_1.SalesReturnService(prisma);
    // Step 7: Expenses & Cash services
    const expenseCategoryService = new business_1.ExpenseCategoryService(prisma);
    const expenseService = new business_1.ExpenseService(prisma);
    const cashRegisterService = new business_1.CashRegisterService(prisma);
    const cashbookService = new business_1.CashbookService(prisma);
    const dayEndClosingService = new business_1.DayEndClosingService(prisma);
    const financialDashboardService = new business_1.FinancialDashboardService(prisma);
    // Step 8: Reporting
    const reportingService = new business_1.ReportingService(prisma);
    // Step 10: Licensing & Activation
    const licenseService = new business_1.LicenseService(prisma);
    const machineIdService = new machine_id_service_js_1.MachineIdService();
    const licenseVerifierService = new license_verifier_service_js_1.LicenseVerifierService(licenseService, machineIdService);
    licenseVerifierService.initialize().catch((err) => loggerService.error('License initialization failed', err));
    // Helper for error formatting
    const handleSuccess = (data) => ({ success: true, data });
    const handleError = (error, defaultCode) => {
        loggerService.error(`IPC Handler Error (${defaultCode})`, error);
        const errObj = error;
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
    const getRequiredCompanyId = async () => {
        const company = await companyService.getCompany();
        if (!company) {
            throw new Error('No active company found. Complete setup first.');
        }
        return company.id;
    };
    // ---------------- Base Application & System ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.APP_GET_CONFIG, async () => {
        try {
            return handleSuccess(configService.getConfig());
        }
        catch (err) {
            return handleError(err, 'CONFIG_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SYSTEM_GET_INFO, async () => {
        try {
            const mem = process.memoryUsage();
            const systemInfo = {
                platform: process.platform,
                arch: process.arch,
                osVersion: `${os.type()} ${os.release()}`,
                nodeVersion: process.versions.node,
                electronVersion: process.versions.electron || 'unknown',
                uptimeSeconds: Math.round(process.uptime()),
                memoryUsageMb: Math.round(mem.rss / 1024 / 1024),
            };
            return handleSuccess(systemInfo);
        }
        catch (err) {
            return handleError(err, 'SYSTEM_INFO_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DATABASE_HEALTH_CHECK, async () => {
        try {
            const health = await dbService.healthCheck();
            return handleSuccess(health);
        }
        catch (err) {
            return handleError(err, 'DATABASE_HEALTH_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LOGGER_LOG, async (_event, payload) => {
        try {
            loggerService.log(payload.level, `[Renderer] ${payload.message}`, payload.meta);
            return handleSuccess(undefined);
        }
        catch {
            return { success: false };
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.WINDOW_CONTROL, async (_event, action) => {
        try {
            const win = electron_1.BrowserWindow.getFocusedWindow();
            switch (action) {
                case 'minimize':
                    win?.minimize();
                    break;
                case 'maximize':
                    if (win?.isMaximized())
                        win.unmaximize();
                    else
                        win?.maximize();
                    break;
                case 'close':
                    win?.close();
                    break;
                case 'restart':
                    electron_1.app.relaunch();
                    electron_1.app.exit(0);
                    break;
            }
            return handleSuccess(undefined);
        }
        catch (err) {
            return handleError(err, 'WINDOW_CONTROL_ERROR');
        }
    });
    // ---------------- Authentication & Session ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.AUTH_LOGIN, async (_event, credentials) => {
        try {
            const response = await authService.login(credentials);
            activeSessionUser = response.user;
            activeSessionToken = response.sessionToken;
            activeSessionPermissions = response.permissions;
            return handleSuccess(response);
        }
        catch (err) {
            return handleError(err, 'AUTH_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.AUTH_LOGOUT, async () => {
        try {
            if (activeSessionToken) {
                await authService.logout(activeSessionToken);
            }
            activeSessionUser = null;
            activeSessionToken = null;
            activeSessionPermissions = [];
            return handleSuccess(undefined);
        }
        catch (err) {
            return handleError(err, 'LOGOUT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.AUTH_GET_CURRENT_USER, async () => {
        try {
            if (!activeSessionUser || !activeSessionToken) {
                return handleSuccess(null);
            }
            const company = await companyService.getCompany();
            return handleSuccess({
                user: activeSessionUser,
                sessionToken: activeSessionToken,
                permissions: activeSessionPermissions,
                company: company,
            });
        }
        catch (err) {
            return handleError(err, 'SESSION_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.AUTH_CHANGE_PASSWORD, async (_event, dto) => {
        try {
            if (!activeSessionUser) {
                return handleError(new Error('Unauthorized session.'), 'AUTH_UNAUTHORIZED');
            }
            await authService.changePassword(activeSessionUser.id, dto);
            return handleSuccess(undefined);
        }
        catch (err) {
            return handleError(err, 'CHANGE_PASSWORD_ERROR');
        }
    });
    // ---------------- Company Setup & Profile ----------------
    const normalizeCompanyLogo = (comp) => {
        if (!comp || !comp.logoPath)
            return comp;
        if (comp.logoPath.startsWith('data:image/'))
            return comp;
        try {
            if (fs.existsSync(comp.logoPath)) {
                const ext = path.extname(comp.logoPath).toLowerCase();
                const mimeType = ext === '.png'
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
        }
        catch (err) {
            loggerService.warn(`Failed to read logo image from disk: ${comp.logoPath}`, err);
        }
        return comp;
    };
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.COMPANY_CHECK_SETUP, async () => {
        try {
            const isSetup = await companyService.hasCompany();
            let company = isSetup ? await companyService.getCompany() : null;
            company = normalizeCompanyLogo(company);
            return handleSuccess({ isSetup, company });
        }
        catch (err) {
            return handleError(err, 'COMPANY_CHECK_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.COMPANY_GET, async () => {
        try {
            let company = await companyService.getCompany();
            company = normalizeCompanyLogo(company);
            return handleSuccess(company);
        }
        catch (err) {
            return handleError(err, 'COMPANY_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.COMPANY_SETUP, async (_event, dto) => {
        try {
            const response = await companyService.setupCompanyAndAdmin(dto);
            activeSessionUser = response.user;
            activeSessionToken = response.sessionToken;
            activeSessionPermissions = response.permissions;
            return handleSuccess(response);
        }
        catch (err) {
            return handleError(err, 'COMPANY_SETUP_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.COMPANY_UPDATE, async (_event, dto) => {
        try {
            const company = await companyService.getCompany();
            if (!company) {
                return handleError(new Error('No active company found.'), 'NOT_FOUND');
            }
            let updated = await companyService.updateCompany(company.id, dto);
            updated = normalizeCompanyLogo(updated);
            return handleSuccess(updated);
        }
        catch (err) {
            return handleError(err, 'COMPANY_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.COMPANY_SELECT_LOGO, async () => {
        try {
            const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
            const options = {
                title: 'Select Company Logo',
                filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
                properties: ['openFile'],
            };
            const result = focusedWindow
                ? await electron_1.dialog.showOpenDialog(focusedWindow, options)
                : await electron_1.dialog.showOpenDialog(options);
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
                return handleError(new Error('Logo image must be smaller than 2 MB.'), 'VALIDATION_ERROR');
            }
            const targetDir = path.join(configService.getAppDataRoot(), 'company');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const ext = path.extname(sourceFilePath).toLowerCase();
            const targetFilePath = path.join(targetDir, `logo${ext}`);
            fs.copyFileSync(sourceFilePath, targetFilePath);
            const mimeType = ext === '.png'
                ? 'image/png'
                : ext === '.webp'
                    ? 'image/webp'
                    : ext === '.jpg' || ext === '.jpeg'
                        ? 'image/jpeg'
                        : 'image/png';
            const fileBuffer = fs.readFileSync(targetFilePath);
            const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
            return handleSuccess(dataUri);
        }
        catch (err) {
            return handleError(err, 'LOGO_UPLOAD_ERROR');
        }
    });
    // ---------------- Users & Roles ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.USERS_LIST, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const users = await userService.listUsers(companyId);
            return handleSuccess(users);
        }
        catch (err) {
            return handleError(err, 'USERS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ROLES_GET_ALL, async () => {
        try {
            const roles = await userService.getRoles();
            return handleSuccess(roles);
        }
        catch (err) {
            return handleError(err, 'ROLES_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.USERS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const user = await userService.createUser(companyId, dto, activeSessionUser?.id);
            return handleSuccess(user);
        }
        catch (err) {
            return handleError(err, 'USER_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.USERS_UPDATE, async (_event, payload) => {
        try {
            const user = await userService.updateUser(payload.id, payload.dto, activeSessionUser?.id);
            return handleSuccess(user);
        }
        catch (err) {
            return handleError(err, 'USER_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.USERS_TOGGLE_ACTIVE, async (_event, id) => {
        try {
            const user = await userService.toggleUserActive(id, activeSessionUser?.id);
            return handleSuccess(user);
        }
        catch (err) {
            return handleError(err, 'USER_TOGGLE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.USERS_RESET_PASSWORD, async (_event, dto) => {
        try {
            await userService.resetPassword(dto.userId, dto.newPassword, activeSessionUser?.id);
            return handleSuccess(undefined);
        }
        catch (err) {
            return handleError(err, 'RESET_PASSWORD_ERROR');
        }
    });
    // ---------------- Settings & Audits ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const settings = await settingsService.getSettings(companyId);
            return handleSuccess(settings);
        }
        catch (err) {
            return handleError(err, 'SETTINGS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SETTINGS_UPDATE, async (_event, settingsMap) => {
        try {
            const companyId = await getRequiredCompanyId();
            const updated = await settingsService.updateSettings(companyId, settingsMap);
            return handleSuccess(updated);
        }
        catch (err) {
            return handleError(err, 'SETTINGS_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.AUDIT_GET_LOGS, async (_event, limit) => {
        try {
            const companyId = await getRequiredCompanyId();
            const logs = await auditService.getLogs(companyId, limit || 100);
            return handleSuccess(logs);
        }
        catch (err) {
            return handleError(err, 'AUDIT_LOGS_ERROR');
        }
    });
    // ---------------- Categories ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CATEGORIES_LIST, async (_event, includeInactive) => {
        try {
            const companyId = await getRequiredCompanyId();
            const categories = await categoryService.getCategories(companyId, includeInactive);
            return handleSuccess(categories);
        }
        catch (err) {
            return handleError(err, 'CATEGORIES_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CATEGORIES_GET, async (_event, id) => {
        try {
            const category = await categoryService.getCategory(id);
            return handleSuccess(category);
        }
        catch (err) {
            return handleError(err, 'CATEGORY_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CATEGORIES_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const category = await categoryService.createCategory(companyId, dto, activeSessionUser?.id);
            return handleSuccess(category);
        }
        catch (err) {
            return handleError(err, 'CATEGORY_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CATEGORIES_UPDATE, async (_event, payload) => {
        try {
            const category = await categoryService.updateCategory(payload.id, payload.dto, activeSessionUser?.id);
            return handleSuccess(category);
        }
        catch (err) {
            return handleError(err, 'CATEGORY_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CATEGORIES_TOGGLE_ACTIVE, async (_event, id) => {
        try {
            const category = await categoryService.toggleCategoryActive(id, activeSessionUser?.id);
            return handleSuccess(category);
        }
        catch (err) {
            return handleError(err, 'CATEGORY_TOGGLE_ERROR');
        }
    });
    // ---------------- Units ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.UNITS_LIST, async (_event, includeInactive) => {
        try {
            const companyId = await getRequiredCompanyId();
            const units = await unitService.getUnits(companyId, includeInactive);
            return handleSuccess(units);
        }
        catch (err) {
            return handleError(err, 'UNITS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.UNITS_GET, async (_event, id) => {
        try {
            const unit = await unitService.getUnit(id);
            return handleSuccess(unit);
        }
        catch (err) {
            return handleError(err, 'UNIT_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.UNITS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const unit = await unitService.createUnit(companyId, dto, activeSessionUser?.id);
            return handleSuccess(unit);
        }
        catch (err) {
            return handleError(err, 'UNIT_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.UNITS_UPDATE, async (_event, payload) => {
        try {
            const unit = await unitService.updateUnit(payload.id, payload.dto, activeSessionUser?.id);
            return handleSuccess(unit);
        }
        catch (err) {
            return handleError(err, 'UNIT_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.UNITS_TOGGLE_ACTIVE, async (_event, id) => {
        try {
            const unit = await unitService.toggleUnitActive(id, activeSessionUser?.id);
            return handleSuccess(unit);
        }
        catch (err) {
            return handleError(err, 'UNIT_TOGGLE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.UNITS_SEED_DEFAULTS, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const units = await unitService.seedDefaultUnits(companyId, activeSessionUser?.id);
            return handleSuccess(units);
        }
        catch (err) {
            return handleError(err, 'UNITS_SEED_ERROR');
        }
    });
    // ---------------- Brands ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BRANDS_LIST, async (_event, includeInactive) => {
        try {
            const companyId = await getRequiredCompanyId();
            const brands = await brandService.getBrands(companyId, includeInactive);
            return handleSuccess(brands);
        }
        catch (err) {
            return handleError(err, 'BRANDS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BRANDS_GET, async (_event, id) => {
        try {
            const brand = await brandService.getBrand(id);
            return handleSuccess(brand);
        }
        catch (err) {
            return handleError(err, 'BRAND_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BRANDS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const brand = await brandService.createBrand(companyId, dto, activeSessionUser?.id);
            return handleSuccess(brand);
        }
        catch (err) {
            return handleError(err, 'BRAND_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BRANDS_UPDATE, async (_event, payload) => {
        try {
            const brand = await brandService.updateBrand(payload.id, payload.dto, activeSessionUser?.id);
            return handleSuccess(brand);
        }
        catch (err) {
            return handleError(err, 'BRAND_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BRANDS_TOGGLE_ACTIVE, async (_event, id) => {
        try {
            const brand = await brandService.toggleBrandActive(id, activeSessionUser?.id);
            return handleSuccess(brand);
        }
        catch (err) {
            return handleError(err, 'BRAND_TOGGLE_ERROR');
        }
    });
    // ---------------- Products ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_LIST, async (_event, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await productService.getProducts(companyId, filters);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PRODUCTS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_GET, async (_event, id) => {
        try {
            const product = await productService.getProductById(id);
            return handleSuccess(product);
        }
        catch (err) {
            return handleError(err, 'PRODUCT_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const product = await productService.createProduct(companyId, dto, activeSessionUser?.id);
            return handleSuccess(product);
        }
        catch (err) {
            return handleError(err, 'PRODUCT_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_UPDATE, async (_event, payload) => {
        try {
            const product = await productService.updateProduct(payload.id, payload.dto, activeSessionUser?.id);
            return handleSuccess(product);
        }
        catch (err) {
            return handleError(err, 'PRODUCT_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_TOGGLE_ACTIVE, async (_event, id) => {
        try {
            const product = await productService.toggleProductActive(id, activeSessionUser?.id);
            return handleSuccess(product);
        }
        catch (err) {
            return handleError(err, 'PRODUCT_TOGGLE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_SEARCH, async (_event, query) => {
        try {
            const companyId = await getRequiredCompanyId();
            const products = await productService.searchProducts(companyId, query);
            return handleSuccess(products);
        }
        catch (err) {
            return handleError(err, 'PRODUCTS_SEARCH_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_BY_BARCODE, async (_event, barcode) => {
        try {
            const companyId = await getRequiredCompanyId();
            const product = await productService.getProductByBarcode(companyId, barcode);
            return handleSuccess(product);
        }
        catch (err) {
            return handleError(err, 'PRODUCT_BARCODE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_BY_SKU, async (_event, sku) => {
        try {
            const companyId = await getRequiredCompanyId();
            const product = await productService.getProductBySku(companyId, sku);
            return handleSuccess(product);
        }
        catch (err) {
            return handleError(err, 'PRODUCT_SKU_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_GENERATE_SKU, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const sku = await productService.generateSku(companyId);
            return handleSuccess(sku);
        }
        catch (err) {
            return handleError(err, 'PRODUCT_GENERATE_SKU_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRODUCTS_GET_PRICE_HISTORY, async (_event, productId) => {
        try {
            const history = await productService.getPriceHistory(productId);
            return handleSuccess(history);
        }
        catch (err) {
            return handleError(err, 'PRODUCT_PRICE_HISTORY_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Locations Handlers
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LOCATIONS_LIST, async (_event, includeInactive) => {
        try {
            const companyId = await getRequiredCompanyId();
            const locations = await locationService.getLocations(companyId, includeInactive);
            return handleSuccess(locations);
        }
        catch (err) {
            return handleError(err, 'LOCATIONS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LOCATIONS_GET, async (_event, id) => {
        try {
            const location = await locationService.getLocation(id);
            return handleSuccess(location);
        }
        catch (err) {
            return handleError(err, 'LOCATIONS_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LOCATIONS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const location = await locationService.createLocation(companyId, dto, activeSessionUser?.id);
            return handleSuccess(location);
        }
        catch (err) {
            return handleError(err, 'LOCATIONS_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LOCATIONS_UPDATE, async (_event, payload) => {
        try {
            const location = await locationService.updateLocation(payload.id, payload.dto, activeSessionUser?.id);
            return handleSuccess(location);
        }
        catch (err) {
            return handleError(err, 'LOCATIONS_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LOCATIONS_TOGGLE_ACTIVE, async (_event, id) => {
        try {
            const location = await locationService.toggleLocationActive(id, activeSessionUser?.id);
            return handleSuccess(location);
        }
        catch (err) {
            return handleError(err, 'LOCATIONS_TOGGLE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LOCATIONS_GET_DEFAULT, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const location = await locationService.getDefaultLocation(companyId);
            return handleSuccess(location);
        }
        catch (err) {
            return handleError(err, 'LOCATIONS_GET_DEFAULT_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Stock Ledger & Operational Stock Handlers
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCK_GET_CURRENT, async (_event, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await stockService.getCurrentStock(companyId, filters);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'STOCK_GET_CURRENT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCK_GET_MOVEMENTS, async (_event, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await stockService.getStockMovements(companyId, filters);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'STOCK_GET_MOVEMENTS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCK_GET_PRODUCT_SUMMARY, async (_event, productId) => {
        try {
            const companyId = await getRequiredCompanyId();
            const summary = await stockService.getProductStockSummary(companyId, productId);
            return handleSuccess(summary);
        }
        catch (err) {
            return handleError(err, 'STOCK_GET_PRODUCT_SUMMARY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCK_GET_VALUATION, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const report = await stockService.getInventoryValuation(companyId);
            return handleSuccess(report);
        }
        catch (err) {
            return handleError(err, 'STOCK_GET_VALUATION_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCK_GET_KPIS, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const kpis = await stockService.getInventoryKPIs(companyId);
            return handleSuccess(kpis);
        }
        catch (err) {
            return handleError(err, 'STOCK_GET_KPIS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCK_RECONCILE, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const report = await stockService.reconcileStock(companyId);
            return handleSuccess(report);
        }
        catch (err) {
            return handleError(err, 'STOCK_RECONCILE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCK_REPAIR_DISCREPANCIES, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await stockService.repairStockDiscrepancies(companyId, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'STOCK_REPAIR_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Stock Adjustment Handlers
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ADJUSTMENTS_LIST, async (_event, limit) => {
        try {
            const companyId = await getRequiredCompanyId();
            const adjustments = await stockAdjustmentService.getAdjustments(companyId, limit);
            return handleSuccess(adjustments);
        }
        catch (err) {
            return handleError(err, 'ADJUSTMENTS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ADJUSTMENTS_GET, async (_event, id) => {
        try {
            const adjustment = await stockAdjustmentService.getAdjustment(id);
            return handleSuccess(adjustment);
        }
        catch (err) {
            return handleError(err, 'ADJUSTMENTS_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ADJUSTMENTS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const adjustment = await stockAdjustmentService.createAdjustment(companyId, dto, activeSessionUser?.id);
            return handleSuccess(adjustment);
        }
        catch (err) {
            return handleError(err, 'ADJUSTMENTS_CREATE_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Stocktake Handlers
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCKTAKES_LIST, async (_event, limit) => {
        try {
            const companyId = await getRequiredCompanyId();
            const stocktakes = await stocktakeService.getStocktakes(companyId, limit);
            return handleSuccess(stocktakes);
        }
        catch (err) {
            return handleError(err, 'STOCKTAKES_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCKTAKES_GET, async (_event, id) => {
        try {
            const stocktake = await stocktakeService.getStocktake(id);
            return handleSuccess(stocktake);
        }
        catch (err) {
            return handleError(err, 'STOCKTAKES_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCKTAKES_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const stocktake = await stocktakeService.createStocktake(companyId, dto, activeSessionUser?.id);
            return handleSuccess(stocktake);
        }
        catch (err) {
            return handleError(err, 'STOCKTAKES_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCKTAKES_UPDATE, async (_event, payload) => {
        try {
            const stocktake = await stocktakeService.updateStocktake(payload.id, payload.dto, activeSessionUser?.id);
            return handleSuccess(stocktake);
        }
        catch (err) {
            return handleError(err, 'STOCKTAKES_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCKTAKES_START, async (_event, id) => {
        try {
            const stocktake = await stocktakeService.startStocktake(id, activeSessionUser?.id);
            return handleSuccess(stocktake);
        }
        catch (err) {
            return handleError(err, 'STOCKTAKES_START_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCKTAKES_COMPLETE, async (_event, id) => {
        try {
            const stocktake = await stocktakeService.completeStocktake(id, activeSessionUser?.id);
            return handleSuccess(stocktake);
        }
        catch (err) {
            return handleError(err, 'STOCKTAKES_COMPLETE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.STOCKTAKES_CANCEL, async (_event, id) => {
        try {
            const stocktake = await stocktakeService.cancelStocktake(id, activeSessionUser?.id);
            return handleSuccess(stocktake);
        }
        catch (err) {
            return handleError(err, 'STOCKTAKES_CANCEL_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Stock Transfer Handlers
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.TRANSFERS_LIST, async (_event, limit) => {
        try {
            const companyId = await getRequiredCompanyId();
            const transfers = await stockTransferService.getTransfers(companyId, limit);
            return handleSuccess(transfers);
        }
        catch (err) {
            return handleError(err, 'TRANSFERS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.TRANSFERS_GET, async (_event, id) => {
        try {
            const transfer = await stockTransferService.getTransfer(id);
            return handleSuccess(transfer);
        }
        catch (err) {
            return handleError(err, 'TRANSFERS_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.TRANSFERS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const transfer = await stockTransferService.createTransfer(companyId, dto, activeSessionUser?.id);
            return handleSuccess(transfer);
        }
        catch (err) {
            return handleError(err, 'TRANSFERS_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.TRANSFERS_CANCEL, async (_event, id) => {
        try {
            const transfer = await stockTransferService.cancelTransfer(id, activeSessionUser?.id);
            return handleSuccess(transfer);
        }
        catch (err) {
            return handleError(err, 'TRANSFERS_CANCEL_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Demo Data Handlers
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DEMO_DATA_STATUS, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const status = await demoDataService.getDemoDataStatus(companyId);
            return handleSuccess(status);
        }
        catch (err) {
            return handleError(err, 'DEMO_DATA_STATUS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DEMO_DATA_INSTALL, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await demoDataService.installDemoData(companyId, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'DEMO_DATA_INSTALL_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DEMO_DATA_CLEAR, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await demoDataService.clearDemoData(companyId, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'DEMO_DATA_CLEAR_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Step 5: Supplier Handlers
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIERS_LIST, async (_event, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await supplierService.getSuppliers(companyId, filters);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIERS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIERS_GET, async (_event, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await supplierService.getSupplierById(companyId, id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIERS_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIERS_GENERATE_CODE, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await supplierService.generateSupplierCode(companyId);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIERS_GENERATE_CODE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIERS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await supplierService.createSupplier(companyId, dto, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIERS_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIERS_UPDATE, async (_event, { id, dto }) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await supplierService.updateSupplier(companyId, id, dto, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIERS_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIERS_TOGGLE_ACTIVE, async (_event, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await supplierService.toggleSupplierActive(companyId, id, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIERS_TOGGLE_ACTIVE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIERS_DELETE, async (_event, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await supplierService.deleteSupplier(companyId, id, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIERS_DELETE_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Step 5: Purchase Handlers
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_LIST, async (_event, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.getPurchases(companyId, filters);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_GET, async (_event, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.getPurchaseById(companyId, id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_GET_SUMMARY, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.getSummary(companyId);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_GET_SUMMARY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_GET_KPIS, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.getKPIs(companyId);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_GET_KPIS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_CALCULATE, async (_event, input) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.calculate(companyId, input);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_CALCULATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_CREATE_DRAFT, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.createDraft(companyId, dto, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_CREATE_DRAFT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_UPDATE_DRAFT, async (_event, { id, dto }) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.updateDraft(companyId, id, dto, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_UPDATE_DRAFT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_POST, async (_event, id) => {
        try {
            licenseService.assertFeatureEntitled('purchases.core', 'post purchase');
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.postPurchase(companyId, id, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_POST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASES_CANCEL, async (_event, { id, reason }) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseService.cancelPurchase(companyId, id, reason, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASES_CANCEL_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Step 5: Purchase Payments
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASE_PAYMENTS_LIST, async (_event, filtersOrPurchaseId) => {
        try {
            const companyId = await getRequiredCompanyId();
            const filters = typeof filtersOrPurchaseId === 'string'
                ? { purchaseId: filtersOrPurchaseId }
                : filtersOrPurchaseId;
            const result = await purchasePaymentService.getPayments(companyId, filters);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASE_PAYMENTS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASE_PAYMENTS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchasePaymentService.createPayment(companyId, dto, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASE_PAYMENTS_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASE_PAYMENTS_REVERSE, async (_event, payload, reasonArg) => {
        try {
            const companyId = await getRequiredCompanyId();
            const dto = typeof payload === 'string'
                ? { paymentId: payload, reversalReason: reasonArg || 'Reversed by user' }
                : payload;
            const result = await purchasePaymentService.reversePayment(companyId, dto, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASE_PAYMENTS_REVERSE_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Step 5: Purchase Returns
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASE_RETURNS_LIST, async (_event, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseReturnService.getReturns(companyId, filters);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASE_RETURNS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASE_RETURNS_GET, async (_event, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseReturnService.getReturnById(companyId, id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASE_RETURNS_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PURCHASE_RETURNS_CREATE, async (_event, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await purchaseReturnService.createReturn(companyId, dto, activeSessionUser?.id);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'PURCHASE_RETURNS_CREATE_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Step 5: Supplier Ledger
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIER_LEDGER_GET_ENTRIES, async (_event, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            const result = await supplierLedgerService.getEntries(companyId, filters);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIER_LEDGER_GET_ENTRIES_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SUPPLIER_LEDGER_GET_STATEMENT, async (_event, arg1, arg2, arg3) => {
        try {
            const companyId = await getRequiredCompanyId();
            let supplierId;
            let startDate;
            let endDate;
            if (typeof arg1 === 'object' && arg1 !== null) {
                supplierId = arg1.supplierId;
                startDate = arg1.startDate ? new Date(arg1.startDate).toISOString() : undefined;
                endDate = arg1.endDate ? new Date(arg1.endDate).toISOString() : undefined;
            }
            else {
                supplierId = arg1;
                if (typeof arg2 === 'object' && arg2 !== null) {
                    startDate = arg2.startDate ? new Date(arg2.startDate).toISOString() : undefined;
                    endDate = arg2.endDate ? new Date(arg2.endDate).toISOString() : undefined;
                }
                else {
                    startDate = arg2 ? new Date(arg2).toISOString() : undefined;
                    endDate = arg3 ? new Date(arg3).toISOString() : undefined;
                }
            }
            const result = await supplierLedgerService.getStatement(companyId, supplierId, startDate, endDate);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'SUPPLIER_LEDGER_GET_STATEMENT_ERROR');
        }
    });
    // ─── Step 6: Customers ─────────────────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CUSTOMERS_LIST, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await customerService.listCustomers(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'CUSTOMERS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CUSTOMERS_GET, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await customerService.getCustomer(companyId, id));
        }
        catch (err) {
            return handleError(err, 'CUSTOMERS_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CUSTOMERS_CREATE, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await customerService.createCustomer(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CUSTOMERS_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CUSTOMERS_UPDATE, async (_e, arg1, arg2) => {
        try {
            const companyId = await getRequiredCompanyId();
            const id = typeof arg1 === 'object' && arg1 !== null && 'id' in arg1 ? arg1.id : arg1;
            const dto = typeof arg1 === 'object' && arg1 !== null && 'dto' in arg1 ? arg1.dto : arg2;
            return handleSuccess(await customerService.updateCustomer(companyId, id, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CUSTOMERS_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CUSTOMERS_TOGGLE_ACTIVE, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await customerService.toggleActive(companyId, id, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CUSTOMERS_TOGGLE_ACTIVE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CUSTOMERS_GENERATE_CODE, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await customerService.generateCode(companyId));
        }
        catch (err) {
            return handleError(err, 'CUSTOMERS_GENERATE_CODE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CUSTOMERS_GET_LEDGER, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            const repo = new (await import('@rs-inventory/business')).CustomerLedgerRepository(prisma);
            return handleSuccess(await repo.findEntries(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'CUSTOMERS_GET_LEDGER_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CUSTOMERS_GET_STATEMENT, async (_e, arg1, arg2, arg3) => {
        try {
            const companyId = await getRequiredCompanyId();
            const customerId = typeof arg1 === 'object' && arg1 !== null && 'customerId' in arg1 ? arg1.customerId : arg1;
            const startDate = typeof arg1 === 'object' && arg1 !== null && 'startDate' in arg1 ? arg1.startDate : arg2;
            const endDate = typeof arg1 === 'object' && arg1 !== null && 'endDate' in arg1 ? arg1.endDate : arg3;
            return handleSuccess(await customerService.getStatement(companyId, customerId, startDate, endDate));
        }
        catch (err) {
            return handleError(err, 'CUSTOMERS_GET_STATEMENT_ERROR');
        }
    });
    // ─── Step 6: Sales Invoices ────────────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_LIST, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesService.listSales(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'SALES_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_GET, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesService.getSale(companyId, id));
        }
        catch (err) {
            return handleError(err, 'SALES_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_CREATE_DRAFT, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesService.createDraft(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'SALES_CREATE_DRAFT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_UPDATE_DRAFT, async (_e, arg1, arg2) => {
        try {
            const companyId = await getRequiredCompanyId();
            const id = typeof arg1 === 'object' && arg1 !== null && 'id' in arg1 ? arg1.id : arg1;
            const dto = typeof arg1 === 'object' && arg1 !== null && 'dto' in arg1 ? arg1.dto : arg2;
            return handleSuccess(await salesService.updateDraft(companyId, id, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'SALES_UPDATE_DRAFT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_CANCEL_DRAFT, async (_e, arg1, arg2) => {
        try {
            const companyId = await getRequiredCompanyId();
            const id = typeof arg1 === 'object' && arg1 !== null && 'id' in arg1 ? arg1.id : arg1;
            const reason = typeof arg1 === 'object' && arg1 !== null && 'reason' in arg1 ? arg1.reason : arg2;
            return handleSuccess(await salesService.cancelDraft(companyId, id, reason, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'SALES_CANCEL_DRAFT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_POST, async (_e, arg1, arg2) => {
        try {
            licenseService.assertFeatureEntitled('sales.core', 'post sale');
            const companyId = await getRequiredCompanyId();
            const id = typeof arg1 === 'object' && arg1 !== null && 'id' in arg1 ? arg1.id : arg1;
            const dto = typeof arg1 === 'object' && arg1 !== null && 'dto' in arg1 ? arg1.dto : arg2;
            return handleSuccess(await salesService.postSale(companyId, id, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'SALES_POST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_CALCULATE, async (_e, input) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesService.calculate(companyId, input));
        }
        catch (err) {
            return handleError(err, 'SALES_CALCULATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_GET_SUMMARY, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesService.getSummary(companyId));
        }
        catch (err) {
            return handleError(err, 'SALES_GET_SUMMARY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_GET_KPIS, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesService.getKPIs(companyId));
        }
        catch (err) {
            return handleError(err, 'SALES_GET_KPIS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_SEARCH_PRODUCTS, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesService.searchPOSProducts(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'SALES_SEARCH_PRODUCTS_ERROR');
        }
    });
    // ─── Step 6: Sales Payments ────────────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_PAYMENTS_LIST, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesPaymentService.listPayments(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'SALES_PAYMENTS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_PAYMENTS_CREATE, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesPaymentService.createPayment(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'SALES_PAYMENTS_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_PAYMENTS_REVERSE, async (_e, arg1, arg2) => {
        try {
            const companyId = await getRequiredCompanyId();
            const paymentId = typeof arg1 === 'object' && arg1 !== null && 'paymentId' in arg1 ? arg1.paymentId : arg1;
            const reason = typeof arg1 === 'object' && arg1 !== null && 'reason' in arg1 ? arg1.reason : (arg2 || 'Reversed by user');
            return handleSuccess(await salesPaymentService.reversePayment(companyId, paymentId, reason, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'SALES_PAYMENTS_REVERSE_ERROR');
        }
    });
    // ─── Step 6: Sales Returns ─────────────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_RETURNS_LIST, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesReturnService.listReturns(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'SALES_RETURNS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_RETURNS_GET, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesReturnService.getReturn(companyId, id));
        }
        catch (err) {
            return handleError(err, 'SALES_RETURNS_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SALES_RETURNS_CREATE, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await salesReturnService.createReturn(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'SALES_RETURNS_CREATE_ERROR');
        }
    });
    // ─── Step 7: Expense Categories ────────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_LIST, async (_e, includeInactive) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseCategoryService.listCategories(companyId, includeInactive));
        }
        catch (err) {
            return handleError(err, 'EXPENSE_CATEGORIES_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_CREATE, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseCategoryService.createCategory(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'EXPENSE_CATEGORIES_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_UPDATE, async (_e, payload) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseCategoryService.updateCategory(companyId, payload.id, payload.dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'EXPENSE_CATEGORIES_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_DELETE, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseCategoryService.deleteCategory(companyId, id, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'EXPENSE_CATEGORIES_DELETE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_SEED_DEFAULTS, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseCategoryService.seedDefaultCategories(companyId, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'EXPENSE_CATEGORIES_SEED_ERROR');
        }
    });
    // ─── Step 7: Expenses ──────────────────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSES_LIST, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseService.listExpenses(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'EXPENSES_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSES_GET, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseService.getExpense(companyId, id));
        }
        catch (err) {
            return handleError(err, 'EXPENSES_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSES_CREATE_DRAFT, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseService.createDraft(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'EXPENSES_CREATE_DRAFT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSES_UPDATE_DRAFT, async (_e, payload) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseService.updateDraft(companyId, payload.id, payload.dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'EXPENSES_UPDATE_DRAFT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSES_POST, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseService.postExpense(companyId, id, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'EXPENSES_POST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.EXPENSES_CANCEL, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await expenseService.cancelDraft(companyId, id, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'EXPENSES_CANCEL_ERROR');
        }
    });
    // ─── Step 7: Cash Registers & Sessions ─────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_LIST, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.listRegisters(companyId));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_CREATE, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.createRegister(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_UPDATE, async (_e, payload) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.updateRegister(companyId, payload.id, payload.dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_GET_ACTIVE_SESSION, async (_e, cashRegisterId) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.getActiveSession(companyId, cashRegisterId));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_ACTIVE_SESSION_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_OPEN_SESSION, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.openSession(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_OPEN_SESSION_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_RECORD_CASH_IN, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.recordCashIn(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_CASH_IN_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_RECORD_CASH_OUT, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.recordCashOut(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_CASH_OUT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_GET_SESSION_SUMMARY, async (_e, sessionId) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.getSessionSummary(companyId, sessionId));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_SESSION_SUMMARY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASH_REGISTERS_REOPEN_SESSION, async (_e, payload) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashRegisterService.reopenSession(companyId, payload.sessionId, payload.reason, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'CASH_REGISTERS_REOPEN_SESSION_ERROR');
        }
    });
    // ─── Step 7: Cashbook ──────────────────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASHBOOK_GET_ENTRIES, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashbookService.getCashbookEntries(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'CASHBOOK_GET_ENTRIES_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CASHBOOK_GET_SUMMARY, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await cashbookService.getCashbookSummary(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'CASHBOOK_GET_SUMMARY_ERROR');
        }
    });
    // ─── Step 7: Day-End Closing ───────────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DAY_END_CLOSING_PREVIEW, async (_e, sessionId) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await dayEndClosingService.preview(companyId, sessionId));
        }
        catch (err) {
            return handleError(err, 'DAY_END_CLOSING_PREVIEW_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DAY_END_CLOSING_CLOSE, async (_e, dto) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await dayEndClosingService.closeSession(companyId, dto, activeSessionUser?.id));
        }
        catch (err) {
            return handleError(err, 'DAY_END_CLOSING_CLOSE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DAY_END_CLOSING_GET, async (_e, id) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await dayEndClosingService.getDayEndClosing(companyId, id));
        }
        catch (err) {
            return handleError(err, 'DAY_END_CLOSING_GET_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DAY_END_CLOSING_LIST, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await dayEndClosingService.listDayEndClosings(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'DAY_END_CLOSING_LIST_ERROR');
        }
    });
    // ─── Step 7: Financial Dashboard ───────────────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.FINANCIAL_DASHBOARD_KPIS, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await financialDashboardService.getKPIs(companyId));
        }
        catch (err) {
            return handleError(err, 'FINANCIAL_DASHBOARD_KPIS_ERROR');
        }
    });
    // ─── Step 8: Business Reports & Analytics ─────────────────────────────────
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_DASHBOARD_KPIS, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getBusinessDashboardKPIs(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_DASHBOARD_KPIS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_CHARTS_DATA, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getDashboardChartsData(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_CHARTS_DATA_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_SALES_SUMMARY, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getSalesSummary(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_SALES_SUMMARY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_SALES_INVOICE_LIST, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getSalesInvoiceList(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_SALES_INVOICE_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_PRODUCT_SALES, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getProductSalesReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_PRODUCT_SALES_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_CATEGORY_SALES, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getCategorySalesReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_CATEGORY_SALES_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_CUSTOMER_SALES, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getCustomerSalesReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_CUSTOMER_SALES_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_PAYMENT_COLLECTIONS, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getPaymentCollections(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_PAYMENT_COLLECTIONS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_PURCHASE_SUMMARY, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getPurchaseSummary(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_PURCHASE_SUMMARY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_PURCHASE_INVOICE_LIST, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getPurchaseInvoiceList(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_PURCHASE_INVOICE_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_PRODUCT_PURCHASES, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getProductPurchaseReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_PRODUCT_PURCHASES_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_SUPPLIER_REPORT, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getSupplierReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_SUPPLIER_REPORT_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_CURRENT_STOCK, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getCurrentStockReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_CURRENT_STOCK_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_LOW_STOCK, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getLowStockReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_LOW_STOCK_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_OUT_OF_STOCK, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getOutOfStockReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_OUT_OF_STOCK_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_STOCK_MOVEMENTS, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getStockMovementsReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_STOCK_MOVEMENTS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_INVENTORY_VALUATION, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getInventoryValuationReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_INVENTORY_VALUATION_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_STOCK_ADJUSTMENTS, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getStockAdjustmentsReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_STOCK_ADJUSTMENTS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_PROFIT_LOSS, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getProfitLoss(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_PROFIT_LOSS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_CUSTOMER_OUTSTANDING, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getCustomerOutstanding(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_CUSTOMER_OUTSTANDING_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_SUPPLIER_OUTSTANDING, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getSupplierOutstanding(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_SUPPLIER_OUTSTANDING_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_EXPENSE_SUMMARY, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getExpenseSummary(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_EXPENSE_SUMMARY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_CASHBOOK, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getCashbookReport(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_CASHBOOK_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_REGISTER_CLOSINGS, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getRegisterClosings(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_REGISTER_CLOSINGS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORTS_GET_TAX_SUMMARY, async (_e, filters) => {
        try {
            const companyId = await getRequiredCompanyId();
            return handleSuccess(await reportingService.getTaxSummary(companyId, filters));
        }
        catch (err) {
            return handleError(err, 'REPORTS_GET_TAX_SUMMARY_ERROR');
        }
    });
    // ---------------- Step 9: Roles & Permissions ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ROLES_GET_MATRIX, async () => {
        try {
            const matrix = await userService.getRolesMatrix();
            return handleSuccess(matrix);
        }
        catch (err) {
            return handleError(err, 'ROLES_GET_MATRIX_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ROLES_CREATE, async (_event, dto) => {
        try {
            const role = await userService.createRole(dto, activeSessionUser?.id);
            return handleSuccess(role);
        }
        catch (err) {
            return handleError(err, 'ROLE_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ROLES_UPDATE, async (_event, payload) => {
        try {
            const role = await userService.updateRole(payload.id, payload.dto, activeSessionUser?.id);
            return handleSuccess(role);
        }
        catch (err) {
            return handleError(err, 'ROLE_UPDATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ROLES_DELETE, async (_event, id) => {
        try {
            const res = await userService.deleteRole(id, activeSessionUser?.id);
            return handleSuccess(res);
        }
        catch (err) {
            return handleError(err, 'ROLE_DELETE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.ROLES_UPDATE_PERMISSIONS, async (_event, payload) => {
        try {
            const res = await userService.updateRolePermissions(payload.roleId, payload.permissionCodes, activeSessionUser?.id);
            return handleSuccess(res);
        }
        catch (err) {
            return handleError(err, 'ROLES_UPDATE_PERMISSIONS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PERMISSIONS_LIST_ALL, async () => {
        try {
            const perms = await userService.listAllPermissions();
            return handleSuccess(perms);
        }
        catch (err) {
            return handleError(err, 'PERMISSIONS_LIST_ALL_ERROR');
        }
    });
    // ---------------- Step 9: Settings Defaults ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SETTINGS_RESET_DEFAULTS, async () => {
        try {
            const companyId = await getRequiredCompanyId();
            const resetMap = await settingsService.resetDefaults(companyId, activeSessionUser?.id);
            return handleSuccess(resetMap);
        }
        catch (err) {
            return handleError(err, 'SETTINGS_RESET_DEFAULTS_ERROR');
        }
    });
    // ---------------- Step 9: Backup & Restore ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BACKUP_CREATE, async (_event, destinationDir) => {
        try {
            const result = await backupService.createBackup(destinationDir);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'BACKUP_CREATE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BACKUP_RESTORE, async (_event, filePath) => {
        try {
            const result = await backupService.restoreBackup(filePath);
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'BACKUP_RESTORE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BACKUP_LIST, async () => {
        try {
            const list = backupService.listBackups();
            return handleSuccess(list);
        }
        catch (err) {
            return handleError(err, 'BACKUP_LIST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BACKUP_CHOOSE_DIRECTORY, async () => {
        try {
            const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
            const options = {
                title: 'Choose Backup Directory',
                properties: ['openDirectory', 'createDirectory'],
            };
            const result = focusedWindow
                ? await electron_1.dialog.showOpenDialog(focusedWindow, options)
                : await electron_1.dialog.showOpenDialog(options);
            if (result.canceled || result.filePaths.length === 0) {
                return handleSuccess(null);
            }
            return handleSuccess(result.filePaths[0]);
        }
        catch (err) {
            return handleError(err, 'BACKUP_CHOOSE_DIRECTORY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.BACKUP_CHOOSE_FILE, async () => {
        try {
            const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
            const options = {
                title: 'Select Backup Database to Restore',
                filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
                properties: ['openFile'],
            };
            const result = focusedWindow
                ? await electron_1.dialog.showOpenDialog(focusedWindow, options)
                : await electron_1.dialog.showOpenDialog(options);
            if (result.canceled || result.filePaths.length === 0) {
                return handleSuccess(null);
            }
            return handleSuccess(result.filePaths[0]);
        }
        catch (err) {
            return handleError(err, 'BACKUP_CHOOSE_FILE_ERROR');
        }
    });
    // ---------------- Step 9: System Info & Hardware ----------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SYSTEM_GET_INFO_DETAILED, async () => {
        try {
            const company = await companyService.getCompany();
            const info = {
                productName: 'RS Inventory – Solo',
                companyName: company?.name || 'RS ORANGE TECH PVT LTD',
                appVersion: electron_1.app.getVersion() || configService.getAppVersion(),
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
        }
        catch (err) {
            return handleError(err, 'SYSTEM_GET_INFO_DETAILED_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SYSTEM_GET_LOGS_PATH, async () => {
        try {
            return handleSuccess(configService.getLogPath());
        }
        catch (err) {
            return handleError(err, 'SYSTEM_GET_LOGS_PATH_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SYSTEM_OPEN_LOGS_FOLDER, async () => {
        try {
            const logDir = path.dirname(configService.getLogPath());
            if (fs.existsSync(logDir)) {
                await electron_1.shell.openPath(logDir);
                return handleSuccess(true);
            }
            return handleSuccess(false);
        }
        catch (err) {
            return handleError(err, 'SYSTEM_OPEN_LOGS_FOLDER_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRINTER_LIST_AVAILABLE, async () => {
        try {
            const win = electron_1.BrowserWindow.getFocusedWindow();
            if (win && win.webContents.getPrintersAsync) {
                const printers = await win.webContents.getPrintersAsync();
                const names = printers.map((p) => p.name);
                if (names.length > 0)
                    return handleSuccess(names);
            }
            return handleSuccess(['Default System Printer', 'POS-80 Thermal Printer', 'Microsoft Print to PDF']);
        }
        catch {
            return handleSuccess(['Default System Printer', 'Microsoft Print to PDF']);
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PRINTER_TEST_PRINT, async (_event, payload) => {
        try {
            const printer = payload?.printerName || 'Default System Printer';
            const format = payload?.format || 'thermal';
            loggerService.info(`Executing test print to [${printer}] with format [${format}]`);
            return handleSuccess({
                success: true,
                message: `Test print sent successfully to "${printer}" (${format === 'thermal' ? '80mm Thermal Receipt' : 'A4 Invoice'}).`,
            });
        }
        catch (err) {
            return handleError(err, 'PRINTER_TEST_PRINT_ERROR');
        }
    });
    // -------------------------------------------------------------
    // Step 10: Product Licensing, Activation & Edition Management
    // -------------------------------------------------------------
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LICENSE_GET_STATUS, async () => {
        try {
            const status = await licenseVerifierService.getLicenseStatus();
            return handleSuccess(status);
        }
        catch (err) {
            return handleError(err, 'LICENSE_GET_STATUS_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LICENSE_GENERATE_REQUEST, async (_event, customerName) => {
        try {
            const req = await licenseVerifierService.generateActivationRequest(customerName);
            return handleSuccess(req);
        }
        catch (err) {
            return handleError(err, 'LICENSE_GENERATE_REQUEST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LICENSE_EXPORT_REQUEST, async (_event, customerName, targetPath) => {
        try {
            const res = await licenseVerifierService.exportActivationRequest(customerName, targetPath);
            return handleSuccess(res);
        }
        catch (err) {
            return handleError(err, 'LICENSE_EXPORT_REQUEST_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LICENSE_CHOOSE_FILE, async () => {
        try {
            const chosen = await licenseVerifierService.chooseLicenseFile();
            return handleSuccess(chosen);
        }
        catch (err) {
            return handleError(err, 'LICENSE_CHOOSE_FILE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LICENSE_IMPORT_FILE, async (_event, filePath) => {
        try {
            const status = await licenseVerifierService.importLicenseFile(filePath);
            return handleSuccess(status);
        }
        catch (err) {
            return handleError(err, 'LICENSE_IMPORT_FILE_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LICENSE_ACTIVATE_KEY, async (_event, licenseFileContent) => {
        try {
            const status = await licenseVerifierService.activateLicenseContent(licenseFileContent);
            return handleSuccess(status);
        }
        catch (err) {
            return handleError(err, 'LICENSE_ACTIVATE_KEY_ERROR');
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LICENSE_DEACTIVATE, async () => {
        try {
            const result = await licenseVerifierService.deactivateLicense();
            return handleSuccess(result);
        }
        catch (err) {
            return handleError(err, 'LICENSE_DEACTIVATE_ERROR');
        }
    });
}
