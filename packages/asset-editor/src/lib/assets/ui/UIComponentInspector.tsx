import { useState } from 'react';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { UIComponent, type ComponentType, type ComponentStyles, type AnimationConfig } from '@ocentra/game-asset-domain/ui/UIComponent';
import './UIComponentInspector.css';

export const UIComponentInspector: InspectorComponent<UIComponent | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  const component = (assetData.component || 'Button') as ComponentType;
  const stylesData = (assetData.styles || {}) as ComponentStyles;
  const animationsData = (assetData.animations || {}) as Record<string, AnimationConfig>;

  const [styles, setStyles] = useState<Array<{ key: string; value: string }>>(
    Object.entries(stylesData).map(([key, value]) => ({ key, value: String(value) }))
  );
  const [animations, setAnimations] = useState<Array<{ key: string; config: AnimationConfig }>>(
    Object.entries(animationsData).map(([key, config]) => ({ key, config }))
  );
  const [newStyleKey, setNewStyleKey] = useState('');
  const [newStyleValue, setNewStyleValue] = useState('');
  const [expandedAnimationKey, setExpandedAnimationKey] = useState<string | null>(null);

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleStylesChange = (updated: Array<{ key: string; value: string }>) => {
    setStyles(updated);
    const dict: ComponentStyles = {};
    updated.forEach(({ key, value }) => {
      if (key.trim()) {
        dict[key.trim()] = value;
      }
    });
    handleFieldChange('styles', dict);
  };

  const handleAddStyle = () => {
    if (!newStyleKey.trim()) return;
    const updated = [...styles, { key: newStyleKey.trim(), value: newStyleValue }];
    handleStylesChange(updated);
    setNewStyleKey('');
    setNewStyleValue('');
  };

  const handleRemoveStyle = (index: number) => {
    const updated = styles.filter((_, i) => i !== index);
    handleStylesChange(updated);
  };

  const handleUpdateStyle = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...styles];
    updated[index] = { ...updated[index], [field]: value };
    handleStylesChange(updated);
  };

  const handleAnimationsChange = (updated: Array<{ key: string; config: AnimationConfig }>) => {
    setAnimations(updated);
    const dict: Record<string, AnimationConfig> = {};
    updated.forEach(({ key, config }) => {
      if (key.trim()) {
        dict[key.trim()] = config;
      }
    });
    handleFieldChange('animations', dict);
  };

  const handleUpdateAnimation = (index: number, field: keyof AnimationConfig, value: string) => {
    const updated = [...animations];
    updated[index] = {
      ...updated[index],
      config: { ...updated[index].config, [field]: value },
    };
    handleAnimationsChange(updated);
  };

  const handleRemoveAnimation = (index: number) => {
    const updated = animations.filter((_, i) => i !== index);
    handleAnimationsChange(updated);
  };

  const handleAddAnimation = () => {
    const newKey = `animation_${Date.now()}`;
    const updated = [...animations, { key: newKey, config: { name: '' } }];
    handleAnimationsChange(updated);
    setExpandedAnimationKey(newKey);
  };

  return (
    <div className="ui-component-inspector">
      <div className="ui-component-inspector__section">
        <div className="ui-component-inspector__section-header">Component</div>
        <div className="ui-component-inspector__field">
          <label htmlFor="ui-component-type" className="ui-component-inspector__label">Component Type</label>
          <select
            id="ui-component-type"
            className="ui-component-inspector__select"
            value={component}
            onChange={(e) => handleFieldChange('component', e.target.value as ComponentType)}
            title="Component Type"
          >
            <option value="Button">Button</option>
            <option value="Input">Input</option>
            <option value="Card">Card</option>
            <option value="Modal">Modal</option>
            <option value="Dialog">Dialog</option>
            <option value="Tooltip">Tooltip</option>
            <option value="Badge">Badge</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="ui-component-inspector__section">
        <div className="ui-component-inspector__section-header">Styles</div>
        {styles.length > 0 && (
          <div className="ui-component-inspector__styles-list">
            {styles.map((style, index) => (
              <div key={index} className="ui-component-inspector__style-item">
                <input
                  type="text"
                  className="ui-component-inspector__style-key"
                  value={style.key}
                  onChange={(e) => handleUpdateStyle(index, 'key', e.target.value)}
                  placeholder="Property name"
                  title="Style property"
                />
                <input
                  type="text"
                  className="ui-component-inspector__style-value"
                  value={style.value}
                  onChange={(e) => handleUpdateStyle(index, 'value', e.target.value)}
                  placeholder="Property value"
                  title="Style value"
                />
                <button
                  type="button"
                  className="ui-component-inspector__remove-button"
                  onClick={() => handleRemoveStyle(index)}
                  title="Remove style"
                  aria-label="Remove style"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="ui-component-inspector__add-style">
          <input
            type="text"
            className="ui-component-inspector__style-key"
            value={newStyleKey}
            onChange={(e) => setNewStyleKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newStyleKey.trim()) {
                handleAddStyle();
              }
            }}
            placeholder="New property name"
            title="Style property"
          />
          <input
            type="text"
            className="ui-component-inspector__style-value"
            value={newStyleValue}
            onChange={(e) => setNewStyleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newStyleKey.trim()) {
                handleAddStyle();
              }
            }}
            placeholder="New property value"
            title="Style value"
          />
          <button
            type="button"
            className="ui-component-inspector__add-button"
            onClick={handleAddStyle}
            disabled={!newStyleKey.trim()}
            title="Add style"
          >
            Add
          </button>
        </div>
      </div>

      <div className="ui-component-inspector__section">
        <div className="ui-component-inspector__section-header">Animations</div>
        {animations.length > 0 && (
          <div className="ui-component-inspector__animations-list">
            {animations.map((animation, index) => (
              <div key={index} className="ui-component-inspector__animation-item">
                <div className="ui-component-inspector__animation-header">
                  <span className="ui-component-inspector__animation-key">{animation.key}</span>
                  <div className="ui-component-inspector__animation-actions">
                    <button
                      type="button"
                      className="ui-component-inspector__action-button"
                      onClick={() => setExpandedAnimationKey(expandedAnimationKey === animation.key ? null : animation.key)}
                      title={expandedAnimationKey === animation.key ? "Collapse" : "Expand"}
                      aria-label={expandedAnimationKey === animation.key ? "Collapse" : "Expand"}
                    >
                      {expandedAnimationKey === animation.key ? '▼' : '▶'}
                    </button>
                    <button
                      type="button"
                      className="ui-component-inspector__remove-button"
                      onClick={() => handleRemoveAnimation(index)}
                      title="Remove animation"
                      aria-label="Remove animation"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {expandedAnimationKey === animation.key && (
                  <div className="ui-component-inspector__animation-content">
                    <div className="ui-component-inspector__field">
                      <label htmlFor={`ui-anim-name-${index}`} className="ui-component-inspector__label">Name</label>
                      <input
                        id={`ui-anim-name-${index}`}
                        type="text"
                        className="ui-component-inspector__input"
                        value={animation.config.name || ''}
                        onChange={(e) => handleUpdateAnimation(index, 'name', e.target.value)}
                        placeholder="Animation name"
                        title="Animation name"
                      />
                    </div>
                    <div className="ui-component-inspector__field">
                      <label htmlFor={`ui-anim-duration-${index}`} className="ui-component-inspector__label">Duration</label>
                      <input
                        id={`ui-anim-duration-${index}`}
                        type="text"
                        className="ui-component-inspector__input"
                        value={animation.config.duration || ''}
                        onChange={(e) => handleUpdateAnimation(index, 'duration', e.target.value)}
                        placeholder="e.g., 0.3s"
                        title="Duration"
                      />
                    </div>
                    <div className="ui-component-inspector__field">
                      <label htmlFor={`ui-anim-timing-${index}`} className="ui-component-inspector__label">Timing Function</label>
                      <input
                        id={`ui-anim-timing-${index}`}
                        type="text"
                        className="ui-component-inspector__input"
                        value={animation.config.timingFunction || ''}
                        onChange={(e) => handleUpdateAnimation(index, 'timingFunction', e.target.value)}
                        placeholder="e.g., ease-in-out"
                        title="Timing Function"
                      />
                    </div>
                    <div className="ui-component-inspector__field">
                      <label htmlFor={`ui-anim-delay-${index}`} className="ui-component-inspector__label">Delay</label>
                      <input
                        id={`ui-anim-delay-${index}`}
                        type="text"
                        className="ui-component-inspector__input"
                        value={animation.config.delay || ''}
                        onChange={(e) => handleUpdateAnimation(index, 'delay', e.target.value)}
                        placeholder="e.g., 0.1s"
                        title="Delay"
                      />
                    </div>
                    <div className="ui-component-inspector__field">
                      <label htmlFor={`ui-anim-iteration-${index}`} className="ui-component-inspector__label">Iteration Count</label>
                      <input
                        id={`ui-anim-iteration-${index}`}
                        type="text"
                        className="ui-component-inspector__input"
                        value={animation.config.iterationCount || ''}
                        onChange={(e) => handleUpdateAnimation(index, 'iterationCount', e.target.value)}
                        placeholder="e.g., infinite, 1"
                        title="Iteration Count"
                      />
                    </div>
                    <div className="ui-component-inspector__field">
                      <label htmlFor={`ui-anim-direction-${index}`} className="ui-component-inspector__label">Direction</label>
                      <input
                        id={`ui-anim-direction-${index}`}
                        type="text"
                        className="ui-component-inspector__input"
                        value={animation.config.direction || ''}
                        onChange={(e) => handleUpdateAnimation(index, 'direction', e.target.value)}
                        placeholder="e.g., normal, reverse"
                        title="Direction"
                      />
                    </div>
                    <div className="ui-component-inspector__field">
                      <label htmlFor={`ui-anim-fill-${index}`} className="ui-component-inspector__label">Fill Mode</label>
                      <input
                        id={`ui-anim-fill-${index}`}
                        type="text"
                        className="ui-component-inspector__input"
                        value={animation.config.fillMode || ''}
                        onChange={(e) => handleUpdateAnimation(index, 'fillMode', e.target.value)}
                        placeholder="e.g., forwards, backwards"
                        title="Fill Mode"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          className="ui-component-inspector__add-button"
          onClick={handleAddAnimation}
          title="Add animation"
        >
          Add Animation
        </button>
      </div>
    </div>
  );
};


