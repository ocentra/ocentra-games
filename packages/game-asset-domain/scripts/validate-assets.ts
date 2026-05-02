import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import {
    COMMERCIAL_DECK_FAMILY_SET,
    COMMERCIAL_DECK_TYPE_SET,
} from '@ocentra/game-domain/deck/commercialDeckTypes';
import { validateAssetFile } from '../src/schemas/asset/asset-file-schema';
import { getCommercialAssetViolation } from '../src/schemas/asset/commercial-asset-policy';
import {
    decodeProcessedGameDeckTriple,
    decodeSupportedDeckTriples,
    getDeckTripleKey,
    type SupportedDeckTriple,
} from '../src/schemas/asset/deck-effect.schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the absolute path to the Resources directory
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');
const PROCESSED_GAMES_DIR = path.resolve(__dirname, '../../card-games/src/processed-games');

interface ValidationFailure {
    filePath: string;
    errors: Array<{ path: string; message: string }>;
}

/**
 * Recursively find all .asset files in a directory
 */
function findAssetFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findAssetFiles(filePath, fileList);
        } else if (file.endsWith('.asset')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

function findJsonFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findJsonFiles(filePath, fileList);
        } else if (file.endsWith('.json')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

function isCommercialDeckTriple(triple: SupportedDeckTriple): boolean {
    return COMMERCIAL_DECK_TYPE_SET.has(triple.deckType) || COMMERCIAL_DECK_FAMILY_SET.has(triple.suitSet);
}

function collectDeckAssetTriples(assetFiles: string[]): Set<string> {
    const triples = new Set<string>();

    for (const filePath of assetFiles) {
        try {
            const jsonObj = JSON5.parse(fs.readFileSync(filePath, 'utf-8'));
            if (jsonObj?.system?.assetType !== 'Deck') {
                continue;
            }
            for (const triple of decodeSupportedDeckTriples(jsonObj?.data?.supportedTriples)) {
                triples.add(getDeckTripleKey(triple));
            }
        } catch {
            continue;
        }
    }

    return triples;
}

function validateProcessedGameDeckTriples(availableDeckTriples: Set<string>, failures: ValidationFailure[]): void {
    if (!fs.existsSync(PROCESSED_GAMES_DIR)) {
        return;
    }

    const processedFiles = findJsonFiles(PROCESSED_GAMES_DIR);

    for (const filePath of processedFiles) {
        try {
            const jsonObj = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const triple = decodeProcessedGameDeckTriple(jsonObj);
            if (!triple || isCommercialDeckTriple(triple)) {
                continue;
            }

            if (!availableDeckTriples.has(getDeckTripleKey(triple))) {
                failures.push({
                    filePath: path.relative(PROCESSED_GAMES_DIR, filePath),
                    errors: [{
                        path: 'engine.deckType',
                        message: `Processed game references deck triple "${triple.deckType}/${triple.suitSet}/${triple.rankSet}" but no matching Deck asset exists`,
                    }],
                });
            }
        } catch (e: any) {
            failures.push({
                filePath: path.relative(PROCESSED_GAMES_DIR, filePath),
                errors: [{ path: 'JSON_PARSE_ERROR', message: e.message || 'Failed to parse processed game file' }],
            });
        }
    }
}

/**
 * Run validation on all .asset files
 */
function validateAllAssets() {
    console.log(`🔍 Scanning for .asset files in: ${RESOURCES_DIR}`);

    if (!fs.existsSync(RESOURCES_DIR)) {
        console.error(`❌ Resources directory not found at: ${RESOURCES_DIR}`);
        process.exit(1);
    }

    const assetFiles = findAssetFiles(RESOURCES_DIR);
    const availableDeckTriples = collectDeckAssetTriples(assetFiles);
    console.log(`Found ${assetFiles.length} .asset files to validate.\n`);

    const failures: ValidationFailure[] = [];
    let passedCount = 0;

    for (const filePath of assetFiles) {
        const relativePath = path.relative(RESOURCES_DIR, filePath);

        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const preValidationViolation = getCommercialAssetViolation(relativePath);
            if (preValidationViolation) {
                failures.push({
                    filePath: relativePath,
                    errors: [{ path: 'asset', message: preValidationViolation }]
                });
                continue;
            }
            const jsonObj = JSON5.parse(fileContent);

            const result = validateAssetFile(jsonObj);

            if (result.success) {
                const violation = getCommercialAssetViolation(
                    relativePath,
                    (result.data as { system: { assetType: string }; data: unknown }).system.assetType,
                    (result.data as { system: { assetType: string }; data: unknown }).data,
                );
                if (violation) {
                    failures.push({
                        filePath: relativePath,
                        errors: [{ path: 'asset', message: violation }]
                    });
                    continue;
                }
                passedCount++;
            } else {
                failures.push({
                    filePath: relativePath,
                    errors: result.error.issues.map((issue: any) => ({
                        path: issue.path.join('.'),
                        message: issue.message
                    }))
                });
            }
        } catch (e: any) {
            failures.push({
                filePath: relativePath,
                errors: [{ path: 'JSON_PARSE_ERROR', message: e.message || 'Failed to parse file' }]
            });
        }
    }

    validateProcessedGameDeckTriples(availableDeckTriples, failures);

    console.log(`\n--- Validation Results ---`);
    console.log(`✅ Passed: ${passedCount}`);
    console.log(`❌ Failed: ${failures.length}`);
    console.log(`Total Scanned: ${assetFiles.length}`);

    if (failures.length > 0) {
        fs.writeFileSync('validation-failures.json', JSON.stringify(failures, null, 2));
        console.log(`\n📄 Wrote failures to validation-failures.json`);
        console.log(`\n--- Failures ---`);
        for (const failure of failures) {
            console.log(`\n📄 ${failure.filePath}`);
            for (const error of failure.errors) {
                console.log(`  ❌ [${error.path}]: ${error.message}`);
            }
        }
        process.exit(1);
    } else {
        console.log(`\n🎉 All assets passed validation successfully!`);
        process.exit(0);
    }
}

validateAllAssets();
