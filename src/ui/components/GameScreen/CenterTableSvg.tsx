import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Mlogo from '../../../assets/Mlogo.png';

function extractAlphaFromRgba(color: string | undefined): number {
  if (!color) return 1;
  const rgbaMatch = color.match(/^rgba?\(\s*([^)]+)\)/i);
  if (!rgbaMatch) return 1;
  const parts = rgbaMatch[1]
    .split(',')
    .map((segment) => parseFloat(segment.trim()))
    .filter((value) => !Number.isNaN(value));
  if (rgbaMatch[0].toLowerCase().startsWith('rgba') && parts.length === 4) {
    return Math.max(0, Math.min(1, parts[3]));
  }
  if (parts.length === 4) {
    return Math.max(0, Math.min(1, parts[3]));
  }
  return 1;
}

interface GradientStop {
  color: string;
  offset?: string;
}

interface ParsedLinearGradient {
  angle: number;
  stops: GradientStop[];
  coords: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  source: string;
}

function splitGradientArgs(input: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (char === ',' && depth === 0) {
      if (current.trim()) {
        result.push(current.trim());
      }
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

function parseColorStop(token: string): GradientStop | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const percentMatch = trimmed.match(/(-?\d*\.?\d+%)(?!.*-?\d*\.?\d+%)/);
  if (percentMatch && percentMatch.index !== undefined) {
    const offset = percentMatch[1];
    const color = trimmed.slice(0, percentMatch.index).trim();
    return {
      color: color || 'transparent',
      offset,
    };
  }

  return {
    color: trimmed,
  };
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function parseLinearGradient(value?: string | null): ParsedLinearGradient | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^linear-gradient\((.*)\)$/i);
  if (!match) {
    return null;
  }

  const args = splitGradientArgs(match[1]);
  if (!args.length) {
    return null;
  }

  let angle = 180;
  let stopStartIdx = 0;

  const first = args[0].toLowerCase();
  if (first.endsWith('deg')) {
    angle = parseFloat(first);
    stopStartIdx = 1;
  } else if (first.endsWith('turn')) {
    angle = parseFloat(first) * 360;
    stopStartIdx = 1;
  } else if (first.endsWith('rad')) {
    angle = (parseFloat(first) * 180) / Math.PI;
    stopStartIdx = 1;
  }

  const stops = args.slice(stopStartIdx).map(parseColorStop).filter((stop): stop is GradientStop => Boolean(stop));
  if (!stops.length) {
    return null;
  }

  const normalizedAngle = normalizeAngle(angle);
  const rad = ((90 - normalizedAngle) * Math.PI) / 180;
  const x1 = 50 - Math.cos(rad) * 50;
  const y1 = 50 + Math.sin(rad) * 50;
  const x2 = 50 + Math.cos(rad) * 50;
  const y2 = 50 - Math.sin(rad) * 50;

  return {
    angle: normalizedAngle,
    stops,
    coords: {
      x1,
      y1,
      x2,
      y2,
    },
    source: trimmed,
  };
}

export type EmblemStyle = 'glass' | 'hole';

export interface AnchorPoint {
  x: number;
  y: number;
  radius: number;
}

export interface CenterTableSVGProps {
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
  anchorPoint?: AnchorPoint | null;
  followAnchor?: boolean;
  minScale?: number;
  maxScale?: number;
  responsivePaddingX?: number;
  responsivePaddingY?: number;

  rimThickness?: number;
  rimColor?: string;
  rimGlowColor?: string;
  rimGlowIntensity?: number;
  rimGlowSpread?: number;
  rimInnerGap?: number;
  rimGlowThickness?: number;
  rimGlowBlendMode?: CSSProperties['mixBlendMode'];

  innerRimThickness?: number;
  innerRimColor?: string;
  innerRimTexture?: string;
  innerRimTextureBlendMode?: CSSProperties['mixBlendMode'];
  innerRimTextureOpacity?: number;

  feltInner?: string;
  feltOuter?: string;
  feltInnerColor?: string;
  feltOuterColor?: string;
  feltInset?: number;

