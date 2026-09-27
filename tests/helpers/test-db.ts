import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DatabaseService } from '../../packages/database/src/database.service';

const candidateTemplatePaths = [
  path.resolve(__dirname, '../../packages/database/prisma/dev-data/database/rs_inventorysolo.db'),
  path.resolve(__dirname, '../../packages/database/prisma/dev-data/database/rs_inventory_solo.db'),
  path.resolve(__dirname, '../../packages/database/prisma/dev-data/database/rs_inventory.db'),
  path.resolve(process.cwd(), 'packages/database/prisma/dev-data/database/rs_inventorysolo.db'),
  path.resolve(process.cwd(), 'packages/database/prisma/dev-data/database/rs_inventory_solo.db'),
  path.resolve(process.cwd(), 'packages/database/prisma/dev-data/database/rs_inventory.db'),
];

export const TEMPLATE_DB_PATH =
  candidateTemplatePaths.find((p) => fs.existsSync(p)) || candidateTemplatePaths[0];

export async function createTestDatabase(): Promise<{
  dbPath: string;
  dbService: DatabaseService;
  cleanup: () => Promise<void>;
}> {
  const dbPath = path.join(
    os.tmpdir(),
    `rs_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.db`,
  );

  // Copy fresh migrated schema
  fs.copyFileSync(TEMPLATE_DB_PATH, dbPath);

  const dbService = DatabaseService.getInstance();
  await dbService.disconnect();
  await dbService.initialize(dbPath);

  const cleanup = async () => {
    try {
      await dbService.disconnect();
    } catch {
      // ignore
    }
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
      } catch {
        // ignore
      }
    }
  };

  return { dbPath, dbService, cleanup };
}
