import React, { useRef, useLayoutEffect } from "react";
import cardBgTexture from "../../../assets/BgCards/CardBg.png";
import cardClubFilled from "../../../assets/BgCards/Fullcard/256/CardClubFilled.png";
import cardClubHollow from "../../../assets/BgCards/Fullcard/256/CardClubHollow.png";
import cardDiamondFilled from "../../../assets/BgCards/Fullcard/256/CardDiamondFilled.png";
import cardDiamondHollow from "../../../assets/BgCards/Fullcard/256/CardDiamondHollow.png";
import cardHeartFilled from "../../../assets/BgCards/Fullcard/256/CardHeartFilled.png";
import cardHeartHollow from "../../../assets/BgCards/Fullcard/256/CardHeartHollow.png";
import cardSpadeFilled from "../../../assets/BgCards/Fullcard/256/CardSpadeFilled.png";
import cardSpadeHollow from "../../../assets/BgCards/Fullcard/256/CardSpadeHollow.png";
import clubCircleFilled from "../../../assets/BgCards/with circles/256/ClubWithCirclesFilled.png";
import clubCircleHollow from "../../../assets/BgCards/with circles/256/ClubWithCirclesHollow.png";
import diamondCircleFilled from "../../../assets/BgCards/with circles/256/DiamondWithCirclesFilled.png";
import diamondCircleHollow from "../../../assets/BgCards/with circles/256/DiamondWithCirclesHollow.png";
import heartCircleFilled from "../../../assets/BgCards/with circles/256/HeartWithCirclesFilled.png";
import heartCircleHollow from "../../../assets/BgCards/with circles/256/HeartWithCirclesHollow.png";
import spadeCircleFilled from "../../../assets/BgCards/with circles/256/SpadeWithCirclesFilled.png";
import spadeCircleHollow from "../../../assets/BgCards/with circles/256/SpadeWithCirclesHollow.png";
import "./GameBackground.css";

const TILE_X = 2; // 2 tiles horizontally
const TILE_Y = 1; // 1 tile vertically
const TEXTURE_SCALE = 1; // 1 = default size, <1 zooms out, >1 zooms in

const TextureBlendModes = {
  NORMAL: 'normal',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  OVERLAY: 'overlay',
  LIGHTEN: 'lighten',
  COLOR_DODGE: 'color-dodge',
} as const;

type TextureBlendMode = typeof TextureBlendModes[keyof typeof TextureBlendModes];

const TEXTURE_BLEND_MODE: TextureBlendMode = TextureBlendModes.SCREEN;
const TEXTURE_OPACITY = 0.25;

const OverlayBlendModes = {
  SCREEN: 'screen',
  LIGHTEN: 'lighten',
  COLOR_DODGE: 'color-dodge',
  HARD_LIGHT: 'hard-light',
  SOFT_LIGHT: 'soft-light',
} as const;

type OverlayBlendMode = typeof OverlayBlendModes[keyof typeof OverlayBlendModes];

const OVERLAY_OPACITY = 1;
const OVERLAY_BLEND_MODE: OverlayBlendMode = OverlayBlendModes.HARD_LIGHT;

const OVERLAY_CENTER_COLOR = 'hsl(125, 95.10%, 48.20%)';
const OVERLAY_TOP_COLOR = 'hsla(180, 89.80%, 38.60%, 0.42)';
const OVERLAY_BOTTOM_COLOR = 'hsla(192, 73.30%, 32.40%, 0.94)';

const OVERLAY_CENTER_SIZE = '100%';
const OVERLAY_TOP_SIZE = '55%';
const OVERLAY_BOTTOM_SIZE = '55%';

const OVERLAY_LAYERS = [
  { at: '50% 50%', color: OVERLAY_CENTER_COLOR, radius: OVERLAY_CENTER_SIZE },
  { at: '80% 20%', color: OVERLAY_TOP_COLOR, radius: OVERLAY_TOP_SIZE },
  { at: '20% 80%', color: OVERLAY_BOTTOM_COLOR, radius: OVERLAY_BOTTOM_SIZE },
];

const SymbolBlendModes = {
  NORMAL: 'normal',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  SOFT_LIGHT: 'soft-light',
  HARD_LIGHT: 'hard-light',
  COLOR_DODGE: 'color-dodge',
} as const;

type SymbolBlendMode = typeof SymbolBlendModes[keyof typeof SymbolBlendModes];

