import 'reflect-metadata';
import { ScriptableSingleton } from '@ocentra/asset-domain/ScriptableSingleton';
import type { ImageListEntry } from '../../content/imageList/ImageList';
export declare class ComingSoon extends ScriptableSingleton {
    static schemaVersion: number;
    static executionOrder: number;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    images: ImageListEntry[];
    static getOrCreateInstance(): Promise<ComingSoon>;
}
