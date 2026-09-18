/**
 * RS Inventory - Verification Helper Script
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

console.log('--- RS Inventory - Foundation Verification ---');

const requiredFiles = [
  'package.json',
  'tsconfig.json',
  '.gitignore',
  '.env.example',
  'README.md',
  'LICENSE',
  'packages/types/src/index.ts',
  'packages/database/prisma/schema.prisma',
  'packages/database/src/database.service.ts',
  'packages/business/src/errors/app.error.ts',
  'packages/business/src/repositories/interfaces.ts',
  'packages/business/src/services/app-services.ts',
  'packages/printing/src/index.ts',
  'desktop/electron/src/main.ts',
  'desktop/electron/src/preload.ts',
  'desktop/electron/src/services/config.service.ts',
  'desktop/electron/src/services/logger.service.ts',
  'desktop/electron/src/services/backup.service.ts',
  'desktop/electron/src/ipc/ipc-router.ts',
  'desktop/renderer/src/App.tsx',
  'desktop/renderer/src/main.tsx',
  'desktop/renderer/src/pages/DashboardPage.tsx',
  'desktop/renderer/src/layouts/Sidebar.tsx',
  'desktop/renderer/src/layouts/Topbar.tsx',
  'desktop/renderer/src/components/ErrorBoundary.tsx',
];

let allPassed = true;
for (const relPath of requiredFiles) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (fs.existsSync(fullPath)) {
    console.log(`[PASS] Found: ${relPath}`);
  } else {
    console.error(`[FAIL] Missing: ${relPath}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\nAll foundational components verified successfully!');
  process.exit(0);
} else {
  console.error('\nVerification failed. Some files are missing.');
  process.exit(1);
}
