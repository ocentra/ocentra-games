import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { AssetTypeCategory, MimeTypes, type MimeType } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { Timestamp } from '@ocentra/asset-domain/core/Timestamp';
import type { AssetEntry } from '@ocentra/boundary-domain/types/asset-entry';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { RegisterIResourceEntryEvent } from '@ocentra/eventing-domain/events/assets/RegisterResourceEntryEvent';
import { SaveAssetRegistryEvent } from '@ocentra/eventing-domain/events/assets/SaveAssetRegistryEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import { EditorImageCache } from '@/lib/cache/EditorImageCache';
import { ImageVariant, ProcessingState } from '@/lib/cache/editorImageTypes';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function uploadEditorImageFile(file: File): Promise<ImageHash> {
  const buffer = await file.arrayBuffer();
  const blob = new Blob([buffer], { type: file.type });
  const imageCache = EditorImageCache.getInstance();
  const hash = await imageCache.calculateImageHash(blob);
  const base64Content = arrayBufferToBase64(buffer);

  const uploadDeferred = new OperationDeferred<AssetEntry>();
  await EventBus.instance.publishAsync(new UploadAssetEvent(
    hash,
    base64Content,
    {
      assetType: 'Image',
      displayName: file.name,
      category: AssetTypeCategory.Content,
      mimeType: file.type || MimeTypes.Png,
      fileSize: file.size,
    },
    uploadDeferred,
  ));

  const uploadResult = await uploadDeferred.promise;
  if (!uploadResult.isSuccess || !uploadResult.value) {
    throw new Error(`Failed to upload image: ${uploadResult.errorMessage || 'Unknown error'}`);
  }

  const imageHash = isImageHash(hash) ? hash : hash as ImageHash;
  const assetEntry = uploadResult.value;
  const entry = new ImageResourceEntry();
  entry.hash = imageHash;
  entry.path = assetEntry.path;
  entry.displayName = file.name;
  entry.gameId = null;
  entry.mimeType = (file.type as MimeType) || MimeTypes.Png;
  entry.fileSize = file.size;
  entry.createdAt = Timestamp.now();
  entry.updatedAt = Timestamp.now();

  const registerDeferred = new OperationDeferred<boolean>();
  await EventBus.instance.publishAsync(new RegisterIResourceEntryEvent(entry, registerDeferred));
  await registerDeferred.promise;

  const saveDeferred = new OperationDeferred<boolean>();
  await EventBus.instance.publishAsync(new SaveAssetRegistryEvent(saveDeferred));
  await saveDeferred.promise;

  try {
    await imageCache.cacheImage(
      imageHash,
      blob,
      ImageVariant.Full,
      undefined,
      blob.type,
      ProcessingState.Processed,
      assetEntry.path,
    );
  } catch {
    return imageHash;
  }

  return imageHash;
}
