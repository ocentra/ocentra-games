import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { UnifiedHeaderNavigationConfig } from './UnifiedHeader.config';
import styles from './UnifiedHeader.module.css';

type SiteNavItem = {
  label: string;
  path: string;
  matchPrefixes?: string[];
};

type PrimarySiteNavigationProps = {
  includeAdmin?: boolean;
  config: UnifiedHeaderNavigationConfig;
  extraItems?: SiteNavItem[];
};

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundedRectPath(box: Box, radius: number) {
  const nextRadius = clamp(radius, 0, Math.min(box.h / 2, box.w / 2));

  return [
    `M ${box.x + nextRadius} ${box.y}`,
    `L ${box.x + box.w - nextRadius} ${box.y}`,
    `Q ${box.x + box.w} ${box.y} ${box.x + box.w} ${box.y + nextRadius}`,
    `L ${box.x + box.w} ${box.y + box.h - nextRadius}`,
    `Q ${box.x + box.w} ${box.y + box.h} ${box.x + box.w - nextRadius} ${box.y + box.h}`,
    `L ${box.x + nextRadius} ${box.y + box.h}`,
    `Q ${box.x} ${box.y + box.h} ${box.x} ${box.y + box.h - nextRadius}`,
    `L ${box.x} ${box.y + nextRadius}`,
    `Q ${box.x} ${box.y} ${box.x + nextRadius} ${box.y}`,
    'Z',
  ].join(' ');
}

function arrowShellPath(shell: Box, side: 'left' | 'right') {
  const radius = shell.h / 2;

  if (side === 'left') {
    return [
      `M ${shell.x + radius} ${shell.y}`,
      `L ${shell.x + shell.w} ${shell.y}`,
      `L ${shell.x + shell.w} ${shell.y + shell.h}`,
      `L ${shell.x + radius} ${shell.y + shell.h}`,
      `Q ${shell.x} ${shell.y + shell.h} ${shell.x} ${shell.y + radius}`,
      `Q ${shell.x} ${shell.y} ${shell.x + radius} ${shell.y}`,
      'Z',
    ].join(' ');
  }

  return [
    `M ${shell.x} ${shell.y}`,
    `L ${shell.x + shell.w - radius} ${shell.y}`,
    `Q ${shell.x + shell.w} ${shell.y} ${shell.x + shell.w} ${shell.y + radius}`,
    `Q ${shell.x + shell.w} ${shell.y + shell.h} ${shell.x + shell.w - radius} ${shell.y + shell.h}`,
    `L ${shell.x} ${shell.y + shell.h}`,
    'Z',
  ].join(' ');
}

function accentLines(box: Box, inset: number) {
  const left = box.x + inset;
  const right = box.x + box.w - inset;

  return [
    `M ${left} ${box.y + 4} L ${right} ${box.y + 4}`,
    `M ${left} ${box.y + box.h - 5} L ${right} ${box.y + box.h - 5}`,
  ].join(' ');
}

function estimateLabelWidth(label: string, textSize: number) {
  let width = 0;

  for (const character of label) {
    if ('ilI.,!|'.includes(character)) {
      width += textSize * 0.28;
    } else if ('mwMW@#%&'.includes(character)) {
      width += textSize * 0.82;
    } else if (character === ' ') {
      width += textSize * 0.34;
    } else {
      width += textSize * 0.55;
    }
  }

  return width;
}

function getButtonWidth(label: string, shellHeight: number, config: UnifiedHeaderNavigationConfig) {
  const textSize = clamp(shellHeight * config.textScale, 11, 18);
  const labelWidth = estimateLabelWidth(label, textSize);
  const sideArrowClearance = config.sideArrowInset + clamp(shellHeight * 0.16, 4, 7) + 8;
  const sidePadding = Math.max(config.textSidePadding, sideArrowClearance);
  const naturalWidth = labelWidth + sidePadding * 2;

  return clamp(Math.ceil(naturalWidth), config.minButtonWidth, config.maxButtonWidth);
}

