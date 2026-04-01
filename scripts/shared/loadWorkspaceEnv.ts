import fs from 'node:fs';
import path from 'node:path';

function applyEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
  }
}

export function loadWorkspaceEnv(workspaceDir: string, repoRoot: string): void {
  for (const filePath of [
    path.join(repoRoot, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(workspaceDir, '.env'),
    path.join(workspaceDir, '.env.local'),
  ]) {
    applyEnvFile(filePath);
  }
}
