import React, { useLayoutEffect, useRef, useState } from 'react';
import GameBackground from './scene/GameBackground';
import { CardGameTemplatePage, type CardGameTemplatePageProps } from './CardGameTemplatePage';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

export interface CardGameViewportScalerProps extends CardGameTemplatePageProps {
  className?: string;
}

export const CardGameViewportScaler: React.FC<CardGameViewportScalerProps> = ({
  className,
  ...pageProps
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setScale(Math.min(width / BASE_WIDTH, height / BASE_HEIGHT));
      }
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(host);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const floatScale = pageProps.document?.cardVisuals?.floatScale ?? 1;
  const showHostBackground = pageProps.document?.hud.layerVisibility?.background !== false;

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* Background renders at host level — fills the entire container including letterbox strips */}
      {showHostBackground ? <GameBackground floatScale={floatScale} position="absolute" /> : null}

      {/* Scaled 1920×1080 game canvas — background suppressed here since host covers it */}
      <div
        style={{
          position: 'absolute',
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          left: '50%',
          top: '50%',
          transformOrigin: 'center center',
          transform: `translate(-50%, -50%) scale(${scale})`,
          zIndex: 1,
        }}
      >
        <CardGameTemplatePage {...pageProps} embedded showBackground={false} scaleFactor={scale} />
      </div>
    </div>
  );
};

export default CardGameViewportScaler;