function getVisibleWindow(
  items: SiteNavItem[],
  startIndex: number,
  availableWidth: number,
  shellHeight: number,
  config: UnifiedHeaderNavigationConfig,
) {
  const result: Array<SiteNavItem & { width: number }> = [];
  let usedWidth = 0;

  for (let index = startIndex; index < items.length; index += 1) {
    const item = items[index];
    const width = getButtonWidth(item.label, shellHeight, config);
    const nextWidth = result.length === 0 ? width : usedWidth + config.buttonGap + width;

    if (result.length > 0 && nextWidth > availableWidth) {
      break;
    }

    if (result.length === 0 && width > availableWidth) {
      result.push({ ...item, width: availableWidth });
      break;
    }

    result.push({ ...item, width });
    usedWidth = nextWidth;
  }

  return result;
}

function getMaxStartIndex(
  items: SiteNavItem[],
  availableWidth: number,
  shellHeight: number,
  config: UnifiedHeaderNavigationConfig,
) {
  for (let index = 0; index < items.length; index += 1) {
    const windowItems = getVisibleWindow(items, index, availableWidth, shellHeight, config);
    const lastLabel = windowItems[windowItems.length - 1]?.label;
    if (lastLabel === items[items.length - 1]?.label) {
      return index;
    }
  }

  return Math.max(0, items.length - 1);
}

