import React, { useEffect, useId, useMemo, useState } from "react";
import { motion } from "framer-motion";

type HudButtonProps = {
  label?: string;
  width?: number;
  height?: number;
  radius?: number;
  leftX?: number;
  rightX?: number;
  sideInset?: number;
  dotInset?: number;
  dotGap?: number;
  textColor?: string;
  fontSize?: number;
  bodyCenter?: string;
  bodyMid?: string;
  bodyEdge?: string;
  ringColor?: string;
  outerGlowColor?: string;
  midGlowColor?: string;
  dotGlowColor?: string;
  dotCoreColor?: string;
  sideFillTop?: string;
  sideFillMid?: string;
  sideFillBottom?: string;
  sideStroke?: string;
  sideGlow?: string;
  frontFillTop?: string;
  frontFillMid?: string;
  frontFillBottom?: string;
  hoverInsetExpand?: number;
  hoverClampGlowColor?: string;
  hoverClampGlowOpacity?: number;
  clickInsetExpand?: number;
  clickRingFlashColor?: string;
  clickRingFlashOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function splitLabelIntoLines(label: string, maxCharsPerLine: number) {
  const cleaned = label.trim();
  if (!cleaned) {
    return [""];
  }

  if (cleaned.includes("\n")) {
    return cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 2);
  }

  const words = cleaned.split(" ").filter((word) => word.length > 0);
  const normalized = words.join(" ");
  if (normalized.length <= maxCharsPerLine) {
    return [normalized];
  }

  if (words.length === 1) {
    const mid = Math.ceil(normalized.length / 2);
    return [normalized.slice(0, mid), normalized.slice(mid)].filter(Boolean).slice(0, 2);
  }

  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 1; i < words.length; i += 1) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const balancePenalty = Math.abs(left.length - right.length);
    const overflowPenalty = Math.max(0, left.length - maxCharsPerLine) + Math.max(0, right.length - maxCharsPerLine);
    const score = balancePenalty + overflowPenalty * 4;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")].filter(Boolean).slice(0, 2);
}

function SideBack({
  x,
  y,
  mirrored,
  sideFillId,
  glowId,
  sideStroke,
  sideGlow,
}: {
  x: number;
  y: number;
  mirrored?: boolean;
  sideFillId: string;
  glowId: string;
  sideStroke: string;
  sideGlow: string;
}) {
  const transform = `translate(${x} ${y})${mirrored ? " scale(-1 1)" : ""}`;

  return (
    <g transform={transform}>
      <use
        href="#sideBackShape"
        fill="none"
        stroke={sideGlow}
        strokeWidth="7"
        strokeLinejoin="round"
        opacity="0.7"
        filter={`url(#${glowId})`}
      />
      <use href="#sideBackShape" fill={`url(#${sideFillId})`} stroke={sideStroke} strokeWidth="2" strokeLinejoin="round" />
      <use href="#sideBackShape" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.25" transform="translate(1 1)" />
    </g>
  );
}

function SideFront({
  x,
  y,
  mirrored,
  frontFillId,
  glowId,
  sideStroke,
  sideGlow,
}: {
  x: number;
  y: number;
  mirrored?: boolean;
  frontFillId: string;
  glowId: string;
  sideStroke: string;
  sideGlow: string;
}) {
  const transform = `translate(${x} ${y})${mirrored ? " scale(-1 1)" : ""}`;

  return (
    <g transform={transform}>
      <use
        href="#sideFrontShape"
        fill="none"
        stroke={sideGlow}
        strokeWidth="7"
        strokeLinejoin="round"
        opacity="0.7"
        filter={`url(#${glowId})`}
      />
      <use href="#sideFrontShape" fill={`url(#${frontFillId})`} stroke={sideStroke} strokeWidth="2" strokeLinejoin="round" />
      <use href="#sideFrontShape" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.25" transform="translate(1 1)" />
    </g>
  );
}

