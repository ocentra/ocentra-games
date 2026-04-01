import 'reflect-metadata';
import { type AssetCategory, type MimeType } from '../constants/assets';
import type { GameId, AssetChecksum } from '../types/assetIdentifier';
import type { Timestamp } from '../core/Timestamp';
export declare class ResourceEntry {
    path: string;
    displayName: string;
    gameId?: GameId | null;
    category?: AssetCategory | null;
    mimeType?: MimeType | null;
    fileSize?: number | null;
    createdAt?: Timestamp | null;
    updatedAt?: Timestamp | null;
    lastScanAt?: Timestamp | null;
    checksum?: AssetChecksum | null;
}
