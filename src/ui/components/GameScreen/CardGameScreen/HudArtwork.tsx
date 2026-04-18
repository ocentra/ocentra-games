import { forwardRef, useId, type CSSProperties } from "react";
import HudButton from "./HudButton";
import {
  type ClampConfig,
  type HudActionKey,
  type HudArtworkControls,
  type WingConfig,
} from "./HudArtwork.types";
import "./HudArtwork.css";

const SHOW_HUD_DEBUG_GUIDES = false;

interface HudArtworkProps {
  controls: HudArtworkControls;
  fitWidth: number;
  fitHeight: number;
}

function leftWingPath(x: number, y: number, width: number, height: number, topRadius: number) {
  const x2 = x + width;
  const y2 = y + height;

  return `M ${x} ${y2}
          L ${x} ${y + topRadius}
          Q ${x} ${y} ${x + topRadius} ${y}
          L ${x2} ${y}
          L ${x2} ${y2}
          Z`;
}

function rightWingPath(x: number, y: number, width: number, height: number, topRadius: number) {
  const x2 = x + width;
  const y2 = y + height;

  return `M ${x} ${y2}
          L ${x} ${y}
          L ${x2 - topRadius} ${y}
          Q ${x2} ${y} ${x2} ${y + topRadius}
          L ${x2} ${y2}
          Z`;
}

function leftWingGlassPath(x: number, y: number, width: number, height: number, topRadius: number, inset = 2) {
  const ix = x + inset;
  const iy = y + inset;
  const iw = width - inset * 2;
  const ih = height - inset * 2;
  const ir = Math.max(0, topRadius - inset);
  const x2 = ix + iw;
  const y2 = iy + ih;

  return `M ${ix} ${y2}
          L ${ix} ${iy + ir}
          Q ${ix} ${iy} ${ix + ir} ${iy}
          L ${x2} ${iy}
          L ${x2} ${y2}
          Z`;
}

function rightWingGlassPath(x: number, y: number, width: number, height: number, topRadius: number, inset = 2) {
  const ix = x + inset;
  const iy = y + inset;
  const iw = width - inset * 2;
  const ih = height - inset * 2;
  const ir = Math.max(0, topRadius - inset);
  const x2 = ix + iw;
  const y2 = iy + ih;

  return `M ${ix} ${y2}
          L ${ix} ${iy}
          L ${x2 - ir} ${iy}
          Q ${x2} ${iy} ${x2} ${iy + ir}
          L ${x2} ${y2}
          Z`;
}

function leftClampPath(wing: WingConfig, clamp: ClampConfig) {
  const x = wing.x;
  const y2 = wing.y + wing.height;
  const y = y2 - clamp.height;
  const x1 = x;
  const x2 = x + clamp.width;
  const rr = Math.min(clamp.rightRadius, clamp.width, clamp.height / 2);

  return `M ${x1} ${y}
          L ${x1} ${y2}
          L ${x2 - rr} ${y2}
          Q ${x2} ${y2} ${x2} ${y2 - rr}
          L ${x2} ${y + rr}
          Q ${x2} ${y} ${x2 - rr} ${y}
          Z`;
}

function rightClampPath(wing: WingConfig, clamp: ClampConfig) {
  const x2 = wing.x + wing.width;
  const y2 = wing.y + wing.height;
  const y = y2 - clamp.height;
  const x1 = x2 - clamp.width;
  const rr = Math.min(clamp.rightRadius, clamp.width, clamp.height / 2);

  return `M ${x2} ${y}
          L ${x2} ${y2}
          L ${x1 + rr} ${y2}
          Q ${x1} ${y2} ${x1} ${y2 - rr}
          L ${x1} ${y + rr}
          Q ${x1} ${y} ${x1 + rr} ${y}
          Z`;
}

function domeClipRect(width: number, cy: number) {
  return { x: 0, y: 0, width, height: cy };
}

