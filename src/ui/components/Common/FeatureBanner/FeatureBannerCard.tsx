import { lazy, Suspense, useMemo } from 'react';
import './FeatureBannerCard.css';

const RUBIK_DISABLED = false;

const RubikBannerCube = RUBIK_DISABLED
  ? null
  : lazy(() => import('./RubikBannerCube').then((m) => ({ default: m.RubikBannerCube })));

export interface FeatureBannerItem {
  title: string;
  description: string;
  image?: string;
}

export interface FeatureBannerCardProps {
  items: FeatureBannerItem[];
  currentIndex: number;
  onIdleComplete?: () => void;
}

export function FeatureBannerCard({ items, currentIndex, onIdleComplete }: FeatureBannerCardProps) {
  const currentItem = items[currentIndex] ?? items[0];
  const { imageSources, targetIndex } = useMemo(() => {
    const withImages = items
      .map((item, i) => ({ image: item.image, originalIndex: i }))
      .filter((x): x is { image: string; originalIndex: number } => Boolean(x.image));
    const sources = withImages.map((x) => x.image);
    const idx = withImages.findIndex((x) => x.originalIndex === currentIndex);
    return {
      imageSources: sources,
      targetIndex: idx >= 0 ? idx : 0,
    };
  }, [items, currentIndex]);

  return (
    <div className="feature-banner-card">
      <div className="feature-banner-cube-wrap">
        {RUBIK_DISABLED ? (
          currentItem?.image && (
            <img src={currentItem.image} alt="" className="rubik-banner-cube-fallback-image" />
          )
        ) : (
          imageSources.length > 0 &&
          RubikBannerCube && (
            <Suspense fallback={null}>
              <RubikBannerCube
                images={imageSources}
                targetIndex={targetIndex}
                onIdleComplete={onIdleComplete}
              />
            </Suspense>
          )
        )}
      </div>
      <div className="feature-banner-text">
        <h3 className="feature-banner-title">{currentItem.title}</h3>
        <p className="feature-banner-description">{currentItem.description}</p>
      </div>
    </div>
  );
}
