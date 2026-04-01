import * as path from 'path';

export function normalizeToRepoRelative(filePath: string, cwd: string): string {
  const resolved = path.resolve(cwd, filePath);
  const relative = path.relative(cwd, resolved);
  const normalized = relative.replace(/\\/g, '/');
  const withoutLeading = normalized.replace(/^\.\//, '');
  return withoutLeading;
}
