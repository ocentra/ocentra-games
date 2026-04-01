import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envLocalPath = path.join(rootDir, '.env.local');
const tauriDir = path.join(rootDir, 'platforms', 'desktop', 'tauri');

const searchDirs = [rootDir, tauriDir];
let jsonPath = null;
let jsonFile = null;
for (const dir of searchDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  const found = files.find((f) => f.startsWith('client_secret_') && f.endsWith('.json'));
  if (found) {
    jsonFile = found;
    jsonPath = path.join(dir, found);
    break;
  }
}
if (!jsonFile || !jsonPath) {
  console.error(
    'No client_secret_*.json found in repo root or platforms/desktop/tauri. Add your Google Desktop OAuth client JSON there. ' +
      'See AGENTS.md or packages/asset-editor/README.md for setup.'
  );
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const creds = data.installed || data.web;
if (!creds?.client_id) {
  console.error('JSON must have installed.client_id (Desktop) or web.client_id (Web).');
  process.exit(1);
}

const clientId = creds.client_id;
const clientSecret = creds.client_secret || '';

let existing = '';
if (fs.existsSync(envLocalPath)) {
  existing = fs.readFileSync(envLocalPath, 'utf8');
}
const lines = existing.split(/\r?\n/).filter((line) => {
  const key = line.replace(/=.*/, '').trim();
  return (
    key &&
    !key.startsWith('VITE_GOOGLE_OAUTH_CLIENT_ID') &&
    !key.startsWith('VITE_GOOGLE_OAUTH_CLIENT_SECRET')
  );
});
const trimmed = lines.join('\n').trimEnd();
const out = trimmed
  ? `${trimmed}\n\n# Main app Tauri desktop Google OAuth (from ${jsonFile})\n# Redirect URI: http://127.0.0.1:8766\nVITE_GOOGLE_OAUTH_CLIENT_ID=${clientId}\nVITE_GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`
  : `# Main app Tauri desktop Google OAuth (from ${jsonFile})\n# Redirect URI: http://127.0.0.1:8766\nVITE_GOOGLE_OAUTH_CLIENT_ID=${clientId}\nVITE_GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`;
fs.writeFileSync(envLocalPath, out, 'utf8');
console.log('Wrote VITE_GOOGLE_OAUTH_* to .env.local from', jsonFile);
console.log('Main app Tauri uses redirect URI http://127.0.0.1:8766 — add that in Google Cloud Console.');
