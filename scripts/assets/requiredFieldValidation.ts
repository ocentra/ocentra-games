import 'reflect-metadata';
import type { Plugin } from 'vite';
import glob from 'glob';
import { readFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { extname, join } from 'path';
import { execSync } from 'child_process';
import JSON5 from 'json5';

const globAsync = promisify(glob.glob);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface AssetValidationError {
  file: string;
  assetType: string;
  guid?: string;
  errors: ValidationError[];
}

type SerializableConstructor<T = unknown> = new () => T;


interface AssetTypeMetadata {
  importPath: string;
  assetType: string;
  displayName?: string;
  icon?: string;
  category?: string;
  commonType?: string;
}

type GetSerializableFields = <T>(constructor: SerializableConstructor<T>) => SerializableField[];
type AssetTypeMetadataMap = Record<string, AssetTypeMetadata>;

interface SerializableField {
  key: string;
  options: unknown;
  defaultValue: unknown;
  designType?: SerializableConstructor | ArrayConstructor;
}

export interface AssetValidationPluginOptions {
  pattern?: string;
  failOnError?: boolean;
}

interface SourceCodeValidationError {
  file: string;
  line: number;
  field: string;
  message: string;
}

function findRequiredFieldsInSource(content: string): Map<string, { line: number }> {
  const requiredFields = new Map<string, { line: number }>();
  const lines = content.split('\n');
  let inClass = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.match(/^(export\s+)?(abstract\s+)?class\s+\w+/)) {
      inClass = true;
      continue;
    }

    if (inClass && trimmed.match(/^}/)) {
      inClass = false;
      continue;
    }

    if (inClass && trimmed.includes('@required')) {
      let fieldFound = false;
      const currentLineMatch = line.match(/^\s*(\w+)\s*[!:?]/);
      if (currentLineMatch && !line.includes('{') && !line.includes('(')) {
        const fieldName = currentLineMatch[1];
        requiredFields.set(fieldName, {
          line: i + 1,
        });
        fieldFound = true;
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextLineMatch = nextLine.match(/^\s*(readonly\s+|private\s+|public\s+|protected\s+)?(\w+)\s*[!:?]/);
        if (nextLineMatch && !nextLine.includes('{') && !nextLine.includes('(')) {
          const fieldName = nextLineMatch[2] || nextLineMatch[1];
          requiredFields.set(fieldName, {
            line: i + 2,
          });
          fieldFound = true;
        }
      }
      if (!fieldFound && i + 2 < lines.length) {
        const secondNextLine = lines[i + 2];
        const secondNextLineMatch = secondNextLine.match(/^\s*(readonly\s+|private\s+|public\s+|protected\s+)?(\w+)\s*[!:?]/);
        if (secondNextLineMatch && !secondNextLine.includes('{') && !secondNextLine.includes('(')) {
          const fieldName = secondNextLineMatch[2] || secondNextLineMatch[1];
          requiredFields.set(fieldName, {
            line: i + 3,
          });
        }
      }
    }
  }

  return requiredFields;
}

function findConstructorInitializations(content: string): Set<string> {
  const initializedFields = new Set<string>();
  const lines = content.split('\n');
  let inConstructor = false;
  let braceDepth = 0;
  let parenDepth = 0;

  for (const line of lines) {
    if (line.includes('constructor(')) {
      inConstructor = true;
      braceDepth = 0;
      parenDepth = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
    }

    if (inConstructor) {
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      parenDepth += (line.match(/\(/g) || []).length;
      parenDepth -= (line.match(/\)/g) || []).length;

      const assignmentPatterns = [
        /this\.(\w+)\s*=/,
        /this\[['"](\w+)['"]\]\s*=/,
        /this\.(\w+)\s*:/,
      ];

      for (const pattern of assignmentPatterns) {
        const match = line.match(pattern);
        if (match) {
          initializedFields.add(match[1]);
        }
      }

      if (braceDepth <= 0 && parenDepth <= 0 && line.includes('}')) {
        inConstructor = false;
      }
    }
  }

  return initializedFields;
}

function validateSourceFile(filePath: string, errors: SourceCodeValidationError[]): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    if (!content.includes('@required')) {
      return;
    }

    const requiredFields = findRequiredFieldsInSource(content);
    if (requiredFields.size === 0) {
      return;
    }

    const initializedFields = findConstructorInitializations(content);

    for (const [fieldName, fieldInfo] of requiredFields) {
      if (!initializedFields.has(fieldName)) {
        errors.push({
          file: filePath,
          line: fieldInfo.line,
          field: fieldName,
          message: `Field "${fieldName}" is marked as @required but is not initialized in constructor`,
        });
      }
    }
  } catch (error) {
    console.error(`Error validating ${filePath}:`, error);
  }
}

