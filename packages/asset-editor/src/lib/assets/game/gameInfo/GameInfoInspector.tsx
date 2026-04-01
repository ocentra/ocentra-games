import { useState } from 'react';
import { GameInfo } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import type { HeroSection, PageSection } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { PageSectionType } from '@ocentra/game-asset-domain/constants/page-section-type';
import { GamePhase } from '@ocentra/game-domain/types/game';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { SynthesizeGameInfoEvent } from '@ocentra/game-asset-domain/events/synthesis';


import './GameInfoInspector.css';

import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const LOG_GAMEINFO_INSPECTOR = false;

export const GameInfoInspector: InspectorComponent<GameInfo | Record<string, unknown>> = ({ data, onFieldChange }) => {
  log.logInfo('[GameInfoInspector] Received data', getStackTrace(), data, LOG_GAMEINFO_INSPECTOR);
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);

  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  const system = (dataObj.system && typeof dataObj.system === 'object')
    ? (dataObj.system as Record<string, unknown>)
    : null;

  const guid = (system?.guid as string) || (dataObj.guid as string);
  log.logInfo('[GameInfoInspector] Extracted GUID', getStackTrace(), { guid, source: system ? 'envelope' : 'direct' }, LOG_GAMEINFO_INSPECTOR);

  const heroData = (assetData.hero || { title: '' }) as HeroSection;
  const sectionsData = (assetData.sections || []) as PageSection[];
  const description = (assetData.description || '') as string;
  const tagsData = (assetData.tags || []) as string[];
  const comingSoon = (assetData.comingSoon || false) as boolean;
  const minPlayers = (assetData.minPlayers || 2) as number;
  const maxPlayers = (assetData.maxPlayers || 4) as number;
  const routePath = (assetData.routePath || '') as string;
  const llmDescription = (assetData.LLM || '') as string;
  const playerDescription = (assetData.Player || '') as string;
  const tagline = (assetData.tagline || '') as string;
  const tagline2 = (assetData.tagline2 || '') as string;
  const shortDescription = (assetData.shortDescription || '') as string;
  const gameIconImage = (assetData.gameIconImage || '') as string;

  const [hero, setHero] = useState<HeroSection>(heroData);
  const [sections, setSections] = useState<PageSection[]>(sectionsData);
  const [tags, setTags] = useState<string[]>(tagsData);
  const [expandedSectionIndex, setExpandedSectionIndex] = useState<number | null>(null);
  const [newTag, setNewTag] = useState('');
  const [newSection, setNewSection] = useState<Partial<PageSection>>({
    type: 'text',
    title: '',
    content: '',
  });

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleHeroChange = (updated: HeroSection) => {
    setHero(updated);
    handleFieldChange('hero', updated);
  };

  const handleTagsChange = (updated: string[]) => {
    setTags(updated);
    handleFieldChange('tags', updated);
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    handleTagsChange([...tags, newTag.trim()]);
    setNewTag('');
  };

  const handleRemoveTag = (index: number) => {
    handleTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleAddSection = () => {
    if (!newSection.type) return;

    const section: PageSection = {
      type: newSection.type,
      tabLabel: newSection.title?.trim() || newSection.type || 'Section',
      title: newSection.title?.trim() || undefined,
      content: newSection.content?.trim() || undefined,
      imageRefs: newSection.imageRefs || undefined,
    };

    const updated = [...sections, section];
    setSections(updated);
    handleFieldChange('sections', updated);
    setNewSection({ type: 'text', title: '', content: '' });
  };

  const handleDeleteSection = (index: number) => {
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated);
    handleFieldChange('sections', updated);
  };

  const handleUpdateSection = (index: number, field: keyof PageSection, value: unknown) => {
    const updated = sections.map((section, i) =>
      i === index ? { ...section, [field]: value } : section
    );
    setSections(updated);
    handleFieldChange('sections', updated);
  };

  const handleUpdateCtaButton = (index: number, field: 'label' | 'href' | 'onClick', value: string) => {
    const ctaButtons = hero.ctaButtons || [];
    const updated = ctaButtons.map((btn, i) =>
      i === index ? { ...btn, [field]: value } : btn
    );
    handleHeroChange({ ...hero, ctaButtons: updated });
  };

  const handleAddCtaButton = () => {
    const ctaButtons = hero.ctaButtons || [];
    handleHeroChange({ ...hero, ctaButtons: [...ctaButtons, { label: '' }] });
  };

  const handleRemoveCtaButton = (index: number) => {
    const ctaButtons = hero.ctaButtons || [];
    handleHeroChange({ ...hero, ctaButtons: ctaButtons.filter((_, i) => i !== index) });
  };

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const handleSynthesize = async () => {
    log.logInfo('[GameInfoInspector] handleSynthesize called', getStackTrace(), { guid }, LOG_GAMEINFO_INSPECTOR);
    if (!guid) {
      alert('Asset GUID missing. Cannot synthesize.');
      return;
    }

    setIsSynthesizing(true);
    try {
      const deferred = new OperationDeferred<Map<number, import('@ocentra/game-asset-domain/game/gameInfo/GameInfo').ContentBlock[]>>();
      await EventBus.instance.publishAsync(new SynthesizeGameInfoEvent(guid, [], deferred));
      const result = await deferred.promise;

      if (result.isSuccess && result.value) {
        // Update local sections with synthesized content
        const updatedSections = [...sections];
        let pageIdx = 0;
        for (const section of updatedSections) {
          if (section.pages) {
            for (const page of section.pages) {
              const newContent = result.value.get(pageIdx);
              if (newContent) {
                page.content = newContent;
              }
              pageIdx++;
            }
          }
        }
        setSections(updatedSections);
        alert('Synthesis complete! Content has been updated and saved.');
      } else {
        alert(`Synthesis failed: ${result.errorMessage}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="page-content-inspector">
      <div className="page-content-inspector__section">
        <div className="page-content-inspector__section-header">Hero Section</div>
        <div className="page-content-inspector__field">
          <label htmlFor="hero-title" className="page-content-inspector__label">Title *</label>
          <input
            id="hero-title"
            type="text"
            className="page-content-inspector__input"
            value={hero.title || ''}
            onChange={(e) => handleHeroChange({ ...hero, title: e.target.value })}
            title="Hero Title"
            placeholder="Enter hero title"
          />
        </div>
        <div className="page-content-inspector__field">
          <label htmlFor="hero-subtitle" className="page-content-inspector__label">Subtitle</label>
          <input
            id="hero-subtitle"
            type="text"
            className="page-content-inspector__input"
            value={hero.subtitle || ''}
            onChange={(e) => handleHeroChange({ ...hero, subtitle: e.target.value || undefined })}
            title="Hero Subtitle"
            placeholder="Enter hero subtitle"
          />
        </div>
        <div className="page-content-inspector__field">
          <label htmlFor="hero-bg" className="page-content-inspector__label">Background Image Ref</label>
          <input
            id="hero-bg"
            type="text"
            className="page-content-inspector__input"
            value={typeof hero.backgroundImageRef === 'string' ? hero.backgroundImageRef : ''}
            onChange={(e) => handleHeroChange({ ...hero, backgroundImageRef: e.target.value || undefined })}
            title="Background Image Reference"
            placeholder="Enter background image reference"
          />
        </div>
        <div className="page-content-inspector__field">
          <div className="page-content-inspector__label">CTA Buttons</div>
          {(hero.ctaButtons || []).length > 0 && (
            <div className="page-content-inspector__cta-list">
              {(hero.ctaButtons || []).map((button, index) => (
                <div key={index} className="page-content-inspector__cta-item">
                  <input
                    type="text"
                    className="page-content-inspector__input"
                    value={button.label}
                    onChange={(e) => handleUpdateCtaButton(index, 'label', e.target.value)}
                    placeholder="Button label"
                    title="Button Label"
                  />
                  <input
                    type="text"
                    className="page-content-inspector__input"
                    value={button.href || ''}
                    onChange={(e) => handleUpdateCtaButton(index, 'href', e.target.value)}
                    placeholder="href (optional)"
                    title="Button Href"
                  />
                  <input
                    type="text"
                    className="page-content-inspector__input"
                    value={button.onClick || ''}
                    onChange={(e) => handleUpdateCtaButton(index, 'onClick', e.target.value)}
                    placeholder="onClick (optional)"
                    title="Button onClick"
                  />
                  <button
                    type="button"
                    className="page-content-inspector__remove-button"
                    onClick={() => handleRemoveCtaButton(index)}
                    title="Remove button"
                    aria-label="Remove button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className="page-content-inspector__add-button"
            onClick={handleAddCtaButton}
            title="Add CTA button"
          >
            Add CTA Button
          </button>
        </div>
      </div>

      <div className="page-content-inspector__section">
        <div className="page-content-inspector__section-header">Metadata</div>
        <div className="page-content-inspector__field">
          <label htmlFor="page-description" className="page-content-inspector__label">Description</label>
          <textarea
            id="page-description"
            className="page-content-inspector__textarea"
            value={description}
            onChange={(e) => handleFieldChange('description', e.target.value || undefined)}
            rows={4}
            title="Description"
            placeholder="Enter page description"
          />
        </div>
        <div className="page-content-inspector__field">
          <div className="page-content-inspector__label">Tags</div>
          {tags.length > 0 && (
            <div className="page-content-inspector__tags-list">
              {tags.map((tag, index) => (
                <div key={index} className="page-content-inspector__tag-item">
                  <span className="page-content-inspector__tag">{tag}</span>
                  <button
                    type="button"
                    className="page-content-inspector__remove-button"
                    onClick={() => handleRemoveTag(index)}
                    title="Remove tag"
                    aria-label="Remove tag"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="page-content-inspector__add-tag">
            <input
              type="text"
              className="page-content-inspector__input"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  handleAddTag();
                }
              }}
              placeholder="New tag"
              title="Tag"
            />
            <button
              type="button"
              className="page-content-inspector__add-button"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              title="Add tag"
            >
              Add
            </button>
          </div>
        </div>
        <div className="page-content-inspector__field">
          <label htmlFor="page-route" className="page-content-inspector__label">Route Path</label>
          <input
            id="page-route"
            type="text"
            className="page-content-inspector__input"
            value={routePath}
            onChange={(e) => handleFieldChange('routePath', e.target.value || undefined)}
            title="Route Path"
            placeholder="Enter route path"
          />
        </div>
        <div className="page-content-inspector__field">
          <label htmlFor="page-coming-soon" className="page-content-inspector__label">
            <input
              id="page-coming-soon"
              type="checkbox"
              checked={comingSoon}
              onChange={(e) => handleFieldChange('comingSoon', e.target.checked)}
              title="Coming Soon"
            />
            Coming Soon
          </label>
        </div>
        <div className="page-content-inspector__field-row">
          <div className="page-content-inspector__field">
            <label htmlFor="page-min-players" className="page-content-inspector__label">Min Players</label>
            <input
              id="page-min-players"
              type="number"
              className="page-content-inspector__input page-content-inspector__input--number"
              value={minPlayers}
              onChange={(e) => handleFieldChange('minPlayers', parseInt(e.target.value, 10) || undefined)}
              min="1"
              title="Min Players"
            />
          </div>
          <div className="page-content-inspector__field">
            <label htmlFor="page-max-players" className="page-content-inspector__label">Max Players</label>
            <input
              id="page-max-players"
              type="number"
              className="page-content-inspector__input page-content-inspector__input--number"
              value={maxPlayers}
              onChange={(e) => handleFieldChange('maxPlayers', parseInt(e.target.value, 10) || undefined)}
              min="1"
              title="Max Players"
            />
          </div>
        </div>
      </div>

      <div className="page-content-inspector__section">
        <div className="page-content-inspector__section-header">Game Descriptions</div>
        <div className="page-content-inspector__field">
          <label htmlFor="game-info-llm" className="page-content-inspector__label">LLM Description</label>
          <textarea
            id="game-info-llm"
            className="page-content-inspector__textarea"
            value={llmDescription}
            onChange={(e) => handleFieldChange('LLM', e.target.value)}
            rows={6}
            placeholder="Enter description for LLM..."
            title="LLM Description"
          />
        </div>
        <div className="page-content-inspector__field">
          <label htmlFor="game-info-player" className="page-content-inspector__label">Player Description</label>
          <textarea
            id="game-info-player"
            className="page-content-inspector__textarea"
            value={playerDescription}
            onChange={(e) => handleFieldChange('Player', e.target.value)}
            rows={6}
            placeholder="Enter description for players..."
            title="Player Description"
          />
        </div>
        <div className="page-content-inspector__field-row">
          <div className="page-content-inspector__field">
            <label htmlFor="game-info-tagline" className="page-content-inspector__label">Tagline</label>
            <input
              id="game-info-tagline"
              type="text"
              className="page-content-inspector__input"
              value={tagline}
              onChange={(e) => handleFieldChange('tagline', e.target.value || undefined)}
              placeholder="Main tagline..."
              title="Tagline"
            />
          </div>
          <div className="page-content-inspector__field">
            <label htmlFor="game-info-tagline2" className="page-content-inspector__label">Tagline 2</label>
            <input
              id="game-info-tagline2"
              type="text"
              className="page-content-inspector__input"
              value={tagline2}
              onChange={(e) => handleFieldChange('tagline2', e.target.value || undefined)}
              placeholder="Secondary tagline..."
              title="Tagline 2"
            />
          </div>
        </div>
        <div className="page-content-inspector__field-row">
          <div className="page-content-inspector__field">
            <label htmlFor="game-info-short" className="page-content-inspector__label">Short Description</label>
            <input
              id="game-info-short"
              type="text"
              className="page-content-inspector__input"
              value={shortDescription}
              onChange={(e) => handleFieldChange('shortDescription', e.target.value || undefined)}
              placeholder="Short description..."
              title="Short Description"
            />
          </div>
          <div className="page-content-inspector__field">
            <label htmlFor="game-info-icon" className="page-content-inspector__label">Game Icon Image</label>
            <input
              id="game-info-icon"
              type="text"
              className="page-content-inspector__input"
              value={gameIconImage}
              onChange={(e) => handleFieldChange('gameIconImage', e.target.value || undefined)}
              placeholder="Path to icon image..."
              title="Game Icon Image"
            />
          </div>
        </div>
      </div>
      <div className="page-content-inspector__section">
        <div className="page-content-inspector__header">
          <div className="page-content-inspector__title">Sections</div>
          <div className="page-content-inspector__actions">
            <button
              type="button"
              className="page-content-inspector__synth-button"
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              title="Generate pre-baked content from linked assets"
            >
              {isSynthesizing ? '🕒 Synthesizing...' : '⚡ Synthesize Content'}
            </button>
            <div className="page-content-inspector__count">{sections.length} section{sections.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {sections.length > 0 && (
          <div className="page-content-inspector__list">
            {sections.map((section, index) => (
              <div key={index} className="page-content-inspector__item">
                <div className="page-content-inspector__item-header">
                  <span className="page-content-inspector__item-index">[{index}]</span>
                  <span className="page-content-inspector__item-type">{section.type}</span>
                  {section.title && (
                    <span className="page-content-inspector__item-title">{section.title}</span>
                  )}
                  <div className="page-content-inspector__item-actions">
                    <button
                      type="button"
                      className="page-content-inspector__action-button page-content-inspector__action-button--delete"
                      onClick={() => handleDeleteSection(index)}
                      title="Delete"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      className="page-content-inspector__action-button"
                      onClick={() => setExpandedSectionIndex(expandedSectionIndex === index ? null : index)}
                      title={expandedSectionIndex === index ? "Collapse" : "Expand"}
                      aria-label={expandedSectionIndex === index ? "Collapse" : "Expand"}
                    >
                      {expandedSectionIndex === index ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
                {expandedSectionIndex === index && (
                  <div className="page-content-inspector__item-content">
                    <div className="page-content-inspector__field">
                      <label htmlFor={`page-section-type-${index}`} className="page-content-inspector__label">Type</label>
                      <select
                        id={`page-section-type-${index}`}
                        className="page-content-inspector__select"
                        value={section.type}
                        onChange={(e) => handleUpdateSection(index, 'type', e.target.value as PageSectionType)}
                        title="Section Type"
                      >
                        <option value="text">Text</option>
                        <option value="rules">Rules</option>
                        <option value="screenshots">Screenshots</option>
                        <option value="strategy">Strategy</option>
                        <option value={GamePhase.SCORING}>Scoring</option>
                        <option value="about">About</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div className="page-content-inspector__field">
                      <label htmlFor={`page-section-title-${index}`} className="page-content-inspector__label">Title</label>
                      <input
                        id={`page-section-title-${index}`}
                        type="text"
                        className="page-content-inspector__input"
                        value={section.title || ''}
                        onChange={(e) => handleUpdateSection(index, 'title', e.target.value || undefined)}
                        title="Section Title"
                      />
                    </div>
                    <div className="page-content-inspector__field">
                      <label htmlFor={`page-section-content-${index}`} className="page-content-inspector__label">Content</label>
                      <textarea
                        id={`page-section-content-${index}`}
                        className="page-content-inspector__textarea"
                        value={section.content || ''}
                        onChange={(e) => handleUpdateSection(index, 'content', e.target.value || undefined)}
                        rows={4}
                        title="Section Content"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="page-content-inspector__add">
          <div className="page-content-inspector__add-header">Add New Section</div>
          <div className="page-content-inspector__add-fields">
            <div className="page-content-inspector__add-field">
              <label htmlFor="page-section-add-type" className="page-content-inspector__label">Type *</label>
              <select
                id="page-section-add-type"
                className="page-content-inspector__select"
                value={newSection.type || 'text'}
                onChange={(e) => setNewSection({ ...newSection, type: e.target.value as PageSectionType })}
                title="Section Type"
              >
                <option value="text">Text</option>
                <option value="rules">Rules</option>
                <option value="screenshots">Screenshots</option>
                <option value="strategy">Strategy</option>
                <option value={GamePhase.SCORING}>Scoring</option>
                <option value="about">About</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="page-content-inspector__add-field">
              <label htmlFor="page-section-add-title" className="page-content-inspector__label">Title</label>
              <input
                id="page-section-add-title"
                type="text"
                className="page-content-inspector__input"
                value={newSection.title || ''}
                onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                placeholder="Section title (optional)"
                title="Section Title"
              />
            </div>
            <div className="page-content-inspector__add-field">
              <label htmlFor="page-section-add-content" className="page-content-inspector__label">Content</label>
              <textarea
                id="page-section-add-content"
                className="page-content-inspector__textarea"
                value={newSection.content || ''}
                onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
                placeholder="Section content (optional)"
                rows={3}
                title="Section Content"
              />
            </div>
            <button
              type="button"
              className="page-content-inspector__add-button"
              onClick={handleAddSection}
              disabled={!newSection.type}
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




