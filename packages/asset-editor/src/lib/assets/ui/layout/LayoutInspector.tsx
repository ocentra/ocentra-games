import { useState } from 'react';
import { Layout, type LayoutStructure, type LayoutSection, type LayoutType } from '@ocentra/game-asset-domain/ui/layout/Layout';
import type { InspectorComponent } from '@/lib/core/inspector/types';


import './LayoutInspector.css';

export const LayoutInspector: InspectorComponent<Layout | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;
  
  const layoutData = (assetData.layout || { type: 'custom', sections: [] }) as LayoutStructure;
  
  const [layout, setLayout] = useState<LayoutStructure>(layoutData);
  const [expandedSectionIndex, setExpandedSectionIndex] = useState<number | null>(null);
  const [newSection, setNewSection] = useState<Partial<LayoutSection>>({
    id: '',
    type: '',
    width: '',
    order: 0,
  });

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleLayoutChange = (updated: LayoutStructure) => {
    setLayout(updated);
    handleFieldChange('layout', updated);
  };

  const handleAddSection = () => {
    if (!newSection.id?.trim() || !newSection.type?.trim()) return;

    const section: LayoutSection = {
      id: newSection.id.trim(),
      type: newSection.type.trim(),
      width: newSection.width?.trim() || undefined,
      order: newSection.order || 0,
      contentRef: newSection.contentRef || undefined,
    };

    const updated = {
      ...layout,
      sections: [...(layout.sections || []), section],
    };
    handleLayoutChange(updated);
    setNewSection({ id: '', type: '', width: '', order: 0 });
  };

  const handleDeleteSection = (index: number) => {
    const updated = {
      ...layout,
      sections: (layout.sections || []).filter((_, i) => i !== index),
    };
    handleLayoutChange(updated);
  };

  const handleUpdateSection = (index: number, field: keyof LayoutSection, value: unknown) => {
    const updated = {
      ...layout,
      sections: (layout.sections || []).map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      ),
    };
    handleLayoutChange(updated);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const sections = layout.sections || [];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const updated = { ...layout };
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated.sections[index], updated.sections[targetIndex]] = [updated.sections[targetIndex], updated.sections[index]];
    handleLayoutChange(updated);
  };

  return (
    <div className="layout-inspector">
      <div className="layout-inspector__section">
        <div className="layout-inspector__section-header">Layout Structure</div>
        <div className="layout-inspector__field">
          <label htmlFor="layout-type" className="layout-inspector__label">Layout Type</label>
          <select
            id="layout-type"
            className="layout-inspector__select"
            value={layout.type || 'custom'}
            onChange={(e) => handleLayoutChange({ ...layout, type: e.target.value as LayoutType })}
            title="Layout Type"
          >
            <option value="single-column">Single Column</option>
            <option value="two-column">Two Column</option>
            <option value="three-column">Three Column</option>
            <option value="grid">Grid</option>
            <option value="sidebar">Sidebar</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="layout-inspector__field">
          <label htmlFor="layout-gap" className="layout-inspector__label">Gap</label>
          <input
            id="layout-gap"
            type="text"
            className="layout-inspector__input"
            value={layout.gap || ''}
            onChange={(e) => handleLayoutChange({ ...layout, gap: e.target.value || undefined })}
            placeholder="e.g., 1rem, 16px"
            title="Gap"
          />
        </div>
        <div className="layout-inspector__field">
          <label htmlFor="layout-padding" className="layout-inspector__label">Padding</label>
          <input
            id="layout-padding"
            type="text"
            className="layout-inspector__input"
            value={layout.padding || ''}
            onChange={(e) => handleLayoutChange({ ...layout, padding: e.target.value || undefined })}
            placeholder="e.g., 1rem, 16px"
            title="Padding"
          />
        </div>
      </div>

      <div className="layout-inspector__section">
        <div className="layout-inspector__header">
          <div className="layout-inspector__title">Sections</div>
          <div className="layout-inspector__count">{(layout.sections || []).length} section{(layout.sections || []).length !== 1 ? 's' : ''}</div>
        </div>

        {(layout.sections || []).length > 0 && (
          <div className="layout-inspector__list">
            {(layout.sections || []).map((section, index) => (
              <div key={index} className="layout-inspector__item">
                <div className="layout-inspector__item-header">
                  <span className="layout-inspector__item-index">[{index}]</span>
                  <span className="layout-inspector__item-id">{section.id}</span>
                  <span className="layout-inspector__item-type">{section.type}</span>
                  <div className="layout-inspector__item-actions">
                    <button
                      type="button"
                      className="layout-inspector__action-button"
                      onClick={() => handleMoveSection(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="layout-inspector__action-button"
                      onClick={() => handleMoveSection(index, 'down')}
                      disabled={index === (layout.sections || []).length - 1}
                      title="Move down"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="layout-inspector__action-button layout-inspector__action-button--delete"
                      onClick={() => handleDeleteSection(index)}
                      title="Delete"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      className="layout-inspector__action-button"
                      onClick={() => setExpandedSectionIndex(expandedSectionIndex === index ? null : index)}
                      title={expandedSectionIndex === index ? "Collapse" : "Expand"}
                      aria-label={expandedSectionIndex === index ? "Collapse" : "Expand"}
                    >
                      {expandedSectionIndex === index ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
                {expandedSectionIndex === index && (
                  <div className="layout-inspector__item-content">
                    <div className="layout-inspector__field">
                      <div className="layout-inspector__label">ID</div>
                      <input
                        type="text"
                        className="layout-inspector__input"
                        value={section.id}
                        onChange={(e) => handleUpdateSection(index, 'id', e.target.value)}
                        title="Section ID"
                        aria-label="Section ID"
                      />
                    </div>
                    <div className="layout-inspector__field">
                      <div className="layout-inspector__label">Type</div>
                      <input
                        type="text"
                        className="layout-inspector__input"
                        value={section.type}
                        onChange={(e) => handleUpdateSection(index, 'type', e.target.value)}
                        title="Section Type"
                        aria-label="Section Type"
                      />
                    </div>
                    <div className="layout-inspector__field">
                      <div className="layout-inspector__label">Width</div>
                      <input
                        type="text"
                        className="layout-inspector__input"
                        value={section.width || ''}
                        onChange={(e) => handleUpdateSection(index, 'width', e.target.value || undefined)}
                        placeholder="e.g., 50%, 200px"
                        title="Width"
                        aria-label="Width"
                      />
                    </div>
                    <div className="layout-inspector__field">
                      <div className="layout-inspector__label">Order</div>
                      <input
                        type="number"
                        className="layout-inspector__input layout-inspector__input--number"
                        value={section.order || 0}
                        onChange={(e) => handleUpdateSection(index, 'order', parseInt(e.target.value, 10) || 0)}
                        title="Order"
                        aria-label="Order"
                      />
                    </div>
                    <div className="layout-inspector__field">
                      <div className="layout-inspector__label">Content Ref</div>
                      <input
                        type="text"
                        className="layout-inspector__input"
                        value={typeof section.contentRef === 'string' ? section.contentRef : ''}
                        onChange={(e) => handleUpdateSection(index, 'contentRef', e.target.value || undefined)}
                        placeholder="Asset reference"
                        title="Content Reference"
                        aria-label="Content Reference"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="layout-inspector__add">
          <div className="layout-inspector__add-header">Add New Section</div>
          <div className="layout-inspector__add-fields">
            <div className="layout-inspector__add-field">
              <label htmlFor="layout-add-id" className="layout-inspector__label">ID *</label>
              <input
                id="layout-add-id"
                type="text"
                className="layout-inspector__input"
                value={newSection.id || ''}
                onChange={(e) => setNewSection({ ...newSection, id: e.target.value })}
                placeholder="Section ID"
                title="Section ID"
              />
            </div>
            <div className="layout-inspector__add-field">
              <label htmlFor="layout-add-type" className="layout-inspector__label">Type *</label>
              <input
                id="layout-add-type"
                type="text"
                className="layout-inspector__input"
                value={newSection.type || ''}
                onChange={(e) => setNewSection({ ...newSection, type: e.target.value })}
                placeholder="Section type"
                title="Section Type"
              />
            </div>
            <div className="layout-inspector__add-field">
              <label htmlFor="layout-add-width" className="layout-inspector__label">Width</label>
              <input
                id="layout-add-width"
                type="text"
                className="layout-inspector__input"
                value={newSection.width || ''}
                onChange={(e) => setNewSection({ ...newSection, width: e.target.value })}
                placeholder="e.g., 50%"
                title="Width"
              />
            </div>
            <div className="layout-inspector__add-field">
              <label htmlFor="layout-add-order" className="layout-inspector__label">Order</label>
              <input
                id="layout-add-order"
                type="number"
                className="layout-inspector__input layout-inspector__input--number"
                value={newSection.order || 0}
                onChange={(e) => setNewSection({ ...newSection, order: parseInt(e.target.value, 10) || 0 })}
                title="Order"
              />
            </div>
            <button
              type="button"
              className="layout-inspector__add-button"
              onClick={handleAddSection}
              disabled={!newSection.id?.trim() || !newSection.type?.trim()}
              title="Add section"
            >
              Add Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



