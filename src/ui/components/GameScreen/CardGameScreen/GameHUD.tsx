import { forwardRef, type ReactNode } from "react";
import "./GameHUD.css";

interface GameHUDProps {
  children?: ReactNode;
}

const GameHUD = forwardRef<HTMLDivElement, GameHUDProps>(({ children }, ref) => {
  return (
    <div className="hud" role="presentation">
      <div className="hud__wing hud__wing--left" />
      <div className="hud__center" ref={ref}>
        <div className="hud__center-mask" />
      </div>
      <div className="hud__wing hud__wing--right" />
      {children ? <div className="hud__overlay">{children}</div> : null}
    </div>
  );
});

GameHUD.displayName = "GameHUD";

export default GameHUD;
