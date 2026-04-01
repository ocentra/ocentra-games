import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join, relative } from 'path';

const CLASS_RE = /export\s+class\s+(\w+)\s+[^{]*extends\s+EventArgsBase/g;
const EVENT_TYPE_RE = /static\s+readonly\s+eventType\s*(?::\s*string)?\s*=\s*['"]([^'"]+)['"]/g;

interface EventEntry {
  className: string;
  eventType: string;
  relPath: string;
}

function* walk(dir: string, base: string = dir): Generator<{ full: string; rel: string }> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      yield* walk(full, base);
    } else if (name.endsWith('.ts') && name !== 'EventTypeMap.ts') {
      yield { full, rel: relative(base, full) };
    }
  }
}

function extractEvents(filePath: string, relPath: string): EventEntry[] {
  const content = readFileSync(filePath, 'utf8');
  const classes = [...content.matchAll(CLASS_RE)].map((m) => m[1]);
  const eventTypes = [...content.matchAll(EVENT_TYPE_RE)].map((m) => m[1]);
  const normalized = relPath.replace(/\.ts$/, '').replace(/\\/g, '/');
  const pairs: EventEntry[] = [];
  for (let i = 0; i < classes.length; i++) {
    if (eventTypes[i]) {
      pairs.push({ className: classes[i], eventType: eventTypes[i], relPath: normalized });
    }
  }
  return pairs;
}

const srcEvents = join(process.cwd(), 'src', 'events');
const allEntries: EventEntry[] = [];

for (const { full, rel } of walk(srcEvents)) {
  allEntries.push(...extractEvents(full, rel));
}

const seen = new Set<string>();
const unique = allEntries.filter((e) => {
  if (seen.has(e.eventType)) return false;
  seen.add(e.eventType);
  return true;
});

const importByPath = new Map<string, string[]>();
for (const e of unique) {
  const imp = './' + e.relPath;
  if (!importByPath.has(imp)) importByPath.set(imp, []);
  importByPath.get(imp)!.push(e.className);
}

const sortedPaths = [...importByPath.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const lines: string[] = [];
for (const [path, classes] of sortedPaths) {
  const uniq = [...new Set(classes)].sort();
  lines.push(`import type { ${uniq.join(', ')} } from '${path}';`);
}
lines.push('');
lines.push("declare module '@/events/EventTypes' {");
lines.push('  interface EventTypeMap {');
const sortedEntries = [...unique].sort((a, b) => a.eventType.localeCompare(b.eventType));
for (const e of sortedEntries) {
  lines.push(`    '${e.eventType}': ${e.className};`);
}
lines.push('  }');
lines.push('}');
lines.push('');
lines.push('export {};');

const outPath = join(srcEvents, 'EventTypeMap.ts');
writeFileSync(outPath, lines.join('\n'));
console.log('Wrote', outPath, `(${unique.length} events)`);

const pathsFromUnique = new Set(unique.map((e) => e.relPath));
const pathsFromWalk = new Set(
  (function* () {
    for (const { rel } of walk(srcEvents)) {
      yield rel.replace(/\.ts$/, '').replace(/\\/g, '/');
    }
  })()
);
const eventExportPaths = [...new Set([...pathsFromUnique, ...pathsFromWalk])].sort();
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const exports = pkg.exports as Record<string, unknown>;
const eventKeys = Object.keys(exports).filter((k) => k.startsWith('./events/') && k.includes('*'));
for (const k of eventKeys) delete exports[k];
for (const rel of eventExportPaths) {
  const key = './events/' + rel;
  exports[key] = {
    import: './dist/events/' + rel + '.js',
    types: './dist/events/' + rel + '.d.ts',
  };
}
pkg.exports = exports;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('Wrote', pkgPath, `(${eventExportPaths.length} event exports)`);

const toRemove = [
  join(srcEvents, 'assets', 'EventTypeMap.ts'),
  join(srcEvents, 'authentication', 'EventTypeMap.ts'),
  join(srcEvents, 'dev', 'EventTypeMap.ts'),
  join(srcEvents, 'game', 'EventTypeMap.ts'),
  join(srcEvents, 'image', 'EventTypeMap.ts'),
  join(srcEvents, 'lobby', 'EventTypeMap.ts'),
  join(srcEvents, 'logs', 'EventTypeMap.ts'),
  join(srcEvents, 'model', 'EventTypeMap.ts'),
];
for (const p of toRemove) {
  if (existsSync(p)) {
    unlinkSync(p);
    console.log('Removed', p);
  }
}