interface SymbolLayer {
  id: string;
  image: string;
  position: { x: string; y: string };
  size: { width: string; height: string };
  opacity: number;
  blend: SymbolBlendMode;
}

interface SuitVariant {
  id: 'filled' | 'hollow' | 'circle-filled' | 'circle-hollow';
  image: string;
  offset: { x: number; y: number };
  opacity: number;
  blend: SymbolBlendMode;
  size?: { width: string; height: string };
}

interface SuitConfig {
  id: string;
  anchor: { x: number; y: number };
  size: { width: string; height: string };
  variants: SuitVariant[];
}

const SUIT_CONFIGS: SuitConfig[] = [
  {
    id: 'club',
    anchor: { x: 15, y: 22 },
    size: { width: '12%', height: '22%' },
    variants: [
      {
        id: 'filled',
        image: cardClubFilled,
        offset: { x: 0, y: 0 },
        opacity: 0.25,
        blend: SymbolBlendModes.SOFT_LIGHT,
      },
      {
        id: 'hollow',
        image: cardClubHollow,
        offset: { x: 6.85, y: 0 },
        opacity: 0.25,
        blend: SymbolBlendModes.SOFT_LIGHT,
      },
      {
        id: 'circle-filled',
        image: clubCircleFilled,
        offset: { x: 30, y: -5 },
        opacity: 0.35,
        blend: SymbolBlendModes.SOFT_LIGHT,
        size: { width: '8%', height: '14%' },
      },
      {
        id: 'circle-hollow',
        image: clubCircleHollow,
        offset: { x: 37, y: -5 },
        opacity: 0.35,
        blend: SymbolBlendModes.SCREEN,
        size: { width: '8%', height: '14%' },
      },
    ],
  },
  {
    id: 'diamond',
    anchor: { x: 80, y: 80 },
    size: { width: '13%', height: '24%' },
    variants: [
      {
        id: 'filled',
        image: cardDiamondFilled,
        offset: { x: 0, y: 0 },
        opacity: 0.25,
        blend: SymbolBlendModes.SOFT_LIGHT,
      },
      {
        id: 'hollow',
        image: cardDiamondHollow,
        offset: { x: 7.25, y: 0 },
        opacity: 0.25,
        blend: SymbolBlendModes.SOFT_LIGHT,
      },
      {
        id: 'circle-filled',
        image: diamondCircleFilled,
        offset: { x: -30, y: 0 },
        opacity: 0.35,
        blend: SymbolBlendModes.HARD_LIGHT,
        size: { width: '8%', height: '14%' },
      },
      {
        id: 'circle-hollow',
        image: diamondCircleHollow,
        offset: { x: -23, y: 0 },
        opacity: 0.35,
        blend: SymbolBlendModes.HARD_LIGHT,
        size: { width: '8%', height: '14%' },
      },
    ],
  },
  {
    id: 'heart',
    anchor: { x: 20, y: 82 },
    size: { width: '14%', height: '24%' },
    variants: [
      {
        id: 'filled',
        image: cardHeartFilled,
        offset: { x: 0, y: 0 },
        opacity: 0.25,
        blend: SymbolBlendModes.SOFT_LIGHT,
      },
      {
        id: 'hollow',
        image: cardHeartHollow,
        offset: { x: 7.35, y: 0 },
        opacity: 0.25,
        blend: SymbolBlendModes.SOFT_LIGHT,
      },
      {
        id: 'circle-filled',
        image: heartCircleFilled,
        offset: { x: -7.35, y: -25 },
        opacity: 0.35,
        blend: SymbolBlendModes.HARD_LIGHT,
        size: { width: '8%', height: '14%' },
      },
      {
        id: 'circle-hollow',
        image: heartCircleHollow,
        offset: { x: -14.7, y: -25 },
        opacity: 0.35,
        blend: SymbolBlendModes.HARD_LIGHT,
        size: { width: '8%', height: '14%' },
      },
    ],
  },
  {
    id: 'spade',
    anchor: { x: 75, y: 20 },
    size: { width: '14%', height: '24%' },
    variants: [
      {
        id: 'filled',
        image: cardSpadeFilled,
        offset: { x: 0, y: 0 },
        opacity: 0.25,
        blend: SymbolBlendModes.SOFT_LIGHT,
      },
      {
        id: 'hollow',
        image: cardSpadeHollow,
        offset: { x: 7.3, y: 0 },
        opacity: 0.25,
        blend: SymbolBlendModes.SOFT_LIGHT,
      },
      {
        id: 'circle-filled',
        image: spadeCircleFilled,
        offset: { x: 10, y: 30 },
        opacity: 0.35,
        blend: SymbolBlendModes.SOFT_LIGHT,
        size: { width: '8%', height: '14%' },
      },
      {
        id: 'circle-hollow',
        image: spadeCircleHollow,
        offset: { x: 17, y: 30 },
        opacity: 0.35,
        blend: SymbolBlendModes.SCREEN,
        size: { width: '8%', height: '14%' },
      },
    ],
  },
];