const HudArtwork = forwardRef<HTMLDivElement, HudArtworkProps>(({ controls, fitWidth, fitHeight }, ref) => {
  const uid = useId().replace(/:/g, "");
  const wingGlowId = `${uid}-wingGlow`;
  const domeGlowId = `${uid}-domeGlow`;
  const domeClipId = `${uid}-domeClip`;
  const leftClampClipId = `${uid}-leftClampClip`;
  const rightClampClipId = `${uid}-rightClampClip`;

  const {
    width,
    height,
    buttonScale,
    buttonCount,
    buttonLabels,
    leftWing,
    rightWing,
    clamp,
    wingStyle,
    dome,
    panelTop,
    panelMid,
    panelBottom,
    panelGlassOpacity,
  } = controls;

  const leftWingShape = leftWingPath(leftWing.x, leftWing.y, leftWing.width, leftWing.height, leftWing.topRadius);
  const rightWingShape = rightWingPath(rightWing.x, rightWing.y, rightWing.width, rightWing.height, rightWing.topRadius);
  const leftWingGlass = leftWingGlassPath(leftWing.x, leftWing.y, leftWing.width, leftWing.height, leftWing.topRadius, 2);
  const rightWingGlass = rightWingGlassPath(rightWing.x, rightWing.y, rightWing.width, rightWing.height, rightWing.topRadius, 2);
  const leftClamp = leftClampPath(leftWing, clamp);
  const rightClamp = rightClampPath(rightWing, clamp);
  const domeClip = domeClipRect(width, dome.cy);
  const activeButtonCount = Math.max(1, Math.min(6, Math.round(buttonCount)));
  const activeButtonScale = Math.max(0.5, buttonScale);
  const buttonWidth = Math.max(48, Math.min(Math.round(fitWidth * 0.082 * activeButtonScale), 110));
  const buttonHeight = Math.round(buttonWidth * 0.28);
  const buttonCenterY = ((leftWing.y + leftWing.height * 0.5) / height) * fitHeight;

  const buttonsBase: Array<{ slot: HudActionKey; left: number; top: number }> = [
    { slot: "A", left: ((leftWing.x + leftWing.width * 0.14) / width) * fitWidth, top: buttonCenterY },
    { slot: "B", left: ((leftWing.x + leftWing.width * 0.46) / width) * fitWidth, top: buttonCenterY },
    { slot: "C", left: ((leftWing.x + leftWing.width * 0.78) / width) * fitWidth, top: buttonCenterY },
    { slot: "D", left: ((rightWing.x + rightWing.width * 0.22) / width) * fitWidth, top: buttonCenterY },
    { slot: "E", left: ((rightWing.x + rightWing.width * 0.54) / width) * fitWidth, top: buttonCenterY },
    { slot: "F", left: ((rightWing.x + rightWing.width * 0.86) / width) * fitWidth, top: buttonCenterY },
  ];

  const buttons = buttonsBase
    .slice(0, activeButtonCount)
    .map((button, index) => ({
      ...button,
      label: buttonLabels[index] ?? button.slot,
    }));

  const artworkStyle: CSSProperties = {
    ['--hud-offset-x' as string]: `${controls.hudOffsetX}px`,
    ['--hud-offset-y' as string]: `${controls.hudOffsetY}px`,
    ['--hud-fit-width' as string]: `${fitWidth}px`,
    ['--hud-fit-height' as string]: `${fitHeight}px`,
    ['--hud-overall-scale' as string]: String(controls.overallScale),
  };

  const anchorStyle: CSSProperties = {
    left: `${((dome.cx - dome.radius) / width) * 100}%`,
    top: `${((dome.cy - dome.radius) / height) * 100}%`,
    width: `${((dome.radius * 2) / width) * 100}%`,
    height: `${((dome.radius * 2) / height) * 100}%`,
  };

  return (
    <div className="hud-artwork" aria-hidden="true" style={artworkStyle}>
      {SHOW_HUD_DEBUG_GUIDES ? <div className="hud-artwork__debug-frame" aria-hidden="true" /> : null}
      {SHOW_HUD_DEBUG_GUIDES ? (
        <div className="hud-artwork__debug-label" aria-hidden="true">
          {fitWidth} x {fitHeight}
        </div>
      ) : null}
      <svg
        className="hud-artwork__svg"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${uid}-panelFill`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={panelTop} />
            <stop offset="45%" stopColor={panelMid} />
            <stop offset="100%" stopColor={panelBottom} />
          </linearGradient>

          <linearGradient id={`${uid}-glassOverlay`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={panelGlassOpacity} />
            <stop offset="40%" stopColor="#ffffff" stopOpacity={panelGlassOpacity * 0.25} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`${uid}-goldFill`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={clamp.goldTop} />
            <stop offset="45%" stopColor={clamp.goldMid} />
            <stop offset="100%" stopColor={clamp.goldBottom} />
          </linearGradient>

          <linearGradient id={`${uid}-goldSheen`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff8d2" stopOpacity="0.24" />
            <stop offset="28%" stopColor="#fff0a8" stopOpacity="0.10" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          <radialGradient id={`${uid}-domeFill`} cx="50%" cy="28%" r="74%">
            <stop offset="0%" stopColor="#14251a" />
            <stop offset="34%" stopColor="#0b1a11" />
            <stop offset="68%" stopColor="#050b07" />
            <stop offset="100%" stopColor="#010202" />
          </radialGradient>

          <radialGradient id={`${uid}-domeSheen`} cx="50%" cy="12%" r="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="22%" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.01" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <filter id={wingGlowId} x="-30%" y="-40%" width="160%" height="200%">
            <feGaussianBlur stdDeviation={wingStyle.glowWidth / 2} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={domeGlowId} x="-35%" y="-35%" width="170%" height="180%">
            <feGaussianBlur stdDeviation={dome.glowWidth / 2} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id={domeClipId}>
            <rect x={domeClip.x} y={domeClip.y} width={domeClip.width} height={domeClip.height} />
          </clipPath>

          <clipPath id={leftClampClipId}>
            <path d={leftClamp} />
          </clipPath>

          <clipPath id={rightClampClipId}>
            <path d={rightClamp} />
          </clipPath>
        </defs>

        {SHOW_HUD_DEBUG_GUIDES ? (
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="none"
            stroke="#00ff66"
            strokeWidth="1"
            strokeDasharray="10 8"
            opacity="0.8"
          />
        ) : null}

        <g id="LeftWing">
          <g filter={`url(#${wingGlowId})`} opacity={wingStyle.glowOpacity}>
            <path
              d={leftWingShape}
              fill="none"
              stroke={wingStyle.glowColor}
              strokeWidth={wingStyle.glowWidth}
              strokeLinejoin="round"
            />
            <path
              d={leftClamp}
              fill="none"
              stroke={wingStyle.glowColor}
              strokeWidth={wingStyle.glowWidth}
              strokeLinejoin="round"
            />
          </g>

          <path d={leftWingShape} fill={`url(#${uid}-panelFill)`} />
          <path d={leftWingGlass} fill={`url(#${uid}-glassOverlay)`} />

          <path d={leftClamp} fill={`url(#${uid}-goldFill)`} />
          <g clipPath={`url(#${leftClampClipId})`}>
            <rect
              x={leftWing.x}
              y={leftWing.y + leftWing.height - clamp.height}
              width={clamp.width}
              height={clamp.height}
              fill={`url(#${uid}-goldSheen)`}
            />
          </g>

          <path
            d={leftWingShape}
            fill="none"
            stroke={wingStyle.edgeColor}
            strokeWidth={wingStyle.edgeWidth}
            strokeLinejoin="round"
          />
          <path
            d={leftClamp}
            fill="none"
            stroke={wingStyle.edgeColor}
            strokeWidth={wingStyle.edgeWidth}
            strokeLinejoin="round"
          />
        </g>

        <g id="RightWing">
          <g filter={`url(#${wingGlowId})`} opacity={wingStyle.glowOpacity}>
            <path
              d={rightWingShape}
              fill="none"
              stroke={wingStyle.glowColor}
              strokeWidth={wingStyle.glowWidth}
              strokeLinejoin="round"
            />
            <path
              d={rightClamp}
              fill="none"
              stroke={wingStyle.glowColor}
              strokeWidth={wingStyle.glowWidth}
              strokeLinejoin="round"
            />
          </g>

          <path d={rightWingShape} fill={`url(#${uid}-panelFill)`} />
          <path d={rightWingGlass} fill={`url(#${uid}-glassOverlay)`} />

          <path d={rightClamp} fill={`url(#${uid}-goldFill)`} />
          <g clipPath={`url(#${rightClampClipId})`}>
            <rect
              x={rightWing.x + rightWing.width - clamp.width}
              y={rightWing.y + rightWing.height - clamp.height}
              width={clamp.width}
              height={clamp.height}
              fill={`url(#${uid}-goldSheen)`}
            />
          </g>

          <path
            d={rightWingShape}
            fill="none"
            stroke={wingStyle.edgeColor}
            strokeWidth={wingStyle.edgeWidth}
            strokeLinejoin="round"
          />
          <path
            d={rightClamp}
            fill="none"
            stroke={wingStyle.edgeColor}
            strokeWidth={wingStyle.edgeWidth}
            strokeLinejoin="round"
          />
        </g>

        <g id="CenterDome">
          <circle
            cx={dome.cx}
            cy={dome.cy}
            r={dome.radius}
            fill="none"
            stroke={dome.glowColor}
            strokeWidth={dome.glowWidth}
            opacity={dome.glowOpacity}
            filter={`url(#${domeGlowId})`}
            clipPath={`url(#${domeClipId})`}
          />

          <circle
            cx={dome.cx}
            cy={dome.cy}
            r={dome.radius}
            fill={`url(#${uid}-domeFill)`}
            clipPath={`url(#${domeClipId})`}
          />

          <circle
            cx={dome.cx}
            cy={dome.cy}
            r={Math.max(0, dome.radius - 8)}
            fill={`url(#${uid}-domeSheen)`}
            clipPath={`url(#${domeClipId})`}
          />

          <circle
            cx={dome.cx}
            cy={dome.cy}
            r={dome.radius}
            fill="none"
            stroke={dome.edgeColor}
            strokeWidth={dome.edgeWidth}
            clipPath={`url(#${domeClipId})`}
          />

          <circle
            cx={dome.cx}
            cy={dome.cy}
            r={Math.max(0, dome.radius - 8)}
            fill="none"
            stroke={dome.edgeInnerColor}
            strokeWidth={Math.max(1, dome.edgeWidth / 2)}
            opacity="0.85"
            clipPath={`url(#${domeClipId})`}
          />
        </g>
      </svg>

          <div className="hud-artwork__button-layer" aria-hidden="false">
        {buttons.map((button) => (
          <HudButton
            key={button.slot}
            label={button.label}
            className="hud-artwork__action-button"
            width={500 * activeButtonScale}
            height={140 * activeButtonScale}
            radius={58 * activeButtonScale}
            fontSize={34 * activeButtonScale}
            style={{
              position: "absolute",
              left: `${button.left}px`,
              top: `${button.top}px`,
              width: `${buttonWidth}px`,
              height: `${buttonHeight}px`,
            }}
            onClick={() => undefined}
          />
        ))}
      </div>

      <div ref={ref} className="hud-artwork__anchor" style={anchorStyle} />
    </div>
  );
});

HudArtwork.displayName = "HudArtwork";

export default HudArtwork;
