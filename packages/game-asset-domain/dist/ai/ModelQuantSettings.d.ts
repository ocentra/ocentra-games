import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { InferenceSettings } from '@ocentra/ai-domain/types/inference-settings';
export declare class ModelQuantSettings extends ScriptableObject {
    static schemaVersion: 1;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    modelId: string;
    quantPath: string;
    displayName: string;
    description: string;
    settings: InferenceSettings;
    static generateModelQuantAssetId(modelId: string, quantPath: string): string;
    static create(modelId: string, quantPath: string): ModelQuantSettings;
}
