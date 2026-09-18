import { AppConfig, Environment } from '@rs-inventory/types';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Load .env if present in current dir, workspace root, or parent dirs
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export class ConfigService {
  private static instance: ConfigService | null = null;

  private readonly appName: string;
  private readonly appVersion: string;
  private readonly environment: Environment;
  private readonly appDataRoot: string;
  private readonly databasePath: string;
  private readonly backupPath: string;
  private readonly logPath: string;
  private readonly exportPath: string;
  private readonly logLevel: string;

  private constructor() {
    this.appName = process.env.APP_NAME || 'RS Inventory';
    this.appVersion = process.env.APP_VERSION || '1.0.0';

    const envStr = (process.env.NODE_ENV || process.env.ENVIRONMENT || 'development').toLowerCase();
    this.environment =
      envStr === 'production' ? 'production' : envStr === 'test' ? 'test' : 'development';

    // Calculate Application Data directory appropriate for Windows and cross-platform
    const baseAppData =
      process.env.APPDATA ||
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

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Reset instance (useful for unit tests with different env variables)
   */
  public static resetInstance(): void {
    ConfigService.instance = null;
  }

  public getAppName(): string {
    return this.appName;
  }

  public getAppVersion(): string {
    return this.appVersion;
  }

  public getEnvironment(): Environment {
    return this.environment;
  }

  public getAppDataRoot(): string {
    return this.appDataRoot;
  }

  public getDatabasePath(): string {
    return this.databasePath;
  }

  public getBackupPath(): string {
    return this.backupPath;
  }

  public getLogPath(): string {
    return this.logPath;
  }

  public getExportPath(): string {
    return this.exportPath;
  }

  public getLogLevel(): string {
    return this.logLevel;
  }

  public getConfig(): AppConfig {
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
  public ensureDirectoriesExist(): void {
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
