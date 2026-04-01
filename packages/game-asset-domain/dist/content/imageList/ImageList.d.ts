import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
export interface ImageListEntry {
    id: string;
    label?: string;
    description?: string;
    alt?: string;
    imageHash: ImageHash;
    weight?: number;
}
export declare class ImageList extends ScriptableObject {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    images: ImageListEntry[];
}
