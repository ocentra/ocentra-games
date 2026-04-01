import 'reflect-metadata';
import type { ImageHash } from '../types/assetIdentifier';
import { ResourceEntry } from '../resourceEntry/ResourceEntry';
export declare class ImageResourceEntry extends ResourceEntry {
    static assetType: string;
    hash: ImageHash;
}
