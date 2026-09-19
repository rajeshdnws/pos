"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("@rs-inventory/types");
const electron_1 = require("electron");
const api = {
    // Base App & System
    getAppConfig: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.APP_GET_CONFIG);
    },
    getSystemInfo: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SYSTEM_GET_INFO);
    },
    checkDatabaseHealth: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.DATABASE_HEALTH_CHECK);
    },
    logMessage: async (level, message, meta) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LOGGER_LOG, { level, message, meta });
    },
    windowControl: async (action) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.WINDOW_CONTROL, action);
    },
    // Auth
    login: async (credentials) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.AUTH_LOGIN, credentials);
    },
    logout: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.AUTH_LOGOUT);
    },
    getCurrentUser: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.AUTH_GET_CURRENT_USER);
    },
    changePassword: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.AUTH_CHANGE_PASSWORD, dto);
    },
    // Company
    checkCompanySetup: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.COMPANY_CHECK_SETUP);
    },
    getCompany: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.COMPANY_GET);
    },
    setupCompany: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.COMPANY_SETUP, dto);
    },
    updateCompany: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.COMPANY_UPDATE, dto);
    },
    selectCompanyLogo: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.COMPANY_SELECT_LOGO);
    },
    // Users
    listUsers: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.USERS_LIST);
    },
    createUser: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.USERS_CREATE, dto);
    },
    updateUser: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.USERS_UPDATE, { id, dto });
    },
    toggleUserActive: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.USERS_TOGGLE_ACTIVE, id);
    },
    resetUserPassword: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.USERS_RESET_PASSWORD, dto);
    },
    getRoles: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ROLES_GET_ALL);
    },
    // Settings & Audits
    getSettings: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SETTINGS_GET_ALL);
    },
    updateSettings: async (settingsMap) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SETTINGS_UPDATE, settingsMap);
    },
    getAuditLogs: async (limit) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.AUDIT_GET_LOGS, limit);
    },
    // Categories
    listCategories: async (includeInactive) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CATEGORIES_LIST, includeInactive);
    },
    getCategory: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CATEGORIES_GET, id);
    },
    createCategory: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CATEGORIES_CREATE, dto);
    },
    updateCategory: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CATEGORIES_UPDATE, { id, dto });
    },
    toggleCategoryActive: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CATEGORIES_TOGGLE_ACTIVE, id);
    },
    // Units
    listUnits: async (includeInactive) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.UNITS_LIST, includeInactive);
    },
    getUnit: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.UNITS_GET, id);
    },
    createUnit: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.UNITS_CREATE, dto);
    },
    updateUnit: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.UNITS_UPDATE, { id, dto });
    },
    toggleUnitActive: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.UNITS_TOGGLE_ACTIVE, id);
    },
    seedDefaultUnits: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.UNITS_SEED_DEFAULTS);
    },
    // Brands
    listBrands: async (includeInactive) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BRANDS_LIST, includeInactive);
    },
    getBrand: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BRANDS_GET, id);
    },
    createBrand: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BRANDS_CREATE, dto);
    },
    updateBrand: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BRANDS_UPDATE, { id, dto });
    },
    toggleBrandActive: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BRANDS_TOGGLE_ACTIVE, id);
    },
    // Products
    listProducts: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_LIST, filters);
    },
    getProduct: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_GET, id);
    },
    createProduct: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_CREATE, dto);
    },
    updateProduct: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_UPDATE, { id, dto });
    },
    toggleProductActive: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_TOGGLE_ACTIVE, id);
    },
    searchProducts: async (query) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_SEARCH, query);
    },
    getProductByBarcode: async (barcode) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_BY_BARCODE, barcode);
    },
    getProductBySku: async (sku) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_BY_SKU, sku);
    },
    generateProductSku: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_GENERATE_SKU);
    },
    getProductPriceHistory: async (productId) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRODUCTS_GET_PRICE_HISTORY, productId);
    },
    // Locations
    listLocations: async (includeInactive) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LOCATIONS_LIST, includeInactive);
    },
    getLocation: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LOCATIONS_GET, id);
    },
    createLocation: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LOCATIONS_CREATE, dto);
    },
    updateLocation: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LOCATIONS_UPDATE, { id, dto });
    },
    toggleLocationActive: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LOCATIONS_TOGGLE_ACTIVE, id);
    },
    getDefaultLocation: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LOCATIONS_GET_DEFAULT);
    },
    // Stock Management
    getCurrentStock: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCK_GET_CURRENT, filters);
    },
    getStockMovements: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCK_GET_MOVEMENTS, filters);
    },
    getProductStockSummary: async (productId) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCK_GET_PRODUCT_SUMMARY, productId);
    },
    getInventoryValuation: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCK_GET_VALUATION);
    },
    getInventoryKPIs: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCK_GET_KPIS);
    },
    reconcileStock: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCK_RECONCILE);
    },
    repairStockDiscrepancies: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCK_REPAIR_DISCREPANCIES);
    },
    // Stock Adjustments
    listStockAdjustments: async (limit) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ADJUSTMENTS_LIST, limit);
    },
    getStockAdjustment: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ADJUSTMENTS_GET, id);
    },
    createStockAdjustment: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ADJUSTMENTS_CREATE, dto);
    },
    // Stocktakes
    listStocktakes: async (limit) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCKTAKES_LIST, limit);
    },
    getStocktake: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCKTAKES_GET, id);
    },
    createStocktake: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCKTAKES_CREATE, dto);
    },
    updateStocktake: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCKTAKES_UPDATE, { id, dto });
    },
    startStocktake: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCKTAKES_START, id);
    },
    completeStocktake: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCKTAKES_COMPLETE, id);
    },
    cancelStocktake: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.STOCKTAKES_CANCEL, id);
    },
    // Stock Transfers
    listStockTransfers: async (limit) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.TRANSFERS_LIST, limit);
    },
    getStockTransfer: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.TRANSFERS_GET, id);
    },
    createStockTransfer: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.TRANSFERS_CREATE, dto);
    },
    cancelStockTransfer: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.TRANSFERS_CANCEL, id);
    },
    // Demo Data Management
    getDemoDataStatus: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.DEMO_DATA_STATUS);
    },
    installDemoData: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.DEMO_DATA_INSTALL);
    },
    clearDemoData: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.DEMO_DATA_CLEAR);
    },
    // Step 5: Suppliers
    listSuppliers: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIERS_LIST, filters);
    },
    getSupplier: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIERS_GET, id);
    },
    createSupplier: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIERS_CREATE, dto);
    },
    updateSupplier: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIERS_UPDATE, { id, dto });
    },
    deleteSupplier: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIERS_DELETE, id);
    },
    toggleSupplierActive: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIERS_TOGGLE_ACTIVE, id);
    },
    generateSupplierCode: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIERS_GENERATE_CODE);
    },
    // Step 5: Purchases
    listPurchases: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_LIST, filters);
    },
    getPurchase: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_GET, id);
    },
    createPurchaseDraft: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_CREATE_DRAFT, dto);
    },
    updatePurchaseDraft: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_UPDATE_DRAFT, { id, dto });
    },
    postPurchase: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_POST, id);
    },
    cancelPurchase: async (id, reason) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_CANCEL, { id, reason });
    },
    getPurchaseSummary: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_GET_SUMMARY);
    },
    calculatePurchase: async (input) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_CALCULATE, input);
    },
    getPurchaseKPIs: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASES_GET_KPIS);
    },
    // Step 5: Purchase Payments
    listPurchasePayments: async (filtersOrPurchaseId) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASE_PAYMENTS_LIST, filtersOrPurchaseId);
    },
    createPurchasePayment: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASE_PAYMENTS_CREATE, dto);
    },
    recordPurchasePayment: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASE_PAYMENTS_CREATE, dto);
    },
    reversePurchasePayment: async (paymentIdOrDto, reason) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASE_PAYMENTS_REVERSE, paymentIdOrDto, reason);
    },
    // Step 5: Purchase Returns
    listPurchaseReturns: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASE_RETURNS_LIST, filters);
    },
    getPurchaseReturn: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASE_RETURNS_GET, id);
    },
    createPurchaseReturn: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PURCHASE_RETURNS_CREATE, dto);
    },
    // Step 5: Supplier Ledger
    getSupplierLedgerEntries: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIER_LEDGER_GET_ENTRIES, filters);
    },
    getSupplierStatement: async (supplierId, startDateOrOptions, endDate) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SUPPLIER_LEDGER_GET_STATEMENT, supplierId, startDateOrOptions, endDate);
    },
    // Step 6: Customers
    listCustomers: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CUSTOMERS_LIST, filters);
    },
    getCustomer: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CUSTOMERS_GET, id);
    },
    createCustomer: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CUSTOMERS_CREATE, dto);
    },
    updateCustomer: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CUSTOMERS_UPDATE, { id, dto });
    },
    toggleCustomerActive: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CUSTOMERS_TOGGLE_ACTIVE, id);
    },
    generateCustomerCode: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CUSTOMERS_GENERATE_CODE);
    },
    getCustomerLedger: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CUSTOMERS_GET_LEDGER, filters);
    },
    getCustomerStatement: async (customerId, startDate, endDate) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CUSTOMERS_GET_STATEMENT, { customerId, startDate, endDate });
    },
    // Step 6: Sales Invoices
    listSales: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_LIST, filters);
    },
    getSale: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_GET, id);
    },
    createSalesDraft: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_CREATE_DRAFT, dto);
    },
    updateSalesDraft: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_UPDATE_DRAFT, { id, dto });
    },
    cancelSalesDraft: async (id, reason) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_CANCEL_DRAFT, { id, reason });
    },
    postSale: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_POST, { id, dto });
    },
    calculateSales: async (input) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_CALCULATE, input);
    },
    getSalesSummary: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_GET_SUMMARY);
    },
    getSalesKPIs: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_GET_KPIS);
    },
    searchPOSProducts: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_SEARCH_PRODUCTS, filters);
    },
    // Step 6: Sales Payments
    listSalesPayments: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_PAYMENTS_LIST, filters);
    },
    createSalesPayment: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_PAYMENTS_CREATE, dto);
    },
    reverseSalesPayment: async (paymentId, reason) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_PAYMENTS_REVERSE, { paymentId, reason });
    },
    // Step 6: Sales Returns
    listSalesReturns: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_RETURNS_LIST, filters);
    },
    getSalesReturn: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_RETURNS_GET, id);
    },
    createSalesReturn: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SALES_RETURNS_CREATE, dto);
    },
    // Step 7: Expense Categories
    listExpenseCategories: async (includeInactive) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_LIST, includeInactive);
    },
    createExpenseCategory: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_CREATE, dto);
    },
    updateExpenseCategory: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_UPDATE, { id, dto });
    },
    deleteExpenseCategory: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_DELETE, id);
    },
    seedDefaultExpenseCategories: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSE_CATEGORIES_SEED_DEFAULTS);
    },
    // Step 7: Expenses
    listExpenses: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSES_LIST, filters);
    },
    getExpense: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSES_GET, id);
    },
    createExpenseDraft: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSES_CREATE_DRAFT, dto);
    },
    updateExpenseDraft: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSES_UPDATE_DRAFT, { id, dto });
    },
    postExpense: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSES_POST, id);
    },
    cancelExpenseDraft: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.EXPENSES_CANCEL, id);
    },
    // Step 7: Cash Registers & Sessions
    listCashRegisters: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_LIST);
    },
    createCashRegister: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_CREATE, dto);
    },
    updateCashRegister: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_UPDATE, { id, dto });
    },
    getActiveCashRegisterSession: async (cashRegisterId) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_GET_ACTIVE_SESSION, cashRegisterId);
    },
    openCashRegisterSession: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_OPEN_SESSION, dto);
    },
    recordCashIn: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_RECORD_CASH_IN, dto);
    },
    recordCashOut: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_RECORD_CASH_OUT, dto);
    },
    getSessionSummary: async (sessionId) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_GET_SESSION_SUMMARY, sessionId);
    },
    reopenCashRegisterSession: async (sessionId, reason) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASH_REGISTERS_REOPEN_SESSION, { sessionId, reason });
    },
    // Step 7: Cashbook
    getCashbookEntries: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASHBOOK_GET_ENTRIES, filters);
    },
    getCashbookSummary: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.CASHBOOK_GET_SUMMARY, filters);
    },
    // Step 7: Day-End Closing
    previewDayEndClosing: async (sessionId) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.DAY_END_CLOSING_PREVIEW, sessionId);
    },
    closeDayEndSession: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.DAY_END_CLOSING_CLOSE, dto);
    },
    getDayEndClosing: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.DAY_END_CLOSING_GET, id);
    },
    listDayEndClosings: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.DAY_END_CLOSING_LIST, filters);
    },
    // Step 7: Financial Dashboard
    getFinancialDashboardKPIs: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.FINANCIAL_DASHBOARD_KPIS);
    },
    // Step 8: Business Reports & Analytics
    getReportDashboardKPIs: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_DASHBOARD_KPIS, filters);
    },
    getReportChartsData: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_CHARTS_DATA, filters);
    },
    getSalesReportSummary: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_SALES_SUMMARY, filters);
    },
    getSalesInvoiceReportList: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_SALES_INVOICE_LIST, filters);
    },
    getProductSalesReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_PRODUCT_SALES, filters);
    },
    getCategorySalesReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_CATEGORY_SALES, filters);
    },
    getCustomerSalesReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_CUSTOMER_SALES, filters);
    },
    getPaymentCollectionReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_PAYMENT_COLLECTIONS, filters);
    },
    getPurchaseReportSummary: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_PURCHASE_SUMMARY, filters);
    },
    getPurchaseInvoiceReportList: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_PURCHASE_INVOICE_LIST, filters);
    },
    getProductPurchaseReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_PRODUCT_PURCHASES, filters);
    },
    getSupplierReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_SUPPLIER_REPORT, filters);
    },
    getInventoryCurrentStockReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_CURRENT_STOCK, filters);
    },
    getLowStockReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_LOW_STOCK, filters);
    },
    getOutOfStockReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_OUT_OF_STOCK, filters);
    },
    getStockMovementsReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_STOCK_MOVEMENTS, filters);
    },
    getInventoryValuationReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_INVENTORY_VALUATION, filters);
    },
    getStockAdjustmentsReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_STOCK_ADJUSTMENTS, filters);
    },
    getProfitLossReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_PROFIT_LOSS, filters);
    },
    getCustomerOutstandingReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_CUSTOMER_OUTSTANDING, filters);
    },
    getSupplierOutstandingReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_SUPPLIER_OUTSTANDING, filters);
    },
    getExpenseSummaryReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_EXPENSE_SUMMARY, filters);
    },
    getCashbookReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_CASHBOOK, filters);
    },
    getRegisterClosingReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_REGISTER_CLOSINGS, filters);
    },
    getTaxSummaryReport: async (filters) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.REPORTS_GET_TAX_SUMMARY, filters);
    },
    // Step 9: Roles & Permissions
    createRole: async (dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ROLES_CREATE, dto);
    },
    updateRole: async (id, dto) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ROLES_UPDATE, { id, dto });
    },
    deleteRole: async (id) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ROLES_DELETE, id);
    },
    getRolesMatrix: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ROLES_GET_MATRIX);
    },
    updateRolePermissions: async (roleId, permissionCodes) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.ROLES_UPDATE_PERMISSIONS, { roleId, permissionCodes });
    },
    listAllPermissions: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PERMISSIONS_LIST_ALL);
    },
    // Step 9: Settings management
    resetDefaultSettings: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SETTINGS_RESET_DEFAULTS);
    },
    // Step 9: Backup & Restore
    createBackup: async (destinationDir) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BACKUP_CREATE, destinationDir);
    },
    restoreBackup: async (filePath) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BACKUP_RESTORE, filePath);
    },
    listBackups: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BACKUP_LIST);
    },
    chooseBackupDirectory: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BACKUP_CHOOSE_DIRECTORY);
    },
    chooseBackupFile: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.BACKUP_CHOOSE_FILE);
    },
    // Step 9: System & Hardware
    getSystemInfoDetailed: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SYSTEM_GET_INFO_DETAILED);
    },
    getLogsPath: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SYSTEM_GET_LOGS_PATH);
    },
    openLogsFolder: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SYSTEM_OPEN_LOGS_FOLDER);
    },
    listAvailablePrinters: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRINTER_LIST_AVAILABLE);
    },
    testPrint: async (printerName, format) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PRINTER_TEST_PRINT, { printerName, format });
    },
    // Step 10: Licensing & Activation
    getLicenseStatus: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LICENSE_GET_STATUS);
    },
    generateActivationRequest: async (customerName) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LICENSE_GENERATE_REQUEST, customerName);
    },
    exportActivationRequest: async (customerName, targetPath) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LICENSE_EXPORT_REQUEST, customerName, targetPath);
    },
    importLicenseFile: async (filePath) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LICENSE_IMPORT_FILE, filePath);
    },
    activateLicenseContent: async (licenseFileContent) => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LICENSE_ACTIVATE_KEY, licenseFileContent);
    },
    deactivateLicense: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LICENSE_DEACTIVATE);
    },
    chooseLicenseFile: async () => {
        return electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LICENSE_CHOOSE_FILE);
    },
};
// Expose safe, strictly typed API to renderer via contextBridge
electron_1.contextBridge.exposeInMainWorld('rsInventory', api);
