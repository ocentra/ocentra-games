import { randomUUID, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.svg',
  '.avif',
]);

function normalizeResourcePath(inputPath) {
  return inputPath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function getResourcesDir() {
  const cwd = process.cwd();
  if (cwd.includes('asset-editor')) {
    return path.join(cwd, 'Resources');
  }
  return path.join(cwd, 'packages', 'asset-editor', 'Resources');
}

function toMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.avif') return 'image/avif';
  return 'application/octet-stream';
}

function formatMetaContent(meta) {
  return `{
  guid: '${meta.guid}',
  type: 'file',
  mimeType: '${meta.mimeType}',
  createdAt: '${meta.createdAt}',
  modifiedAt: '${meta.modifiedAt}',
  fileSize: ${meta.fileSize},
  checksum: '${meta.checksum}',
  imageHash: '${meta.imageHash}',
}
`;
}

async function walkFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      out.push(fullPath);
    }
  }
  return out;
}

async function createMetaForFile(imagePath, dryRun) {
  const metaPath = `${imagePath}.meta`;
  try {
    await fs.access(metaPath);
    return { status: 'exists', imagePath, metaPath };
  } catch (error) {
    void error;
  }

  const bytes = await fs.readFile(imagePath);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const stat = await fs.stat(imagePath);
  const now = new Date().toISOString();

  const meta = {
    guid: randomUUID(),
    mimeType: toMimeType(imagePath),
    createdAt: now,
    modifiedAt: now,
    fileSize: stat.size,
    checksum,
    imageHash: checksum,
  };

  if (!dryRun) {
    await fs.writeFile(metaPath, formatMetaContent(meta), 'utf8');
  }

  return { status: 'created', imagePath, metaPath };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetArg = args.find((arg) => !arg.startsWith('--')) ?? 'GameMode/CardGames/Images';
  const resourcesDir = getResourcesDir();
  const targetPath = normalizeResourcePath(targetArg);
  const fullTargetPath = path.join(resourcesDir, targetPath);

  const targetStat = await fs.stat(fullTargetPath).catch(() => null);
  if (!targetStat || !targetStat.isDirectory()) {
    throw new Error(`Target folder not found: ${fullTargetPath}`);
  }

  const files = await walkFiles(fullTargetPath);
  const imageFiles = files.filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  });

  let created = 0;
  let exists = 0;
  for (const imagePath of imageFiles) {
    const result = await createMetaForFile(imagePath, dryRun);
    if (result.status === 'created') {
      created += 1;
    } else {
      exists += 1;
    }
  }

  const mode = dryRun ? 'DRY RUN' : 'WRITE';
  console.log(`[meta-images] Mode: ${mode}`);
  console.log(`[meta-images] Target: ${fullTargetPath}`);
  console.log(`[meta-images] Images scanned: ${imageFiles.length}`);
  console.log(`[meta-images] Meta created: ${created}`);
  console.log(`[meta-images] Meta already existed: ${exists}`);
}

main().catch((error) => {
  console.error(`[meta-images] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
