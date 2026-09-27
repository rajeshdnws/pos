import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '../../desktop/electron/src/services/config.service';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('ConfigService', () => {
  beforeEach(() => {
    ConfigService.resetInstance();
  });

  it('should load default configuration correctly', () => {
    const configService = ConfigService.getInstance();
    expect(configService.getAppName()).toBe('RS Inventory');
    expect(configService.getAppVersion()).toBe('1.0.0');
    expect(['development', 'test', 'production']).toContain(configService.getEnvironment());
  });

  it('should generate required paths inside AppData directory', () => {
    const configService = ConfigService.getInstance();
    const appData = configService.getAppDataRoot();
    const dbPath = configService.getDatabasePath();
    expect(appData).toContain('RS Inventory');
    const backupPath = configService.getBackupPath();
    const logPath = configService.getLogPath();
    const exportPath = configService.getExportPath();

    expect(dbPath).toMatch(/rs_inventory_\w+\.db/);
    expect(backupPath).toContain('backups');
    expect(logPath).toContain('application.log');
    expect(exportPath).toContain('exports');
  });

  it('should format database path differently for each edition (solo, lan, business)', () => {
    // 1. Solo Edition
    process.env.APP_EDITION = 'solo';
    ConfigService.resetInstance();
    let configService = ConfigService.getInstance();
    expect(configService.getAppEdition()).toBe('solo');
    expect(configService.getDatabasePath()).toContain('rs_inventory_solo.db');

    // 2. LAN Edition
    process.env.APP_EDITION = 'lan';
    ConfigService.resetInstance();
    configService = ConfigService.getInstance();
    expect(configService.getAppEdition()).toBe('lan');
    expect(configService.getDatabasePath()).toContain('rs_inventory_lan.db');

    // 3. Business Edition
    process.env.APP_EDITION = 'business';
    ConfigService.resetInstance();
    configService = ConfigService.getInstance();
    expect(configService.getAppEdition()).toBe('business');
    expect(configService.getDatabasePath()).toContain('rs_inventory_business.db');

    delete process.env.APP_EDITION;
  });

  it('should automatically create required directories if they do not exist', () => {
    const testTempDir = path.join(os.tmpdir(), 'rs_inventory_test_' + Date.now());
    process.env.DATABASE_PATH = path.join(testTempDir, 'database', 'test.db');
    process.env.BACKUP_PATH = path.join(testTempDir, 'backups');
    process.env.LOG_PATH = path.join(testTempDir, 'logs', 'test.log');
    process.env.EXPORT_PATH = path.join(testTempDir, 'exports');

    ConfigService.resetInstance();
    const configService = ConfigService.getInstance();
    configService.ensureDirectoriesExist();

    expect(fs.existsSync(path.join(testTempDir, 'database'))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, 'backups'))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, 'logs'))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, 'exports'))).toBe(true);

    // Clean up test temp dir
    try {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }

    delete process.env.DATABASE_PATH;
    delete process.env.BACKUP_PATH;
    delete process.env.LOG_PATH;
    delete process.env.EXPORT_PATH;
  });
});
