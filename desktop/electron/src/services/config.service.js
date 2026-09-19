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
exports.ConfigService = void 0;
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
// Load .env if present in current dir, workspace root, or parent dirs
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
class ConfigService {
    static instance = null;
    appName;
    appVersion;
    environment;
    appDataRoot;
    databasePath;
    backupPath;
    logPath;
    exportPath;
    logLevel;
    constructor() {
        this.appName = process.env.APP_NAME || 'RS Inventory';
        this.appVersion = process.env.APP_VERSION || '1.0.0';
        const envStr = (process.env.NODE_ENV || process.env.ENVIRONMENT || 'development').toLowerCase();
        this.environment =
            envStr === 'production' ? 'production' : envStr === 'test' ? 'test' : 'development';
        // Calculate Application Data directory appropriate for Windows and cross-platform
        const baseAppData = process.env.APPDATA ||
            (process.platform === 'darwin'
                ? path.join(os.homedir(), 'Library', 'Application Support')
                : path.join(os.homedir(), '.config'));
        this.appDataRoot = path.join(baseAppData, this.appName);
        // Paths can be overridden via environment variables or default to AppData subdirectories
        this.databasePath =
            process.env.DATABASE_PATH || path.join(this.appDataRoot, 'database', 'rs_inventory.db');
        this.backupPath = process.env.BACKUP_PATH || path.join(this.appDataRoot, 'backups');
        this.logPath = process.env.LOG_PATH || path.join(this.appDataRoot, 'logs', 'application.log');
        this.exportPath = process.env.EXPORT_PATH || path.join(this.appDataRoot, 'exports');
        this.logLevel =
            process.env.LOG_LEVEL || (this.environment === 'development' ? 'DEBUG' : 'INFO');
    }
    static getInstance() {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }
    /**
     * Reset instance (useful for unit tests with different env variables)
     */
    static resetInstance() {
        ConfigService.instance = null;
    }
    getAppName() {
        return this.appName;
    }
    getAppVersion() {
        return this.appVersion;
    }
    getEnvironment() {
        return this.environment;
    }
    getAppDataRoot() {
        return this.appDataRoot;
    }
    getDatabasePath() {
        return this.databasePath;
    }
    getBackupPath() {
        return this.backupPath;
    }
    getLogPath() {
        return this.logPath;
    }
    getExportPath() {
        return this.exportPath;
    }
    getLogLevel() {
        return this.logLevel;
    }
    getConfig() {
        return {
            appName: this.appName,
            appVersion: this.appVersion,
            environment: this.environment,
            databasePath: this.databasePath,
            backupPath: this.backupPath,
            logPath: this.logPath,
            exportPath: this.exportPath,
            logLevel: this.logLevel,
        };
    }
    /**
     * Automatically creates all required directories upon first launch.
     */
    ensureDirectoriesExist() {
        const directoriesToCreate = [
            path.dirname(this.databasePath),
            this.backupPath,
            path.dirname(this.logPath),
            this.exportPath,
        ];
        for (const dir of directoriesToCreate) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
}
exports.ConfigService = ConfigService;