  curvature?: number;
  emblemSize?: number;
  emblemStyle?: EmblemStyle;
  emblemInnerColor?: string;
  emblemOuterColor?: string;
  emblemBlendMode?: CSSProperties['mixBlendMode'];

  emblemImageHref?: string;
  emblemImageSrc?: string;
  emblemImageAlt?: string;
  showEmblemImage?: boolean;

  className?: string;
  containerClassName?: string;
}

interface ResolvedCenterTableSvgProps {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  zIndex: number;
  anchorPoint: AnchorPoint | null;
  followAnchor: boolean;
  minScale: number;
  maxScale: number;
  responsivePaddingX: number;
  responsivePaddingY: number;
  rimThickness: number;
  rimColor: string;
  rimGlowColor: string;
  rimGlowIntensity: number;
  rimGlowSpread: number;
  rimInnerGap: number;
  rimGlowThickness: number;
  rimGlowBlendMode?: CSSProperties['mixBlendMode'];
  innerRimThickness: number;
  innerRimColor: string;
  innerRimTexture: string;
  innerRimTextureBlendMode?: CSSProperties['mixBlendMode'];
  innerRimTextureOpacity: number;
  feltInner: string;
  feltOuter: string;
  feltInset: number;
  curvature: number;
  emblemSize: number;
  emblemStyle: EmblemStyle;
  emblemInnerColor: string;
  emblemOuterColor: string;
  emblemBlendMode?: CSSProperties['mixBlendMode'];
  emblemImageHref: string;
  emblemImageAlt: string;
  showEmblemImage: boolean;
  className: string;
  containerClassName: string;
}

const RESOLVED_DEFAULTS: ResolvedCenterTableSvgProps = {
  // Layout & positioning
  width: 900,
  height: 512,
  offsetX: 0,
  offsetY: -80,
  zIndex: 100,
  anchorPoint: null,
  followAnchor: false,
  minScale: 0.35,
  maxScale: 1,
  responsivePaddingX: 10,
  responsivePaddingY: 10,

  // Overall table geometry
  curvature: 1,

  // Outer rim (gold metal)
  rimThickness: 3,
  rimColor: 'rgb(244, 197, 66)',
  rimGlowColor: 'rgb(66, 244, 125)',
  rimGlowIntensity: 3,
  rimGlowSpread: 10,
  rimInnerGap: 1,
  rimGlowThickness: 5,
  rimGlowBlendMode: 'screen',

  // Inner rim (wood / secondary ring)
  innerRimThickness: 75,
  innerRimColor: 'rgba(3, 199, 45, 0.27)',
  innerRimTexture: 'linear-gradient(145deg, rgb(0, 255, 98) 0%, rgb(0, 34, 54) 100%)',
  innerRimTextureBlendMode: 'screen',
  innerRimTextureOpacity: 0.75,

  // Felt surface colors
  feltInner: 'rgba(0,170,91,0.18)',
  feltOuter: 'rgba(0,70,40,0.56)',
  feltInset: -3,



  // Emblem (center logo) tint
  emblemInnerColor: 'rgb(0, 0, 0)',
  emblemOuterColor: 'rgba(98,255,0,0.74)',
  emblemBlendMode: 'screen',
  emblemSize: 0.5,
  emblemStyle: 'glass',

  // Emblem image defaults
  emblemImageHref: Mlogo,
  emblemImageAlt: 'M logo emblem',
  showEmblemImage: true,

  // CSS class hooks
  className: '',
  containerClassName: 'center-table',
};

