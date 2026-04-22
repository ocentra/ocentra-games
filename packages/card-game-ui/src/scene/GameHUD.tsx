import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import HudArtwork from "./HudArtwork";
import { type HudArtworkControls } from "./HudArtwork.types";
import "./GameHUD.css";

interface GameHUDProps {
  children?: ReactNode;
  controls: HudArtworkControls;
  showButtonGuides?: boolean;
  scaleFactor?: number;
  showArtwork?: boolean;
  onButtonClick?: (index: number, label: string) => void;
}

const GameHUD = forwardRef<HTMLDivElement, GameHUDProps>(({ children, controls, showButtonGuides = false, scaleFactor = 1, showArtwork = true, onButtonClick }, ref) => {
  const hudHostRef = useRef<HTMLDivElement | null>(null);
  const [fitSize, setFitSize] = useState({ width: controls.width, height: controls.height });

  useLayoutEffect(() => {
    const measure = () => {
      const host = hudHostRef.current;
      if (!host) {
        return;
      }

      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const unscaledWidth = rect.width / scaleFactor;
      const unscaledHeight = rect.height / scaleFactor;

      const availableWidth = unscaledWidth * 0.98;
      const availableHeight = unscaledHeight * 0.94;
      const overallScale = Math.max(0.1, controls.overallScale);
      const scale = Math.min(availableWidth / controls.width, availableHeight / controls.height) / overallScale;

      setFitSize({
        width: Math.max(1, Math.round(controls.width * scale)),
        height: Math.max(1, Math.round(controls.height * scale)),
      });
    };

    measure();

    const host = hudHostRef.current;
    if (!host || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(host);

    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [controls.height, controls.overallScale, controls.width, scaleFactor]);

  return (
    <div className="hud" role="presentation" ref={hudHostRef}>
      {showArtwork ? (
        <HudArtwork
          ref={ref}
          controls={controls}
          fitWidth={fitSize.width}
          fitHeight={fitSize.height}
          showButtonGuides={showButtonGuides}
          onButtonClick={onButtonClick}
        />
      ) : (
        <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      )}
      {children ? <div className="hud__overlay">{children}</div> : null}
    </div>
  );
});

GameHUD.displayName = "GameHUD";

export default GameHUD;
