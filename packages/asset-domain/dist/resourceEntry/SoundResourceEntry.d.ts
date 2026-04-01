import 'reflect-metadata';
import type { SoundHash } from '../types/assetIdentifier';
import { ResourceEntry } from '../resourceEntry/ResourceEntry';
export declare class SoundResourceEntry extends ResourceEntry {
    static assetType: string;
    hash: SoundHash;
}
