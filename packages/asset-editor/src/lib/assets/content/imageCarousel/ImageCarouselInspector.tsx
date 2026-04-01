import { useState } from 'react';
import { ImageCarousel } from '@ocentra/game-asset-domain/content/imageCarousel/ImageCarousel';
import type { CarouselSlide, CarouselAction } from '@ocentra/game-asset-domain/content/imageCarousel/ImageCarousel';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

import './ImageCarouselInspector.css';

export const ImageCarouselInspector: InspectorComponent<ImageCarousel | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;
  const slidesData = (assetData.slides || []) as CarouselSlide[];
  const autoplayIntervalMs = (assetData.autoplayIntervalMs ?? 5000) as number;
  
  const [slides, setSlides] = useState<CarouselSlide[]>(slidesData);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [newSlide, setNewSlide] = useState<{ id: string; imageHash: string; heading?: string; subheading?: string; action?: CarouselAction }>({
    id: '',
    imageHash: '',
    heading: '',
    subheading: '',
    action: { label: '', href: '' },
  });

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleAddSlide = () => {
    if (!newSlide.id?.trim() || !newSlide.imageHash?.trim()) {
      return;
    }

    const trimmedHash = newSlide.imageHash.trim();
    if (!isImageHash(trimmedHash)) {
      return;
    }

    const slide: CarouselSlide = {
      id: newSlide.id.trim(),
      imageHash: trimmedHash as ImageHash,
      heading: newSlide.heading?.trim() || undefined,
      subheading: newSlide.subheading?.trim() || undefined,
      label: undefined,
      description: undefined,
      alt: undefined,
      weight: undefined,
      action: newSlide.action?.label?.trim() ? {
        label: newSlide.action.label.trim(),
        href: newSlide.action.href?.trim() || undefined,
      } : undefined,
    };

    const updated = [...slides, slide];
    setSlides(updated);
    handleFieldChange('slides', updated);
    setNewSlide({ id: '', imageHash: '', heading: '', subheading: '', action: { label: '', href: '' } });
  };

  const handleDeleteSlide = (index: number) => {
    const updated = slides.filter((_, i) => i !== index);
    setSlides(updated);
    handleFieldChange('slides', updated);
  };

  const handleUpdateSlide = (index: number, field: keyof CarouselSlide, value: unknown) => {
    if (field === 'imageHash' && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && !isImageHash(trimmed)) {
        return;
      }
      if (!trimmed) {
        return;
      }
      const updated = [...slides];
      updated[index] = { ...updated[index], [field]: trimmed as ImageHash };
      setSlides(updated);
      handleFieldChange('slides', updated);
      return;
    }
    const updated = [...slides];
    updated[index] = { ...updated[index], [field]: value };
    setSlides(updated);
    handleFieldChange('slides', updated);
  };

  const handleUpdateAction = (index: number, field: keyof CarouselAction, value: string) => {
    const updated = [...slides];
    const currentAction = updated[index].action || { label: '' };
    updated[index] = {
      ...updated[index],
      action: { ...currentAction, [field]: value },
    };
    setSlides(updated);
    handleFieldChange('slides', updated);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    const updated = [...slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setSlides(updated);
    handleFieldChange('slides', updated);
  };

  return (
    <div className="image-carousel-inspector">
      <div className="image-carousel-inspector__section">
        <div className="image-carousel-inspector__section-header">Settings</div>
        <div className="image-carousel-inspector__field">
          <label htmlFor="carousel-autoplay" className="image-carousel-inspector__label">Autoplay Interval (ms)</label>
          <input
            id="carousel-autoplay"
            type="number"
            className="image-carousel-inspector__input image-carousel-inspector__input--number"
            value={autoplayIntervalMs}
            onChange={(e) => handleFieldChange('autoplayIntervalMs', parseInt(e.target.value, 10) || 0)}
            min="0"
            step="100"
            title="Autoplay Interval in milliseconds"
          />
        </div>
      </div>

      <div className="image-carousel-inspector__section">
        <div className="image-carousel-inspector__header">
          <div className="image-carousel-inspector__title">Slides</div>
          <div className="image-carousel-inspector__count">{slides.length} slide{slides.length !== 1 ? 's' : ''}</div>
        </div>

        {slides.length > 0 && (
          <div className="image-carousel-inspector__list">
            {slides.map((slide, index) => (
              <div key={index} className="image-carousel-inspector__item">
                <div className="image-carousel-inspector__item-header">
                  <span className="image-carousel-inspector__item-index">[{index}]</span>
                  <span className="image-carousel-inspector__item-id">{slide.id || `Slide ${index + 1}`}</span>
                  {slide.heading && (
                    <span className="image-carousel-inspector__item-heading">{slide.heading}</span>
                  )}
                  <div className="image-carousel-inspector__item-actions">
                    <button
                      type="button"
                      className="image-carousel-inspector__action-button"
                      onClick={() => handleMoveSlide(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="image-carousel-inspector__action-button"
                      onClick={() => handleMoveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      title="Move down"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="image-carousel-inspector__action-button image-carousel-inspector__action-button--delete"
                      onClick={() => handleDeleteSlide(index)}
                      title="Delete"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      className="image-carousel-inspector__action-button"
                      onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      title={expandedIndex === index ? "Collapse" : "Expand"}
                      aria-label={expandedIndex === index ? "Collapse" : "Expand"}
                    >
                      {expandedIndex === index ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
                {expandedIndex === index && (
                  <div className="image-carousel-inspector__item-content">
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">ID *</div>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          className="image-carousel-inspector__input"
                          value={slide.id}
                          onChange={(e) => handleUpdateSlide(index, 'id', e.target.value)}
                          onBlur={() => setEditingIndex(null)}
                          title="Slide ID"
                          aria-label="Slide ID"
                        />
                      ) : (
                        <span
                          className="image-carousel-inspector__editable-text"
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
                          {slide.id}
                        </span>
                      )}
                    </div>
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">Image Hash *</div>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          className="image-carousel-inspector__input"
                          value={slide.imageHash as string}
                          onChange={(e) => handleUpdateSlide(index, 'imageHash', e.target.value)}
                          onBlur={() => setEditingIndex(null)}
                          title="Image Hash (SHA-256)"
                          aria-label="Image Hash"
                        />
                      ) : (
                        <span
                          className="image-carousel-inspector__editable-text"
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
                          {slide.imageHash as string}
                        </span>
                      )}
                    </div>
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">Heading</div>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          className="image-carousel-inspector__input"
                          value={slide.heading || ''}
                          onChange={(e) => handleUpdateSlide(index, 'heading', e.target.value || undefined)}
                          onBlur={() => setEditingIndex(null)}
                          title="Heading"
                          aria-label="Heading"
                        />
                      ) : (
                        <span className="image-carousel-inspector__text">{slide.heading || '(empty)'}</span>
                      )}
                    </div>
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">Subheading</div>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          className="image-carousel-inspector__input"
                          value={slide.subheading || ''}
                          onChange={(e) => handleUpdateSlide(index, 'subheading', e.target.value || undefined)}
                          onBlur={() => setEditingIndex(null)}
                          title="Subheading"
                          aria-label="Subheading"
                        />
                      ) : (
                        <span className="image-carousel-inspector__text">{slide.subheading || '(empty)'}</span>
                      )}
                    </div>
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">Label</div>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          className="image-carousel-inspector__input"
                          value={slide.label || ''}
                          onChange={(e) => handleUpdateSlide(index, 'label', e.target.value || undefined)}
                          onBlur={() => setEditingIndex(null)}
                          title="Label"
                          aria-label="Label"
                        />
                      ) : (
                        <span className="image-carousel-inspector__text">{slide.label || '(empty)'}</span>
                      )}
                    </div>
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">Description</div>
                      {editingIndex === index ? (
                        <textarea
                          className="image-carousel-inspector__textarea"
                          value={slide.description || ''}
                          onChange={(e) => handleUpdateSlide(index, 'description', e.target.value || undefined)}
                          onBlur={() => setEditingIndex(null)}
                          rows={2}
                          title="Description"
                          aria-label="Description"
                        />
                      ) : (
                        <span className="image-carousel-inspector__text">{slide.description || '(empty)'}</span>
                      )}
                    </div>
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">Alt Text</div>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          className="image-carousel-inspector__input"
                          value={slide.alt || ''}
                          onChange={(e) => handleUpdateSlide(index, 'alt', e.target.value || undefined)}
                          onBlur={() => setEditingIndex(null)}
                          title="Alt Text"
                          aria-label="Alt Text"
                        />
                      ) : (
                        <span className="image-carousel-inspector__text">{slide.alt || '(empty)'}</span>
                      )}
                    </div>
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">Weight</div>
                      {editingIndex === index ? (
                        <input
                          type="number"
                          className="image-carousel-inspector__input image-carousel-inspector__input--number"
                          value={slide.weight || 0}
                          onChange={(e) => handleUpdateSlide(index, 'weight', parseInt(e.target.value, 10) || undefined)}
                          onBlur={() => setEditingIndex(null)}
                          title="Weight"
                          aria-label="Weight"
                        />
                      ) : (
                        <span className="image-carousel-inspector__text">{slide.weight ?? 0}</span>
                      )}
                    </div>
                    <div className="image-carousel-inspector__field">
                      <div className="image-carousel-inspector__label">Action</div>
                      <div className="image-carousel-inspector__action-fields">
                        <input
                          type="text"
                          className="image-carousel-inspector__input"
                          value={slide.action?.label || ''}
                          onChange={(e) => handleUpdateAction(index, 'label', e.target.value)}
                          placeholder="Action label"
                          title="Action Label"
                        />
                        <input
                          type="text"
                          className="image-carousel-inspector__input"
                          value={slide.action?.href || ''}
                          onChange={(e) => handleUpdateAction(index, 'href', e.target.value)}
                          placeholder="Action href (optional)"
                          title="Action Href"
                        />
                      </div>
                    </div>
                    {editingIndex !== index && (
                      <button
                        type="button"
                        className="image-carousel-inspector__edit-button"
                        onClick={() => setEditingIndex(index)}
                        title="Edit slide"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="image-carousel-inspector__add">
          <div className="image-carousel-inspector__add-header">Add New Slide</div>
          <div className="image-carousel-inspector__add-fields">
            <div className="image-carousel-inspector__add-field">
              <label htmlFor="carousel-add-id" className="image-carousel-inspector__label">ID *</label>
              <input
                id="carousel-add-id"
                type="text"
                className="image-carousel-inspector__input"
                value={newSlide.id || ''}
                onChange={(e) => setNewSlide({ ...newSlide, id: e.target.value })}
                placeholder="Slide ID"
                title="Slide ID"
              />
            </div>
            <div className="image-carousel-inspector__add-field">
              <label htmlFor="carousel-add-path" className="image-carousel-inspector__label">Image Hash *</label>
              <input
                id="carousel-add-path"
                type="text"
                className="image-carousel-inspector__input"
                value={newSlide.imageHash || ''}
                onChange={(e) => setNewSlide({ ...newSlide, imageHash: e.target.value })}
                placeholder="Image hash (SHA-256)"
                title="Image Hash"
              />
            </div>
            <div className="image-carousel-inspector__add-field">
              <label htmlFor="carousel-add-heading" className="image-carousel-inspector__label">Heading</label>
              <input
                id="carousel-add-heading"
                type="text"
                className="image-carousel-inspector__input"
                value={newSlide.heading || ''}
                onChange={(e) => setNewSlide({ ...newSlide, heading: e.target.value })}
                placeholder="Heading (optional)"
                title="Heading"
              />
            </div>
            <div className="image-carousel-inspector__add-field">
              <label htmlFor="carousel-add-subheading" className="image-carousel-inspector__label">Subheading</label>
              <input
                id="carousel-add-subheading"
                type="text"
                className="image-carousel-inspector__input"
                value={newSlide.subheading || ''}
                onChange={(e) => setNewSlide({ ...newSlide, subheading: e.target.value })}
                placeholder="Subheading (optional)"
                title="Subheading"
              />
            </div>
            <div className="image-carousel-inspector__add-field">
              <label htmlFor="carousel-add-action-label" className="image-carousel-inspector__label">Action Label</label>
              <input
                id="carousel-add-action-label"
                type="text"
                className="image-carousel-inspector__input"
                value={newSlide.action?.label || ''}
                onChange={(e) => setNewSlide({ ...newSlide, action: { label: e.target.value, href: newSlide.action?.href || '' } })}
                placeholder="Action label (optional)"
                title="Action Label"
              />
            </div>
            <div className="image-carousel-inspector__add-field">
              <label htmlFor="carousel-add-action-href" className="image-carousel-inspector__label">Action Href</label>
              <input
                id="carousel-add-action-href"
                type="text"
                className="image-carousel-inspector__input"
                value={newSlide.action?.href || ''}
                onChange={(e) => setNewSlide({ ...newSlide, action: { label: newSlide.action?.label || '', href: e.target.value } })}
                placeholder="Action href (optional)"
                title="Action Href"
              />
            </div>
            <button
              type="button"
              className="image-carousel-inspector__add-button"
              onClick={handleAddSlide}
              disabled={!newSlide.id?.trim() || !newSlide.imageHash?.trim()}
              title="Add slide"
            >
              Add Slide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



