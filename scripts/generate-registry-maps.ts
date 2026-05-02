import { readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { join, relative } from 'path';

interface AssetTypeMetadata {
  importPath: string;
  assetType: string;
  displayName?: string;
  icon?: string;
  category?: string;
  commonType?: string;
}

function deriveCommonType(assetType: string, category?: string): string {
  if (assetType === 'Card') {
    return 'Cards';
  }
  
  if (assetType.includes('Rules') || assetType.includes('Rule')) {
    return 'CardRules';
  }
  
  if (assetType.includes('Deck')) {
    return 'Decks';
  }
  
  if (assetType.includes('Scoring')) {
    return 'Scoring';
  }
  
  if (assetType.includes('Strategy') || assetType.includes('Tips')) {
    return 'Strategy';
  }
  
  if (assetType.includes('AI') || category === 'AI') {
    return 'AI';
  }
  
  return 'Assets';
}

function parseFieldType(typeString: string): string | null {
  const trimmed = typeString.trim();
  
  if (trimmed === 'string') return 'String';
  if (trimmed === 'number') return 'Number';
  if (trimmed === 'boolean') return 'Boolean';
  if (trimmed.startsWith('Array<') || trimmed.endsWith('[]')) return 'Array';
  if (trimmed === 'AssetRef' || trimmed.startsWith('AssetRef<')) return 'AssetRef';
  
  return trimmed;
}

function extractClassBody(classContent: string, classStartIndex: number): string | null {
  const firstBraceIndex = classContent.indexOf('{', classStartIndex);
  if (firstBraceIndex < 0) return null;

  let depth = 0;
  for (let index = firstBraceIndex; index < classContent.length; index++) {
    const char = classContent[index];
    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        return classContent.slice(firstBraceIndex + 1, index);
      }
    }
  }

  return null;
}

function parseFieldTypes(classContent: string, classStartIndex: number): { fieldTypes: Record<string, string>; requiredFields: Record<string, string> } {
  const fieldTypes: Record<string, string> = {};
  const requiredFields: Record<string, string> = {};
  
  const classBody = extractClassBody(classContent, classStartIndex);
  if (!classBody) return { fieldTypes, requiredFields };
  
  const lines = classBody.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';
    const prevPrevLine = i > 1 ? lines[i - 2] : '';
    const prevPrevPrevLine = i > 2 ? lines[i - 3] : '';
    
    const hasSerializable = prevLine.includes('@serializable') || prevPrevLine.includes('@serializable') || line.includes('@serializable');
    const hasRequired = prevLine.includes('@required') || prevPrevLine.includes('@required') || prevPrevPrevLine.includes('@required') || line.includes('@required');
    
    if (hasSerializable) {
      const fieldMatch = line.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:!|\?)?\s*:\s*([^=;]+?)(?:\s*=|;)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const typeString = fieldMatch[2].trim();
        const parsedType = parseFieldType(typeString);
        if (parsedType) {
          fieldTypes[fieldName] = parsedType;
        }
        
        if (hasRequired) {
          const requiredMessageMatch = (prevLine + prevPrevLine + prevPrevPrevLine + line).match(/@required\s*\(\s*['"]([^'"]+)['"]\s*\)/);
          const message = requiredMessageMatch ? requiredMessageMatch[1] : `${fieldName} is required`;
          requiredFields[fieldName] = message;
        }
      }
    }
  }
  
  return { fieldTypes, requiredFields };
}

const PACKAGE_SCAN_DIRS = [
  { pkgPath: 'packages/asset-domain' },
  { pkgPath: 'packages/game-asset-domain' },
] as const;

const EXCLUDED_MAIN_APP_ASSET_TYPES = new Set([
  'AssetRegistry',
  'GameInfo',
]);

function getPackageName(pkgPath: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), pkgPath, 'package.json'), 'utf-8'));
    return (pkg?.name as string) ?? null;
  } catch {
    return null;
  }
}

