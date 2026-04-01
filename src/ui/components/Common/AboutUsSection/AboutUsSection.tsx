import { useCallback, useMemo, useState } from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { FeatureBannerItem as HomepageFeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import { FeatureBannerCard } from '@/ui/components/Common/FeatureBanner/FeatureBannerCard';
import './AboutUsSection.css';

type AboutUsSectionProps = {
  featureBannerItems?: HomepageFeatureBannerItem[];
  resolveImageUrl?: (hash: ImageHash) => string | null;
};

export function AboutUsSection({
  featureBannerItems = [],
  resolveImageUrl,
}: AboutUsSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = useMemo(
    () =>
      featureBannerItems.map((item) => ({
        title: item.title,
        description: item.description,
        image: isImageHash(item.imageHash)
          ? (resolveImageUrl?.(item.imageHash as ImageHash) ?? undefined)
          : undefined,
      })),
    [featureBannerItems, resolveImageUrl]
  );

  const goToSlide = useCallback((newSlide: number) => {
    if (newSlide === currentSlide) return;
    setCurrentSlide(newSlide);
  }, [currentSlide]);

  const handleIdleComplete = useCallback(() => {
    if (slides.length > 1) {
      const nextSlide = (currentSlide + 1) % slides.length;
      goToSlide(nextSlide);
    }
  }, [currentSlide, slides.length, goToSlide]);

  const handleIndicatorClick = (index: number) => {
    goToSlide(index);
  };

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="feature-banner">
      <div className="feature-banner-box">
        <div className="feature-banner-top">
          <FeatureBannerCard
            items={slides}
            currentIndex={currentSlide}
            onIdleComplete={handleIdleComplete}
          />
        </div>
        {slides.length > 1 && (
          <div className="feature-banner-indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`feature-banner-indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => handleIndicatorClick(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