function matchesItemPath(pathname: string, item: SiteNavItem) {
  const prefixes = item.matchPrefixes?.length ? item.matchPrefixes : [item.path];
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function resolveActiveItem(pathname: string, items: SiteNavItem[]) {
  const directMatch = items.find((item) => matchesItemPath(pathname, item));
  if (directMatch) {
    return directMatch.label;
  }

  if (pathname.startsWith('/admin')) {
    return items.some((item) => item.label === 'Admin') ? 'Admin' : '';
  }
  if (pathname.startsWith('/player-hub')) {
    return 'Profile';
  }
  if (pathname.startsWith('/competition')) {
    return 'Tournaments';
  }
  if (pathname.startsWith('/social')) {
    return 'Social';
  }
  if (pathname.startsWith('/shop')) {
    return 'Shop';
  }
  if (pathname.startsWith('/CardGamesExplorer')) {
    return 'Games';
  }
  if (pathname.startsWith('/settings')) {
    return 'Profile';
  }

  return '';
}

function ArrowGlyph({ cx, cy, side, color }: { cx: number; cy: number; side: 'left' | 'right'; color: string }) {
  const direction = side === 'left' ? -1 : 1;

  return (
    <g>
      <path
        d={`M ${cx - direction * 8} ${cy} L ${cx + direction * 8} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${cx + direction * 2} ${cy - 7} L ${cx + direction * 10} ${cy} L ${cx + direction * 2} ${cy + 7}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function ArrowShell({
  shell,
  side,
  config,
  disabled,
  onClick,
}: {
  shell: Box;
  side: 'left' | 'right';
  config: UnifiedHeaderNavigationConfig;
  disabled: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered && !disabled;
  const edgeColor = disabled ? 'rgba(217,247,231,0.22)' : active ? config.hoverEdgeColor : config.edgeColor;
  const fillColor = active ? config.hoverTintColor : config.tintColor;
  const fillOpacity = disabled ? 0.025 : active ? 0.16 : config.boxOpacity;

  return (
    <g
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: disabled ? 'default' : 'pointer', pointerEvents: 'auto' }}
      opacity={disabled ? 0.55 : 1}
    >
      <path
        d={arrowShellPath(shell, side)}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={edgeColor}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        filter={disabled ? undefined : 'url(#navGlow)'}
      />
      <ArrowGlyph cx={shell.x + shell.w / 2} cy={shell.y + shell.h / 2} side={side} color={edgeColor} />
    </g>
  );
}

function SideArrow({
  box,
  side,
  color,
  active,
  inset,
}: {
  box: Box;
  side: 'left' | 'right';
  color: string;
  active: boolean;
  inset: number;
}) {
  const cy = box.y + box.h / 2;
  const opacity = active ? 0.9 : 0.42;
  const size = clamp(box.h * 0.16, 4, 7);

  if (side === 'left') {
    const x = box.x + inset;
    return (
      <path
        d={`M ${x + size} ${cy - size} L ${x} ${cy} L ${x + size} ${cy + size}`}
        fill="none"
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  const x = box.x + box.w - inset;
  return (
    <path
      d={`M ${x - size} ${cy - size} L ${x} ${cy} L ${x - size} ${cy + size}`}
      fill="none"
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

function NavButton({
  box,
  item,
  active,
  config,
  onClick,
}: {
  box: Box;
  item: SiteNavItem;
  active: boolean;
  config: UnifiedHeaderNavigationConfig;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const lit = hovered || active;
  const edgeColor = active ? config.activeEdgeColor : hovered ? config.hoverEdgeColor : config.edgeColor;
  const fillColor = active ? config.activeTintColor : hovered ? config.hoverTintColor : config.tintColor;
  const fillOpacity = active ? 0.18 : hovered ? 0.15 : 0.09;
  const textSize = clamp(box.h * config.textScale, 11, 18);
  const textStroke = clamp(textSize * 0.22, 2.2, 3.6);
  const lift = hovered ? -1.2 : active ? -0.6 : 0;

  return (
    <g
      transform={`translate(0 ${lift})`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
    >
      <path
        d={roundedRectPath({ x: box.x, y: box.y + 1.8, w: box.w, h: box.h }, config.buttonRadius)}
        fill="#000000"
        fillOpacity={0.35}
        stroke="#000000"
        strokeOpacity={0.35}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={roundedRectPath(box, config.buttonRadius)}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={edgeColor}
        strokeOpacity={lit ? 0.9 : 0.5}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        filter={lit ? 'url(#navGlow)' : undefined}
      />
      <path
        d={roundedRectPath(box, config.buttonRadius)}
        fill={active ? 'url(#buttonBodyActive)' : 'url(#buttonBody)'}
        stroke="url(#buttonBevelStroke)"
        strokeWidth={1.1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={roundedRectPath(
          { x: box.x + 2, y: box.y + 2, w: box.w - 4, h: box.h - 4 },
          Math.max(0, config.buttonRadius - 2),
        )}
        fill="url(#buttonCornerGlow)"
        stroke={edgeColor}
        strokeOpacity={lit ? 0.32 : 0.16}
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${box.x + config.buttonRadius + 3} ${box.y + 3.2} L ${box.x + box.w - config.buttonRadius - 3} ${box.y + 3.2}`}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={lit ? 0.52 : 0.3}
        strokeWidth={1.1}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${box.x + config.buttonRadius + 3} ${box.y + box.h - 3.2} L ${box.x + box.w - config.buttonRadius - 3} ${box.y + box.h - 3.2}`}
        fill="none"
        stroke="#000000"
        strokeOpacity={0.58}
        strokeWidth={1.1}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={accentLines(box, config.accentInset)}
        fill="none"
        stroke={edgeColor}
        strokeOpacity={lit ? 0.48 : 0.22}
        strokeWidth={1}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <SideArrow box={box} side="left" color={edgeColor} active={lit} inset={config.sideArrowInset} />
      <SideArrow box={box} side="right" color={edgeColor} active={lit} inset={config.sideArrowInset} />
      <text
        x={box.x + box.w / 2}
        y={box.y + box.h / 2 + textSize * 0.36}
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        fontSize={textSize}
        fontWeight={850}
        fill="#ffffff"
        paintOrder="stroke fill markers"
        stroke="rgba(0, 14, 32, 0.8)"
        strokeWidth={textStroke}
      >
        {item.label}
      </text>
    </g>
  );
}

function getLayout(items: SiteNavItem[], viewWidth: number, viewHeight: number, config: UnifiedHeaderNavigationConfig) {
  const panelHeight = Math.max(1, viewHeight - config.panelInsetY * 2);
  const shellHeight = Math.max(1, panelHeight - config.shellInset * 2);
  const shellWidth = shellHeight;
  const endCurvePadding = config.panelRadius >= 999 ? panelHeight / 2 : config.endCurvePadding;
  const maxPanelWidth = Math.max(1, viewWidth - config.outerMargin * 2);
  const naturalItems = items.map((item) => ({ ...item, width: getButtonWidth(item.label, shellHeight, config) }));
  const naturalWidth =
    naturalItems.reduce((total, item) => total + item.width, 0) +
    config.buttonGap * Math.max(0, naturalItems.length - 1);
  const fullAvailableWidth = Math.max(1, maxPanelWidth - config.shellInset * 2 - endCurvePadding * 2);
  const hasOverflow = naturalWidth > fullAvailableWidth;
  const fittedPanelWidth = hasOverflow
    ? maxPanelWidth
    : Math.min(maxPanelWidth, naturalWidth + config.shellInset * 2 + endCurvePadding * 2);
  const panel = {
    x: Math.max(0, (viewWidth - fittedPanelWidth) / 2),
    y: config.panelInsetY,
    w: fittedPanelWidth,
    h: panelHeight,
  };

  const leftShell = hasOverflow
    ? {
        x: panel.x + config.shellInset,
        y: panel.y + config.shellInset,
        w: shellWidth,
        h: shellHeight,
      }
    : undefined;

  const rightShell = hasOverflow
    ? {
        x: panel.x + panel.w - config.shellInset - shellWidth,
        y: panel.y + config.shellInset,
        w: shellWidth,
        h: shellHeight,
      }
    : undefined;

  const navX = hasOverflow && leftShell ? leftShell.x + leftShell.w + config.navGap : panel.x + config.shellInset + endCurvePadding;
  const navRight = hasOverflow && rightShell ? rightShell.x - config.navGap : panel.x + panel.w - config.shellInset - endCurvePadding;
  const navWidth = Math.max(1, navRight - navX);
  const firstButtonX = navX + Math.max(0, (navWidth - naturalWidth) / 2);

  return {
    panel,
    shellHeight,
    hasOverflow,
    leftShell,
    rightShell,
    navWidth,
    naturalItems,
    firstButtonX,
  };
}

function SiteNavigationSvg({
  width,
  config,
  items,
  activeItem,
  onSelect,
  startIndex,
  setStartIndex,
}: {
  width: number;
  config: UnifiedHeaderNavigationConfig;
  items: SiteNavItem[];
  activeItem: string;
  onSelect: (item: SiteNavItem) => void;
  startIndex: number;
  setStartIndex: Dispatch<SetStateAction<number>>;
}) {
  const viewWidth = Math.max(240, width);
  const viewHeight = config.height;
  const layout = getLayout(items, viewWidth, viewHeight, config);
  const maxStartIndex = layout.hasOverflow
    ? getMaxStartIndex(items, layout.navWidth, layout.shellHeight, config)
    : 0;
  const safeStartIndex = clamp(startIndex, 0, maxStartIndex);
  const visibleItems = layout.hasOverflow
    ? getVisibleWindow(items, safeStartIndex, layout.navWidth, layout.shellHeight, config)
    : layout.naturalItems;
  const canGoPrevious = layout.hasOverflow && safeStartIndex > 0;
  const canGoNext = layout.hasOverflow && safeStartIndex < maxStartIndex;
  const renderedWidth =
    visibleItems.reduce((total, item) => total + item.width, 0) +
    config.buttonGap * Math.max(0, visibleItems.length - 1);
  const overflowNavLeft = layout.hasOverflow && layout.leftShell ? layout.leftShell.x + layout.leftShell.w + config.navGap : layout.panel.x;
  const overflowNavRight = layout.hasOverflow && layout.rightShell ? layout.rightShell.x - config.navGap : layout.panel.x + layout.panel.w;
  const overflowNavWidth = Math.max(1, overflowNavRight - overflowNavLeft);
  const firstRenderedButtonX = layout.hasOverflow
    ? overflowNavLeft + Math.max(0, (overflowNavWidth - renderedWidth) / 2)
    : layout.firstButtonX;

  return (
    <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" className={styles.primaryNavSvg}>
      <defs>
        <filter id="navGlow" x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation={config.glowBlur} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="buttonBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#eaffff" stopOpacity="0.2" />
          <stop offset="16%" stopColor="#8ff7ff" stopOpacity="0.13" />
          <stop offset="44%" stopColor="#00bfff" stopOpacity="0.055" />
          <stop offset="72%" stopColor="#001b26" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.38" />
        </linearGradient>

        <linearGradient id="buttonBodyActive" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff8d0" stopOpacity="0.28" />
          <stop offset="18%" stopColor="#ffd86b" stopOpacity="0.22" />
          <stop offset="48%" stopColor="#ffc400" stopOpacity="0.09" />
          <stop offset="76%" stopColor="#2b2100" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
        </linearGradient>

        <linearGradient id="buttonBevelStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="36%" stopColor="#d9f7e7" stopOpacity="0.2" />
          <stop offset="68%" stopColor="#00151d" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.58" />
        </linearGradient>

        <radialGradient id="buttonCornerGlow" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="38%" stopColor="#00bfff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path
        d={roundedRectPath(layout.panel, config.panelRadius)}
        fill={config.tintColor}
        fillOpacity={config.boxOpacity}
        stroke={config.edgeColor}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        filter="url(#navGlow)"
      />
      <path
        d={roundedRectPath(layout.panel, config.panelRadius)}
        fill="none"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth={0.9}
        strokeOpacity={0.45}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={roundedRectPath(
          {
            x: layout.panel.x + 1.5,
            y: layout.panel.y + 1.5,
            w: Math.max(1, layout.panel.w - 3),
            h: Math.max(1, layout.panel.h - 3),
          },
          Math.max(0, config.panelRadius - 2),
        )}
        fill="none"
        stroke="rgba(0, 0, 0, 0.34)"
        strokeWidth={0.9}
        strokeOpacity={0.55}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${layout.panel.x + Math.min(layout.panel.h / 2, config.panelRadius) + 6} ${layout.panel.y + 2.4} L ${layout.panel.x + layout.panel.w - Math.min(layout.panel.h / 2, config.panelRadius) - 6} ${layout.panel.y + 2.4}`}
        fill="none"
        stroke="rgba(255, 255, 255, 0.28)"
        strokeOpacity={0.6}
        strokeWidth={0.9}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${layout.panel.x + Math.min(layout.panel.h / 2, config.panelRadius) + 6} ${layout.panel.y + layout.panel.h - 2.2} L ${layout.panel.x + layout.panel.w - Math.min(layout.panel.h / 2, config.panelRadius) - 6} ${layout.panel.y + layout.panel.h - 2.2}`}
        fill="none"
        stroke="rgba(0, 0, 0, 0.42)"
        strokeOpacity={0.75}
        strokeWidth={0.9}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {layout.hasOverflow && layout.leftShell ? (
        <ArrowShell
          shell={layout.leftShell}
          side="left"
          config={config}
          disabled={!canGoPrevious}
          onClick={() => setStartIndex(() => clamp(safeStartIndex - 1, 0, maxStartIndex))}
        />
      ) : null}

      {visibleItems.map((item, index) => {
        const x =
          firstRenderedButtonX +
          visibleItems
            .slice(0, index)
            .reduce((total, previous) => total + previous.width + config.buttonGap, 0);

        return (
          <NavButton
            key={item.label}
            item={item}
            active={item.label === activeItem}
            config={config}
            onClick={() => onSelect(item)}
            box={{
              x,
              y: layout.panel.y + config.shellInset,
              w: item.width,
              h: layout.shellHeight,
            }}
          />
        );
      })}

      {layout.hasOverflow && layout.rightShell ? (
        <ArrowShell
          shell={layout.rightShell}
          side="right"
          config={config}
          disabled={!canGoNext}
          onClick={() => setStartIndex(() => clamp(safeStartIndex + 1, 0, maxStartIndex))}
        />
      ) : null}
    </svg>
  );
}

export function PrimarySiteNavigation({ includeAdmin = false, config, extraItems = [] }: PrimarySiteNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [startIndex, setStartIndex] = useState(0);
  const items = useMemo<SiteNavItem[]>(
    () => [
      { label: 'Shop', path: '/shop' },
      { label: 'Social', path: '/social' },
      { label: 'Games', path: '/CardGamesExplorer' },
      { label: 'Tournaments', path: '/competition' },
      { label: 'Leaderboard', path: '/competition/leaderboard', matchPrefixes: ['/competition/leaderboard'] },
      { label: 'Profile', path: '/player-hub', matchPrefixes: ['/player-hub', '/settings'] },
      ...(includeAdmin ? [{ label: 'Admin', path: '/admin' }] : []),
      ...extraItems,
    ],
    [extraItems, includeAdmin],
  );
  const activeItem = useMemo(() => resolveActiveItem(location.pathname, items), [items, location.pathname]);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) {
      return undefined;
    }

    const updateWidth = () => {
      const rect = element.getBoundingClientRect();
      setWidth(Math.max(240, Math.floor(rect.width)));
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  return (
    <div ref={hostRef} className={styles.primaryNavHost} style={{ height: `${config.height}px` }}>
      <SiteNavigationSvg
        width={width}
        config={config}
        items={items}
        activeItem={activeItem}
        startIndex={startIndex}
        setStartIndex={setStartIndex}
        onSelect={(item) => {
          navigate(item.path);
        }}
      />
    </div>
  );
}
