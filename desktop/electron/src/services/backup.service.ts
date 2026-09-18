import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigService } from './config.service.js';
import { LoggerService } from './logger.service.js';

export interface BackupResult {
  success: boolean;
  backupFilePath?: string;
  bytesCopied?: number;
  timestamp: string;
  error?: string;
}

export class BackupService {
  private static instance: BackupService | null = null;
  private readonly config: ConfigService;
  private readonly logger: LoggerService;

  private constructor() {
    this.config = ConfigService.getInstance();
    this.logger = LoggerService.getInstance();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Creates a snapshot copy of the SQLite database in the backup directory.
   */
  public async createBackup(): Promise<BackupResult> {
    const timestamp = new Date().toISOString();
    const dbPath = this.config.getDatabasePath();
    const backupDir = this.config.getBackupPath();

    this.logger.info('Starting database backup operation', { dbPath, backupDir });

    if (!fs.existsSync(dbPath)) {
      const err = `Database file does not exist at ${dbPath}`;
      this.logger.error('Backup failed: source database missing', { dbPath });
      return {
        success: false,
        timestamp,
        error: err,
      };
    }

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `rs_inventory_backup_${dateStr}.db`;
      const backupFilePath = path.join(backupDir, backupFileName);

      fs.copyFileSync(dbPath, backupFilePath);
      const stat = fs.statSync(backupFilePath);

      this.logger.info('Database backup created successfully', {
        backupFilePath,
        sizeBytes: stat.size,
      });

      return {
        success: true,
        backupFilePath,
        bytesCopied: stat.size,
        timestamp,
      };
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error('Failed to create database backup', { error: msg });
      return {
        success: false,
        timestamp,
        error: msg,
      };
    }
  }

  /**
   * Lists existing backup files.
   */
  public listBackups(): string[] {
    const backupDir = this.config.getBackupPath();
    if (!fs.existsSync(backupDir)) {
      return [];
    }
    return fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith('.db'))
      .map((file) => path.join(backupDir, file));
  }
}
