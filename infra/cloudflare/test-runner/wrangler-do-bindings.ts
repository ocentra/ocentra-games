import * as path from 'path';
import { readFileSync, existsSync } from 'node:fs';

export function getDurableObjectsFromWrangler(cwd: string): Record<string, string> {
  const wranglerPath = path.join(cwd, 'wrangler.toml');
  if (!existsSync(wranglerPath)) return {};
  const raw = readFileSync(wranglerPath, 'utf-8');
  const out: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);
  const bindingHeader = '[[env.development.durable_objects.bindings]]';
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(bindingHeader)) {
      let name: string | null = null;
      let class_name: string | null = null;
      for (let j = i + 1; j < lines.length && j < i + 10; j++) {
        const trimmed = lines[j].trim();
        if (trimmed.startsWith('[')) break;
        const nm = lines[j].match(/^\s*name\s*=\s*"([^"]+)"\s*$/);
        const cn = lines[j].match(/^\s*class_name\s*=\s*"([^"]+)"\s*$/);
        if (nm) name = nm[1];
        if (cn) class_name = cn[1];
      }
      if (name && class_name) out[name] = class_name;
    }
  }
  return out;
}
