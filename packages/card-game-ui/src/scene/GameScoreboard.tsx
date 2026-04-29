import React, { useId, useMemo } from 'react';
import type {
  CardGameScoreboardControls,
  CardGameScoreboardIcon,
  CardGameScoreboardPresentation,
  CardGameScoreboardRowControls,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';

interface GameScoreboardProps {
  controls: CardGameScoreboardControls;
  presentation?: CardGameScoreboardPresentation;
  showHeaderBounds?: boolean;
  showRowBounds?: boolean;
}

function asDisplayText(value: number | string | undefined, fallback: string): string {
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value);
}

function mergeRows(
  controls: CardGameScoreboardControls,
  presentation?: CardGameScoreboardPresentation,
): CardGameScoreboardRowControls[] {
  return controls.rows
    .map((row) => {
      const override = presentation?.rowsById?.[row.id];
      if (override?.hidden) {
        return null;
      }
      return {
        ...row,
        icon: override?.icon ?? row.icon,
        label: override?.label ?? row.label,
        value: override?.value ?? row.value,
      };
    })
    .filter((row): row is CardGameScoreboardRowControls => row !== null);
}

function HeaderText({
  children,
  uid,
  x,
  y,
  size,
  fill,
  stroke,
  letterSpacing = 0,
}: {
  children: React.ReactNode;
  uid: string;
  x: number;
  y: number;
  size: number;
  fill: string;
  stroke: string;
  letterSpacing?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="Impact, Haettenschweiler, Arial Black, sans-serif"
      fontSize={size}
      fill={fill}
      stroke={stroke}
      strokeWidth="1"
      paintOrder="stroke fill"
      filter={`url(#${uid}_goldShadow)`}
      letterSpacing={letterSpacing}
    >
      {children}
    </text>
  );
}

function ValueText({
  children,
  uid,
  x,
  y,
  size,
  fill,
  stroke,
  textLength,
  letterSpacing = 0,
}: {
  children: React.ReactNode;
  uid: string;
  x: number;
  y: number;
  size: number;
  fill: string;
  stroke: string;
  textLength?: number;
  letterSpacing?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontFamily="Impact, Haettenschweiler, Arial Black, sans-serif"
      fontSize={size}
      fill={fill}
      stroke={stroke}
      strokeWidth="1.2"
      paintOrder="stroke fill"
      filter={`url(#${uid}_textShadow)`}
      lengthAdjust={textLength ? 'spacingAndGlyphs' : undefined}
      textLength={textLength}
      letterSpacing={letterSpacing}
    >
      {children}
    </text>
  );
}

function LabelText({
  children,
  uid,
  x,
  y,
  size,
  fill,
  stroke,
  anchor = 'start',
  letterSpacing = 0,
}: {
  children: React.ReactNode;
  uid: string;
  x: number;
  y: number;
  size: number;
  fill: string;
  stroke: string;
  anchor?: 'start' | 'middle' | 'end';
  letterSpacing?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily="Impact, Haettenschweiler, Arial Black, sans-serif"
      fontSize={size}
      fill={fill}
      stroke={stroke}
      strokeWidth="2"
      paintOrder="stroke fill"
      filter={`url(#${uid}_textShadow)`}
      letterSpacing={letterSpacing}
    >
      {children}
    </text>
  );
}

function MoneyIcon({
  cx,
  cy,
  size,
  uid,
  dollarFontSize,
  dollarTextLength,
  dollarY,
  dollarStrokeWidth,
}: {
  cx: number;
  cy: number;
  size: number;
  uid: string;
  dollarFontSize: number;
  dollarTextLength: number;
  dollarY: number;
  dollarStrokeWidth: number;
}) {
  const scale = size / 100;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} filter={`url(#${uid}_goldShadow)`}>
      <circle cx="0" cy="0" r="43" fill={`url(#${uid}_coinRim)`} stroke="#6d4a00" strokeWidth="4" />
      <circle cx="0" cy="0" r="34" fill={`url(#${uid}_coinFace)`} stroke="#fff1a0" strokeWidth="3" opacity="0.98" />
      <circle cx="0" cy="0" r="25" fill="none" stroke="#9f7000" strokeWidth="2" opacity="0.48" />
      <path d="M -24 -22 C -12 -35 15 -34 27 -14" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.38" />
      <path d="M 26 19 C 13 34 -14 34 -28 14" fill="none" stroke="#6e4a00" strokeWidth="5" strokeLinecap="round" opacity="0.26" />
      <text
        x="0"
        y={dollarY}
        textAnchor="middle"
        fontFamily="Impact, Arial Black, sans-serif"
        fontSize={dollarFontSize}
        fill="#fff8c9"
        stroke="#7a5500"
        strokeWidth={dollarStrokeWidth}
        paintOrder="stroke fill"
        lengthAdjust="spacingAndGlyphs"
        textLength={dollarTextLength}
      >
        $$
      </text>
    </g>
  );
}

