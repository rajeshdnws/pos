import { DatabaseService } from '@rs-inventory/database';
import { PermissionService } from '@rs-inventory/business';
import { app, BrowserWindow, dialog, Menu } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import { registerIpcHandlers } from './ipc/ipc-router.js';
import { ConfigService } from './services/config.service.js';
import { LoggerService } from './services/logger.service.js';

// Load .env configuration
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let mainWindow: BrowserWindow | null = null;

// Determine directory paths
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

async function bootstrap(): Promise<void> {
  // Hide native Electron menu bar application-wide (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  // Step 1 & 2: Load Configuration
  const configService = ConfigService.getInstance();
  const env = configService.getEnvironment();

  // Step 3: Create Required Directories
  configService.ensureDirectoriesExist();

  // Step 4: Initialize Logger
  const loggerService = LoggerService.getInstance();
  loggerService.info('=============================================');
  loggerService.info(`Starting ${configService.getAppName()} v${configService.getAppVersion()}`);
  loggerService.info(`Environment: ${env}, Platform: ${process.platform} (${process.arch})`);
  loggerService.info(`AppData Root: ${configService.getAppDataRoot()}`);
  loggerService.info(`Database Path: ${configService.getDatabasePath()}`);
  loggerService.info('=============================================');

  // Step 5 & 6: Initialize Database & Run Migration Check
  const dbService = DatabaseService.getInstance();
  try {
    loggerService.info('Initializing SQLite database with Prisma...');
    await dbService.initialize(configService.getDatabasePath());
    loggerService.info('Database initialized successfully.');

    // Run health check / migration check
    const health = await dbService.healthCheck();
    loggerService.info('Database health check result', health);

    // Synchronize all system permissions and role mappings
    const prisma = dbService.getClient();
    await PermissionService.syncSystemPermissions(prisma);
    loggerService.info('System permissions and role mappings synchronized successfully.');
  } catch (dbError) {
    loggerService.error('Fatal Database Initialization Failure', dbError);
    dialog.showErrorBox(
      'Database Error',
      'Unable to initialize local database.\n\nPlease restart the application or contact support.',
    );
    app.exit(1);
    return;
  }

  // Register IPC Handlers
  registerIpcHandlers();
  loggerService.info('IPC Handlers registered successfully.');

  // Step 7: Load Electron Window
  createMainWindow(configService, loggerService);
}

function createMainWindow(configService: ConfigService, loggerService: LoggerService): void {
  const isDevelopment = configService.getEnvironment() === 'development' || isDev;

  // Preload path: in dist-electron/
  const preloadPath = path.join(__dirname, 'preload.cjs');

  // Ensure application menu is null
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: `${configService.getAppName()} – Solo`,
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
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

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  const localRendererPath = path.resolve(
    __dirname,
    '..',
    '..',
    'renderer',
    'dist',
    'index.html',
  );
  const packagedRendererPath = path.resolve(
    __dirname,
    '..',
    'renderer',
    'dist',
    'index.html',
  );
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
      if (errorCode === -3) return;
      loggerService.warn(`Dev server failed to load (${errorCode}: ${errorDescription})`);
      loadFallback();
    });

    mainWindow.loadURL(devUrl).catch((err) => {
      if (String(err).includes('ERR_ABORTED')) return;
      loggerService.warn(`Dev server unreachable at ${devUrl} (${(err as Error).message})`);
      loadFallback();
    });
  } else {
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
const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app
    .whenReady()
    .then(bootstrap)
    .catch((err) => {
      console.error('Failed to start application:', err);
    });

  app.on('window-all-closed', async () => {
    const logger = LoggerService.getInstance();
    logger.info('All windows closed. Disconnecting database...');
    try {
      await DatabaseService.getInstance().disconnect();
      logger.info('Database disconnected safely.');
    } catch (err) {
      logger.error('Error during database disconnect:', err);
    }

    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createMainWindow(ConfigService.getInstance(), LoggerService.getInstance());
    }
  });
}