function resolveProps(props: CenterTableSVGProps): ResolvedCenterTableSvgProps {
  const width = props.width ?? RESOLVED_DEFAULTS.width;
  const height = props.height ?? RESOLVED_DEFAULTS.height;
  const offsetX = props.offsetX ?? RESOLVED_DEFAULTS.offsetX;
  const offsetY = props.offsetY ?? RESOLVED_DEFAULTS.offsetY;
  const zIndex = props.zIndex ?? RESOLVED_DEFAULTS.zIndex;
  const anchorPoint = props.anchorPoint ?? RESOLVED_DEFAULTS.anchorPoint;
  const followAnchor = props.followAnchor ?? RESOLVED_DEFAULTS.followAnchor;
  const minScale = props.minScale ?? RESOLVED_DEFAULTS.minScale;
  const maxScale = props.maxScale ?? RESOLVED_DEFAULTS.maxScale;
  const responsivePaddingX = props.responsivePaddingX ?? RESOLVED_DEFAULTS.responsivePaddingX;
  const responsivePaddingY = props.responsivePaddingY ?? RESOLVED_DEFAULTS.responsivePaddingY;

  const rimThickness = props.rimThickness ?? RESOLVED_DEFAULTS.rimThickness;
  const rimColor = props.rimColor ?? RESOLVED_DEFAULTS.rimColor;
  const rimGlowColor = props.rimGlowColor ?? RESOLVED_DEFAULTS.rimGlowColor;
  const rimGlowIntensity = props.rimGlowIntensity ?? RESOLVED_DEFAULTS.rimGlowIntensity;
  const rimGlowSpread = props.rimGlowSpread ?? RESOLVED_DEFAULTS.rimGlowSpread;
  const rimInnerGap = props.rimInnerGap ?? RESOLVED_DEFAULTS.rimInnerGap;
  const rimGlowThickness =
    props.rimGlowThickness ?? props.rimThickness ?? RESOLVED_DEFAULTS.rimGlowThickness;
  const rimGlowBlendMode = props.rimGlowBlendMode ?? RESOLVED_DEFAULTS.rimGlowBlendMode;

  const innerRimThickness = props.innerRimThickness ?? RESOLVED_DEFAULTS.innerRimThickness;
  const innerRimColor = props.innerRimColor ?? RESOLVED_DEFAULTS.innerRimColor;
  const innerRimTexture = props.innerRimTexture ?? RESOLVED_DEFAULTS.innerRimTexture;
  const innerRimTextureBlendMode =
    props.innerRimTextureBlendMode ?? RESOLVED_DEFAULTS.innerRimTextureBlendMode;
  const innerRimTextureOpacity =
    props.innerRimTextureOpacity ?? RESOLVED_DEFAULTS.innerRimTextureOpacity;

  const feltInner = props.feltInnerColor ?? props.feltInner ?? RESOLVED_DEFAULTS.feltInner;
  const feltOuter = props.feltOuterColor ?? props.feltOuter ?? RESOLVED_DEFAULTS.feltOuter;
  const feltInset = props.feltInset ?? RESOLVED_DEFAULTS.feltInset;

  const curvature = props.curvature ?? RESOLVED_DEFAULTS.curvature;
  const emblemSize = props.emblemSize ?? RESOLVED_DEFAULTS.emblemSize;
  const emblemStyle = props.emblemStyle ?? RESOLVED_DEFAULTS.emblemStyle;
  const emblemInnerColor = props.emblemInnerColor ?? RESOLVED_DEFAULTS.emblemInnerColor;
  const emblemOuterColor = props.emblemOuterColor ?? RESOLVED_DEFAULTS.emblemOuterColor;
  const emblemBlendMode =
    props.emblemBlendMode ??
    (emblemStyle === 'hole' ? ('multiply' as CSSProperties['mixBlendMode']) : RESOLVED_DEFAULTS.emblemBlendMode);

  const emblemImageHref = props.emblemImageHref ?? props.emblemImageSrc ?? RESOLVED_DEFAULTS.emblemImageHref;
  const emblemImageAlt = props.emblemImageAlt ?? RESOLVED_DEFAULTS.emblemImageAlt;
  const showEmblemImage = props.showEmblemImage ?? Boolean(emblemImageHref);

  const className = props.className ?? RESOLVED_DEFAULTS.className;
  const containerClassName = props.containerClassName ?? RESOLVED_DEFAULTS.containerClassName;

  return {
    width,
    height,
    offsetX,
    offsetY,
    zIndex,
    anchorPoint,
    followAnchor,
    minScale,
    maxScale,
    responsivePaddingX,
    responsivePaddingY,
    rimThickness,
    rimColor,
    rimGlowColor,
    rimGlowIntensity,
    rimGlowSpread,
    rimInnerGap,
    rimGlowThickness,
    rimGlowBlendMode,
    innerRimThickness,
    innerRimColor,
    innerRimTexture,
    innerRimTextureBlendMode,
    innerRimTextureOpacity,
    feltInner,
    feltOuter,
    feltInset,
    curvature,
    emblemSize,
    emblemStyle,
    emblemInnerColor,
    emblemOuterColor,
    emblemBlendMode,
    emblemImageHref,
    emblemImageAlt,
    showEmblemImage,
    className,
    containerClassName,
  };
}