function PotIcon({
  cx,
  cy,
  size,
  uid,
  yellow,
}: {
  cx: number;
  cy: number;
  size: number;
  uid: string;
  yellow: string;
}) {
  const scale = size / 100;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} filter={`url(#${uid}_goldShadow)`}>
      <ellipse cx="0" cy="-20" rx="36" ry="11" fill="#ffe66b" stroke="#8b6500" strokeWidth="4" />
      <path d="M -34 -18 C -42 8 -30 37 0 40 C 30 37 42 8 34 -18 Z" fill="#d99b00" stroke="#8b6500" strokeWidth="4" />
      <path d="M -22 -12 C -28 8 -18 27 0 30 C 18 27 28 8 22 -12 Z" fill="#ffc928" opacity="0.9" />
      <ellipse cx="0" cy="-18" rx="27" ry="7" fill="#fff08a" opacity="0.9" />
      <circle cx="-14" cy="-19" r="6" fill={yellow} stroke="#8b6500" strokeWidth="2" />
      <circle cx="0" cy="-21" r="6" fill={yellow} stroke="#8b6500" strokeWidth="2" />
      <circle cx="14" cy="-19" r="6" fill={yellow} stroke="#8b6500" strokeWidth="2" />
      <rect x="-22" y="39" width="44" height="7" rx="3" fill="#8b6500" opacity="0.75" />
    </g>
  );
}

function RowIcon({
  icon,
  row,
  controls,
  uid,
  cx,
  cy,
}: {
  icon: CardGameScoreboardIcon;
  row: CardGameScoreboardRowControls;
  controls: CardGameScoreboardControls;
  uid: string;
  cx: number;
  cy: number;
}) {
  if (icon === 'coin') {
    return (
      <MoneyIcon
        cx={cx}
        cy={cy}
        size={row.iconSize}
        uid={uid}
        dollarFontSize={row.coinDollarFontSize}
        dollarTextLength={row.coinDollarTextLength}
        dollarY={row.coinDollarY}
        dollarStrokeWidth={row.coinDollarStrokeWidth}
      />
    );
  }

  if (icon === 'pot') {
    return (
      <PotIcon
        cx={cx}
        cy={cy}
        size={row.iconSize}
        uid={uid}
        yellow={controls.textYellow}
      />
    );
  }

  return null;
}

