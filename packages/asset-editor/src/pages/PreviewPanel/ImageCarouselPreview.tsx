import React, { useState, useEffect, useCallback } from 'react';
import { Resources } from '@ocentra/asset-domain/resources/Resources';
import type { CarouselSlide } from '@ocentra/game-asset-domain/content/imageCarousel/ImageCarousel';
import './ImageCarouselPreview.css';

interface ImageCarouselPreviewProps {
  slides: CarouselSlide[];
  autoplayIntervalMs: number;
  assetId: string;
}

export const ImageCarouselPreview: React.FC<ImageCarouselPreviewProps> = ({ slides, autoplayIntervalMs }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const loadUrls = async () => {
      const urlMap = new Map<number, string>();
      await Promise.all(slides.map(async (slide, index) => {
        try {
          const url = await Resources.getUrl(slide.imageHash);
          if (url) {
            urlMap.set(index, url);
          }
        } catch {
          // Don't set empty string - skip this slide
        }
      }));
      setImageUrls(urlMap);
    };
    if (slides.length > 0) {
      loadUrls();
    }
  }, [slides]);

  const handleNext = useCallback(() => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setDirection('right');
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 600);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;
    const interval = setInterval(() => {
      handleNext();
    }, autoplayIntervalMs || 5000);
    return () => clearInterval(interval);
  }, [slides.length, autoplayIntervalMs, handleNext]);

  const handlePrev = () => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setDirection('left');
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const handleIndicatorClick = (index: number) => {
    if (index === currentSlide) return;
    setIsTransitioning(true);
    setDirection(index > currentSlide ? 'right' : 'left');
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="preview-panel">
        <div className="preview-panel__content preview-panel__content--image-carousel">
          <div className="preview-panel__placeholder">No slides available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel">
      <div className="preview-panel__content preview-panel__content--image-carousel">
        <div className="image-carousel-preview">
          {slides.length > 1 && (
            <>
              <button
                className="image-carousel-preview__nav-button image-carousel-preview__nav-button--prev"
                onClick={handlePrev}
                aria-label="Previous slide"
              >
                ◀
              </button>
              <button
                className="image-carousel-preview__nav-button image-carousel-preview__nav-button--next"
                onClick={handleNext}
                aria-label="Next slide"
              >
                ▶
              </button>
            </>
          )}

          <div className="image-carousel-preview__container">
            <div className="image-carousel-preview__wrapper">
              {slides.map((slide, index) => {
                const slideImageUrl = imageUrls.get(index);
                if (!slideImageUrl) return null;
                const isActive = index === currentSlide;
                const wasActive = index === (currentSlide === 0 ? slides.length - 1 : currentSlide - 1);
                const isEntering = isTransitioning && isActive;
                const isExiting = isTransitioning && wasActive && !isActive;

                return (
                  <div
                    key={index}
                    className={`image-carousel-preview__slide ${isActive ? 'active' : ''} ${isExiting ? `exiting-${direction}` : ''} ${isEntering ? `entering-${direction}` : ''}`}
                  >
                    <div className="image-carousel-preview__slide-image-container">
                      <img
                        src={slideImageUrl}
                        alt={slide.alt || slide.heading || slide.id}
                        className="image-carousel-preview__slide-image"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    {(slide.heading || slide.subheading || slide.action?.label) && (
                      <div className="image-carousel-preview__slide-content">
                        {slide.heading && (
                          <h2 className="image-carousel-preview__slide-heading">{slide.heading}</h2>
                        )}
                        {slide.subheading && (
                          <h3 className="image-carousel-preview__slide-subheading">{slide.subheading}</h3>
                        )}
                        {slide.action?.label && (
                          <a
                            href={slide.action.href || '#'}
                            className="image-carousel-preview__slide-action"
                            onClick={(e) => e.preventDefault()}
                          >
                            {slide.action.label}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {slides.length > 1 && (
              <div className="image-carousel-preview__controls">
                <div className="image-carousel-preview__indicators">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      className={`image-carousel-preview__indicator ${index === currentSlide ? 'active' : ''}`}
                      onClick={() => handleIndicatorClick(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

