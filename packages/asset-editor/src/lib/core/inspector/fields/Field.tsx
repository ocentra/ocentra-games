import React from 'react';
import { ImageField } from './ImageField';
import type { AssetIdentifier, ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import './Field.css';

interface FieldProps {
  label: string;
  value: unknown;
  onChange?: (value: unknown) => void;
  readOnly?: boolean;
  type?: string;
  id?: string;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  isRequired?: boolean;
  validationError?: string | null;
}

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  readOnly = false,
  type = 'text',
  id,
  onNavigateToAsset,
  isRequired = false,
  validationError = null
}) => {
  const stringValue = String(value ?? '');
  const hasError = !!validationError;

  if (typeof value === 'string' && isImageHash(value)) {
    return (
      <ImageField
        label={label}
        value={value}
        onChange={onChange as ((value: ImageHash) => void) | undefined}
        onNavigateToAsset={onNavigateToAsset}
        readOnly={readOnly}
        id={id}
        isRequired={isRequired}
        validationError={validationError}
      />
    );
  }

  const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={`inspector-panel__field ${hasError ? 'inspector-panel__field--error' : ''}`}>
      <label htmlFor={inputId} className="inspector-panel__field-label">
        {label}
        {isRequired && <span className="inspector-panel__field-required" title="Required">*</span>}
      </label>
      {readOnly ? (
        <div className="inspector-panel__field-value-readonly" id={inputId}>{stringValue}</div>
      ) : (
        <input
          id={inputId}
          className={`inspector-panel__field-input ${hasError ? 'inspector-panel__field-input--error' : ''}`}
          type={type}
          value={stringValue}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
      {hasError && (
        <div className="inspector-panel__field-error">{validationError}</div>
      )}
    </div>
  );
};

