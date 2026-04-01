import React, { useState, useEffect } from 'react';
import type { PageSection } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';
import './GameInfoTabs.css';

interface GameInfoTabsProps {
  sections: PageSection[];
}

export const GameInfoTabs: React.FC<GameInfoTabsProps> = ({ sections }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [activePage, setActivePage] = useState(0);

  // Recalculate totalPages whenever sections or activeTab changes
  const totalPages = sections[activeTab]?.pages?.length || 0;

  // Reset activePage if the number of pages in the current section changes
  useEffect(() => {
    if (activePage >= totalPages) {
      setActivePage(0);
    }
  }, [activeTab, totalPages, activePage]);

  useEffect(() => {
    const currentSection = sections[activeTab];
    if (!currentSection?.pages) return;
    
    const firstPageWithContent = currentSection.pages.findIndex(page => 
      page?.content && Array.isArray(page.content) && page.content.length > 0
    );
    
    if (firstPageWithContent >= 0 && activePage === 0 && !currentSection.pages[0]?.content?.length) {
      setActivePage(firstPageWithContent);
    }
  }, [activeTab, sections, activePage]);

  const currentSection = sections[activeTab];
  const pages = currentSection?.pages || [];
  const currentPage = pages[activePage];

  if (!sections || sections.length === 0) {
    return (
      <div className="game-info-tabs">
        <div className="tabs-content">
          <p>No sections available.</p>
        </div>
      </div>
    );
  }

  const handlePrevPage = () => {
    setActivePage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const handleNextPage = () => {
    setActivePage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    setActivePage(0);
  };

  const renderContent = () => {
    if (!currentPage) {
      return <p>No content available for this page.</p>;
    }

    if (currentPage.content && Array.isArray(currentPage.content) && currentPage.content.length > 0) {
      return (
        <div className={GameInfoCSSClasses.ContentSection}>
          {currentPage.content.map((block, index) => (
            <ContentBlockRenderer key={index} block={block} />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="game-info-tabs">
      <div className="tabs-header">
        <div className="tabs-list">
          {sections.map((section, index) => (
            <button
              key={`${section.type}-${index}`}
              className={`${GameInfoCSSClasses.TabButton} ${activeTab === index ? GameInfoCSSClasses.TabButtonActive : ''}`}
              onClick={() => handleTabChange(index)}
            >
              {section.tabLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="tabs-content">
        <div className={GameInfoCSSClasses.TabPanel}>
          {currentPage?.title && (
            <h2 className={GameInfoCSSClasses.TabHeading}>{currentPage.title}</h2>
          )}
          {currentPage?.subtitle && (
            <p className={GameInfoCSSClasses.TabSubtitle}>{currentPage.subtitle}</p>
          )}
          {renderContent()}
        </div>

        {totalPages > 1 && (
          <div className={GameInfoCSSClasses.TabFooter}>
            <button
              className="tab-nav-btn"
              onClick={handlePrevPage}
              aria-label="Previous page"
            >
              ← Previous
            </button>

            <div className="page-indicator">
              {activePage + 1} / {totalPages}
            </div>

            <button
              className="tab-nav-btn"
              onClick={handleNextPage}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