export function HudButton({
  label = "PLAY",
  width = 500,
  height = 140,
  radius = 58,
  leftX,
  rightX,
  sideInset = 0,
  dotInset = 20,
  dotGap = 15,
  textColor = "#fff7ff",
  fontSize = 34,
  bodyCenter = "#2b064a",
  bodyMid = "#17002a",
  bodyEdge = "#0a0013",
  ringColor = "#ea6bff",
  outerGlowColor = "#9d00ff",
  midGlowColor = "#e25eff",
  dotGlowColor = "#ffca28",
  dotCoreColor = "#fff59d",
  sideFillTop = "#3d0f69",
  sideFillMid = "#21043c",
  sideFillBottom = "#10011f",
  sideStroke = "#eb7aff",
  sideGlow = "#b020ff",
  frontFillTop = "#0f2a66",
  frontFillMid = "#0a1b3f",
  frontFillBottom = "#050d1f",
  hoverInsetExpand = 10,
  hoverClampGlowColor = "#ffd34d",
  hoverClampGlowOpacity = 0.9,
  clickInsetExpand = 14,
  clickRingFlashColor = "#39ff88",
  clickRingFlashOpacity = 0.95,
  className,
  style,
  onClick,
}: HudButtonProps) {
  const uid = useId().replace(/:/g, "");
  const [isHovered, setIsHovered] = useState(false);
  const [clickFlash, setClickFlash] = useState(0);

  useEffect(() => {
    if (clickFlash === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => setClickFlash(0), 220);
    return () => window.clearTimeout(timeoutId);
  }, [clickFlash]);

  const bodyX = 0;
  const bodyY = 0;
  const bodyW = width;
  const bodyH = height;
  const centerX = bodyX + bodyW / 2;
  const centerY = bodyY + bodyH / 2;

  const baseLeftX = leftX ?? bodyX + sideInset;
  const baseRightX = rightX ?? bodyX + bodyW - sideInset;

  const activeInsetExpand = clickFlash > 0 ? clickInsetExpand : isHovered ? hoverInsetExpand : 0;
  const animatedLeftX = baseLeftX - activeInsetExpand;
  const animatedRightX = baseRightX + activeInsetExpand;

  const safeDotInset = clamp(dotInset, 4, Math.min(bodyW / 4, bodyH / 3));
  const innerX = bodyX + safeDotInset;
  const innerY = bodyY + safeDotInset;
  const innerW = Math.max(20, bodyW - safeDotInset * 2);
  const innerH = Math.max(20, bodyH - safeDotInset * 2);
  const innerR = Math.max(4, Math.min(radius - safeDotInset, innerH / 2));

  const floorGlowRx = Math.max(90, bodyW * 0.38);
  const floorGlowRx2 = Math.max(55, bodyW * 0.22);
  const floorGlowRx3 = Math.max(18, bodyW * 0.08);
  const floorGlowY = bodyY + bodyH + Math.max(10, bodyH * 0.08);
  const artYOffset = Math.max(6, Math.round(height * 0.04));

  const maxCharsPerLine = Math.max(8, Math.floor(bodyW / (fontSize * 0.72)));
  const labelLines = splitLabelIntoLines(label, maxCharsPerLine);
  const lineHeight = fontSize * 1.08;
  const textStartY = labelLines.length > 1 ? centerY - lineHeight * 0.38 : centerY + fontSize * 0.35;

  const viewBox = useMemo(() => {
    const maxExpand = Math.max(hoverInsetExpand, clickInsetExpand);
    const minX = Math.min(-52, baseLeftX - 52 - maxExpand);
    const minY = -24;
    const maxX = Math.max(bodyW + 52, baseRightX + 52 + maxExpand);
    const maxY = Math.max(bodyH + 56 + artYOffset, floorGlowY + 20 + artYOffset);
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [artYOffset, bodyW, bodyH, baseLeftX, baseRightX, floorGlowY, hoverInsetExpand, clickInsetExpand]);

  const bodyFillId = `bodyFill-${uid}`;
  const sideFillId = `sideFill-${uid}`;
  const frontFillId = `frontFill-${uid}`;
  const glowStrongId = `glowStrong-${uid}`;
  const glowMidId = `glowMid-${uid}`;
  const glowYellowId = `glowYellow-${uid}`;
  const glowWhiteId = `glowWhite-${uid}`;
  const softShadowId = `softShadow-${uid}`;

  const clampGlowOpacity = clickFlash > 0 ? 1 : isHovered ? hoverClampGlowOpacity : 0;
  const ringStroke = clickFlash > 0 ? clickRingFlashColor : ringColor;
  const ringGlowFilter = clickFlash > 0 || isHovered ? `url(#${glowMidId})` : undefined;
  const outerGlowOpacity = clickFlash > 0 ? 0.38 : 0.28;
  const midGlowOpacityValue = clickFlash > 0 ? 0.62 : 0.45;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setClickFlash((current) => current + 1)}
      className={className}
      style={{
        background: "transparent",
        border: 0,
        padding: 0,
        cursor: onClick ? "pointer" : "default",
        width: "100%",
        ...style,
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <filter id={glowStrongId} x="-40%" y="-50%" width="180%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={glowMidId} x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={glowYellowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={glowWhiteId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={softShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={bodyFillId} cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor={bodyCenter} />
            <stop offset="65%" stopColor={bodyMid} />
            <stop offset="100%" stopColor={bodyEdge} />
          </radialGradient>
          <linearGradient id={sideFillId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={sideFillTop} />
            <stop offset="50%" stopColor={sideFillMid} />
            <stop offset="100%" stopColor={sideFillBottom} />
          </linearGradient>
          <linearGradient id={frontFillId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={frontFillTop} />
            <stop offset="50%" stopColor={frontFillMid} />
            <stop offset="100%" stopColor={frontFillBottom} />
          </linearGradient>
          <g id="sideBackShape">
            <path d="M 60 -68 L 15 -68 L -25 -45 L -25 -12 L 15 -12 Q 40 -40 60 -68 Z" />
            <path d="M 15 12 L -25 12 L -25 45 L 15 68 L 60 68 Q 40 40 15 12 Z" />
          </g>
          <g id="sideFrontShape">
            <path d="M -25 -22 L 4 -12 Q 10 0 4 12 L -25 22 Q -42 0 -25 -22 Z" />
          </g>
        </defs>

        <g transform={`translate(0 ${artYOffset})`}>
          <ellipse
            cx={centerX}
            cy={bodyY + bodyH + bodyH * 0.95}
            rx={floorGlowRx}
            ry={18}
            fill={outerGlowColor}
            opacity={clickFlash > 0 ? 0.36 : isHovered ? 0.33 : 0.3}
            filter={`url(#${glowStrongId})`}
          />
          <ellipse
            cx={centerX}
            cy={bodyY + bodyH + bodyH * 0.97}
            rx={floorGlowRx2}
            ry={5}
            fill={midGlowColor}
            opacity={clickFlash > 0 ? 0.72 : isHovered ? 0.62 : 0.55}
            filter={`url(#${glowStrongId})`}
          />
          <ellipse
            cx={centerX}
            cy={bodyY + bodyH + bodyH * 0.98}
            rx={floorGlowRx3}
            ry={2}
            fill="#ffffff"
            opacity={clickFlash > 0 ? 0.95 : 0.8}
            filter={`url(#${glowWhiteId})`}
          />

          <rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            rx={radius}
            fill="none"
            stroke={outerGlowColor}
            strokeWidth="16"
            opacity={outerGlowOpacity}
            filter={`url(#${glowStrongId})`}
          />
          <rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            rx={radius}
            fill="none"
            stroke={midGlowColor}
            strokeWidth="8"
            opacity={midGlowOpacityValue}
            filter={`url(#${glowMidId})`}
          />

          <motion.g animate={{ x: animatedLeftX - baseLeftX }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
            <SideBack x={baseLeftX} y={centerY} sideFillId={sideFillId} glowId={glowMidId} sideStroke={sideStroke} sideGlow={sideGlow} />
          </motion.g>
          <motion.g animate={{ x: animatedRightX - baseRightX }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
            <SideBack
              x={baseRightX}
              y={centerY}
              mirrored
              sideFillId={sideFillId}
              glowId={glowMidId}
              sideStroke={sideStroke}
              sideGlow={sideGlow}
            />
          </motion.g>

          <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={radius} fill={`url(#${bodyFillId})`} />
          <rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            rx={radius}
            fill="none"
            stroke="#000000"
            strokeWidth="8"
            opacity="0.45"
            filter={`url(#${softShadowId})`}
          />
          <rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            rx={radius}
            fill="none"
            stroke={ringStroke}
            strokeWidth="3"
            filter={ringGlowFilter}
            style={{
              opacity: clickFlash > 0 ? clickRingFlashOpacity : 1,
              transition: "opacity 180ms ease",
            }}
          />
          <rect
            x={innerX}
            y={innerY}
            width={innerW}
            height={innerH}
            rx={innerR}
            fill="none"
            stroke={dotGlowColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={`0.1 ${dotGap}`}
            opacity="0.95"
            filter={`url(#${glowYellowId})`}
          />
          <rect
            x={innerX}
            y={innerY}
            width={innerW}
            height={innerH}
            rx={innerR}
            fill="none"
            stroke={dotCoreColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray={`0.1 ${dotGap}`}
          />

          <motion.g animate={{ x: animatedLeftX - baseLeftX }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
            <SideFront x={baseLeftX} y={centerY} frontFillId={frontFillId} glowId={glowMidId} sideStroke={sideStroke} sideGlow={sideGlow} />
            <g style={{ opacity: clampGlowOpacity, transition: "opacity 160ms ease" }}>
              <g transform={`translate(${animatedLeftX} ${centerY})`}>
                <use
                  href="#sideFrontShape"
                  fill={hoverClampGlowColor}
                  stroke={hoverClampGlowColor}
                  strokeWidth="2.5"
                  filter={`url(#${glowYellowId})`}
                />
              </g>
            </g>
          </motion.g>

          <motion.g animate={{ x: animatedRightX - baseRightX }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
            <SideFront x={baseRightX} y={centerY} mirrored frontFillId={frontFillId} glowId={glowMidId} sideStroke={sideStroke} sideGlow={sideGlow} />
            <g style={{ opacity: clampGlowOpacity, transition: "opacity 160ms ease" }}>
              <g transform={`translate(${animatedRightX} ${centerY}) scale(-1 1)`}>
                <use
                  href="#sideFrontShape"
                  fill={hoverClampGlowColor}
                  stroke={hoverClampGlowColor}
                  strokeWidth="2.5"
                  filter={`url(#${glowYellowId})`}
                />
              </g>
            </g>
          </motion.g>

          <text
            x={centerX}
            y={textStartY}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight="700"
            letterSpacing="0.16em"
            fill={textColor}
            filter={`url(#${glowWhiteId})`}
            style={{ userSelect: "none" }}
          >
            {labelLines.map((line, index) => (
              <tspan key={`${line}-${index}`} x={centerX} dy={index === 0 ? 0 : lineHeight}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      </svg>
    </button>
  );
}

export default HudButton;
