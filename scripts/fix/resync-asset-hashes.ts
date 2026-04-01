
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';
import JSON5 from 'json5';
import { createHash } from 'crypto';

const ASSET_RESOURCES_DIR = path.join('packages', 'asset-editor', 'Resources');
const ASSET_REGISTRY_PATH = path.join(ASSET_RESOURCES_DIR, 'AssetRegistry.asset');

function getFileHash(fullPath: string): string {
    const buf = readFileSync(fullPath);
    return createHash('sha256').update(buf).digest('hex');
}

function walkDir(dir: string, callback: (filePath: string) => void) {
    if (!existsSync(dir)) return;
    const files = readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (statSync(fullPath).isDirectory()) {
            walkDir(fullPath, callback);
        } else {
            callback(fullPath);
        }
    }
}

async function run() {
    console.log('🔍 Building Hash Migration Map...');

    if (!existsSync(ASSET_REGISTRY_PATH)) {
        console.error('Asset registry not found at', ASSET_REGISTRY_PATH);
        return;
    }

    const assetRegistryContent = readFileSync(ASSET_REGISTRY_PATH, 'utf-8');
    const assetRegistry = JSON5.parse(assetRegistryContent);
    const resources = assetRegistry.data.resources || [];

    const migrationMap = new Map<string, string>();
    const pathMap = new Map<string, string>(); // path -> currentHash

    for (const res of resources) {
        if (!res.path) continue;

        const manifestHash = res.hash || res.checksum;
        if (!manifestHash) continue;

        const fullPath = path.join('packages', 'asset-editor', res.path);
        if (existsSync(fullPath) && !statSync(fullPath).isDirectory()) {
            const currentHash = getFileHash(fullPath);
            pathMap.set(res.path, currentHash);

            if (manifestHash !== currentHash) {
                console.log(`📍 Hash changed for ${res.path}:`);
                console.log(`   Old: ${manifestHash.substring(0, 8)}...`);
                console.log(`   New: ${currentHash.substring(0, 8)}...`);
                migrationMap.set(manifestHash, currentHash);
            }
        }
    }

    if (migrationMap.size === 0) {
        console.log('✅ No hash migrations needed based on the asset registry.');
    } else {
        console.log(`🚀 Found ${migrationMap.size} migrations. Applying to all .asset files...`);
    }

    console.log('🧹 Deduplicating AssetRegistry...');
    const uniqueResources = new Map<string, any>();
    for (const res of resources) {
        const key = res.path || res.guid || res.hash || res.checksum || '';
        if (key) {
            if (uniqueResources.has(key)) {
                const currentDiskHash = pathMap.get(res.path);
                const thisHash = res.hash || res.checksum;
                if (thisHash === currentDiskHash) {
                    uniqueResources.set(key, res);
                }
            } else {
                uniqueResources.set(key, res);
            }
        }
    }
    assetRegistry.data.resources = Array.from(uniqueResources.values());
    writeFileSync(ASSET_REGISTRY_PATH, JSON5.stringify(assetRegistry, null, 2), 'utf-8');
    console.log(`✨ AssetRegistry deduplicated. New size: ${assetRegistry.data.resources.length}`);

    let updatedCount = 0;
    walkDir(ASSET_RESOURCES_DIR, (filePath) => {
        if (!filePath.endsWith('.asset') || filePath.includes('AssetRegistry.asset')) return;

        let content = readFileSync(filePath, 'utf-8');
        let changed = false;

        migrationMap.forEach((newHash, oldHash) => {
            if (content.includes(oldHash)) {
                console.log(`   Updating ${path.relative(ASSET_RESOURCES_DIR, filePath)}: ${oldHash.substring(0, 8)} -> ${newHash.substring(0, 8)}`);
                const regex = new RegExp(oldHash, 'g');
                content = content.replace(regex, newHash);
                changed = true;
            }
        });

        if (changed) {
            writeFileSync(filePath, content, 'utf-8');
            updatedCount++;
        }
    });

    console.log(`✅ Completed. Updated ${updatedCount} .asset files.`);
}

run().catch(console.error);
