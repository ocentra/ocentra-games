// PageRenderer.tsx
// Component for rendering complete pages from PageContent

import React from 'react';
import { usePageContent } from '@/hooks/usePageContent';
import type { PageAssetLike } from '@/ui/components/GameInfo/types';
import { SectionRenderer } from '@/ui/components/SectionRenderer/SectionRenderer';
import { AssetImage } from '@/ui/components/AssetImage/AssetImage';
import './PageRenderer.css';

export interface PageRendererProps {
  pageAsset?: PageAssetLike | null;
  pagePath?: string;
  gameId?: string;
}

/**
 * PageRenderer component - Renders complete pages from PageContent
 * Works for any game page by loading asset and rendering hero + sections
 */
export const PageRenderer: React.FC<PageRendererProps> = ({ 
  pageAsset, 
  pagePath,
  gameId 
}) => {
  // Always call hook (React Rules of Hooks), but only use result if pagePath provided
  const loadedFromPath = usePageContent(pagePath || null, gameId);
  
  // Use provided asset if available, otherwise use loaded asset
  const loadedAsset = pageAsset || (pagePath ? loadedFromPath : null);

  if (!loadedAsset) {
    return (
      <div className="page-renderer page-renderer--loading">
        <p>Loading page content...</p>
      </div>
    );
  }

  const { hero, sections } = loadedAsset;

  // Render hero section
  const renderHero = () => {
    if (!hero) return null;

    const backgroundImageUrl = typeof hero.backgroundImageRef === 'string'
      ? hero.backgroundImageRef
      : hero.backgroundImageRef?.guid || null;

    return (
      <div className="page-renderer__hero">
        {backgroundImageUrl && (
          <div className="page-renderer__hero-background">
            <AssetImage
              assetRef={backgroundImageUrl}
              className="page-renderer__hero-image"
              alt={hero.title}
            />
          </div>
        )}
        <div className="page-renderer__hero-content">
          <h1 className="page-renderer__hero-title">{hero.title}</h1>
          {hero.subtitle && (
            <p className="page-renderer__hero-subtitle">{hero.subtitle}</p>
          )}
          {hero.ctaButtons && hero.ctaButtons.length > 0 && (
            <div className="page-renderer__hero-buttons">
              {hero.ctaButtons.map((button, index) => (
                <button
                  key={index}
                  className="page-renderer__hero-button"
                  onClick={() => {
                    if (button.onClick && typeof window !== 'undefined') {
                      const windowWithIndex = window as unknown as Record<string, unknown>;
                      const handler = windowWithIndex[button.onClick];
                      if (typeof handler === 'function') {
                        handler();
                      }
                    }
                  }}
                >
                  {button.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render all sections
  const renderSections = () => {
    if (!sections || sections.length === 0) return null;

    return (
      <div className="page-renderer__sections">
        {sections.map((section, index) => (
          <SectionRenderer key={index} section={section} />
        ))}
      </div>
    );
  };

  return (
    <div className="page-renderer">
      {renderHero()}
      {renderSections()}
    </div>
  );
};

export default PageRenderer;
