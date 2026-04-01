import React, { useState, useRef } from 'react';
import { createInspectorLogger } from '@/lib/core/inspector/utils/logger';
import { useImageUrl } from '@/hooks/useImageUrl';
import { EditorImageCache } from '@/lib/cache/EditorImageCache';
import { ImageVariant, ProcessingState } from '@/lib/cache/editorImageTypes';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { MimeTypes, type MimeType } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { Timestamp } from '@ocentra/asset-domain/core/Timestamp';
import { RegisterIResourceEntryEvent } from '@ocentra/eventing-domain/events/assets/RegisterResourceEntryEvent';
import { SaveAssetRegistryEvent } from '@ocentra/eventing-domain/events/assets/SaveAssetRegistryEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import type { AssetEntry } from '@ocentra/boundary-domain/types/asset-entry';
import './ImageUploadField.css';

const { logInfo, logError } = createInspectorLogger('ImageUploadField');

interface ImageUploadFieldProps {
  label: string;
  value: ImageHash | null;
  onChange: (value: ImageHash | null) => void;
  fieldName: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ label, value, onChange, fieldName }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (fieldName === 'bannerImage') {
      const assetGuidOrHash = e.dataTransfer.getData('text/asset-guid') || e.dataTransfer.getData('text/asset-hash') || e.dataTransfer.getData('text/plain');
      if (assetGuidOrHash && isImageHash(assetGuidOrHash)) {
        onChange(assetGuidOrHash);
        return;
      }
    } else {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          handleFileSelect(file);
        }
      } else {
        const assetGuidOrHash = e.dataTransfer.getData('text/asset-guid') || e.dataTransfer.getData('text/asset-hash') || e.dataTransfer.getData('text/plain');
        if (assetGuidOrHash && isImageHash(assetGuidOrHash)) {
          onChange(assetGuidOrHash);
        }
      }
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const imageCache = EditorImageCache.getInstance();
      const hash = await imageCache.calculateImageHash(blob);

      const base64Content = await blob.arrayBuffer().then(buffer => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      });

      const uploadDeferred = new OperationDeferred<AssetEntry>();
      await EventBus.instance.publishAsync(new UploadAssetEvent(
        hash,
        base64Content,
        {
          assetType: 'Image',
          displayName: file.name,
          category: 'Content',
          mimeType: file.type || 'image/png',
          fileSize: file.size
        },
        uploadDeferred
      ));

      const uploadResult = await uploadDeferred.promise;
      if (!uploadResult.isSuccess || !uploadResult.value) {
        throw new Error(`Failed to upload image: ${uploadResult.errorMessage || 'Unknown error'}`);
      }

      const imageHash = hash;
      const assetEntry = uploadResult.value;

      if (imageHash) {
        const entry = new ImageResourceEntry();
        entry.hash = (isImageHash(imageHash) ? imageHash : imageHash as ImageHash);
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

        onChange(imageHash as ImageHash);
        logInfo('Image uploaded and registered:', imageHash);

        try {
          await imageCache.cacheImage(imageHash, blob, ImageVariant.Full, undefined, blob.type, ProcessingState.Processed, assetEntry.path);
          logInfo('Image cached after upload:', imageHash);
        } catch (cacheError) {
          logError('Failed to cache uploaded image:', cacheError);
        }
      } else {
        throw new Error('Upload failed: Invalid response - missing hash');
      }
    } catch (error) {
      logError('Failed to upload image:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const { imageUrl } = useImageUrl(value);

  return (
    <div className="inspector-panel__field">
      <label className="inspector-panel__field-label">{label}</label>
      <div
        className={`inspector-panel__file-drop-zone ${isDragging ? 'inspector-panel__file-drop-zone--dragging' : ''} ${isUploading ? 'inspector-panel__file-drop-zone--uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="inspector-panel__file-input-hidden"
          onChange={handleFileInputChange}
          aria-label="Select image file"
          disabled={isUploading}
        />
        <input
          className="inspector-panel__field-input"
          type="text"
          value={value || ''}
          onChange={(e) => {
            const newValue = e.target.value;
            if (!newValue) {
              onChange(null);
            } else if (isImageHash(newValue)) {
              onChange(newValue);
            }
          }}
          placeholder={fieldName === 'bannerImage' ? "Drag image from Resources tree here..." : "Drag image here or click browse..."}
          disabled={isUploading}
        />
        {fieldName !== 'bannerImage' && (
          <button
            type="button"
            className="inspector-panel__browse-button"
            onClick={handleBrowseClick}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Browse'}
          </button>
        )}
      </div>
      {imageUrl && fieldName !== 'bannerImage' && (
        <div className="inspector-panel__image-preview">
          <img
            src={imageUrl}
            alt={label}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
};

