import { forwardRef } from "react";
import "./GameHUD.css";

const GameHUD = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div className="hud" role="presentation">
      <div className="hud__wing hud__wing--left" />
      <div className="hud__center" ref={ref}>
        <div className="hud__center-mask" />
      </div>
      <div className="hud__wing hud__wing--right" />
    </div>
  );
});

GameHUD.displayName = "GameHUD";

export default GameHUD;