export default function GameScoreboard({
  controls,
  presentation,
  showHeaderBounds = false,
  showRowBounds = false,
}: GameScoreboardProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const rows = useMemo(() => mergeRows(controls, presentation), [controls, presentation]);

  if (presentation?.hidden || rows.length === 0) {
    return null;
  }

  const width = controls.width;
  const height = controls.height;
  const overallScale = Number.isFinite(controls.overallScale) ? Math.max(controls.overallScale, 0.01) : 1;
  const scaledWidth = width * overallScale;
  const scaledHeight = height * overallScale;
  const panelInset = controls.panelInset;
  const innerX = panelInset;
  const innerY = panelInset;
  const innerW = width - panelInset * 2;
  const innerH = height - panelInset * 2;
  const tableMargin = controls.tableMargin;
  const contentX = innerX + tableMargin;
  const contentY = innerY + controls.headerHeight + tableMargin;
  const contentW = innerW - tableMargin * 2;
  const bottomY = innerY + innerH - tableMargin;
  const tableH = Math.max(20, bottomY - contentY);
  const rowCount = Math.max(1, rows.length);
  const rowH = tableH / rowCount;
  const dividerRatio = controls.tableDividerPercent / 100;
  const col2X = contentX + contentW * dividerRatio + controls.tableDividerOffset;
  const safeCol2X = Math.max(contentX + 80, Math.min(contentX + contentW - 80, col2X));
  const rightColW = contentX + contentW - safeCol2X;
  const centerX = width / 2;
  const headerBandTop = innerY + tableMargin + controls.headerBandTopInset;
  const headerBandBottom = contentY - tableMargin - controls.headerBandBottomInset;
  const headerBandH = Math.max(20, headerBandBottom - headerBandTop);
  const headerGroupY = headerBandTop + controls.headerOuterPadY;
  const headerGroupH = Math.max(18, headerBandH - controls.headerOuterPadY * 2);
  const headerBoxH = Math.min(controls.headerBoxHeight, Math.max(16, headerGroupH - 8));
  const headerBoxY = headerGroupY + (headerGroupH - headerBoxH) / 2;
  const effectiveHeaderValueTextSize = controls.headerValueAutoSize
    ? Math.max(8, Math.min(80, headerBoxH * controls.headerValueSizeScale))
    : controls.headerValueTextSize;
  const headerLabelY = headerBoxY + headerBoxH / 2 + controls.headerLabelTextSize * 0.34 + controls.headerTextYOffset + controls.overallTextYOffset;
  const headerValueY = headerBoxY + headerBoxH / 2 + controls.headerTextYOffset + controls.overallTextYOffset;
  const headerBoxClipY = headerBoxY + 2;
  const headerBoxClipH = Math.max(0, headerBoxH - 4);
  const headerBoxClipW = Math.max(0, controls.headerBoxWidth - controls.headerBoxTextPadding * 2);
  const approxCharW = controls.headerLabelTextSize * 0.62;
  const roundLabelW = Math.max(72, controls.roundLabel.length * approxCharW);
  const ofLabelW = Math.max(28, controls.ofLabel.length * approxCharW);
  const headerTotalW =
    roundLabelW +
    controls.headerBoxWidth +
    ofLabelW +
    controls.headerBoxWidth +
    controls.headerGap * 3 +
    controls.headerPadX * 2;
  const headerStartX = centerX - headerTotalW / 2;
  const roundLabelX = headerStartX + controls.headerPadX + roundLabelW / 2;
  const roundBoxX = roundLabelX + roundLabelW / 2 + controls.headerGap;
  const ofLabelX = roundBoxX + controls.headerBoxWidth + controls.headerGap + ofLabelW / 2;
  const totalBoxX = ofLabelX + ofLabelW / 2 + controls.headerGap;
  const headerBgY = headerGroupY;
  const headerBgH = headerGroupH;
  const roundValue = asDisplayText(presentation?.round, String(controls.round));
  const totalRoundsValue = asDisplayText(presentation?.totalRounds, String(controls.totalRounds));

  return (
    <div
      style={{
        width: scaledWidth,
        height: scaledHeight,
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      <svg
        width={scaledWidth}
        height={scaledHeight}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Scoreboard"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`${uid}_outer`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={controls.bgTop} />
            <stop offset="0.42" stopColor={controls.bgMid} />
            <stop offset="1" stopColor={controls.bgBottom} />
          </linearGradient>
          <linearGradient id={`${uid}_panel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={controls.panelTop} />
            <stop offset="1" stopColor={controls.panelBottom} />
          </linearGradient>
          <linearGradient id={`${uid}_edge`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={controls.edgeLight} />
            <stop offset="0.45" stopColor="#00a4d8" />
            <stop offset="1" stopColor={controls.edgeDark} />
          </linearGradient>
          <linearGradient id={`${uid}_glass`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
            <stop offset="0.25" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${uid}_coinFace`} cx="38%" cy="28%" r="72%">
            <stop offset="0" stopColor="#fff5a6" />
            <stop offset="0.42" stopColor={controls.textYellow} />
            <stop offset="0.72" stopColor="#d79b00" />
            <stop offset="1" stopColor="#8b6500" />
          </radialGradient>
          <linearGradient id={`${uid}_coinRim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff6b8" />
            <stop offset="0.5" stopColor="#f2b800" />
            <stop offset="1" stopColor="#8b6500" />
          </linearGradient>
          <filter id={`${uid}_glow`} x="-15%" y="-20%" width="130%" height="150%">
            <feGaussianBlur stdDeviation={controls.glowBlur} result="blur" />
            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 1 0 0 0.9  0 0 1 0 1  0 0 0 0.9 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${uid}_textShadow`} x="-20%" y="-30%" width="140%" height="160%">
            <feDropShadow dx="2" dy="2" stdDeviation="1.2" floodColor="#00263d" floodOpacity="0.8" />
          </filter>
          <filter id={`${uid}_goldShadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="3" stdDeviation="1.5" floodColor="#4d3700" floodOpacity="0.75" />
          </filter>
          <clipPath id={`${uid}_clip`}>
            <rect x={innerX} y={innerY} width={innerW} height={innerH} rx={controls.outerRadius} />
          </clipPath>
          <clipPath id={`${uid}_tableClip`}>
            <rect x={contentX} y={contentY} width={contentW} height={tableH} rx={controls.cellCornerRadius} />
          </clipPath>
          <clipPath id={`${uid}_roundValueClip`}>
            <rect x={roundBoxX + controls.headerBoxTextPadding} y={headerBoxClipY} width={headerBoxClipW} height={headerBoxClipH} />
          </clipPath>
          <clipPath id={`${uid}_totalValueClip`}>
            <rect x={totalBoxX + controls.headerBoxTextPadding} y={headerBoxClipY} width={headerBoxClipW} height={headerBoxClipH} />
          </clipPath>
        </defs>

        <rect
          x={innerX}
          y={innerY}
          width={innerW}
          height={innerH}
          rx={controls.outerRadius}
          fill={`url(#${uid}_outer)`}
          stroke={`url(#${uid}_edge)`}
          strokeWidth={controls.borderWidth}
          filter={`url(#${uid}_glow)`}
        />

        <rect
          x={innerX + controls.borderWidth}
          y={innerY + controls.borderWidth}
          width={innerW - controls.borderWidth * 2}
          height={innerH - controls.borderWidth * 2}
          rx={Math.max(0, controls.outerRadius - controls.borderWidth)}
          fill="none"
          stroke="#002c4a"
          strokeWidth="3"
          opacity="0.9"
        />

        <g clipPath={`url(#${uid}_clip)`}>
          <rect x={contentX} y={contentY} width={contentW} height={tableH} fill={`url(#${uid}_panel)`} stroke={controls.darkStroke} strokeWidth="3" rx={controls.cellCornerRadius} />
          <g clipPath={`url(#${uid}_tableClip)`}>
            <rect x={contentX} y={contentY} width={contentW} height={tableH} fill={`url(#${uid}_glass)`} opacity={controls.bevelOpacity} />
            {rows.slice(1).map((_, rowIndex) => {
              const y = contentY + rowH * (rowIndex + 1);
              return (
                <React.Fragment key={`row-line-${rowIndex}`}>
                  <line x1={contentX} y1={y} x2={contentX + contentW} y2={y} stroke="#24bce8" strokeWidth={controls.rowStrokeWidth} opacity="0.7" />
                  <line x1={contentX} y1={y + 2} x2={contentX + contentW} y2={y + 2} stroke="#002d48" strokeWidth="1" opacity="0.8" />
                </React.Fragment>
              );
            })}
            <line x1={safeCol2X} y1={contentY} x2={safeCol2X} y2={bottomY} stroke="#24bce8" strokeWidth={controls.rowStrokeWidth} opacity="0.7" />
            <line x1={safeCol2X + 2} y1={contentY} x2={safeCol2X + 2} y2={bottomY} stroke="#002d48" strokeWidth="1" opacity="0.8" />
          </g>

          <rect
            x={headerStartX}
            y={headerBgY}
            width={headerTotalW}
            height={headerBgH}
            rx={controls.headerBgRadius}
            fill={controls.headerBgFill}
            opacity={controls.headerBgOpacity}
            stroke={controls.headerBgStroke}
            strokeWidth={controls.headerBgStrokeWidth}
          />
          <rect
            x={roundBoxX}
            y={headerBoxY}
            width={controls.headerBoxWidth}
            height={headerBoxH}
            rx={controls.headerValueBoxRadius}
            fill={controls.headerValueBoxFill}
            stroke={controls.headerValueBoxStroke}
            strokeWidth="2"
          />
          <rect
            x={totalBoxX}
            y={headerBoxY}
            width={controls.headerBoxWidth}
            height={headerBoxH}
            rx={controls.headerValueBoxRadius}
            fill={controls.headerValueBoxFill}
            stroke={controls.headerValueBoxStroke}
            strokeWidth="2"
          />
        </g>

        <HeaderText uid={uid} x={roundLabelX} y={headerLabelY} size={controls.headerLabelTextSize} fill={controls.textYellow} stroke="#805b00" letterSpacing={controls.overallLetterSpacing}>
          {controls.roundLabel}
        </HeaderText>
        <g clipPath={`url(#${uid}_roundValueClip)`}>
          <ValueText
            uid={uid}
            x={roundBoxX + controls.headerBoxWidth / 2}
            y={headerValueY}
            size={effectiveHeaderValueTextSize}
            fill={controls.textRed}
            stroke={controls.textRedStroke}
            textLength={controls.headerValueAutoFit ? headerBoxClipW : undefined}
            letterSpacing={controls.headerValueAutoFit ? controls.overallLetterSpacing : 0}
          >
            {roundValue}
          </ValueText>
        </g>

        <HeaderText uid={uid} x={ofLabelX} y={headerLabelY} size={controls.headerLabelTextSize} fill={controls.textYellow} stroke="#805b00" letterSpacing={controls.overallLetterSpacing}>
          {controls.ofLabel}
        </HeaderText>
        <g clipPath={`url(#${uid}_totalValueClip)`}>
          <ValueText
            uid={uid}
            x={totalBoxX + controls.headerBoxWidth / 2}
            y={headerValueY}
            size={effectiveHeaderValueTextSize}
            fill={controls.textRed}
            stroke={controls.textRedStroke}
            textLength={controls.headerValueAutoFit ? headerBoxClipW : undefined}
            letterSpacing={controls.headerValueAutoFit ? controls.overallLetterSpacing : 0}
          >
            {totalRoundsValue}
          </ValueText>
        </g>

        {rows.map((row, rowIndex) => {
          const rowY = contentY + rowH * rowIndex;
          const rowCenterY = rowY + rowH / 2;
          const labelTextY = rowCenterY + row.labelTextSize * 0.34 + row.textY + controls.overallTextYOffset;
          const valueTextY = rowCenterY + row.valueTextSize * 0.34 + row.textY + controls.overallTextYOffset;
          const rowLabelX = contentX + (controls.showIcons ? row.labelX : controls.cellPaddingX);
          return (
            <React.Fragment key={row.id}>
              {controls.showIcons ? (
                <RowIcon
                  icon={row.icon}
                  row={row}
                  controls={controls}
                  uid={uid}
                  cx={contentX + row.iconX}
                  cy={rowCenterY + row.iconY}
                />
              ) : null}
              <LabelText uid={uid} x={rowLabelX} y={labelTextY} size={row.labelTextSize} fill={controls.textRed} stroke={controls.textRedStroke} letterSpacing={controls.overallLetterSpacing}>
                {row.label}
              </LabelText>
              <LabelText uid={uid} x={safeCol2X + rightColW / 2} y={valueTextY} size={row.valueTextSize} fill={controls.textRed} stroke={controls.textRedStroke} anchor="middle" letterSpacing={controls.overallLetterSpacing}>
                {row.value}
              </LabelText>
            </React.Fragment>
          );
        })}
        {showHeaderBounds ? (
          <rect
            x={headerStartX}
            y={headerBgY}
            width={headerTotalW}
            height={headerBgH}
            rx={controls.headerBgRadius}
            fill="none"
            stroke="#00ff66"
            strokeWidth="2"
            strokeDasharray="10 8"
            opacity="0.9"
          />
        ) : null}
        {showRowBounds ? (
          <>
            <rect
              x={contentX}
              y={contentY}
              width={contentW}
              height={tableH}
              rx={controls.cellCornerRadius}
              fill="none"
              stroke="#00ff66"
              strokeWidth="2"
              strokeDasharray="10 8"
              opacity="0.9"
            />
            {rows.map((row, rowIndex) => {
              const rowY = contentY + rowH * rowIndex;
              return (
                <rect
                  key={`row-bounds-${row.id}`}
                  x={contentX}
                  y={rowY}
                  width={contentW}
                  height={rowH}
                  fill="none"
                  stroke="#00ff66"
                  strokeWidth="1.5"
                  strokeDasharray="8 6"
                  opacity="0.72"
                />
              );
            })}
          </>
        ) : null}
      </svg>
    </div>
  );
}