async function generateRegistryMaps(): Promise<void> {
  const cwd = process.cwd();
  const srcDir = join(cwd, 'src');
  const inspectorMap: Record<string, string> = {};
  const assetTypeMap: Record<string, AssetTypeMetadata> = {};
  const inheritanceMap: Record<string, string> = {};
  const classNameToAssetType: Record<string, string> = {};
  const fieldTypeMap: Record<string, Record<string, string>> = {};
  const requiredFieldsMap: Record<string, Record<string, string>> = {};

  const scanDirectory = (
    currentDir: string,
    scanRoot: string,
    importPrefix: string,
    options: { skipInspectors?: boolean } = {}
  ): void => {
    const { skipInspectors = false } = options;
    try {
      const entries = readdirSync(currentDir);

      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (entry === '__tests__' || entry === 'test' || entry === 'tests') {
            continue;
          }
          scanDirectory(fullPath, scanRoot, importPrefix, options);
        } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
          const relativePath = relative(scanRoot, fullPath).replace(/\\/g, '/');

          if (relativePath.includes('/__tests__/') || relativePath.includes('/test/') || relativePath.includes('/tests/')) {
            continue;
          }

          const importPath = importPrefix + relativePath.replace(/\.(tsx?)$/, '');

          if (!skipInspectors && (entry.endsWith('Inspector.tsx') || entry.endsWith('Inspector.ts'))) {
            const match = entry.match(/^(.+?)Inspector\.(tsx?)$/);
            if (match) {
              const assetTypeName = match[1];
              inspectorMap[assetTypeName] = importPath;
            }
          } else {
            try {
              const content = readFileSync(fullPath, 'utf-8');

              const decoratorMatches = [...content.matchAll(/@serializableClass\s*\(\s*\{([^}]*)\}/gs)];

              if (decoratorMatches.length > 0) {
                for (const decoratorMatch of decoratorMatches) {
                  try {
                    const decoratorContent = decoratorMatch[1];
                    const assetTypeMatch = decoratorContent.match(/assetType\s*:\s*['"]([^'"]+)['"]/);
                    if (assetTypeMatch) {
                      const matchedAssetType = assetTypeMatch[1];
                      const displayNameMatch = decoratorContent.match(/displayName\s*:\s*['"]([^'"]+)['"]/);
                      const iconMatch = decoratorContent.match(/icon\s*:\s*['"]([^'"]+)['"]/);
                      const categoryMatch = decoratorContent.match(/category\s*:\s*AssetTypeCategory\.(\w+)/);

                      const matchedDisplayName = displayNameMatch ? displayNameMatch[1] : undefined;
                      const matchedIcon = iconMatch ? iconMatch[1] : undefined;
                      const matchedCategory = categoryMatch ? categoryMatch[1] : undefined;
                      const commonTypeMatch = decoratorContent.match(/commonType\s*:\s*['"]([^'"]+)['"]/);
                      const matchedCommonType = commonTypeMatch ? commonTypeMatch[1] : deriveCommonType(matchedAssetType, matchedCategory);

                      const decoratorIndex = decoratorMatch.index || 0;
                      const afterDecorator = content.substring(decoratorIndex);
                      const classMatch = afterDecorator.match(/(?:export\s+(?:abstract\s+)?class|class)\s+(\w+)/);

                      if (classMatch) {
                        const className = classMatch[1];
                        assetTypeMap[matchedAssetType] = {
                          importPath,
                          assetType: matchedAssetType,
                          displayName: matchedDisplayName,
                          icon: matchedIcon,
                          category: matchedCategory,
                          commonType: matchedCommonType,
                        };

                        classNameToAssetType[className] = matchedAssetType;

                        const classBlock = afterDecorator.substring(classMatch.index || 0);
                        const classBodyStart = classBlock.indexOf('{');
                        if (classBodyStart >= 0) {
                          const { fieldTypes, requiredFields } = parseFieldTypes(content, decoratorIndex + (classMatch.index || 0) + classBodyStart);
                          if (Object.keys(fieldTypes).length > 0) {
                            fieldTypeMap[matchedAssetType] = fieldTypes;
                          }
                          if (Object.keys(requiredFields).length > 0) {
                            requiredFieldsMap[matchedAssetType] = requiredFields;
                          }
                        }

                        const extendsMatch = classBlock.match(/extends\s+(\w+)/);
                        if (extendsMatch) {
                          const parentClassName = extendsMatch[1];
                          inheritanceMap[matchedAssetType] = parentClassName;
                        }
                      }
                    }
                  } catch (err) {
                    console.warn(`[generate-registry-maps] Error parsing decorator in ${entry}:`, err);
                  }
                }
              }

              const staticAssetTypeMatch = content.match(/static\s+(?:override\s+)?assetType\s*=\s*['"]([^'"]+)['"]/);
              if (staticAssetTypeMatch && !assetTypeMap[staticAssetTypeMatch[1]]) {
                const staticAssetType = staticAssetTypeMatch[1];
                const displayNameMatch = content.match(/static\s+(?:override\s+)?displayName\s*=\s*['"]([^'"]+)['"]/);
                const iconMatch = content.match(/static\s+(?:override\s+)?icon\s*=\s*['"]([^'"]+)['"]/);
                const categoryMatch = content.match(/static\s+(?:override\s+)?category\s*=\s*AssetTypeCategory\.(\w+)/);
                const commonTypeMatch = content.match(/static\s+(?:override\s+)?commonType\s*=\s*['"]([^'"]+)['"]/);
                const matchedCategory = categoryMatch ? categoryMatch[1] : undefined;
                const matchedCommonType = commonTypeMatch ? commonTypeMatch[1] : deriveCommonType(staticAssetType, matchedCategory);

                assetTypeMap[staticAssetType] = {
                  importPath,
                  assetType: staticAssetType,
                  displayName: displayNameMatch ? displayNameMatch[1] : undefined,
                  icon: iconMatch ? iconMatch[1] : undefined,
                  category: matchedCategory,
                  commonType: matchedCommonType,
                };

                const classMatch = content.match(/(?:export\s+(?:abstract\s+)?class|class)\s+(\w+)/);
                if (classMatch) {
                  const className = classMatch[1];
                  classNameToAssetType[className] = staticAssetType;
                  
                  const classBodyStart = content.indexOf('{', classMatch.index || 0);
                  if (classBodyStart >= 0) {
                    const { fieldTypes, requiredFields } = parseFieldTypes(content, classBodyStart);
                    if (Object.keys(fieldTypes).length > 0) {
                      fieldTypeMap[staticAssetType] = fieldTypes;
                    }
                    if (Object.keys(requiredFields).length > 0) {
                      requiredFieldsMap[staticAssetType] = requiredFields;
                    }
                  }
                }

                const extendsMatch = content.match(/extends\s+(\w+)/);
                if (extendsMatch) {
                  const parentClassName = extendsMatch[1];
                  inheritanceMap[staticAssetType] = parentClassName;
                }
              }
            } catch (error) {
              console.warn(`[generate-registry-maps] Failed to parse ${fullPath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[generate-registry-maps] Failed to scan ${currentDir}:`, error);
    }
  };

  scanDirectory(srcDir, srcDir, '@/');

  for (const pkg of PACKAGE_SCAN_DIRS) {
    const packageName = getPackageName(pkg.pkgPath);
    if (!packageName) continue;
    const pkgSrcDir = join(cwd, pkg.pkgPath, 'src');
    try {
      if (statSync(pkgSrcDir).isDirectory()) {
        scanDirectory(pkgSrcDir, pkgSrcDir, `${packageName}/`, { skipInspectors: true });
      }
    } catch {
      /* skip if src missing */
    }
  }

  const findParentInspector = (assetType: string, visited: Set<string> = new Set()): string | null => {
    if (visited.has(assetType)) {
      return null;
    }
    visited.add(assetType);

    if (inspectorMap[assetType]) {
      return inspectorMap[assetType];
    }

    const parentClassName = inheritanceMap[assetType];
    if (parentClassName) {
      const parentAssetType = classNameToAssetType[parentClassName] || parentClassName;

      if (parentAssetType && parentAssetType !== assetType) {
        return findParentInspector(parentAssetType, visited);
      }
    }

    return null;
  };

  for (const assetType of Object.keys(assetTypeMap)) {
    if (!inspectorMap[assetType]) {
      const parentInspector = findParentInspector(assetType);
      if (parentInspector) {
        inspectorMap[assetType] = parentInspector;
      }
    }
  }

  const assetEditorAssetTypeMap = { ...assetTypeMap };
  const assetEditorFieldTypeMap = { ...fieldTypeMap };
  const assetEditorRequiredFieldsMap = { ...requiredFieldsMap };

  for (const excludedType of EXCLUDED_MAIN_APP_ASSET_TYPES) {
    delete assetTypeMap[excludedType];
    delete fieldTypeMap[excludedType];
    delete requiredFieldsMap[excludedType];
    delete inheritanceMap[excludedType];
  }

  const registryDir = join(srcDir, 'lib', 'core', 'registry');

  const inspectorMapContent = `// This file is auto-generated by scripts/generate-registry-maps.ts
// Do not edit manually - it will be overwritten on build

export type ImportPath = string;

export const inspectorMap = ${JSON.stringify(inspectorMap, null, 2)} as const;

export type InspectorTypeName = keyof typeof inspectorMap;

export type InspectorMap = Record<InspectorTypeName, ImportPath>;
`;

  const createAssetTypeMapContent = (map: Record<string, AssetTypeMetadata>) => `// This file is auto-generated by scripts/generate-registry-maps.ts
// Do not edit manually - it will be overwritten on build

import { decodeImportPath, type AssetTypeMetadata } from '@ocentra/asset-domain/constants/assets';

const rawAssetTypeMap = ${JSON.stringify(map, null, 2)} as const;

export const assetTypeMap: Record<string, AssetTypeMetadata> = Object.fromEntries(
  Object.entries(rawAssetTypeMap).map(([assetType, metadata]) => [
    assetType,
    {
      ...metadata,
      importPath: decodeImportPath(metadata.importPath),
    },
  ]),
);
`;

  const createAssetConstructorLoadersContent = (map: Record<string, AssetTypeMetadata>) => {
    const loaderEntries = Object.entries(map)
    .filter(([, m]) => m.importPath.startsWith('@ocentra/'))
    .map(([k, m]) => {
      return `  ${JSON.stringify(k)}: () => import(${JSON.stringify(m.importPath)})`;
    })
    .join(',\n');
    return `// This file is auto-generated by scripts/generate-registry-maps.ts
// Do not edit manually - it will be overwritten on build
// Literal import() so Vite can bundle; bare specifiers fail in dynamic import(variable)

export const assetConstructorLoaders: Record<string, () => Promise<unknown>> = {
${loaderEntries}
};
`;
  };

  const createFieldTypeMapContent = (map: Record<string, Record<string, string>>) => `// This file is auto-generated by scripts/generate-registry-maps.ts
// Do not edit manually - it will be overwritten on build

export const fieldTypeMap: Record<string, Record<string, string>> = ${JSON.stringify(map, null, 2)};
`;

  const createRequiredFieldsMapContent = (map: Record<string, Record<string, string>>) => `// This file is auto-generated by scripts/generate-registry-maps.ts
// Do not edit manually - it will be overwritten on build

export const requiredFieldsMap: Record<string, Record<string, string>> = ${JSON.stringify(map, null, 2)};
`;

  writeFileSync(join(registryDir, 'inspectorMap.generated.ts'), inspectorMapContent, 'utf-8');
  writeFileSync(join(registryDir, 'assetTypeMap.generated.ts'), createAssetTypeMapContent(assetTypeMap), 'utf-8');
  writeFileSync(join(registryDir, 'assetConstructorLoaders.generated.ts'), createAssetConstructorLoadersContent(assetTypeMap), 'utf-8');
  writeFileSync(join(registryDir, 'fieldTypeMap.generated.ts'), createFieldTypeMapContent(fieldTypeMap), 'utf-8');
  writeFileSync(join(registryDir, 'requiredFieldsMap.generated.ts'), createRequiredFieldsMapContent(requiredFieldsMap), 'utf-8');

  const assetEditorRegistryDir = join(cwd, 'packages', 'asset-editor', 'src', 'lib', 'core', 'registry');
  writeFileSync(join(assetEditorRegistryDir, 'assetTypeMap.generated.ts'), createAssetTypeMapContent(assetEditorAssetTypeMap), 'utf-8');
  writeFileSync(join(assetEditorRegistryDir, 'assetConstructorLoaders.generated.ts'), createAssetConstructorLoadersContent(assetEditorAssetTypeMap), 'utf-8');
  writeFileSync(join(assetEditorRegistryDir, 'fieldTypeMap.generated.ts'), createFieldTypeMapContent(assetEditorFieldTypeMap), 'utf-8');
  writeFileSync(join(assetEditorRegistryDir, 'requiredFieldsMap.generated.ts'), createRequiredFieldsMapContent(assetEditorRequiredFieldsMap), 'utf-8');

  const inspectorCount = Object.keys(inspectorMap).length;
  if (inspectorCount > 0) {
    console.log(`[generate-registry-maps] Generated local inspector map with ${inspectorCount} entries`);
  } else {
    console.log('[generate-registry-maps] No local inspector entries found in main app src/ (expected for current main app build)');
  }
  console.log(`[generate-registry-maps] Generated asset type map with ${Object.keys(assetTypeMap).length} entries`);
  console.log(`[generate-registry-maps] Generated field type map with ${Object.keys(fieldTypeMap).length} asset types`);
  console.log(`[generate-registry-maps] Generated required fields map with ${Object.keys(requiredFieldsMap).length} asset types`);
  console.log(`[generate-registry-maps] Asset type metadata generation completed`);
}

generateRegistryMaps().catch((error) => {
  console.error('[generate-registry-maps] Failed:', error);
  process.exit(1);
});
