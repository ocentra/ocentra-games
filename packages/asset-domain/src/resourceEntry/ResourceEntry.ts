import 'reflect-metadata';
import { serializable, serializableClass } from '@/serialization/decorators';
import { AssetTypeCategory, type AssetCategory, type MimeType } from '@/constants/assets';
import type { GameId, AssetChecksum } from '@/types/assetIdentifier';
import type { Timestamp } from '@/core/Timestamp';

@serializableClass({
  assetType: 'ResourceEntry',
  displayName: 'Resource Entry',
  icon: '📄',
  category: AssetTypeCategory.Content,
})
export class ResourceEntry {
  @serializable({ label: 'Path' })
  path: string = '';

  @serializable({ label: 'Display Name' })
  displayName: string = '';

  @serializable({ label: 'Game ID' })
  gameId?: GameId | null;

  @serializable({ label: 'Category' })
  category?: AssetCategory | null;

  @serializable({ label: 'MIME Type' })
  mimeType?: MimeType | null;

  @serializable({ label: 'File Size' })
  fileSize?: number | null;

  @serializable({ label: 'Created At' })
  createdAt?: Timestamp | null;

  @serializable({ label: 'Updated At' })
  updatedAt?: Timestamp | null;

  @serializable({ label: 'Last Scan At' })
  lastScanAt?: Timestamp | null;

  @serializable({ label: 'Checksum' })
  checksum?: AssetChecksum | null;
}

