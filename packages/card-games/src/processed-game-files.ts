import fs from "fs";
import path from "path";

export interface ProcessedGameFile {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  slug: string;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function walkProcessedGameFiles(rootDir: string): ProcessedGameFile[] {
  const out: ProcessedGameFile[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const dir = stack.pop()!;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;
      const relativePath = toPosixPath(path.relative(rootDir, absolutePath));
      out.push({
        absolutePath,
        relativePath,
        fileName: entry.name,
        slug: entry.name.replace(/\.json$/i, ""),
      });
    }
  }

  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function findProcessedGameFileBySlug(rootDir: string, slug: string): ProcessedGameFile | null {
  const expectedFileName = `${slug}.json`.toLowerCase();
  return walkProcessedGameFiles(rootDir).find((entry) => entry.fileName.toLowerCase() === expectedFileName) ?? null;
}
