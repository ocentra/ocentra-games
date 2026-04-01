import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { ImageListEntry } from '../imageList/ImageList';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
export interface CarouselAction {
    label: string;
    href?: string;
}
export interface CarouselSlide extends ImageListEntry {
    heading?: string;
    subheading?: string;
    action?: CarouselAction;
}
export declare class ImageCarousel extends ScriptableObject {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    slides: CarouselSlide[];
    autoplayIntervalMs: number;
    lastImageDurationMs: number;
    fastRotationDurationMs: number;
    defaultRotationDurationMs: number;
    fastRotationThreshold: number;
    slideTransitionDelayMs: number;
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
