import { forwardRef, type ReactNode, useRef } from "react";
import HudArtwork from "./HudArtwork";
import { type HudArtworkControls } from "./HudArtwork.types";
import "./GameHUD.css";
import { IsolationComponentType } from "@ocentra/game-layout-domain/isolation-types";

interface GameHUDProps {
  children?: ReactNode;
  controls: HudArtworkControls;
  showButtonGuides?: boolean;
  showDebugFrame?: boolean;
  showDomeBounds?: boolean;
  showWingBounds?: boolean;
  showBankBounds?: boolean;
  showArtwork?: boolean;
  onButtonClick?: (index: number, label: string) => void;
  onIsolate?: (type: IsolationComponentType, label: string, config: unknown) => void;
}

const GameHUD = forwardRef<HTMLDivElement, GameHUDProps>(({ 
  children, 
  controls, 
  showButtonGuides = false, 
  showDebugFrame = false,
  showDomeBounds = false,
  showWingBounds = false,
  showBankBounds = false,
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
        position: 'relative',
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
          showDebugFrame={showDebugFrame}
          showDomeBounds={showDomeBounds}
          showWingBounds={showWingBounds}
          showBankBounds={showBankBounds}
          onButtonClick={onButtonClick}
          onIsolate={onIsolate}
        />
      ) : (
        <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      )}
      {children ? <div className="hud__overlay" style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>{children}</div> : null}
    </div>
  );
});

GameHUD.displayName = "GameHUD";

export default GameHUD;