export default function CenterTableSVG(props: CenterTableSVGProps) {
  const p = resolveProps(props);
  const { width, height, minScale, maxScale, responsivePaddingX, responsivePaddingY } = p;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      const availableWidth = viewportWidth - responsivePaddingX * 2;
      const availableHeight = viewportHeight - responsivePaddingY * 2;

      const safeAvailableWidth = Math.max(availableWidth, minScale * width);
      const safeAvailableHeight = Math.max(availableHeight, minScale * height);

      const rawScale = Math.min(safeAvailableWidth / width, safeAvailableHeight / height, maxScale);
      const clamped = Math.max(minScale, Math.min(rawScale, maxScale));
      setScale(clamped);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, [height, maxScale, minScale, responsivePaddingX, responsivePaddingY, width]);

  const vw = 1000;
  const vh = Math.round(vw * (p.height / p.width));
  const unit = vw / p.width;
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const curvature = clamp01(p.curvature);

  const pxToView = (value: number) => value * unit;

  const outerRimStroke = pxToView(p.rimThickness);
  const innerRimStroke = pxToView(p.innerRimThickness);
  const gapBetweenRims = pxToView(p.rimInnerGap);
  const feltInsetExtra = pxToView(p.feltInset);
  const edgeHighlightStroke = pxToView(2);

  const createRoundedRect = (offset: number) => {
    const width = Math.max(0, vw - offset * 2);
    const height = Math.max(0, vh - offset * 2);
    const rx = Math.min(width / 2, (width * curvature) / 2);
    const ry = Math.min(height / 2, (height * curvature) / 2);
    return {
      x: offset,
      y: offset,
      width,
      height,
      rx,
      ry,
    };
  };

  const outerRect = createRoundedRect(outerRimStroke / 2);

  const innerRimOffset = outerRimStroke + gapBetweenRims + innerRimStroke / 2;
  const innerRimRect = createRoundedRect(innerRimOffset);

  const feltOffset = outerRimStroke + gapBetweenRims + innerRimStroke + feltInsetExtra;
  const feltRect = createRoundedRect(feltOffset);

  const edgeHighlightOffset = outerRimStroke * 0.4;
  const edgeHighlightRect = createRoundedRect(edgeHighlightOffset);

  const cx = vw / 2;
  const cy = vh / 2;

  const surfaceRadius = Math.min(feltRect.width, feltRect.height) / 2;
  const emblemRadius = surfaceRadius * p.emblemSize;

  const rimGlowIntensity = Math.max(0, p.rimGlowIntensity);
  const rimGlowSpread = Math.max(0, p.rimGlowSpread);
  const glowBoost = Math.log10(1 + rimGlowIntensity);
  const rimGlowStrokeWidth = pxToView(p.rimGlowThickness);
  const rimGlowBlurStd =
    pxToView(p.rimGlowThickness) *
    (1 + rimGlowSpread * 0.65 + glowBoost * 0.45);
  const rimGlowOpacity = Math.min(1, 0.2 + glowBoost * 0.6);
  const rimGlowRect = outerRect;
  const rimShadowStdDeviation = rimGlowBlurStd * 0.45;
  const rimShadowBlur = rimGlowBlurStd * 0.25;
  const rimShadowOpacity = Math.min(0.65, 0.12 + glowBoost * 0.22);

  const innerRimGradient = useMemo(() => parseLinearGradient(p.innerRimTexture), [p.innerRimTexture]);
  const innerRimGradientSignature = innerRimGradient?.source ?? '';
  const innerRimGradientId = useMemo(
    () => (innerRimGradientSignature ? `ct-inner-grad-${Math.random().toString(36).slice(2, 9)}` : ''),
    [innerRimGradientSignature]
  );
  const emblemGradientId = useMemo(
    () => `ct-emblem-grad-${Math.random().toString(36).slice(2, 9)}`,
    []
  );
  const emblemClipId = useMemo(
    () => `ct-emblem-clip-${Math.random().toString(36).slice(2, 9)}`,
    []
  );
  const emblemImageHref = p.emblemImageHref;
  const shouldShowImage = p.showEmblemImage && Boolean(emblemImageHref);
  const emblemGroupStyle = p.emblemBlendMode ? { mixBlendMode: p.emblemBlendMode } : undefined;

  const containerStyle = useMemo(() => {
    const base: CSSProperties = {
      position: 'absolute',
      transform: `translate(-50%, -50%) scale(${scale})`,
      transformOrigin: 'center',
      width: p.width,
      height: p.height,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: p.zIndex,
    };

    if (p.followAnchor && p.anchorPoint) {
      base.left = `${p.anchorPoint.x + p.offsetX}px`;
      base.top = `${p.anchorPoint.y + p.offsetY}px`;
    } else {
      base.left = `calc(50% + ${p.offsetX}px)`;
      base.top = `calc(50% + ${p.offsetY}px)`;
    }

    return base;
  }, [p.anchorPoint, p.followAnchor, p.height, p.offsetX, p.offsetY, p.width, p.zIndex, scale]);

  return (
    <div className={p.containerClassName || undefined} style={containerStyle} role="presentation">
      <svg
        width={p.width}
        height={p.height}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        className={p.className}
        role="img"
        aria-label="Center poker table"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="rimGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#fff6d6" stopOpacity="1" />
            <stop offset="30%" stopColor={p.rimColor} stopOpacity="1" />
            <stop offset="70%" stopColor="#a06a08" stopOpacity="1" />
            <stop offset="100%" stopColor="#2b1700" stopOpacity="1" />
          </linearGradient>

          <radialGradient id="feltGrad" cx="50%" cy="48%" r="70%">
            <stop offset="0%" stopColor={p.feltInner} stopOpacity="1" />
            <stop offset="100%" stopColor={p.feltOuter} stopOpacity="1" />
          </radialGradient>

          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </radialGradient>

          <filter id="feltTexture" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
            <feComponentTransfer in="mono" result="tex">
              <feFuncA type="table" tableValues="0 0.06" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="tex" mode="overlay" />
          </filter>

          <filter id="rimGlow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation={rimGlowBlurStd} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>

          <filter id="rimShadow" x="-150%" y="-150%" width="400%" height="400%">
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation={rimShadowStdDeviation}
              floodColor={p.rimGlowColor}
              floodOpacity={rimShadowOpacity}
            />
            <feGaussianBlur stdDeviation={rimShadowBlur} />
          </filter>

          <filter id="innerEmboss" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feSpecularLighting
              in="blur"
              surfaceScale="6"
              specularConstant="0.4"
              specularExponent="20"
              lightingColor="#fff"
              result="specOut"
            >
              <fePointLight x={cx - 200} y={cy - 300} z="800" />
            </feSpecularLighting>
            <feComposite in="specOut" in2="SourceAlpha" operator="in" result="litOnly" />
            <feBlend in="SourceGraphic" in2="litOnly" mode="overlay" />
          </filter>

          <filter id="glass" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feSpecularLighting
              in="blur"
              surfaceScale="3"
              specularConstant="0.6"
              specularExponent="22"
              lightingColor="#fff"
            >
              <fePointLight x={cx - 120} y={cy - 200} z="600" />
            </feSpecularLighting>
            <feComposite in2="SourceAlpha" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feOffset dx="0" dy="6" />
            <feGaussianBlur stdDeviation="6" result="o" />
            <feComposite in="o" in2="SourceAlpha" operator="out" result="shadow" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0" />
            <feBlend in2="SourceGraphic" mode="multiply" />
          </filter>

          {innerRimGradient && innerRimGradientId ? (
            <linearGradient
              id={innerRimGradientId}
              x1={`${innerRimGradient.coords.x1}%`}
              y1={`${innerRimGradient.coords.y1}%`}
              x2={`${innerRimGradient.coords.x2}%`}
              y2={`${innerRimGradient.coords.y2}%`}
            >
              {innerRimGradient.stops.map((stop, index) => {
                const denominator = Math.max(1, innerRimGradient.stops.length - 1);
                const fallbackOffset = `${(index / denominator) * 100}%`;
                return (
                  <stop
                    key={`${innerRimGradientId}-stop-${index}`}
                    offset={stop.offset ?? fallbackOffset}
                    stopColor={stop.color}
                    stopOpacity="1"
                  />
                );
              })}
            </linearGradient>
          ) : null}

          <radialGradient id={emblemGradientId} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={p.emblemInnerColor} stopOpacity="1" />
            <stop offset="100%" stopColor={p.emblemOuterColor} stopOpacity="1" />
          </radialGradient>

          <clipPath id={emblemClipId}>
            <circle cx={cx} cy={cy} r={emblemRadius} />
          </clipPath>
        </defs>

        <rect x="0" y="0" width={vw} height={vh} fill="rgba(0,0,0,0)" />

        <rect
          {...rimGlowRect}
          fill="none"
          stroke={p.rimGlowColor}
          strokeWidth={rimGlowStrokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={rimGlowOpacity}
          style={{ mixBlendMode: p.rimGlowBlendMode ?? 'screen' }}
          filter="url(#rimGlow)"
        />

        <rect
          {...outerRect}
          fill="none"
          stroke="url(#rimGrad)"
          strokeWidth={outerRimStroke}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#rimShadow)"
        />

        <rect
          {...innerRimRect}
          fill="none"
          stroke={p.innerRimColor}
          strokeWidth={innerRimStroke}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ mixBlendMode: 'screen' }}
          opacity={extractAlphaFromRgba(p.innerRimColor)}
        />
        {innerRimGradient && innerRimGradientId ? (
          <rect
            {...innerRimRect}
            fill="none"
            stroke={`url(#${innerRimGradientId})`}
            strokeWidth={innerRimStroke}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={
              p.innerRimTextureBlendMode
                ? { mixBlendMode: p.innerRimTextureBlendMode }
                : undefined
            }
            opacity={p.innerRimTextureOpacity}
            filter="url(#innerEmboss)"
          />
        ) : null}

        <g filter="url(#feltTexture)">
          <rect
            {...feltRect}
            fill="url(#feltGrad)"
          />
        </g>

        <rect
          {...feltRect}
          fill="url(#vignette)"
        />

        {p.emblemStyle === 'glass' ? (
          <g filter="url(#glass)" style={emblemGroupStyle}>
            <circle cx={cx} cy={cy} r={emblemRadius} fill={`url(#${emblemGradientId})`} stroke="none" />
            {shouldShowImage && emblemImageHref && (
              <g clipPath={`url(#${emblemClipId})`}>
                <image
                  href={emblemImageHref}
                  x={cx - emblemRadius}
                  y={cy - emblemRadius}
                  width={emblemRadius * 2}
                  height={emblemRadius * 2}
                  preserveAspectRatio="xMidYMid slice"
                  aria-label={p.emblemImageAlt}
                />
              </g>
            )}
            <circle
              cx={cx}
              cy={cy}
              r={emblemRadius}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={2}
            />
          </g>
        ) : (
          <g filter="url(#innerShadow)" style={emblemGroupStyle}>
            <circle cx={cx} cy={cy} r={emblemRadius} fill={`url(#${emblemGradientId})`} stroke="none" />
            {shouldShowImage && emblemImageHref && (
              <g clipPath={`url(#${emblemClipId})`}>
                <image
                  href={emblemImageHref}
                  x={cx - emblemRadius}
                  y={cy - emblemRadius}
                  width={emblemRadius * 2}
                  height={emblemRadius * 2}
                  preserveAspectRatio="xMidYMid slice"
                  aria-label={p.emblemImageAlt}
                />
              </g>
            )}
            <circle
              cx={cx}
              cy={cy}
              r={emblemRadius}
              fill="none"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={2}
            />
          </g>
        )}

        <rect
          {...edgeHighlightRect}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={edgeHighlightStroke}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ mixBlendMode: 'screen' }}
        />
      </svg>
    </div>
  );
}
