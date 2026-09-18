import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseService } from '../../packages/database/src/database.service';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('DatabaseService Integration', () => {
  const tempDbPath = path.join(os.tmpdir(), `rs_inventory_test_${Date.now()}.db`);
  let dbService: DatabaseService;

  beforeAll(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.initialize(tempDbPath);
  });

  afterAll(async () => {
    if (dbService) {
      await dbService.disconnect();
    }
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // ignore
      }
    }
  });

  it('should successfully initialize and report healthy status', async () => {
    const health = await dbService.healthCheck();
    expect(health.status).toBe('connected');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    expect(health.databasePath).toBe(tempDbPath);
  });

  it('should support safe database transactions', async () => {
    const result = await dbService.transaction(async (tx) => {
      // Execute a test query within transaction
      const raw = await tx.$queryRawUnsafe<Array<{ test: number }>>('SELECT 42 as test');
      return raw[0]?.test;
    });

    expect(Number(result)).toBe(42);
  });
});
