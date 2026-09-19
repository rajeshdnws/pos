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
const database_1 = require("@rs-inventory/database");
const electron_1 = require("electron");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const dotenv = __importStar(require("dotenv"));
const ipc_router_js_1 = require("./ipc/ipc-router.js");
const config_service_js_1 = require("./services/config.service.js");
const logger_service_js_1 = require("./services/logger.service.js");
// Load .env configuration
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
let mainWindow = null;
// Determine directory paths
const isDev = process.env.NODE_ENV !== 'production' && !electron_1.app.isPackaged;
async function bootstrap() {
    // Step 1 & 2: Load Configuration
    const configService = config_service_js_1.ConfigService.getInstance();
    const env = configService.getEnvironment();
    // Step 3: Create Required Directories
    configService.ensureDirectoriesExist();
    // Step 4: Initialize Logger
    const loggerService = logger_service_js_1.LoggerService.getInstance();
    loggerService.info('=============================================');
    loggerService.info(`Starting ${configService.getAppName()} v${configService.getAppVersion()}`);
    loggerService.info(`Environment: ${env}, Platform: ${process.platform} (${process.arch})`);
    loggerService.info(`AppData Root: ${configService.getAppDataRoot()}`);
    loggerService.info(`Database Path: ${configService.getDatabasePath()}`);
    loggerService.info('=============================================');
    // Step 5 & 6: Initialize Database & Run Migration Check
    const dbService = database_1.DatabaseService.getInstance();
    try {
        loggerService.info('Initializing SQLite database with Prisma...');
        await dbService.initialize(configService.getDatabasePath());
        loggerService.info('Database initialized successfully.');
        // Run health check / migration check
        const health = await dbService.healthCheck();
        loggerService.info('Database health check result', health);
    }
    catch (dbError) {
        loggerService.error('Fatal Database Initialization Failure', dbError);
        electron_1.dialog.showErrorBox('Database Error', 'Unable to initialize local database.\n\nPlease restart the application or contact support.');
        electron_1.app.exit(1);
        return;
    }
    // Register IPC Handlers
    (0, ipc_router_js_1.registerIpcHandlers)();
    loggerService.info('IPC Handlers registered successfully.');
    // Step 7: Load Electron Window
    createMainWindow(configService, loggerService);
}
function createMainWindow(configService, loggerService) {
    const isDevelopment = configService.getEnvironment() === 'development' || isDev;
    // Preload path: in dist-electron/
    const preloadPath = path.join(__dirname, 'preload.cjs');
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        title: `${configService.getAppName()} – Solo`,
        backgroundColor: '#090d16',
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            devTools: isDevelopment,
        },
        frame: true,
        show: false,
    });
    const localRendererPath = path.resolve(__dirname, '..', '..', 'renderer', 'dist', 'index.html');
    const packagedRendererPath = path.resolve(__dirname, '..', 'renderer', 'dist', 'index.html');
    const rendererPath = fs.existsSync(localRendererPath)
        ? localRendererPath
        : packagedRendererPath;
    // Step 8 & 9: Load React Application & Display
    let fallbackLoaded = false;
    const loadFallback = () => {
        if (!fallbackLoaded && fs.existsSync(rendererPath)) {
            fallbackLoaded = true;
            loggerService.warn(`Falling back to static production bundle: ${rendererPath}`);
            mainWindow?.loadFile(rendererPath);
        }
    };
    if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
        const devUrl = process.env.VITE_DEV_SERVER_URL;
        loggerService.info(`Loading renderer from dev server: ${devUrl}`);
        mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
            if (errorCode === -3)
                return;
            loggerService.warn(`Dev server failed to load (${errorCode}: ${errorDescription})`);
            loadFallback();
        });
        mainWindow.loadURL(devUrl).catch((err) => {
            if (String(err).includes('ERR_ABORTED'))
                return;
            loggerService.warn(`Dev server unreachable at ${devUrl} (${err.message})`);
            loadFallback();
        });
    }
    else {
        loggerService.info(`Loading renderer from production bundle: ${rendererPath}`);
        mainWindow.loadFile(rendererPath);
    }
    mainWindow.once('ready-to-show', () => {
        loggerService.info('Electron main window ready to show.');
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Ensure single instance lock
const hasLock = electron_1.app.requestSingleInstanceLock();
if (!hasLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    electron_1.app
        .whenReady()
        .then(bootstrap)
        .catch((err) => {
        console.error('Failed to start application:', err);
    });
    electron_1.app.on('window-all-closed', async () => {
        const logger = logger_service_js_1.LoggerService.getInstance();
        logger.info('All windows closed. Disconnecting database...');
        try {
            await database_1.DatabaseService.getInstance().disconnect();
            logger.info('Database disconnected safely.');
        }
        catch (err) {
            logger.error('Error during database disconnect:', err);
        }
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
    electron_1.app.on('activate', () => {
        if (mainWindow === null) {
            createMainWindow(config_service_js_1.ConfigService.getInstance(), logger_service_js_1.LoggerService.getInstance());
        }
    });
}
