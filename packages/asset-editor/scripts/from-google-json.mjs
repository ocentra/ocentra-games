import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const envLocalPath = path.join(packageDir, '.env.local');

const files = fs.readdirSync(packageDir);
const jsonFile = files.find((f) => f.startsWith('client_secret_') && f.endsWith('.json'));
if (!jsonFile) {
  console.error('No client_secret_*.json found in packages/asset-editor. Add your Google Desktop OAuth client JSON there.');
  process.exit(1);
}

const jsonPath = path.join(packageDir, jsonFile);
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
  return key && !key.startsWith('VITE_GOOGLE_OAUTH_CLIENT_ID') && !key.startsWith('VITE_GOOGLE_OAUTH_CLIENT_SECRET');
});
const trimmed = lines.join('\n').trimEnd();
const out = trimmed
  ? `${trimmed}\n\n# Tauri desktop Google OAuth (from ${jsonFile})\nVITE_GOOGLE_OAUTH_CLIENT_ID=${clientId}\nVITE_GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`
  : `# Tauri desktop Google OAuth (from ${jsonFile})\nVITE_GOOGLE_OAUTH_CLIENT_ID=${clientId}\nVITE_GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`;
fs.writeFileSync(envLocalPath, out, 'utf8');
console.log('Wrote VITE_GOOGLE_OAUTH_* to packages/asset-editor/.env.local from', jsonFile);