function walkSourceDirectory(dir: string, errors: SourceCodeValidationError[]): void {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.git' && entry !== 'dist' && entry !== 'build' && entry !== 'test') {
        walkSourceDirectory(fullPath, errors);
      }
    } else if (extname(entry) === '.ts' || extname(entry) === '.tsx') {
      if (!fullPath.includes('.test.') && !fullPath.includes('.spec.')) {
        validateSourceFile(fullPath, errors);
      }
    }
  }
}

export function validateRequiredFieldsInSource(): void {
  const errors: SourceCodeValidationError[] = [];
  const srcDir = join(__dirname, '../../src');
  walkSourceDirectory(srcDir, errors);

  if (errors.length > 0) {
    console.error('\n\x1b[31m\x1b[1m❌ Required Field Validation Failed\x1b[0m\n');

    for (const error of errors) {
      const relativePath = error.file.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '');
      console.error(`\x1b[1m📄 ${relativePath}:${error.line}\x1b[0m`);
      console.error(`   \x1b[33m${error.field}\x1b[0m: ${error.message}`);
      console.error('');
    }

    console.error(`\x1b[31mFound ${errors.length} required field(s) not initialized in constructors\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log('\x1b[32m✅ All required fields are properly initialized\x1b[0m\n');
  }
}

export function assetValidationPlugin(options: AssetValidationPluginOptions = {}): Plugin {
  const {
    failOnError = false,
  } = options;

  let hasValidated = false;
  let isDevMode = false;

  return {
    name: 'asset-validation',
    enforce: 'pre',

    async buildStart() {
      if (hasValidated || isDevMode) return;
      if (process.env.VITE_SKIP_ASSET_VALIDATION === '1' || process.env.VITE_SKIP_ASSET_VALIDATION === 'true') return;
      hasValidated = true;

      try {
        execSync('tsx --tsconfig tsconfig.node.json scripts/validate-required-fields.ts', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
      } catch (error) {
        if (failOnError) {
          throw error;
        }
      }
    },

    configureServer(server) {
      isDevMode = true;
      let devValidated = false;
      server.middlewares.use(async (req, _res, next) => {
        const skipValidation = process.env.VITE_SKIP_ASSET_VALIDATION === '1' || process.env.VITE_SKIP_ASSET_VALIDATION === 'true';
        if (skipValidation || (req.url !== '/' && !req.url?.startsWith('/@')) || devValidated) {
          next();
          return;
        }
        devValidated = true;
        try {
          execSync('tsx --tsconfig tsconfig.node.json scripts/validate-required-fields.ts', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
        } catch {
          console.error('\n\x1b[33m\x1b[1m⚠️  Asset Validation Errors Detected\x1b[0m');
          console.error('\x1b[33m   Dev server will continue. Please fix validation errors - lint check will fail if errors persist.\x1b[0m\n');
        }
        next();
      });
    },
  };
}

export async function validateAllAssets(pattern: string, failOnError: boolean): Promise<void> {
  if (process.env.VITE_SKIP_ASSET_VALIDATION === '1' || process.env.VITE_SKIP_ASSET_VALIDATION === 'true') {
    return;
  }
  console.log('\n\x1b[36m\x1b[1m🔍 Validating assets...\x1b[0m');

  const assetFiles = await globAsync(pattern);

  if (assetFiles.length === 0) {
    console.log('\x1b[33m⚠️  No asset files found\x1b[0m');
    return;
  }

  console.log(`\x1b[90m   Found ${assetFiles.length} asset files\x1b[0m`);

  const assetTypeMapFilePath = path.join(__dirname, '../../src/lib/core/registry/assetTypeMap.generated.ts');
  if (!existsSync(assetTypeMapFilePath)) {
    console.error('\x1b[31m\x1b[1m❌ Asset type map not found. Run generate-registry-maps first.\x1b[0m\n');
    if (failOnError) {
      throw new Error('Asset type map not generated. Make sure generate-registry-maps plugin runs before validation.');
    }
    return;
  }

  const fieldTypeMapFilePath = path.join(__dirname, '../../src/lib/core/registry/fieldTypeMap.generated.ts');

  let getSerializableFields: GetSerializableFields;
  try {
    await import('reflect-metadata');
    const decoratorsModule = await import('@ocentra/asset-domain/serialization/decorators') as { 
      getSerializableFields: GetSerializableFields;
    };
    getSerializableFields = decoratorsModule.getSerializableFields;
  } catch (error) {
    console.error('\x1b[31m\x1b[1m❌ Failed to load decorators module. This may indicate a build configuration issue.\x1b[0m\n');
    if (failOnError) {
      throw new Error(`Failed to load decorators: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  const assetTypeMapContent = readFileSync(assetTypeMapFilePath, 'utf-8');
  const assetTypeMapMatch = assetTypeMapContent.match(/export const assetTypeMap[^=]*=\s*({[\s\S]*});/);
  if (!assetTypeMapMatch) {
    console.error('\x1b[31m\x1b[1m❌ Failed to parse asset type map file\x1b[0m\n');
    if (failOnError) {
      throw new Error('Failed to parse asset type map file');
    }
    return;
  }
  const assetTypeMap: AssetTypeMetadataMap = JSON5.parse(assetTypeMapMatch[1]);

  let fieldTypeMap: Record<string, Record<string, string>> = {};
  if (existsSync(fieldTypeMapFilePath)) {
    const fieldTypeMapContent = readFileSync(fieldTypeMapFilePath, 'utf-8');
    const fieldTypeMapMatch = fieldTypeMapContent.match(/export const fieldTypeMap[^=]*=\s*({[\s\S]*});/);
    if (fieldTypeMapMatch) {
      fieldTypeMap = JSON5.parse(fieldTypeMapMatch[1]);
    }
  }

  const requiredFieldsMapFilePath = path.join(__dirname, '../../src/lib/core/registry/requiredFieldsMap.generated.ts');
  let requiredFieldsMap: Record<string, Record<string, string>> = {};
  if (existsSync(requiredFieldsMapFilePath)) {
    const requiredFieldsMapContent = readFileSync(requiredFieldsMapFilePath, 'utf-8');
    const requiredFieldsMapMatch = requiredFieldsMapContent.match(/export const requiredFieldsMap[^=]*=\s*({[\s\S]*});/);
    if (requiredFieldsMapMatch) {
      requiredFieldsMap = JSON5.parse(requiredFieldsMapMatch[1]);
    }
  }

  const allErrors: AssetValidationError[] = [];
  const constructorCache = new Map<string, SerializableConstructor | null>();

  for (const file of assetFiles) {
    const errors = await validateAssetFile(file, getSerializableFields, assetTypeMap, constructorCache, __dirname, fieldTypeMap, requiredFieldsMap);
    if (errors) {
      allErrors.push(errors);
    }
  }

  if (allErrors.length > 0) {
    console.error('\n\x1b[31m\x1b[1m❌ Asset Validation Failed\x1b[0m\n');

    for (const assetError of allErrors) {
      const relativePath = path.relative(process.cwd(), assetError.file);
      console.error(`\x1b[1m📄 ${relativePath}\x1b[0m`);
      console.error(`   Type: \x1b[36m${assetError.assetType}\x1b[0m${assetError.guid ? ` | GUID: \x1b[90m${assetError.guid}\x1b[0m` : ''}`);

      for (const error of assetError.errors) {
        const icon = error.severity === 'error' ? '❌' : '⚠️';
        console.error(`   ${icon} \x1b[33m${error.field}\x1b[0m: ${error.message}`);
      }
      console.error('');
    }

    console.error(`\x1b[31mFound ${allErrors.length} asset(s) with validation errors\x1b[0m\n`);

    if (failOnError) {
      const errorSummary = allErrors.map(err => {
        const relativePath = path.relative(process.cwd(), err.file);
        const errorList = err.errors.map(e => `  - ${e.field}: ${e.message}`).join('\n');
        return `${relativePath} (${err.assetType}):\n${errorList}`;
      }).join('\n\n');
      throw new Error(`Asset validation failed:\n\n${errorSummary}`);
    }
  } else {
    console.log('\x1b[32m✅ All assets validated successfully\x1b[0m\n');
  }
}

async function getConstructor(
  assetType: string,
  assetTypeMap: AssetTypeMetadataMap,
  cache: Map<string, SerializableConstructor | null>,
  pluginDir: string
): Promise<SerializableConstructor | null> {
  if (cache.has(assetType)) {
    return cache.get(assetType) || null;
  }

  const metadata = assetTypeMap[assetType];
  if (!metadata) {
    cache.set(assetType, null);
    return null;
  }

  try {
    const importPath = metadata.importPath;
    
    let module;
    try {
      module = await import(/* @vite-ignore */ importPath);
    } catch {
      let resolvedPath = importPath;
      if (importPath.startsWith('@/')) {
        resolvedPath = path.join(pluginDir, '../../src', importPath.slice(2));
      } else if (importPath.startsWith('@')) {
        const alias = importPath.split('/')[0];
        const rest = importPath.slice(alias.length + 1);
        if (alias === '@lib') {
          resolvedPath = path.join(pluginDir, '../../src/lib', rest);
        } else if (alias === '@gameMode') {
          resolvedPath = path.join(pluginDir, '../../src/gameMode', rest);
        } else {
          resolvedPath = path.join(pluginDir, '../../src', alias.slice(1), rest);
        }
      }
      let modulePath = pathToFileURL(path.resolve(resolvedPath + '.ts')).href;
      try {
        module = await import(modulePath);
      } catch {
        modulePath = pathToFileURL(path.resolve(resolvedPath + '.tsx')).href;
        module = await import(modulePath);
      }
    }
    
    const Constructor = module[assetType] || module.default || Object.values(module).find((exp: unknown) => 
      typeof exp === 'function' && exp.name === assetType
    ) as SerializableConstructor | undefined;
    
    if (Constructor && typeof Constructor === 'function') {
      cache.set(assetType, Constructor);
      return Constructor;
    }
    
    cache.set(assetType, null);
    return null;
  } catch {
    cache.set(assetType, null);
    return null;
  }
}

export function validateFieldTypeByTypeName(
  fieldKey: string,
  value: unknown,
  typeName: string
): ValidationError | null {
  if (value === null || value === undefined) {
    return {
      field: fieldKey,
      message: `${fieldKey} is required but is null or undefined`,
      severity: 'error',
    };
  }

  if (typeName === 'Array') {
    if (!Array.isArray(value)) {
      return {
        field: fieldKey,
        message: `${fieldKey} must be an array, got ${typeof value}`,
        severity: 'error',
      };
    }
    return null;
  }

  if (typeName === 'String') {
    if (typeof value !== 'string') {
      return {
        field: fieldKey,
        message: `${fieldKey} must be a string, got ${typeof value}`,
        severity: 'error',
      };
    }
    if (value.trim() === '') {
      return {
        field: fieldKey,
        message: `${fieldKey} cannot be empty`,
        severity: 'error',
      };
    }
    return null;
  }

  if (typeName === 'Number') {
    if (typeof value !== 'number') {
      return {
        field: fieldKey,
        message: `${fieldKey} must be a number, got ${typeof value}`,
        severity: 'error',
      };
    }
    return null;
  }

  if (typeName === 'Boolean') {
    if (typeof value !== 'boolean') {
      return {
        field: fieldKey,
        message: `${fieldKey} must be a boolean, got ${typeof value}`,
        severity: 'error',
      };
    }
    return null;
  }

  if (typeName === 'AssetRef') {
    if (typeof value !== 'object' || value === null) {
      return {
        field: fieldKey,
        message: `${fieldKey} must be an AssetRef object, got ${typeof value}`,
        severity: 'error',
      };
    }
    const refValue = value as Record<string, unknown>;
    if (typeof refValue.guid !== 'string') {
      return {
        field: fieldKey,
        message: `${fieldKey} must have a 'guid' property of type string`,
        severity: 'error',
      };
    }
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(refValue.guid)) {
      return {
        field: fieldKey,
        message: `${fieldKey} has invalid GUID format: ${refValue.guid}`,
        severity: 'error',
      };
    }
    return null;
  }

  return null;
}

export function validateFieldType(
  fieldKey: string,
  value: unknown,
  designType: SerializableConstructor | ArrayConstructor | undefined
): ValidationError | null {
  if (value === null || value === undefined) {
    return {
      field: fieldKey,
      message: `${fieldKey} is required but is null or undefined`,
      severity: 'error',
    };
  }

  if (!designType) {
    return null;
  }

  const designTypeName = designType.name;

  if (designType === Array || designTypeName === 'Array') {
    if (!Array.isArray(value)) {
      return {
        field: fieldKey,
        message: `${fieldKey} must be an array, got ${typeof value}`,
        severity: 'error',
      };
    }
    return null;
  }

  if (designTypeName === 'String') {
    if (typeof value !== 'string') {
      return {
        field: fieldKey,
        message: `${fieldKey} must be a string, got ${typeof value}`,
        severity: 'error',
      };
    }
    if (value.trim() === '') {
      return {
        field: fieldKey,
        message: `${fieldKey} cannot be empty`,
        severity: 'error',
      };
    }
    return null;
  }

  if (designTypeName === 'Number') {
    if (typeof value !== 'number') {
      return {
        field: fieldKey,
        message: `${fieldKey} must be a number, got ${typeof value}`,
        severity: 'error',
      };
    }
    return null;
  }

  if (designTypeName === 'Boolean') {
    if (typeof value !== 'boolean') {
      return {
        field: fieldKey,
        message: `${fieldKey} must be a boolean, got ${typeof value}`,
        severity: 'error',
      };
    }
    return null;
  }

  if (designTypeName === 'AssetRef') {
    if (typeof value !== 'object' || value === null) {
      return {
        field: fieldKey,
        message: `${fieldKey} must be an AssetRef object, got ${typeof value}`,
        severity: 'error',
      };
    }
    const refValue = value as Record<string, unknown>;
    if (typeof refValue.guid !== 'string') {
      return {
        field: fieldKey,
        message: `${fieldKey} must have a 'guid' property of type string`,
        severity: 'error',
      };
    }
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(refValue.guid)) {
      return {
        field: fieldKey,
        message: `${fieldKey} has invalid GUID format: ${refValue.guid}`,
        severity: 'error',
      };
    }
    return null;
  }

  if (typeof designType === 'function' && designType !== Object && designType !== Function) {
    if (typeof value !== 'object' || value === null) {
      return {
        field: fieldKey,
        message: `${fieldKey} must be an object of type ${designTypeName}, got ${typeof value}`,
        severity: 'error',
      };
    }
  }

  return null;
}

export async function findAssetFileByGuid(guid: string, searchRoot: string): Promise<string | null> {
  try {
    const resourcesPath = path.join(searchRoot, 'packages', 'asset-editor', 'Resources');
    if (!existsSync(resourcesPath)) {
      return null;
    }

    const assetFile = path.join(resourcesPath, `${guid}.asset`);
    if (existsSync(assetFile)) {
      return assetFile;
    }

    const subdirs = readdirSync(resourcesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const subdir of subdirs) {
      const subdirPath = path.join(resourcesPath, subdir);
      const assetFile = path.join(subdirPath, `${guid}.asset`);
      if (existsSync(assetFile)) {
        return assetFile;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function getReferencedAssetType(guid: string, searchRoot: string): Promise<string | null> {
  try {
    const assetFile = await findAssetFileByGuid(guid, searchRoot);
    if (!assetFile) {
      return null;
    }

    const content = await readFile(assetFile, 'utf-8');
    const parsed = JSON5.parse(content);
    return parsed.system?.assetType || null;
  } catch {
    return null;
  }
}

export function inferExpectedAssetType(fieldKey: string): string | null {
  const cleaned = fieldKey
    .replace(/Refs?$/, '')
    .replace(/Assets?$/, '')
    .replace(/asset/gi, '')
    .replace(/ref/gi, '');

  if (!cleaned || cleaned === fieldKey) {
    return null;
  }

  const pascalCase = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return pascalCase;
}

export async function validateAssetRef(
  fieldKey: string,
  value: unknown,
  searchRoot: string
): Promise<ValidationError | null> {
  if (typeof value !== 'object' || value === null) {
    return {
      field: fieldKey,
      message: `${fieldKey} must be an AssetRef object, got ${typeof value}`,
      severity: 'error',
    };
  }

  const refValue = value as Record<string, unknown>;
  if (typeof refValue.guid !== 'string') {
    return {
      field: fieldKey,
      message: `${fieldKey} must have a 'guid' property of type string`,
      severity: 'error',
    };
  }

  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guidRegex.test(refValue.guid)) {
    return {
      field: fieldKey,
      message: `${fieldKey} has invalid GUID format: ${refValue.guid}`,
      severity: 'error',
    };
  }

  const referencedAssetType = await getReferencedAssetType(refValue.guid, searchRoot);
  if (!referencedAssetType) {
    return {
      field: fieldKey,
      message: `${fieldKey} references asset with GUID ${refValue.guid} that does not exist`,
      severity: 'error',
    };
  }

  const expectedTypeFromRef = typeof refValue.type === 'string' ? refValue.type : null;
  const expectedTypeFromField = inferExpectedAssetType(fieldKey);

  if (expectedTypeFromRef && referencedAssetType !== expectedTypeFromRef) {
    return {
      field: fieldKey,
      message: `${fieldKey} references asset of type '${referencedAssetType}' but expected '${expectedTypeFromRef}'`,
      severity: 'error',
    };
  }

  if (expectedTypeFromField && referencedAssetType !== expectedTypeFromField) {
    return {
      field: fieldKey,
      message: `${fieldKey} references asset of type '${referencedAssetType}' but expected '${expectedTypeFromField}' (inferred from field name)`,
      severity: 'warning',
    };
  }

  return null;
}

export async function validateAssetFile(
  filePath: string,
  getSerializableFields: GetSerializableFields,
  assetTypeMap: AssetTypeMetadataMap,
  constructorCache: Map<string, SerializableConstructor | null>,
  pluginDir: string,
  fieldTypeMap?: Record<string, Record<string, string>>,
  requiredFieldsMap?: Record<string, Record<string, string>>
): Promise<AssetValidationError | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON5.parse(content);

    if (!parsed.system || !parsed.system.assetType) {
      return {
        file: filePath,
        assetType: 'Unknown',
        errors: [{
          field: 'system.assetType',
          message: 'Missing assetType in system metadata',
          severity: 'error',
        }],
      };
    }

    const assetType = parsed.system.assetType;

    const errors: ValidationError[] = [];
    
    let serializableFields: Array<{ key: string; designType?: SerializableConstructor | ArrayConstructor }> = [];
    const constructor = await getConstructor(assetType, assetTypeMap, constructorCache, pluginDir);
    if (constructor && typeof constructor === 'function') {
      serializableFields = getSerializableFields(constructor);
    }
    const fieldMap = new Map(serializableFields.map(f => [f.key, f]));

    let requiredFields: Array<{ key: string; message?: string }> = [];
    
    const requiredFieldsFromMap: Array<{ key: string; message?: string }> = [];
    if (requiredFieldsMap && requiredFieldsMap[assetType]) {
      requiredFieldsFromMap.push(...Object.entries(requiredFieldsMap[assetType]).map(([key, message]) => ({
        key,
        message,
      })));
    }

    const requiredFieldsFromDecorator: Array<{ key: string; message?: string }> = [];
    if (constructor && typeof constructor === 'function') {
      try {
        const decoratorsModule = await import('@ocentra/asset-domain/serialization/decorators') as { 
          getRequiredFields: <T>(constructor: SerializableConstructor<T>) => Array<{ key: string; message?: string }>;
        };
        if (decoratorsModule.getRequiredFields) {
          requiredFieldsFromDecorator.push(...decoratorsModule.getRequiredFields(constructor));
        }
      } catch {
        requiredFieldsFromDecorator.length = 0;
      }
    }

    const requiredFieldsMapByKey = new Map<string, { key: string; message?: string }>();
    for (const field of requiredFieldsFromMap) {
      requiredFieldsMapByKey.set(field.key, field);
    }
    for (const field of requiredFieldsFromDecorator) {
      if (!requiredFieldsMapByKey.has(field.key)) {
        requiredFieldsMapByKey.set(field.key, field);
      }
    }
    requiredFields = Array.from(requiredFieldsMapByKey.values());

    if (!parsed.data || typeof parsed.data !== 'object') {
      for (const fieldMeta of requiredFields) {
        errors.push({
          field: fieldMeta.key,
          message: fieldMeta.message || `${fieldMeta.key} is required`,
          severity: 'error',
        });
      }
      if (errors.length > 0) {
        return {
          file: filePath,
          assetType,
          guid: parsed.system.guid,
          errors,
        };
      }
      return null;
    }

    const isGameMode = assetType.includes('GameMode') && assetType !== 'GameMode';
    const systemLevelFields = isGameMode ? ['gameId', 'gameModeCategory'] : [];
    const baseSystemFields = ['treePath'];

    for (const fieldMeta of requiredFields) {
      const checkSystem = systemLevelFields.includes(fieldMeta.key) || baseSystemFields.includes(fieldMeta.key);
      if (checkSystem) {
        if (!parsed.system || !(fieldMeta.key in parsed.system)) {
          errors.push({
            field: fieldMeta.key,
            message: fieldMeta.message || `${fieldMeta.key} is required`,
            severity: 'error',
          });
        }
        continue;
      }

      if (!checkSystem && !(fieldMeta.key in parsed.data)) {
        errors.push({
          field: fieldMeta.key,
          message: fieldMeta.message || `${fieldMeta.key} is required`,
          severity: 'error',
        });
        continue;
      }

      const value = checkSystem ? parsed.system?.[fieldMeta.key] : parsed.data[fieldMeta.key];
      const serializableField = fieldMap.get(fieldMeta.key);

      if (value === null || value === undefined) {
        errors.push({
          field: fieldMeta.key,
          message: fieldMeta.message || `${fieldMeta.key} is required`,
          severity: 'error',
        });
        continue;
      }

      if (!serializableField) {
        continue;
      }

      let typeName: string | undefined;
      
      if (fieldTypeMap) {
        const assetFieldTypes = fieldTypeMap[assetType];
        if (assetFieldTypes) {
          typeName = assetFieldTypes[fieldMeta.key];
        }
      }
      
      if (!typeName) {
        typeName = serializableField.designType?.name;
      }
      
      if (typeName === 'AssetRef') {
        const assetRefError = await validateAssetRef(
          fieldMeta.key,
          value,
          path.join(pluginDir, '../..')
        );
        if (assetRefError) {
          errors.push(assetRefError);
        }
      } else if (typeName) {
        const typeError = validateFieldTypeByTypeName(
          fieldMeta.key,
          value,
          typeName
        );

        if (typeError) {
          errors.push(typeError);
        }
      } else if (serializableField.designType) {
        const typeError = validateFieldType(
          fieldMeta.key,
          value,
          serializableField.designType
        );

        if (typeError) {
          errors.push(typeError);
        }
      }
    }

    if (errors.length > 0) {
      return {
        file: filePath,
        assetType,
        guid: parsed.system.guid,
        errors,
      };
    }

    return null;
  } catch {
    return null;
  }
}