const SYMBOL_LAYERS: SymbolLayer[] = SUIT_CONFIGS.flatMap((suit) =>
  suit.variants.map((variant) => {
    const size = variant.size ?? suit.size;
    return {
      id: `${suit.id}-${variant.id}`,
      image: variant.image,
      position: {
        x: `${suit.anchor.x + variant.offset.x}%`,
        y: `${suit.anchor.y + variant.offset.y}%`,
      },
      size,
      opacity: variant.opacity,
      blend: variant.blend,
    };
  })
);

// Compute background size in percentages based on repeat count + scale factor
const baseSizeX = (100 / TILE_X) * TEXTURE_SCALE;
const baseSizeY = (100 / TILE_Y) * TEXTURE_SCALE;

const GameBackground: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--bg-image", `url(${cardBgTexture})`);
    el.style.setProperty("--bg-size-x", `${baseSizeX}%`);
    el.style.setProperty("--bg-size-y", `${baseSizeY}%`);
    el.style.setProperty("--bg-scale", TEXTURE_SCALE.toString());
    el.style.setProperty("--bg-opacity", TEXTURE_OPACITY.toString());
    el.style.setProperty("--bg-blend", TEXTURE_BLEND_MODE);
    el.style.setProperty("--overlay-opacity", OVERLAY_OPACITY.toString());
    el.style.setProperty("--overlay-blend", OVERLAY_BLEND_MODE);

    const overlayValue = OVERLAY_LAYERS.map(({ at, color, radius }) => {
      return `radial-gradient(circle at ${at}, ${color} 0%, hsla(0, 0%, 0%, 0) ${radius})`;
    }).join(', ');

    el.style.setProperty('--overlay-background', overlayValue);

    SYMBOL_LAYERS.forEach((layer) => {
      const prefix = `--symbol-${layer.id}`;
      el.style.setProperty(`${prefix}-image`, `url(${layer.image})`);
      el.style.setProperty(`${prefix}-x`, layer.position.x);
      el.style.setProperty(`${prefix}-y`, layer.position.y);
      el.style.setProperty(`${prefix}-width`, layer.size.width);
      el.style.setProperty(`${prefix}-height`, layer.size.height);
      el.style.setProperty(`${prefix}-opacity`, layer.opacity.toString());
      el.style.setProperty(`${prefix}-blend`, layer.blend);
    });

    return () => {
      el.style.removeProperty("--bg-image");
      el.style.removeProperty("--bg-size-x");
      el.style.removeProperty("--bg-size-y");
      el.style.removeProperty("--bg-scale");
      el.style.removeProperty("--bg-opacity");
      el.style.removeProperty("--bg-blend");
      el.style.removeProperty("--overlay-opacity");
      el.style.removeProperty("--overlay-blend");
      el.style.removeProperty('--overlay-background');
      SYMBOL_LAYERS.forEach((layer) => {
        const prefix = `--symbol-${layer.id}`;
        el.style.removeProperty(`${prefix}-image`);
        el.style.removeProperty(`${prefix}-x`);
        el.style.removeProperty(`${prefix}-y`);
        el.style.removeProperty(`${prefix}-width`);
        el.style.removeProperty(`${prefix}-height`);
        el.style.removeProperty(`${prefix}-opacity`);
        el.style.removeProperty(`${prefix}-blend`);
      });
    };
  }, []);

  return (
    <div className="game-background" ref={ref}>
      <div className="game-background__texture" />
      <div className="game-background__symbols">
        {SYMBOL_LAYERS.map((layer) => (
          <div key={layer.id} className="game-background__symbol" data-symbol={layer.id} />
        ))}
      </div>
      <div className="game-background__overlay" />
    </div>
  );
};

export default GameBackground;
