import { readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

interface ModuleInfo {
  name: string;
  filePath: string;
  category: string;
}

function getCategoryFromModuleName(moduleName: string, filePath: string): string {
  const moduleLower = moduleName.toLowerCase();
  
  if (filePath.includes('/handlers/')) {
    if (moduleLower.includes('api') || moduleName === 'LogsAPI' || moduleName === 'MatchesAPI' || moduleName === 'ResourcesAPI' || moduleName === 'BatchResolve') {
      return 'API modules';
    }
    return 'Handlers';
  }
  
  if (moduleName === 'AI' || moduleName === 'AIEndpoint') {
    return 'AI';
  }
  
  if (moduleName === 'Auth' || moduleName === 'AdminCheck' || moduleName === 'RateLimit' || moduleName === 'SecurityLogging' || moduleName === 'TokenValidation') {
    return 'Security & Auth';
  }
  
  if (moduleName === 'Index' || moduleName === 'Routes' || moduleName === 'CORS' || moduleName === 'ManifestLoader' || moduleName === 'PathValidation' || moduleName === 'ContentValidation') {
    return 'Infrastructure';
  }
  
  if (moduleName === 'MatchCoordinatorDO') {
    return 'Durable Objects';
  }
  
  if (moduleName === 'Monitoring' || moduleName === 'SecurityLogging') {
    return 'Monitoring';
  }
  
  if (filePath.includes('/utils/')) {
    if (moduleName === 'Badges' || moduleName === 'Leaderboard') {
      return 'Badges & Rewards';
    }
    return 'Utilities';
  }
  
  return 'Utilities';
}

function extractModuleNames(content: string): Set<string> {
  const modules = new Set<string>();
  
  const patterns = [
    /LogModule\.([A-Z][a-zA-Z0-9]*)/g,
    /shouldLog\(LogModule\.([A-Z][a-zA-Z0-9]*)/g,
    /log\.log(Info|Warn|Error|Debug)\(LogModule\.([A-Z][a-zA-Z0-9]*)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const moduleName = match[1] || match[2];
      if (moduleName) {
        modules.add(moduleName);
      }
    }
  }
  
  return modules;
}

function scanDirectory(dir: string, baseDir: string, modules: Map<string, ModuleInfo>): void {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (entry === '__tests__' || entry === 'test' || entry === 'tests' || entry === 'node_modules') {
          continue;
        }
        scanDirectory(fullPath, baseDir, modules);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
        const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
        
        if (relativePath.includes('/__tests__/') || relativePath.includes('/test/') || relativePath.includes('/tests/')) {
          continue;
        }
        
        if (relativePath.includes('log-flags.ts') || relativePath.includes('log-modules.generated.ts')) {
          continue;
        }

        try {
          const content = readFileSync(fullPath, 'utf-8');
          const foundModules = extractModuleNames(content);
          
          for (const moduleName of foundModules) {
            if (!modules.has(moduleName)) {
              const category = getCategoryFromModuleName(moduleName, relativePath);
              modules.set(moduleName, {
                name: moduleName,
                filePath: relativePath,
                category,
              });
            }
          }
        } catch (error) {
          console.warn(`[generate-log-modules] Failed to parse ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn(`[generate-log-modules] Failed to scan ${dir}:`, error);
  }
}

function groupModulesByCategory(modules: Map<string, ModuleInfo>): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  
  for (const module of modules.values()) {
    if (!grouped[module.category]) {
      grouped[module.category] = [];
    }
    grouped[module.category].push(module.name);
  }
  
  for (const category of Object.keys(grouped)) {
    grouped[category].sort();
  }
  
  return grouped;
}

function generateLogModulesFile(groupedModules: Record<string, string[]>): string {
  const categoryOrder = [
    'Handlers',
    'API modules',
    'Security & Auth',
    'AI',
    'Infrastructure',
    'Durable Objects',
    'Monitoring',
    'Badges & Rewards',
    'Utilities',
    'Validators',
    'Logging',
    'Other',
  ];
  
  const categoryMap: Record<string, string> = {
    'Handlers': 'Handlers',
    'API modules': 'API modules',
    'Security & Auth': 'Security & Auth',
    'AI': 'AI',
    'Infrastructure': 'Infrastructure',
    'Durable Objects': 'Durable Objects',
    'Monitoring': 'Monitoring',
    'Badges & Rewards': 'Badges & Rewards',
    'Utilities': 'Utilities',
    'Validators': 'Validators',
    'Logging': 'Logging',
    'Other': 'Utilities',
  };
  
  let content = `/**
 * Log Module Registry (Auto-Generated)
 *
 * This file is auto-generated by infra/cloudflare/scripts/generate-log-modules.ts
 * Do not edit manually - it will be overwritten on build
 *
 * Default Behavior:
 *   - Dev/Test: All modules enabled automatically (see everything)
 *   - Production: Only Errors/Warnings (safe by default)
 *   - Production debugging: Use X-Debug-Modules header per-request
 *
 * @example
 * // Dev/Test: Just run - all logs visible automatically
 * npm test
 *
 * // Production debugging: Enable specific modules per-request
 * fetch(url, { headers: { 'X-Debug-Modules': 'Badges,Credits' } })
 */

/**
 * All available log modules - automatically discovered from codebase
 */
export const LogModule = {
`;

  for (const category of categoryOrder) {
    const modules = groupedModules[category] || [];
    if (modules.length === 0) continue;
    
    const displayCategory = categoryMap[category] || category;
    content += `  // ${displayCategory}\n`;
    
    for (const moduleName of modules) {
      content += `  ${moduleName}: '${moduleName}',\n`;
    }
    
    content += '\n';
  }
  
  content += `} as const;

export type LogModuleType = (typeof LogModule)[keyof typeof LogModule];
`;

  return content;
}

async function generateLogModules(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const cloudflareDir = dirname(scriptDir);
  const srcDir = join(cloudflareDir, 'src');
  const modules = new Map<string, ModuleInfo>();

  console.log('[generate-log-modules] Scanning for LogModule usage...');
  scanDirectory(srcDir, srcDir, modules);

  console.log(`[generate-log-modules] Found ${modules.size} unique log modules`);

  const groupedModules = groupModulesByCategory(modules);
  
  const outputContent = generateLogModulesFile(groupedModules);
  const outputPath = join(srcDir, 'constants', 'log-modules.generated.ts');
  
  writeFileSync(outputPath, outputContent, 'utf-8');
  
  console.log(`[generate-log-modules] Generated log-modules.generated.ts with ${modules.size} modules`);
  
  for (const [category, moduleList] of Object.entries(groupedModules)) {
    console.log(`  ${category}: ${moduleList.length} modules`);
  }
}

generateLogModules().catch((error) => {
  console.error('[generate-log-modules] Failed:', error);
  process.exit(1);
});
