import { forwardRef, type ReactNode, useRef } from "react";
import HudArtwork from "./HudArtwork";
import { type HudArtworkControls } from "./HudArtwork.types";
import "./GameHUD.css";
import { IsolationComponentType } from "@ocentra/game-layout-domain/isolation-types";

interface GameHUDProps {
  children?: ReactNode;
  controls: HudArtworkControls;
  showButtonGuides?: boolean;
  showArtwork?: boolean;
  onButtonClick?: (index: number, label: string) => void;
  onIsolate?: (type: IsolationComponentType, label: string, config: unknown) => void;
}

/**
 * GameHUD acts as a self-scaling "prefab" unit that contains the HUD artwork
 * and its children (like CardInHand).
 * It automatically fits its width to the parent container.
 */
const GameHUD = forwardRef<HTMLDivElement, GameHUDProps>(({ 
  children, 
  controls, 
  showButtonGuides = false, 
  showArtwork = true, 
  onButtonClick,
  onIsolate
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      className="hud" 
      role="presentation"
      ref={containerRef}
      style={{
        width: controls.width,
        height: controls.height,
        left: '50%',
        bottom: 'var(--hud-bottom-offset, 0)',
        transform: `translate(-50%, 0) scale(var(--game-scale, 1))`,
        transformOrigin: 'center bottom',
        position: 'absolute',
        isolation: 'isolate',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 100
      }}
    >
      {showArtwork ? (
        <HudArtwork
          ref={ref}
          controls={controls}
          fitWidth={controls.width}
          fitHeight={controls.height}
          showButtonGuides={showButtonGuides}
          onButtonClick={onButtonClick}
          onIsolate={onIsolate}
        />
      ) : (
        <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      )}
      {/* Overlay children (like CardInHand) inherit the fitScale */}
      {children ? <div className="hud__overlay" style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>{children}</div> : null}
    </div>
  );
});

GameHUD.displayName = "GameHUD";

export default GameHUD;
