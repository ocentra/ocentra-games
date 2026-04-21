import React, { useLayoutEffect, useRef, useState } from 'react';
import { CardGameTemplatePage, type CardGameTemplatePageProps } from './CardGameTemplatePage';
import './CardGameTemplateViewport.css';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

export interface CardGameTemplateViewportProps extends CardGameTemplatePageProps {
  className?: string;
}

export const CardGameTemplateViewport: React.FC<CardGameTemplateViewportProps> = ({
  className,
  ...pageProps
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      setScale(Math.min(rect.width / BASE_WIDTH, rect.height / BASE_HEIGHT));
    };

    measure();

    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(host);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div ref={hostRef} className={className ? `card-game-template-viewport ${className}` : 'card-game-template-viewport'}>
      <div className="card-game-template-viewport__stage">
        <div
          className="card-game-template-viewport__canvas"
          style={{
            width: `${BASE_WIDTH}px`,
            height: `${BASE_HEIGHT}px`,
            transform: `scale(${scale})`,
          }}
        >
          <CardGameTemplatePage {...pageProps} embedded />
        </div>
      </div>
    </div>
  );
};

export default CardGameTemplateViewport;
