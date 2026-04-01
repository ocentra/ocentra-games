import type { Plugin } from 'vite';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

function generateRegistryMaps(): void {
  try {
    execSync('tsx scripts/generate-registry-maps.ts', { stdio: 'inherit' });
  } catch (error) {
    const msg = `[generate-registry-maps] Failed to generate maps: ${error instanceof Error ? error.message : String(error)}\n`;
    process.stderr.write(msg);
  }
}

function shouldRegenerate(): boolean {
  const srcDir = join(process.cwd(), 'src');
  const registryDir = join(srcDir, 'lib', 'core', 'registry');
  const required = [
    'inspectorMap.generated.ts',
    'assetTypeMap.generated.ts',
    'assetConstructorLoaders.generated.ts',
  ];
  for (const name of required) {
    if (!existsSync(join(registryDir, name))) return true;
  }
  return false;
}

export function generateRegistryMapsPlugin(): Plugin {
  let hasGenerated = false;
  
  return {
    name: 'generate-registry-maps',
    buildStart() {
      if (!hasGenerated) {
        generateRegistryMaps();
        hasGenerated = true;
      }
    },
    configureServer() {
      if (!hasGenerated || shouldRegenerate()) {
        generateRegistryMaps();
        hasGenerated = true;
      }
    },
  };
}
