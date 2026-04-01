import { useState, useEffect, useMemo } from 'react';
import { ImageList } from '@ocentra/game-asset-domain/content/imageList/ImageList';
import type { ImageListEntry } from '@ocentra/game-asset-domain/content/imageList/ImageList';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { isImageHash, isAssetHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

import './ImageListInspector.css';

export const ImageListInspector: InspectorComponent<ImageList | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);

  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;
  const imagesData = useMemo(() => (assetData.images || []) as ImageListEntry[], [assetData.images]);

  const [images, setImages] = useState<ImageListEntry[]>(imagesData);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newImage, setNewImage] = useState<{ id: string; imageHash: string; label?: string; description?: string; alt?: string; weight?: number }>({
    id: '',
    imageHash: '',
    label: '',
    description: '',
    alt: '',
    weight: 0,
  });

  useEffect(() => {
    setImages(imagesData);
  }, [imagesData]);

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleAddImage = () => {
    if (!newImage.id?.trim() || !newImage.imageHash?.trim()) {
      return;
    }

    const trimmedHash = newImage.imageHash.trim();
    if (!isImageHash(trimmedHash)) {
      return;
    }

    const imageEntry: ImageListEntry = {
      id: newImage.id.trim(),
      imageHash: trimmedHash as ImageHash,
      label: newImage.label?.trim() || undefined,
      description: newImage.description?.trim() || undefined,
      alt: newImage.alt?.trim() || undefined,
      weight: newImage.weight || 0,
    };

    const updated = [...images, imageEntry];
    setImages(updated);
    handleFieldChange('images', updated);
    setNewImage({ id: '', imageHash: '', label: '', description: '', alt: '', weight: 0 });
  };

  const handleDeleteImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    handleFieldChange('images', updated);
  };

  const handleUpdateImage = (index: number, field: keyof ImageListEntry, value: string | number | undefined) => {
    if (field === 'imageHash' && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && !isAssetHash(trimmed)) {
        return;
      }
      if (!trimmed) {
        return;
      }
      const updated = [...images];
      updated[index] = { ...updated[index], [field]: trimmed as ImageHash };
      setImages(updated);
      handleFieldChange('images', updated);
      return;
    }
    const updated = [...images];
    updated[index] = { ...updated[index], [field]: value };
    setImages(updated);
    handleFieldChange('images', updated);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const updated = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setImages(updated);
    handleFieldChange('images', updated);
  };

  return (
    <div className="image-list-inspector">
      <div className="image-list-inspector__section">
        <div className="image-list-inspector__header">
          <div className="image-list-inspector__title">Images</div>
          <div className="image-list-inspector__count">{images.length} image{images.length !== 1 ? 's' : ''}</div>
        </div>

        {images.length > 0 && (
          <div className="image-list-inspector__list">
            {images.map((image, index) => (
              <div key={index} className="image-list-inspector__item">
                <div className="image-list-inspector__item-header">
                  <span className="image-list-inspector__item-index">[{index}]</span>
                  <span className="image-list-inspector__item-id">{image.id}</span>
                  <div className="image-list-inspector__item-actions">
                    <button
                      type="button"
                      className="image-list-inspector__action-button"
                      onClick={() => handleMoveImage(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="image-list-inspector__action-button"
                      onClick={() => handleMoveImage(index, 'down')}
                      disabled={index === images.length - 1}
                      title="Move down"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="image-list-inspector__action-button image-list-inspector__action-button--delete"
                      onClick={() => handleDeleteImage(index)}
                      title="Delete"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="image-list-inspector__item-content">
                  <div className="image-list-inspector__field">
                    <div className="image-list-inspector__label">ID</div>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        className="image-list-inspector__input"
                        value={image.id}
                        onChange={(e) => handleUpdateImage(index, 'id', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        title="Image ID"
                        aria-label="Image ID"
                      />
                    ) : (
                      <span
                        className="image-list-inspector__editable-text"
                        onClick={() => setEditingIndex(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setEditingIndex(index);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        title="Click to edit"
                      >
                        {image.id}
                      </span>
                    )}
                  </div>
                  <div className="image-list-inspector__field">
                    <div className="image-list-inspector__label">Image Hash</div>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        className="image-list-inspector__input"
                        value={image.imageHash as string}
                        onChange={(e) => handleUpdateImage(index, 'imageHash', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        title="Image Hash (SHA-256)"
                        aria-label="Image Hash"
                      />
                    ) : (
                      <span
                        className="image-list-inspector__editable-text"
                        onClick={() => setEditingIndex(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setEditingIndex(index);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        title="Click to edit"
                      >
                        {image.imageHash as string}
                      </span>
                    )}
                  </div>
                  <div className="image-list-inspector__field">
                    <div className="image-list-inspector__label">Label</div>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        className="image-list-inspector__input"
                        value={image.label || ''}
                        onChange={(e) => handleUpdateImage(index, 'label', e.target.value || undefined)}
                        onBlur={() => setEditingIndex(null)}
                        title="Label"
                        aria-label="Label"
                      />
                    ) : (
                      <span className="image-list-inspector__text">{image.label || '(empty)'}</span>
                    )}
                  </div>
                  <div className="image-list-inspector__field">
                    <div className="image-list-inspector__label">Description</div>
                    {editingIndex === index ? (
                      <textarea
                        className="image-list-inspector__textarea"
                        value={image.description || ''}
                        onChange={(e) => handleUpdateImage(index, 'description', e.target.value || undefined)}
                        onBlur={() => setEditingIndex(null)}
                        rows={2}
                        title="Description"
                        aria-label="Description"
                      />
                    ) : (
                      <span className="image-list-inspector__text">{image.description || '(empty)'}</span>
                    )}
                  </div>
                  <div className="image-list-inspector__field">
                    <div className="image-list-inspector__label">Alt Text</div>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        className="image-list-inspector__input"
                        value={image.alt || ''}
                        onChange={(e) => handleUpdateImage(index, 'alt', e.target.value || undefined)}
                        onBlur={() => setEditingIndex(null)}
                        title="Alt Text"
                        aria-label="Alt Text"
                      />
                    ) : (
                      <span className="image-list-inspector__text">{image.alt || '(empty)'}</span>
                    )}
                  </div>
                  <div className="image-list-inspector__field">
                    <div className="image-list-inspector__label">Weight</div>
                    {editingIndex === index ? (
                      <input
                        type="number"
                        className="image-list-inspector__input image-list-inspector__input--number"
                        value={image.weight || 0}
                        onChange={(e) => handleUpdateImage(index, 'weight', parseInt(e.target.value, 10) || 0)}
                        onBlur={() => setEditingIndex(null)}
                        title="Weight"
                        aria-label="Weight"
                      />
                    ) : (
                      <span className="image-list-inspector__text">{image.weight ?? 0}</span>
                    )}
                  </div>
                  {editingIndex !== index && (
                    <button
                      type="button"
                      className="image-list-inspector__edit-button"
                      onClick={() => setEditingIndex(index)}
                      title="Edit image"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="image-list-inspector__add">
          <div className="image-list-inspector__add-header">Add New Image</div>
          <div className="image-list-inspector__add-fields">
            <div className="image-list-inspector__add-field">
              <label htmlFor="image-list-add-id" className="image-list-inspector__label">ID *</label>
              <input
                id="image-list-add-id"
                type="text"
                className="image-list-inspector__input"
                value={newImage.id || ''}
                onChange={(e) => setNewImage({ ...newImage, id: e.target.value })}
                placeholder="Image ID"
                title="Image ID"
              />
            </div>
            <div className="image-list-inspector__add-field">
              <label htmlFor="image-list-add-path" className="image-list-inspector__label">Image Hash *</label>
              <input
                id="image-list-add-path"
                type="text"
                className="image-list-inspector__input"
                value={newImage.imageHash || ''}
                onChange={(e) => setNewImage({ ...newImage, imageHash: e.target.value })}
                placeholder="Image hash (SHA-256)"
                title="Image Hash"
              />
            </div>
            <div className="image-list-inspector__add-field">
              <label htmlFor="image-list-add-label" className="image-list-inspector__label">Label</label>
              <input
                id="image-list-add-label"
                type="text"
                className="image-list-inspector__input"
                value={newImage.label || ''}
                onChange={(e) => setNewImage({ ...newImage, label: e.target.value })}
                placeholder="Label (optional)"
                title="Label"
              />
            </div>
            <div className="image-list-inspector__add-field">
              <label htmlFor="image-list-add-description" className="image-list-inspector__label">Description</label>
              <textarea
                id="image-list-add-description"
                className="image-list-inspector__textarea"
                value={newImage.description || ''}
                onChange={(e) => setNewImage({ ...newImage, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                title="Description"
              />
            </div>
            <div className="image-list-inspector__add-field">
              <label htmlFor="image-list-add-alt" className="image-list-inspector__label">Alt Text</label>
              <input
                id="image-list-add-alt"
                type="text"
                className="image-list-inspector__input"
                value={newImage.alt || ''}
                onChange={(e) => setNewImage({ ...newImage, alt: e.target.value })}
                placeholder="Alt text (optional)"
                title="Alt Text"
              />
            </div>
            <div className="image-list-inspector__add-field">
              <label htmlFor="image-list-add-weight" className="image-list-inspector__label">Weight</label>
              <input
                id="image-list-add-weight"
                type="number"
                className="image-list-inspector__input image-list-inspector__input--number"
                value={newImage.weight || 0}
                onChange={(e) => setNewImage({ ...newImage, weight: parseInt(e.target.value, 10) || 0 })}
                placeholder="Weight"
                title="Weight"
              />
            </div>
            <button
              type="button"
              className="image-list-inspector__add-button"
              onClick={handleAddImage}
              disabled={!newImage.id?.trim() || !newImage.imageHash?.trim()}
              title="Add image"
            >
              Add Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



