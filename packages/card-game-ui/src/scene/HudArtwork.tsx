import { forwardRef, useId, type CSSProperties } from "react";
import HudButton from "./HudButton";
import {
  type ClampConfig,
  type HudArtworkControls,
  type HudButtonControls,
  type HudButtonVariantControls,
  type WingConfig,
} from "./HudArtwork.types";
import "./HudArtwork.css";
import { IsolationComponentType } from "@ocentra/game-layout-domain/isolation-types";
import { createHudButtonBankLayout } from "./hudButtonBankLayout";


export interface HudArtworkProps {
  controls: HudArtworkControls;
  fitWidth: number;
  fitHeight: number;
  showButtonGuides?: boolean;
  showDebugFrame?: boolean;
  showDomeBounds?: boolean;
  showWingBounds?: boolean;
  showBankBounds?: boolean;
  onButtonClick?: (index: number, label: string) => void;
  onIsolate?: (type: IsolationComponentType, label: string, config: unknown) => void;
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

function domeClipRect(width: number, height: number) {
  return { x: 0, y: 0, width, height };
}

const HudArtwork = forwardRef<HTMLDivElement, HudArtworkProps>(({ controls, fitWidth, fitHeight, showButtonGuides = false, showDebugFrame = false, showDomeBounds = false, showWingBounds = false, showBankBounds = false, onButtonClick, onIsolate }, ref) => {
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
    button,
    buttonVariants,
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
  const domeClip = domeClipRect(width, height);

  const domeLeft = dome.cx - dome.width / 2;
  const domeRight = dome.cx + dome.width / 2;
  const domeTop = dome.cy - dome.height / 2;

  const leftAvailableLeft = ((leftWing.x + clamp.width) / width) * fitWidth;
  const leftAvailableRight = (domeLeft / width) * fitWidth;
  const leftAvailableWidth = Math.max(0, leftAvailableRight - leftAvailableLeft);
  
  const rightAvailableLeft = (domeRight / width) * fitWidth;
  const rightAvailableRight = ((rightWing.x + rightWing.width - clamp.width) / width) * fitWidth;
  const rightAvailableWidth = Math.max(0, rightAvailableRight - rightAvailableLeft);

  const leftBankTop = (leftWing.y / height) * fitHeight;
  const leftBankHeight = (leftWing.height / height) * fitHeight;
  const rightBankTop = (rightWing.y / height) * fitHeight;
  const rightBankHeight = (rightWing.height / height) * fitHeight;
  const visibleButtonCount = Math.max(1, Math.min(6, Math.round(buttonCount)));
  const visibleButtonLabels = Array.from({ length: visibleButtonCount }, (_, i) => buttonLabels[i] || "");
  const leftButtonCount = Math.min(3, Math.ceil(visibleButtonCount / 2));
  const rightButtonCount = Math.max(0, visibleButtonCount - leftButtonCount);
  const leftButtonLabels = visibleButtonLabels.slice(0, leftButtonCount);
  const rightButtonLabels = visibleButtonLabels.slice(leftButtonCount, leftButtonCount + rightButtonCount);

  const resolveButtonConfig = (index: number): HudButtonControls => {
    const variant: HudButtonVariantControls = buttonVariants[index] ?? { linked: true, overrides: {} };
    if (variant.linked) {
      return button;
    }

    return {
      ...button,
      ...variant.overrides,
    };
  };
  const leftBankLayout = createHudButtonBankLayout({
    buttons: leftButtonLabels.map((label, index) => ({
      index,
      label: label || `A${index + 1}`,
      config: resolveButtonConfig(index),
    })),
    hostLeft: leftAvailableLeft,
    hostTop: leftBankTop,
    hostWidth: leftAvailableWidth,
    hostHeight: leftBankHeight,
    align: 'start',
    buttonScale,
    bankControls: controls.buttonBank,
    offsetX: controls.buttonBank.leftOffsetX,
    offsetY: controls.buttonBank.leftOffsetY,
  });
  const rightBankLayout = createHudButtonBankLayout({
    buttons: rightButtonLabels.map((label, index) => {
      const resolvedIndex = leftButtonLabels.length + index;
      return {
        index: resolvedIndex,
        label: label || `B${index + 1}`,
        config: resolveButtonConfig(resolvedIndex),
      };
    }),
    hostLeft: rightAvailableLeft,
    hostTop: rightBankTop,
    hostWidth: rightAvailableWidth,
    hostHeight: rightBankHeight,
    align: 'end',
    buttonScale,
    bankControls: controls.buttonBank,
    offsetX: controls.buttonBank.rightOffsetX,
    offsetY: controls.buttonBank.rightOffsetY,
  });
  const leftBankHostStyle: CSSProperties = {
    left: `${leftAvailableLeft}px`,
    top: `${leftBankTop}px`,
    width: `${leftAvailableWidth}px`,
    height: `${leftBankHeight}px`,
  };
  const rightBankHostStyle: CSSProperties = {
    left: `${rightAvailableLeft}px`,
    top: `${rightBankTop}px`,
    width: `${rightAvailableWidth}px`,
    height: `${rightBankHeight}px`,
  };

  const artworkStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    width: `${fitWidth}px`,
    height: `${fitHeight}px`,
    transform: `translate(calc(-50% + ${controls.hudOffsetX}px), ${controls.hudOffsetY}px) scale(${controls.overallScale})`,
    transformOrigin: 'center bottom',
    pointerEvents: 'none',
    overflow: 'visible',
    ['--hud-offset-x' as string]: `${controls.hudOffsetX}px`,
    ['--hud-offset-y' as string]: `${controls.hudOffsetY}px`,
    ['--hud-fit-width' as string]: `${fitWidth}px`,
    ['--hud-fit-height' as string]: `${fitHeight}px`,
    ['--hud-overall-scale' as string]: String(controls.overallScale),
  };

  const anchorStyle: CSSProperties = {
    left: `${(domeLeft / width) * 100}%`,
    top: `${(domeTop / height) * 100}%`,
    width: `${(dome.width / width) * 100}%`,
    height: `${(dome.height / height) * 100}%`,
  };

  return (
    <div className="hud-artwork" data-button-debug={showButtonGuides ? "true" : "false"} style={artworkStyle}>
      {showDebugFrame ? <div className="hud-artwork__debug-frame" aria-hidden="true" /> : null}
      {showDebugFrame ? (
        <div className="hud-artwork__debug-label" aria-hidden="true">
          {fitWidth} x {fitHeight}
        </div>
      ) : null}
      <svg
        className="hud-artwork__svg"
        aria-hidden="true"
        onContextMenu={(e) => {
          if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
          if (onIsolate) {
            e.preventDefault();
            e.stopPropagation();
            onIsolate(IsolationComponentType.HudArtwork, 'Main HUD', controls);
          }
        }}
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

        {showDebugFrame ? (
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
        {showWingBounds ? (
          <>
            <path d={leftWingShape} fill="none" stroke="#00ff66" strokeWidth="2" strokeDasharray="10 8" opacity="0.92" />
            <path d={leftClamp} fill="none" stroke="#00ff66" strokeWidth="2" strokeDasharray="10 8" opacity="0.92" />
            <path d={rightWingShape} fill="none" stroke="#00ff66" strokeWidth="2" strokeDasharray="10 8" opacity="0.92" />
            <path d={rightClamp} fill="none" stroke="#00ff66" strokeWidth="2" strokeDasharray="10 8" opacity="0.92" />
          </>
        ) : null}
        {showDomeBounds ? (
          <rect
            x={domeLeft}
            y={domeTop}
            width={dome.width}
            height={dome.height}
            rx={dome.topRadius}
            ry={dome.topRadius}
            fill="none"
            stroke="#00ff66"
            strokeWidth="2"
            strokeDasharray="10 8"
            opacity="0.92"
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
          <rect
            x={domeLeft}
            y={domeTop}
            width={dome.width}
            height={dome.height}
            rx={dome.topRadius}
            ry={dome.topRadius}
            fill="none"
            stroke={dome.glowColor}
            strokeWidth={dome.glowWidth}
            opacity={dome.glowOpacity}
            filter={`url(#${domeGlowId})`}
            clipPath={`url(#${domeClipId})`}
          />

          <rect
            x={domeLeft}
            y={domeTop}
            width={dome.width}
            height={dome.height}
            rx={dome.topRadius}
            ry={dome.topRadius}
            fill={`url(#${uid}-domeFill)`}
            clipPath={`url(#${domeClipId})`}
          />

          <rect
            x={domeLeft}
            y={domeTop}
            width={dome.width}
            height={dome.height}
            rx={dome.topRadius}
            ry={dome.topRadius}
            fill={`url(#${uid}-domeSheen)`}
            clipPath={`url(#${domeClipId})`}
          />

          <rect
            x={domeLeft}
            y={domeTop}
            width={dome.width}
            height={dome.height}
            rx={dome.topRadius}
            ry={dome.topRadius}
            fill="none"
            stroke={dome.edgeColor}
            strokeWidth={dome.edgeWidth}
            clipPath={`url(#${domeClipId})`}
          />

          <rect
            x={domeLeft + 4}
            y={domeTop + 4}
            width={Math.max(0, dome.width - 8)}
            height={Math.max(0, dome.height - 8)}
            rx={Math.max(0, dome.topRadius - 4)}
            ry={Math.max(0, dome.topRadius - 4)}
            fill="none"
            stroke={dome.edgeInnerColor}
            strokeWidth={Math.max(1, dome.edgeWidth / 2)}
            opacity="0.85"
            clipPath={`url(#${domeClipId})`}
          />
        </g>
      </svg>

      {showBankBounds ? (
        <>
          <div className="hud-artwork__button-host" aria-hidden="true" style={leftBankHostStyle}>
            <div className="hud-artwork__button-host-label">A Host</div>
          </div>
          <div className="hud-artwork__button-host" aria-hidden="true" style={rightBankHostStyle}>
            <div className="hud-artwork__button-host-label">B Host</div>
          </div>
        </>
      ) : null}
      {leftBankLayout ? (
        <div
          className="hud-artwork__button-bank hud-artwork__button-bank--left"
          style={{
            left: `${leftBankLayout.left}px`,
            top: `${leftBankLayout.top}px`,
            width: `${leftBankLayout.width}px`,
            height: `${leftBankLayout.height}px`,
            gap: `${leftBankLayout.gap}px`,
            transform: `scale(${leftBankLayout.scale})`,
            transformOrigin: 'top left',
          }}
        >
          {showBankBounds ? <div className="hud-artwork__button-bank-bounds" aria-hidden="true" /> : null}
          {leftBankLayout.items.map(({ index, label, config, left, top, width: itemWidth, height: itemHeight }, slotIndex) => (
            <div
              key={label || `left-slot-${index}`}
              className={`hud-artwork__button-slot ${showBankBounds ? "hud-artwork__button-slot--bounds" : ""}`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${itemWidth}px`,
                height: `${itemHeight}px`,
              }}
            >
              {showBankBounds ? <div className="hud-artwork__button-slot-label">A{slotIndex + 1}</div> : null}
              <HudButton
                label={label}
                className="hud-artwork__action-button"
                {...config}
                showArtGuides={showButtonGuides}
                style={{
                  width: `${itemWidth}px`,
                  height: `${itemHeight}px`,
                }}
                onClick={() => onButtonClick?.(index, label)}
                onIsolate={onIsolate ? () => onIsolate(IsolationComponentType.HudButton, label, config) : undefined}
              />
            </div>
          ))}
        </div>
      ) : null}
      {rightBankLayout ? (
        <div
          className="hud-artwork__button-bank hud-artwork__button-bank--right"
          style={{
            left: `${rightBankLayout.left}px`,
            top: `${rightBankLayout.top}px`,
            width: `${rightBankLayout.width}px`,
            height: `${rightBankLayout.height}px`,
            gap: `${rightBankLayout.gap}px`,
            transform: `scale(${rightBankLayout.scale})`,
            transformOrigin: 'top left',
          }}
        >
          {showBankBounds ? <div className="hud-artwork__button-bank-bounds" aria-hidden="true" /> : null}
          {rightBankLayout.items.map(({ index, label, config, left, top, width: itemWidth, height: itemHeight }, slotIndex) => (
            <div
              key={label || `right-slot-${index}`}
              className={`hud-artwork__button-slot ${showBankBounds ? "hud-artwork__button-slot--bounds" : ""}`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${itemWidth}px`,
                height: `${itemHeight}px`,
              }}
            >
              {showBankBounds ? <div className="hud-artwork__button-slot-label">B{slotIndex + 1}</div> : null}
              <HudButton
                label={label}
                className="hud-artwork__action-button"
                {...config}
                showArtGuides={showButtonGuides}
                style={{
                  width: `${itemWidth}px`,
                  height: `${itemHeight}px`,
                }}
                onClick={() => onButtonClick?.(index, label)}
                onIsolate={onIsolate ? () => onIsolate(IsolationComponentType.HudButton, label, config) : undefined}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div ref={ref} className="hud-artwork__anchor" style={anchorStyle} />
    </div>
  );
});

HudArtwork.displayName = "HudArtwork";

export default HudArtwork;
