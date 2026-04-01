import 'reflect-metadata';
import type { VideoHash } from '../types/assetIdentifier';
import { ResourceEntry } from '../resourceEntry/ResourceEntry';
export declare class VideoResourceEntry extends ResourceEntry {
    static assetType: string;
    hash: VideoHash;
}
