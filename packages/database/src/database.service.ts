import { PrismaClient } from '@prisma/client';
import { DatabaseHealth } from '@rs-inventory/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private prisma: PrismaClient | null = null;
  private databasePath: string = '';
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(dbFilePath: string): Promise<void> {
    if (this.isConnected && this.prisma) {
      return;
    }

    this.databasePath = dbFilePath;

    // Ensure the parent directory exists
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // If database file does not exist or is empty (0 bytes), seed it from template
    if (!fs.existsSync(dbFilePath) || fs.statSync(dbFilePath).size === 0) {
      const candidates = [
        path.resolve(process.cwd(), 'packages/database/prisma/dev-data/database/rs_inventory.db'),
        path.resolve(__dirname, '../prisma/dev-data/database/rs_inventory.db'),
        path.resolve(__dirname, '../../packages/database/prisma/dev-data/database/rs_inventory.db'),
        path.resolve(__dirname, '../../../packages/database/prisma/dev-data/database/rs_inventory.db'),
        path.resolve(process.cwd(), 'dev-data/database/rs_inventory.db'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
          try {
            fs.copyFileSync(candidate, dbFilePath);
            break;
          } catch {
            // ignore and try next candidate
          }
        }
      }
    }

    // Format SQLite connection string for Prisma
    // Windows paths: convert backslashes to forward slashes
    const normalizedPath = dbFilePath.replace(/\\/g, '/');
    const datasourceUrl = `file:${normalizedPath}`;

    process.env.DATABASE_URL = datasourceUrl;

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: datasourceUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    try {
      await this.prisma.$connect();
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new Error(
        `Failed to connect to SQLite database at ${dbFilePath}: ${(error as Error).message}`,
      );
    }
  }

  public getClient(): PrismaClient {
    if (!this.prisma || !this.isConnected) {
      throw new Error('DatabaseService has not been initialized. Call initialize() first.');
    }
    return this.prisma;
  }

  public async disconnect(): Promise<void> {
    if (this.prisma) {
      try {
        await this.prisma.$disconnect();
      } finally {
        this.isConnected = false;
        this.prisma = null;
      }
    }
  }

  /**
   * Reusable transaction wrapper.
   * Will later be used for Sale, Purchase, Return, Payment, Stock Adjustment.
   */
  public async transaction<T>(
    fn: (
      tx: Omit<
        PrismaClient,
        '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
      >,
    ) => Promise<T>,
  ): Promise<T> {
    const client = this.getClient();
    return client.$transaction(fn);
  }

  /**
   * Database Health Check
   */
  public async healthCheck(): Promise<DatabaseHealth> {
    const timestamp = new Date().toISOString();

    if (!this.prisma || !this.isConnected) {
      return {
        status: 'disconnected',
        latencyMs: -1,
        databasePath: this.databasePath,
        tableCount: 0,
        timestamp,
        error: 'Database is not connected',
      };
    }

    const start = performance.now();
    try {
      // Execute a lightweight query to check SQLite responsiveness
      const result = await this.prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
        "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'",
      );
      const latencyMs = Math.round(performance.now() - start);
      const rawCount = result[0]?.count ?? 0;
      const tableCount = typeof rawCount === 'bigint' ? Number(rawCount) : Number(rawCount);

      return {
        status: 'connected',
        latencyMs,
        databasePath: this.databasePath,
        tableCount,
        timestamp,
      };
    } catch (error) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        status: 'error',
        latencyMs,
        databasePath: this.databasePath,
        tableCount: 0,
        timestamp,
        error: (error as Error).message,
      };
    }
  }
}
