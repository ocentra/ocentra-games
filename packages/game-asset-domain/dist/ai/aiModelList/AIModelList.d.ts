import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
export interface ModelQuantInfo {
    path: string;
    dtype: string;
    displayName?: string;
    enabled?: boolean;
    priority?: number;
}
export interface AIModelEntry {
    modelId: string;
    displayName: string;
    description?: string;
    quants: ModelQuantInfo[];
    enabled?: boolean;
    priority?: number;
    provider?: string;
    tags?: string[];
}
export declare class AIModelList extends ScriptableObject {
    static schemaVersion: 1;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    name: string;
    description: string;
    models: AIModelEntry[];
    defaultModelId: string;
    defaultQuantPath: string;
}
