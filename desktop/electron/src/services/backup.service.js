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
exports.BackupService = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const database_1 = require("@rs-inventory/database");
const config_service_js_1 = require("./config.service.js");
const logger_service_js_1 = require("./logger.service.js");
class BackupService {
    static instance = null;
    config;
    logger;
    constructor() {
        this.config = config_service_js_1.ConfigService.getInstance();
        this.logger = logger_service_js_1.LoggerService.getInstance();
    }
    static getInstance() {
        if (!BackupService.instance) {
            BackupService.instance = new BackupService();
        }
        return BackupService.instance;
    }
    /**
     * Performs an SQLite WAL checkpoint and creates a consistent snapshot copy
     * of the SQLite database in the backup directory or custom target path.
     */
    async createBackup(targetDirectory) {
        const timestamp = new Date().toISOString();
        const dbPath = this.config.getDatabasePath();
        const backupDir = targetDirectory || this.config.getBackupPath();
        this.logger.info('Starting database backup operation', { dbPath, backupDir });
        if (!fs.existsSync(dbPath)) {
            const err = `Database file does not exist at ${dbPath}`;
            this.logger.error('Backup failed: source database missing', { dbPath });
            return {
                success: false,
                filePath: '',
                sizeBytes: 0,
                timestamp,
                error: err,
            };
        }
        try {
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            // 1. Force full WAL checkpoint to ensure all committed transactions are in main .db file
            try {
                const prisma = database_1.DatabaseService.getInstance().getClient();
                await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL);');
                this.logger.info('SQLite WAL checkpoint completed successfully before backup');
            }
            catch (walErr) {
                this.logger.warn('WAL checkpoint warning (continuing snapshot)', { error: walErr?.message });
            }
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `rs_inventory_backup_${dateStr}.db`;
            const backupFilePath = path.join(backupDir, backupFileName);
            // 2. Perform copy
            fs.copyFileSync(dbPath, backupFilePath);
            const stat = fs.statSync(backupFilePath);
            this.logger.info('Database backup created successfully', {
                backupFilePath,
                sizeBytes: stat.size,
            });
            return {
                success: true,
                filePath: backupFilePath,
                sizeBytes: stat.size,
                timestamp,
            };
        }
        catch (error) {
            const msg = error?.message || 'Unknown backup error';
            this.logger.error('Failed to create database backup', { error: msg });
            return {
                success: false,
                filePath: '',
                sizeBytes: 0,
                timestamp,
                error: msg,
            };
        }
    }
    /**
     * Lists all existing backup files in the default backup directory.
     */
    listBackups() {
        const backupDir = this.config.getBackupPath();
        if (!fs.existsSync(backupDir)) {
            return [];
        }
        try {
            const files = fs
                .readdirSync(backupDir)
                .filter((file) => file.endsWith('.db'))
                .map((filename) => {
                const filePath = path.join(backupDir, filename);
                const stat = fs.statSync(filePath);
                return {
                    filename,
                    filePath,
                    sizeBytes: stat.size,
                    createdAt: stat.birthtime.toISOString() || stat.mtime.toISOString(),
                };
            })
                .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
            return files;
        }
        catch (err) {
            this.logger.error('Error listing backups', { error: err?.message });
            return [];
        }
    }
    /**
     * Validates and restores a database from a candidate backup file:
     * 1. Validates SQLite format and integrity check
     * 2. Checks required schema tables (companies, users, settings)
     * 3. Creates an automatic safety backup of the active database before replacement
     * 4. Cleans up existing WAL/SHM files and atomically restores the database
     */
    async restoreBackup(candidateFilePath) {
        const timestamp = new Date().toISOString();
        const dbPath = this.config.getDatabasePath();
        const backupDir = this.config.getBackupPath();
        this.logger.info('Starting database restore validation', { candidateFilePath, dbPath });
        if (!fs.existsSync(candidateFilePath)) {
            return {
                success: false,
                timestamp,
                error: `Selected backup file not found: ${candidateFilePath}`,
            };
        }
        // 1. Verify SQLite 3 header
        try {
            const fd = fs.openSync(candidateFilePath, 'r');
            const headerBuf = Buffer.alloc(16);
            fs.readSync(fd, headerBuf, 0, 16, 0);
            fs.closeSync(fd);
            const headerString = headerBuf.toString('utf8');
            if (!headerString.startsWith('SQLite format 3')) {
                return {
                    success: false,
                    timestamp,
                    error: 'The selected file is not a valid SQLite 3 database backup.',
                };
            }
        }
        catch (err) {
            return {
                success: false,
                timestamp,
                error: `Failed reading backup file header: ${err?.message}`,
            };
        }
        const prisma = database_1.DatabaseService.getInstance().getClient();
        let restoredTablesCount = 0;
        // 2. Validate backup contents via ATTACH DATABASE
        try {
            const escapedPath = candidateFilePath.replace(/'/g, "''");
            await prisma.$queryRawUnsafe(`ATTACH DATABASE '${escapedPath}' AS backup_candidate;`);
            try {
                const integrityCheck = (await prisma.$queryRawUnsafe('PRAGMA backup_candidate.integrity_check;'));
                const integrityResult = integrityCheck[0]?.integrity_check ?? '';
                if (integrityResult.toLowerCase() !== 'ok') {
                    await prisma.$queryRawUnsafe('DETACH DATABASE backup_candidate;');
                    return {
                        success: false,
                        timestamp,
                        error: `Backup database integrity check failed: ${integrityResult}`,
                    };
                }
                // Verify required tables
                const tables = (await prisma.$queryRawUnsafe("SELECT name FROM backup_candidate.sqlite_master WHERE type='table';"));
                const tableNames = new Set(tables.map((t) => t.name.toLowerCase()));
                restoredTablesCount = tables.length;
                const requiredTables = ['companies', 'users', 'settings'];
                const missingTables = requiredTables.filter((t) => !tableNames.has(t));
                if (missingTables.length > 0) {
                    await prisma.$queryRawUnsafe('DETACH DATABASE backup_candidate;');
                    return {
                        success: false,
                        timestamp,
                        error: `Incompatible backup file. Missing required application tables: ${missingTables.join(', ')}`,
                    };
                }
            }
            finally {
                await prisma.$queryRawUnsafe('DETACH DATABASE backup_candidate;');
            }
        }
        catch (attachErr) {
            this.logger.error('Failed to attach and inspect backup candidate', { error: attachErr?.message });
            return {
                success: false,
                timestamp,
                error: `Could not verify backup database structure: ${attachErr?.message}`,
            };
        }
        // 3. Create Safety Backup of current database
        let safetyBackupPath = '';
        try {
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            if (fs.existsSync(dbPath)) {
                await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL);');
                const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
                safetyBackupPath = path.join(backupDir, `rs_inventory_safety_before_restore_${dateStr}.db`);
                fs.copyFileSync(dbPath, safetyBackupPath);
                this.logger.info('Safety backup created before restoration', { safetyBackupPath });
            }
        }
        catch (safetyErr) {
            this.logger.error('Failed creating safety backup before restore', { error: safetyErr?.message });
            return {
                success: false,
                timestamp,
                error: `Failed to create safety backup of active database: ${safetyErr?.message}`,
            };
        }
        // 4. Perform atomic replacement
        try {
            // Disconnect and flush active WAL
            await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
            // Replace main database file
            fs.copyFileSync(candidateFilePath, dbPath);
            // Clean up old WAL and SHM files to ensure restored file opens cleanly
            const walPath = `${dbPath}-wal`;
            const shmPath = `${dbPath}-shm`;
            if (fs.existsSync(walPath))
                fs.unlinkSync(walPath);
            if (fs.existsSync(shmPath))
                fs.unlinkSync(shmPath);
            this.logger.info('Database restored successfully from backup', {
                candidateFilePath,
                dbPath,
                safetyBackupPath,
            });
            return {
                success: true,
                safetyBackupPath,
                restoredTablesCount,
                timestamp,
            };
        }
        catch (restoreErr) {
            this.logger.error('Restoration file replacement failed', { error: restoreErr?.message });
            // Attempt to rollback using safety backup if replacement failed
            if (safetyBackupPath && fs.existsSync(safetyBackupPath)) {
                try {
                    fs.copyFileSync(safetyBackupPath, dbPath);
                    this.logger.info('Rolled back to safety backup following restoration failure');
                }
                catch (rollbackErr) {
                    this.logger.error('Rollback failed!', { error: rollbackErr?.message });
                }
            }
            return {
                success: false,
                safetyBackupPath,
                timestamp,
                error: `Restoration failed during file replacement: ${restoreErr?.message}`,
            };
        }
    }
}
exports.BackupService = BackupService;
