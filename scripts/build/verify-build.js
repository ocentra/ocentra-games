import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Verify that dist/ doesn't contain Resources/ directory
 * This ensures packages/asset-editor/Resources/ is not bundled
 */
function verifyBuild() {
  const distDir = path.join(__dirname, '..', '..', 'dist');
  
  if (!fs.existsSync(distDir)) {
    console.log('⚠️  dist/ directory does not exist. Run build first.');
    process.exit(1);
  }

  const resourcesInDist = path.join(distDir, 'Resources');
  if (!fs.existsSync(resourcesInDist)) {
    console.log('✅ Build verification passed: dist/ does not contain Resources/');
    return;
  }
  const placeholdersPath = path.join(resourcesInDist, 'AppAssets', 'PlaceHolders');
  const placeholdersOnly = fs.existsSync(placeholdersPath) &&
    fs.readdirSync(resourcesInDist).length === 1 &&
    fs.readdirSync(path.join(resourcesInDist, 'AppAssets')).length === 1;
  if (!placeholdersOnly) {
    console.error('❌ ERROR: dist/Resources/ contains more than AppAssets/PlaceHolders');
    console.error('   packages/asset-editor/Resources/ should NOT be bundled.');
    process.exit(1);
  }
  console.log('✅ Build verification passed: dist/Resources only contains PlaceHolders (Capacitor/Tauri)');
}

verifyBuild();

