import { useState, useMemo } from 'react';
import type { FeatureBannerItem } from '@ocentra/game-asset-domain/content/featureBanner/FeatureBanner';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

import './FeatureBannerInspector.css';

export const FeatureBannerInspector: InspectorComponent<Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);

  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;
  const itemsData = useMemo(() => (assetData.items || []) as FeatureBannerItem[], [assetData.items]);

  const [items, setItems] = useState<FeatureBannerItem[]>(itemsData);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<{ title: string; description: string; imageHash: string }>({
    title: '',
    description: '',
    imageHash: '',
  });

  const [prevItemsData, setPrevItemsData] = useState(itemsData);
  if (itemsData !== prevItemsData) {
    setPrevItemsData(itemsData);
    setItems(itemsData);
  }


  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleAddItem = () => {
    if (!newItem.title?.trim() || !newItem.description?.trim() || !newItem.imageHash?.trim()) {
      return;
    }

    const trimmedHash = newItem.imageHash.trim();
    if (!isImageHash(trimmedHash)) {
      return;
    }

    const entry: FeatureBannerItem = {
      title: newItem.title.trim(),
      description: newItem.description.trim(),
      imageHash: trimmedHash,
    };

    const updated = [...items, entry];
    setItems(updated);
    handleFieldChange('items', updated);
    setNewItem({ title: '', description: '', imageHash: '' });
  };

  const handleDeleteItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    handleFieldChange('items', updated);
  };

  const handleUpdateItem = (index: number, field: keyof FeatureBannerItem, value: string | undefined) => {
    if (field === 'imageHash' && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && !isImageHash(trimmed)) {
        return;
      }
      if (!trimmed) {
        return;
      }
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: trimmed as ImageHash };
      setItems(updated);
      handleFieldChange('items', updated);
      return;
    }
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
    handleFieldChange('items', updated);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const updated = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setItems(updated);
    handleFieldChange('items', updated);
  };

  return (
    <div className="feature-banner-inspector">
      <div className="feature-banner-inspector__section">
        <div className="feature-banner-inspector__header">
          <div className="feature-banner-inspector__title">Feature Banner Items</div>
          <div className="feature-banner-inspector__count">{items.length} item{items.length !== 1 ? 's' : ''}</div>
        </div>

        {items.length > 0 && (
          <div className="feature-banner-inspector__list">
            {items.map((item, index) => (
              <div key={index} className="feature-banner-inspector__item">
                <div className="feature-banner-inspector__item-header">
                  <span className="feature-banner-inspector__item-index">[{index}]</span>
                  <span className="feature-banner-inspector__item-title">{item.title}</span>
                  <div className="feature-banner-inspector__item-actions">
                    <button
                      type="button"
                      className="feature-banner-inspector__action-button"
                      onClick={() => handleMoveItem(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="feature-banner-inspector__action-button"
                      onClick={() => handleMoveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      title="Move down"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="feature-banner-inspector__action-button feature-banner-inspector__action-button--delete"
                      onClick={() => handleDeleteItem(index)}
                      title="Delete"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="feature-banner-inspector__item-content">
                  <div className="feature-banner-inspector__field">
                    <div className="feature-banner-inspector__label">Title</div>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        className="feature-banner-inspector__input"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        title="Title"
                        aria-label="Title"
                      />
                    ) : (
                      <span
                        className="feature-banner-inspector__editable-text"
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
                        {item.title}
                      </span>
                    )}
                  </div>
                  <div className="feature-banner-inspector__field">
                    <div className="feature-banner-inspector__label">Description</div>
                    {editingIndex === index ? (
                      <textarea
                        className="feature-banner-inspector__textarea"
                        value={item.description}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        rows={3}
                        title="Description"
                        aria-label="Description"
                      />
                    ) : (
                      <span
                        className="feature-banner-inspector__editable-text"
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
                        {item.description}
                      </span>
                    )}
                  </div>
                  <div className="feature-banner-inspector__field">
                    <div className="feature-banner-inspector__label">Image Hash</div>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        className="feature-banner-inspector__input"
                        value={item.imageHash as string}
                        onChange={(e) => handleUpdateItem(index, 'imageHash', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        title="Image Hash (SHA-256)"
                        aria-label="Image Hash"
                      />
                    ) : (
                      <span
                        className="feature-banner-inspector__editable-text"
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
                        {(item.imageHash as string).substring(0, 16)}...
                      </span>
                    )}
                  </div>
                  {editingIndex !== index && (
                    <button
                      type="button"
                      className="feature-banner-inspector__edit-button"
                      onClick={() => setEditingIndex(index)}
                      title="Edit item"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="feature-banner-inspector__add">
          <div className="feature-banner-inspector__add-header">Add New Item</div>
          <div className="feature-banner-inspector__add-fields">
            <div className="feature-banner-inspector__add-field">
              <label htmlFor="feature-banner-add-title" className="feature-banner-inspector__label">Title *</label>
              <input
                id="feature-banner-add-title"
                type="text"
                className="feature-banner-inspector__input"
                value={newItem.title || ''}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Title"
                title="Title"
              />
            </div>
            <div className="feature-banner-inspector__add-field">
              <label htmlFor="feature-banner-add-description" className="feature-banner-inspector__label">Description *</label>
              <textarea
                id="feature-banner-add-description"
                className="feature-banner-inspector__textarea"
                value={newItem.description || ''}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Description"
                rows={3}
                title="Description"
              />
            </div>
            <div className="feature-banner-inspector__add-field">
              <label htmlFor="feature-banner-add-imageHash" className="feature-banner-inspector__label">Image Hash *</label>
              <input
                id="feature-banner-add-imageHash"
                type="text"
                className="feature-banner-inspector__input"
                value={newItem.imageHash || ''}
                onChange={(e) => setNewItem({ ...newItem, imageHash: e.target.value })}
                placeholder="Image hash (SHA-256) - pick from Resources/AppAssets/banners"
                title="Image Hash"
              />
            </div>
            <button
              type="button"
              className="feature-banner-inspector__add-button"
              onClick={handleAddItem}
              disabled={!newItem.title?.trim() || !newItem.description?.trim() || !newItem.imageHash?.trim()}
              title="Add item"
            >
              Add Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
