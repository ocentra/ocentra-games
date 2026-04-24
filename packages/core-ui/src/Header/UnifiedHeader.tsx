import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  createUnifiedHeaderConfig,
  type UnifiedHeaderConfig,
  type UnifiedHeaderConfigInput,
  type UnifiedHeaderLayoutConfig,
  type UnifiedHeaderStyleConfig,
  type UnifiedHeaderCenterConfig,
  type UnifiedHeaderLeftConfig,
  type CenterModeAConfig,
  type CenterModeBConfig,
  type HeaderBoxRect,
  type HeaderIconRenderArgs,
  type HeaderIconRenderer,
  type CenterMode
} from './UnifiedHeader.config';

import './header-tokens.css';
import styles from './UnifiedHeader.module.css';

const ENABLE_HEADER_DEBUG_CONTROLS = true;

export function UnifiedHeader({ config: inputConfig }: { config?: UnifiedHeaderConfigInput }) {
  const resolved = createUnifiedHeaderConfig(inputConfig);
  const [config, setConfig] = useState<UnifiedHeaderConfig>(resolved);
  const [showControls, setShowControls] = useState(false);
  const [activeTab, setActiveTab] = useState<'layout' | 'wings' | 'style' | 'sections'>('layout');

  const { layout, style, left, center, right } = config;
  const initialViewWidth = 1000;
  const svgHeight = 80;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [renderedSize, setRenderedSize] = useState({ width: initialViewWidth, height: svgHeight });

  const scaleY = renderedSize.height / svgHeight;
  const viewWidth = Math.max(layout.minViewWidth, renderedSize.width / Math.max(0.0001, scaleY));
  const scaleX = renderedSize.width / viewWidth;
  const aspectCorrection = scaleX > 0 ? scaleY / scaleX : 1;
  const leftBoxCollapsed = renderedSize.width < layout.leftCollapseWidth;
  const rightBoxCollapsed = renderedSize.width < layout.rightCollapseWidth;

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof window === 'undefined') return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setRenderedSize({ width: rect.width || initialViewWidth, height: rect.height || svgHeight });
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const boxY = 12;
  const boxHeight = 56;
  const leftBoxWidth = leftBoxCollapsed ? layout.leftCollapsedWidth : layout.leftExpandedWidth;
  const rightBoxWidth = rightBoxCollapsed ? layout.rightCollapsedWidth : layout.rightWidth;

  const leftBox: HeaderBoxRect = { x: layout.outerMargin, y: boxY, w: leftBoxWidth, h: boxHeight };
  const rightBox: HeaderBoxRect = { x: viewWidth - layout.outerMargin - rightBoxWidth, y: boxY, w: rightBoxWidth, h: boxHeight };

  const centerX = viewWidth / 2;
  const maxCenterWidthFromLeft = Math.max(layout.centerMinWidth, 2 * (centerX - (leftBox.x + leftBox.w + layout.boxGap)));
  const maxCenterWidthFromRight = Math.max(layout.centerMinWidth, 2 * ((rightBox.x - layout.boxGap) - centerX));
  const responsiveCenterWidth = Math.max(
    layout.centerMinWidth,
    Math.min(layout.centerWidth, maxCenterWidthFromLeft, maxCenterWidthFromRight),
  );
  const centerBox: HeaderBoxRect = { x: centerX - responsiveCenterWidth / 2, y: boxY, w: responsiveCenterWidth, h: boxHeight };

  const leftWing = {
    x1: leftBox.x + leftBox.w - layout.wingUnderlap,
    x2: centerBox.x + layout.wingUnderlap,
    y: layout.wingY,
    h: layout.wingHeight,
  };

  const rightWing = {
    x1: centerBox.x + centerBox.w - layout.wingUnderlap,
    x2: rightBox.x + layout.wingUnderlap,
    y: layout.wingY,
    h: layout.wingHeight,
  };

  const updateLayout = (patch: Partial<UnifiedHeaderLayoutConfig>) =>
    setConfig((current) => ({ ...current, layout: { ...current.layout, ...patch } }));

  const updateStyle = (patch: Partial<UnifiedHeaderStyleConfig>) =>
    setConfig((current) => ({ ...current, style: { ...current.style, ...patch } }));

  const updateLeft = (patch: Partial<UnifiedHeaderLeftConfig>) =>
    setConfig((current) => ({ ...current, left: { ...current.left, ...patch } }));

  const updateCenter = (patch: Partial<UnifiedHeaderCenterConfig>) =>
    setConfig((current) => ({ ...current, center: { ...current.center, ...patch } }));

  const updateCenterA = (patch: Partial<CenterModeAConfig>) =>
    setConfig((current) => ({
      ...current,
      center: {
        ...current.center,
        modeA: { ...current.center.modeA, ...patch },
      },
    }));

  const updateCenterB = (patch: Partial<CenterModeBConfig>) =>
    setConfig((current) => ({
      ...current,
      center: {
        ...current.center,
        modeB: { ...current.center.modeB, ...patch },
      },
    }));

  const renderDebugPanel = () => (
    <div className={styles.debugPanel}>
      <div className={styles.debugPanelHeader}>Live Header Tuning</div>
      
      <div className={styles.debugTabs}>
        {(['layout', 'wings', 'style', 'sections'] as const).map(tab => (
          <button 
            key={tab} 
            className={`${styles.debugTabButton} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <button 
          className={styles.debugTabButton} 
          style={{ marginLeft: 'auto', backgroundColor: 'rgba(52, 211, 153, 0.2)', color: '#a7f3d0' }}
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(config, null, 2));
            alert("Config copied to clipboard!");
          }}
        >
          Copy Config
        </button>
      </div>

      <div className={styles.debugScrollArea}>
        {activeTab === 'layout' && (
          <>
            <Control label="Width %" value={config.layout.widthPercent} min={35} max={100} step={1} onChange={(v) => updateLayout({ widthPercent: v })} />
            <Control label="Min height" value={config.layout.minHeightPx} min={36} max={120} step={1} onChange={(v) => updateLayout({ minHeightPx: v })} />
            <Control label="Pref height (vw)" value={config.layout.preferredHeightVw} min={4} max={18} step={0.25} onChange={(v) => updateLayout({ preferredHeightVw: v })} />
            <Control label="Max height" value={config.layout.maxHeightPx} min={44} max={160} step={1} onChange={(v) => updateLayout({ maxHeightPx: v })} />
            <Control label="Box gap" value={config.layout.boxGap} min={0} max={40} step={1} onChange={(v) => updateLayout({ boxGap: v })} />
            <Control label="Outer margin" value={config.layout.outerMargin} min={0} max={60} step={1} onChange={(v) => updateLayout({ outerMargin: v })} />
          </>
        )}

        {activeTab === 'wings' && (
          <>
            <Control label="Wing curve" value={config.layout.wingCurve} min={0} max={60} step={1} onChange={(v) => updateLayout({ wingCurve: v })} />
            <Control label="Wing underlap" value={config.layout.wingUnderlap} min={0} max={60} step={1} onChange={(v) => updateLayout({ wingUnderlap: v })} />
            <Control label="Wing Y" value={config.layout.wingY} min={0} max={50} step={1} onChange={(v) => updateLayout({ wingY: v })} />
            <Control label="Wing height" value={config.layout.wingHeight} min={8} max={60} step={1} onChange={(v) => updateLayout({ wingHeight: v })} />
            <Control label="Wing opacity" value={config.style.wingOpacity} min={0} max={0.8} step={0.01} onChange={(v) => updateStyle({ wingOpacity: v })} />
          </>
        )}

        {activeTab === 'style' && (
          <>
            <Control label="Box opacity" value={config.style.boxOpacity} min={0} max={0.8} step={0.01} onChange={(v) => updateStyle({ boxOpacity: v })} />
            <Control label="Glow blur" value={config.style.glowBlur} min={0} max={12} step={0.1} onChange={(v) => updateStyle({ glowBlur: v })} />
            <Control label="Backdrop blur" value={config.style.backdropBlur} min={0} max={18} step={0.5} onChange={(v) => updateStyle({ backdropBlur: v })} />
            <ColorControl label="Tint / fill" value={config.style.tintColor} onChange={(v) => updateStyle({ tintColor: v })} />
            <ColorControl label="Edge / border" value={config.style.edgeColor} onChange={(v) => updateStyle({ edgeColor: v })} />
            <ColorControl label="Circle fill" value={config.style.circleFillColor} onChange={(v) => updateStyle({ circleFillColor: v })} />
          </>
        )}

        {activeTab === 'sections' && (
          <>
            <div className={styles.debugDivider}>Left Box</div>
            <Control label="Icon size" value={config.left.iconSize} min={8} max={44} step={1} onChange={(v) => updateLeft({ iconSize: v })} />
            <Control label="Icon X" value={config.left.iconOffsetX} min={-30} max={30} step={1} onChange={(v) => updateLeft({ iconOffsetX: v })} />
            <Control label="Icon Y" value={config.left.iconOffsetY} min={-20} max={20} step={1} onChange={(v) => updateLeft({ iconOffsetY: v })} />

            <div className={styles.debugDivider}>Center Shared</div>
            <label className={styles.debugSelectLabel}>
              <span>Mode</span>
              <select value={config.center.mode} onChange={(e) => updateCenter({ mode: e.target.value as CenterMode })}>
                <option value="A">Branding (A)</option>
                <option value="B">Suits (B)</option>
              </select>
            </label>
            <Control label="Shared gap" value={config.center.contentGap} min={0} max={24} step={1} onChange={(v) => updateCenter({ contentGap: v })} />
            <Control label="Side padding" value={config.center.sidePadding} min={0} max={40} step={1} onChange={(v) => updateCenter({ sidePadding: v })} />

            <div className={styles.debugDivider}>Center Mode A</div>
            <Control label="A Text size" value={config.center.modeA.textStyle.size} min={7} max={50} step={1} onChange={(v) => updateCenterA({ textStyle: { ...config.center.modeA.textStyle, size: v } })} />
            <Control label="A Tracking" value={config.center.modeA.textStyle.letterSpacing ?? 0} min={-5} max={20} step={0.5} onChange={(v) => updateCenterA({ textStyle: { ...config.center.modeA.textStyle, letterSpacing: v } })} />
            <Control label="A Logo size" value={config.center.modeA.logo.size} min={8} max={56} step={1} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, size: v } })} />
            <Control label="A Logo X" value={config.center.modeA.logo.offsetX} min={-30} max={30} step={1} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, offsetX: v } })} />
            <Control label="A Logo Y" value={config.center.modeA.logo.offsetY} min={-20} max={20} step={1} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, offsetY: v } })} />
            <Control label="A Logo stroke" value={config.center.modeA.logo.strokeWidth} min={0.5} max={5} step={0.1} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, strokeWidth: v } })} />

            <div className={styles.debugDivider}>Center Mode B</div>
            <Control label="B Text size" value={config.center.modeB.textStyle.size} min={7} max={50} step={1} onChange={(v) => updateCenterB({ textStyle: { ...config.center.modeB.textStyle, size: v } })} />
            <Control label="B Icon size" value={config.center.modeB.iconSize} min={8} max={28} step={1} onChange={(v) => updateCenterB({ iconSize: v })} />
            <Control label="B Pair gap" value={config.center.modeB.pairGap} min={-12} max={20} step={1} onChange={(v) => updateCenterB({ pairGap: v })} />
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={wrapRef}
        className={styles.unifiedHeaderWrapper}
        style={{
          width: `${layout.widthPercent}%`,
          height: `clamp(${layout.minHeightPx}px, ${layout.preferredHeightVw}vw, ${layout.maxHeightPx}px)`,
          backdropFilter: style.backdropBlur > 0 ? `blur(${style.backdropBlur}px)` : undefined,
        }}
      >
        <svg viewBox={`0 0 ${viewWidth} ${svgHeight}`} className={styles.headerSvg} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <filter id="headerSoftGlow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur stdDeviation={String(style.glowBlur)} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <WingShape box={leftWing} curve={layout.wingCurve} style={style} />
          <WingShape box={rightWing} curve={layout.wingCurve} style={style} />

          <HeaderPill box={leftBox} style={style} onClick={left.onClick} isButton={left.isButton} ariaLabel={left.ariaLabel ?? left.text}>
            {left.customRenderer ? (
              left.customRenderer({ box: leftBox, config: left, aspectCorrection })
            ) : (
              <LeftHomeContent
                box={leftBox}
                collapsed={leftBoxCollapsed}
                config={left}
                style={style}
                aspectCorrection={aspectCorrection}
              />
            )}
          </HeaderPill>

          <HeaderPill box={centerBox} style={style}>
            <CenterContent
              box={centerBox}
              config={center}
              aspectCorrection={aspectCorrection}
            />
          </HeaderPill>

          <HeaderPill box={rightBox} style={style} onClick={right.onClick} isButton={right.isButton} ariaLabel={right.ariaLabel ?? right.text}>
            {right.customRenderer ? (
              right.customRenderer({ box: rightBox, config: right, aspectCorrection })
            ) : (
              <FitText
                text={rightBoxCollapsed ? '' : right.text}
                x={rightBox.x + rightBox.w / 2}
                y={rightBox.y + rightBox.h / 2 + 5}
                maxWidth={rightBox.w - 20}
                anchor="middle"
                fontSize={right.textStyle.size}
                color={right.textStyle.color}
                fontWeight={right.textStyle.weight}
                strokeColor={right.textStyle.strokeColor}
                strokeWidth={right.textStyle.strokeWidth}
                smallCaps={right.textStyle.smallCaps}
                letterSpacing={right.textStyle.letterSpacing}
              />
            )}
          </HeaderPill>
        </svg>
      </div>

      {ENABLE_HEADER_DEBUG_CONTROLS && (
        <div className={styles.debugControlsFloating}>
          <button
            type="button"
            onClick={() => setShowControls((v) => !v)}
            className={styles.debugToggleButton}
          >
            {showControls ? 'Hide Header Controls' : 'Show Header Controls'}
          </button>

          {showControls && renderDebugPanel()}
        </div>
      )}
    </>
  );
}
type WingBox = {
  x1: number;
  x2: number;
  y: number;
  h: number;
};

function WingShape({ box, curve, style }: { box: WingBox; curve: number; style: UnifiedHeaderStyleConfig }) {
  const top = box.y;
  const bottom = box.y + box.h;
  const d = [
    `M ${box.x1} ${top}`,
    `L ${box.x2} ${top}`,
    `C ${box.x2 - curve} ${top} ${box.x2 - curve} ${bottom} ${box.x2} ${bottom}`,
    `L ${box.x1} ${bottom}`,
    `C ${box.x1 + curve} ${bottom} ${box.x1 + curve} ${top} ${box.x1} ${top}`,
    'Z',
  ].join(' ');

  return (
    <path
      d={d}
      fill={style.tintColor}
      fillOpacity={style.wingOpacity}
      stroke={style.edgeColor}
      strokeWidth={1}
      strokeOpacity={0.45}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function HeaderPill({
  box,
  style,
  children,
  onClick,
  isButton,
  ariaLabel,
}: {
  box: HeaderBoxRect;
  style: UnifiedHeaderStyleConfig;
  children?: ReactNode;
  onClick?: () => void;
  isButton?: boolean;
  ariaLabel?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const interactive = Boolean(onClick || isButton);
  const edgeColor = interactive && hovered ? style.hoverEdgeColor : style.edgeColor;
  const fillColor = interactive && hovered ? style.hoverTintColor : style.tintColor;
  const fillOpacity = interactive && hovered ? Math.min(1, style.boxOpacity + style.hoverBoxOpacityBoost) : style.boxOpacity;

  return (
    <g
      filter="url(#headerSoftGlow)"
      onClick={() => onClick?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      tabIndex={interactive ? 0 : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={box.h / 2}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={edgeColor}
        strokeWidth={1.2}
        strokeOpacity={0.75}
        vectorEffect="non-scaling-stroke"
      />
      {children}
    </g>
  );
}

function LeftHomeContent({
  box,
  collapsed,
  config,
  style,
  aspectCorrection,
}: {
  box: HeaderBoxRect;
  collapsed: boolean;
  config: UnifiedHeaderLeftConfig;
  style: UnifiedHeaderStyleConfig;
  aspectCorrection: number;
}) {
  const circlePadding = 3;
  const circleRadius = Math.min((box.h - circlePadding * 2) / 2, 24);
  const circleCx = collapsed ? box.x + box.w / 2 : box.x + circlePadding + circleRadius;
  const circleCy = box.y + box.h / 2;
  const textX = circleCx + circleRadius + 6;
  const maxTextWidth = Math.max(1, box.x + box.w - 14 - textX);
  const safeIconSize = Math.min(config.iconSize, circleRadius * 1.55);

  return (
    <g>
      <g transform={`translate(${circleCx} ${circleCy}) scale(${aspectCorrection} 1) translate(${-circleCx} ${-circleCy})`}>
        <circle
          cx={circleCx}
          cy={circleCy}
          r={circleRadius}
          fill={style.circleFillColor}
          fillOpacity={0.22}
          stroke={style.edgeColor}
          strokeOpacity={0.55}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
        {config.icon({
          cx: circleCx + config.iconOffsetX,
          cy: circleCy + config.iconOffsetY,
          size: safeIconSize,
          color: '#ffffff',
        })}
      </g>

      {!collapsed && (
        <FitText
          text={config.text}
          x={textX}
          y={circleCy + 5}
          maxWidth={maxTextWidth}
          anchor="start"
          fontSize={13}
          color="#ffffff"
        />
      )}
    </g>
  );
}

function CenterContent({ box, config, aspectCorrection }: { box: HeaderBoxRect; config: UnifiedHeaderCenterConfig; aspectCorrection: number }) {
  if (config.customRenderer) {
    return config.customRenderer({ box, config, aspectCorrection });
  }

  if (config.mode === 'B') {
    return <CenterModeB box={box} config={config} aspectCorrection={aspectCorrection} />;
  }

  return <CenterModeA box={box} config={config} aspectCorrection={aspectCorrection} />;
}

function CenterModeA({ box, config, aspectCorrection }: { box: HeaderBoxRect; config: UnifiedHeaderCenterConfig; aspectCorrection: number }) {
  const mode = config.modeA;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const fontSize = Math.min(mode.textStyle.size, box.h);
  const logoSize = Math.min(mode.logo.size, box.h);
  const logoCx = cx + mode.logo.offsetX;
  const logoCy = cy + mode.logo.offsetY;
  const logoVisualRadius = (logoSize / 2) * aspectCorrection;
  const leftTextEnd = logoCx - logoVisualRadius - config.contentGap;
  const rightTextStart = logoCx + logoVisualRadius + config.contentGap;
  const leftTextWidth = Math.max(1, leftTextEnd - (box.x + config.sidePadding));
  const rightTextWidth = Math.max(1, box.x + box.w - config.sidePadding - rightTextStart);

  return (
    <g>
      <FitText
        text={mode.leftText}
        x={leftTextEnd}
        y={cy + fontSize * 0.36}
        maxWidth={leftTextWidth}
        anchor="end"
        fontSize={fontSize}
        color={mode.textStyle.color}
        fontWeight={mode.textStyle.weight}
        strokeColor={mode.textStyle.strokeColor}
        strokeWidth={mode.textStyle.strokeWidth}
        smallCaps={mode.textStyle.smallCaps}
        letterSpacing={mode.textStyle.letterSpacing}
      />

      {mode.logo.renderer({
        cx: logoCx,
        cy: logoCy,
        size: logoSize,
        color: mode.textStyle.color,
        strokeWidth: mode.logo.strokeWidth,
        innerOpacity: mode.logo.innerOpacity,
        aspectCorrection,
      })}

      <FitText
        text={mode.rightText}
        x={rightTextStart}
        y={cy + fontSize * 0.36}
        maxWidth={rightTextWidth}
        anchor="start"
        fontSize={fontSize}
        color={mode.textStyle.color}
        fontWeight={mode.textStyle.weight}
        strokeColor={mode.textStyle.strokeColor}
        strokeWidth={mode.textStyle.strokeWidth}
        smallCaps={mode.textStyle.smallCaps}
        letterSpacing={mode.textStyle.letterSpacing}
      />
    </g>
  );
}

function CenterModeB({ box, config, aspectCorrection }: { box: HeaderBoxRect; config: UnifiedHeaderCenterConfig; aspectCorrection: number }) {
  const mode = config.modeB;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const fontSize = Math.min(mode.textStyle.size, box.h);
  const iconSize = Math.min(mode.iconSize, box.h * 0.55);
  const textWidthEstimate = Math.max(fontSize, mode.text.length * fontSize * 0.58);
  const maxTextWidth = Math.max(1, box.w - config.sidePadding * 2 - iconSize * 4 - mode.pairGap * 2 - config.contentGap * 2);
  const textWidth = Math.min(textWidthEstimate, maxTextWidth);
  const leftUnitStart = box.x + config.sidePadding;
  const leftUnitEnd = cx - textWidth / 2 - config.contentGap;
  const rightUnitStart = cx + textWidth / 2 + config.contentGap;
  const rightUnitEnd = box.x + box.w - config.sidePadding;
  const leftPairCenter = leftUnitStart + Math.max(1, leftUnitEnd - leftUnitStart) / 2;
  const rightPairCenter = rightUnitStart + Math.max(1, rightUnitEnd - rightUnitStart) / 2;
  const pairHalfSpread = Math.max(0, iconSize + mode.pairGap) / 2;

  return (
    <g>
      <CorrectedIcon cx={leftPairCenter - pairHalfSpread} cy={cy} size={iconSize} color="#050505" aspectCorrection={aspectCorrection} renderer={mode.icons[0]} />
      <CorrectedIcon cx={leftPairCenter + pairHalfSpread} cy={cy} size={iconSize} color="#ff3b45" aspectCorrection={aspectCorrection} renderer={mode.icons[1]} />
      <FitText
        text={mode.text}
        x={cx}
        y={cy + fontSize * 0.36}
        maxWidth={maxTextWidth}
        anchor="middle"
        fontSize={fontSize}
        color={mode.textStyle.color}
        fontWeight={mode.textStyle.weight}
        strokeColor={mode.textStyle.strokeColor}
        strokeWidth={mode.textStyle.strokeWidth}
        smallCaps={mode.textStyle.smallCaps}
        letterSpacing={mode.textStyle.letterSpacing}
      />
      <CorrectedIcon cx={rightPairCenter - pairHalfSpread} cy={cy} size={iconSize} color="#ff3b45" aspectCorrection={aspectCorrection} renderer={mode.icons[2]} />
      <CorrectedIcon cx={rightPairCenter + pairHalfSpread} cy={cy} size={iconSize} color="#050505" aspectCorrection={aspectCorrection} renderer={mode.icons[3]} />
    </g>
  );
}

function CorrectedIcon({
  cx,
  cy,
  size,
  color,
  aspectCorrection,
  renderer,
}: HeaderIconRenderArgs & { aspectCorrection: number; renderer?: HeaderIconRenderer }) {
  if (!renderer) return null;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
      {renderer({ cx, cy, size, color })}
    </g>
  );
}

function FitText({
  text,
  x,
  y,
  maxWidth,
  anchor,
  fontSize,
  color,
  fontWeight = 700,
  strokeColor,
  strokeWidth,
  smallCaps,
  letterSpacing,
}: {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  color: string;
  fontWeight?: number;
  strokeColor?: string;
  strokeWidth?: number;
  smallCaps?: boolean;
  letterSpacing?: number;
}) {
  const safeFontSize = Math.max(1, Math.min(fontSize, 50));
  const estimatedWidth = Math.max(safeFontSize, text.length * safeFontSize * 0.58);
  const shouldCompress = estimatedWidth > maxWidth;

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily="Impact, sans-serif"
      fontSize={safeFontSize}
      fontWeight={fontWeight}
      fill={color}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      style={{ 
        fontVariant: smallCaps ? 'small-caps' : undefined,
      }}
      letterSpacing={letterSpacing}
      textLength={shouldCompress ? maxWidth : undefined}
      lengthAdjust={shouldCompress ? 'spacingAndGlyphs' : undefined}
    >
      {text}
    </text>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.debugControlRow}>
      <span className={styles.debugControlLabel}>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className={styles.debugColorInput} />
      <span className={styles.debugValueDisplay}>{value}</span>
    </label>
  );
}

function Control({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.debugControlRow}>
      <span className={styles.debugControlLabel}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={styles.debugRangeInput} />
      <span className={styles.debugValueDisplay}>{value.toFixed(step < 1 ? 2 : 0)}</span>
    </label>
  );
}
