import React, { useState, useEffect } from 'react';
import { useImageUrl } from '@/hooks/useImageUrl';
import type { AssetIdentifier, ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash, isAssetHash } from '@ocentra/asset-domain/types/assetIdentifier';
import './ImageField.css';

interface ImageFieldProps {
  label: string;
  value: ImageHash;
  onChange?: (value: ImageHash) => void;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  readOnly?: boolean;
  id?: string;
  isRequired?: boolean;
  validationError?: string | null;
}

export const ImageField: React.FC<ImageFieldProps> = ({
  label,
  value,
  onChange,
  onNavigateToAsset,
  readOnly = false,
  id,
  isRequired = false,
  validationError = null
}) => {
  const [hasError, setHasError] = useState(false);
  const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasValidationError = !!validationError;

  const { imageUrl } = useImageUrl(value);

  useEffect(() => {
    setHasError(false);
  }, [value]);

  const handleThumbnailClick = () => {
    if (onNavigateToAsset && value) {
      if (isAssetHash(value)) {
        onNavigateToAsset(value as AssetIdentifier);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (isImageHash(newValue) && onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className={`inspector-panel__field ${hasValidationError ? 'inspector-panel__field--error' : ''}`}>
      <label htmlFor={inputId} className="inspector-panel__field-label">
        {label}
        {isRequired && <span className="inspector-panel__field-required" title="Required">*</span>}
      </label>
      <div className="inspector-panel__field-with-thumbnail">
        {readOnly ? (
          <div className="inspector-panel__field-value-readonly" id={inputId}>
            {value}
          </div>
        ) : (
          <input
            id={inputId}
            className="inspector-panel__field-input"
            type="text"
            value={value}
            onChange={handleInputChange}
          />
        )}
        {imageUrl && !hasError && (onNavigateToAsset ? (
          <span
            className="inspector-panel__image-thumbnail inspector-panel__image-thumbnail--clickable"
            onClick={handleThumbnailClick}
            title="Click to open image"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleThumbnailClick();
              }
            }}
            aria-label="Click to open image"
          >
            <img
              src={imageUrl}
              alt={value}
              className="inspector-panel__thumbnail-image"
              onError={() => setHasError(true)}
            />
          </span>
        ) : (
          <span
            className="inspector-panel__image-thumbnail"
            title="Image preview"
            aria-label="Image preview"
          >
            <img
              src={imageUrl}
              alt={value}
              className="inspector-panel__thumbnail-image"
              onError={() => setHasError(true)}
            />
          </span>
        ))}
      </div>
      {hasValidationError && (
        <div className="inspector-panel__field-error">{validationError}</div>
      )}
    </div>
  );
};

