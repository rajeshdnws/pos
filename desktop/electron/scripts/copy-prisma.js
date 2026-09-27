const fs = require('fs');
const path = require('path');

const srcDotPrisma = path.resolve(__dirname, '../../../node_modules/.prisma/client');
const destDir = path.resolve(__dirname, '../dist-electron');

const filesToCopy = [
  'query_engine-windows.dll.node',
  'schema.prisma'
];

fs.mkdirSync(destDir, { recursive: true });

for (const file of filesToCopy) {
  const src = path.join(srcDotPrisma, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    console.log(`Copying ${file} to dist-electron/...`);
    fs.copyFileSync(src, dest);
  } else {
    console.warn(`Warning: ${file} not found at ${src}`);
  }
}

console.log('Prisma query engine & schema copied successfully to dist-electron.');

// Copy frontend renderer build into dist-renderer for electron-builder packaging
const srcRendererDist = path.resolve(__dirname, '../../renderer/dist');
const destRendererDist = path.resolve(__dirname, '../dist-renderer');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(srcRendererDist)) {
  console.log('Copying renderer dist to dist-renderer...');
  copyDir(srcRendererDist, destRendererDist);
  console.log('Renderer dist copied successfully to dist-renderer.');
} else {
  console.warn(`Warning: Renderer dist not found at ${srcRendererDist}`);
}
