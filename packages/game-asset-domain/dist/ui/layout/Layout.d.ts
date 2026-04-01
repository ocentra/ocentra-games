import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
export type LayoutType = 'single-column' | 'two-column' | 'three-column' | 'grid' | 'sidebar' | 'custom';
export interface LayoutSection {
    id: string;
    type: string;
    contentRef?: AssetReference | string;
    width?: string;
    order?: number;
    [key: string]: unknown;
}
export interface LayoutStructure {
    type: LayoutType;
    sections: LayoutSection[];
    gap?: string;
    padding?: string;
    [key: string]: unknown;
}
export declare abstract class Layout extends ScriptableObject {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    layout: LayoutStructure;
}
