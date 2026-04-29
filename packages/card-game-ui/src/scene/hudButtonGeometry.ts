import type { HudButtonControls } from './HudArtwork.types';

export const HUD_BUTTON_BODY_X = 250;
export const HUD_BUTTON_BODY_Y = 130;

export interface HudButtonArtSize {
  width: number;
  height: number;
}

export interface HudButtonGeometry {
  artHeight: number;
  artWidth: number;
  baseLeftX: number;
  baseRightX: number;
  bodyHeight: number;
  bodyWidth: number;
  bodyX: number;
  bodyY: number;
  centerX: number;
  centerY: number;
  innerHeight: number;
  innerRadius: number;
  innerWidth: number;
  innerX: number;
  innerY: number;
  viewBox: string;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function resolveHudButtonArtSize(button: Pick<
  HudButtonControls,
  'bodyHeight' | 'clickInsetExpand' | 'height' | 'hoverInsetExpand' | 'leftX' | 'rightX' | 'sideInset' | 'width'
>): HudButtonArtSize {
  const bodyWidth = Math.max(1, button.width);
  const bodyHeight = Math.max(1, button.bodyHeight ?? button.height);
  const slotHeight = Math.max(1, button.height, bodyHeight);
  const baseLeftX = button.leftX ?? HUD_BUTTON_BODY_X + button.sideInset;
  const baseRightX = button.rightX ?? HUD_BUTTON_BODY_X + bodyWidth - button.sideInset;
  const maxExpand = Math.max(button.hoverInsetExpand, button.clickInsetExpand);
  const minX = Math.min(HUD_BUTTON_BODY_X - 110, baseLeftX - 110 - maxExpand);
  const minY = HUD_BUTTON_BODY_Y - 50;
  const maxX = Math.max(HUD_BUTTON_BODY_X + bodyWidth + 110, baseRightX + 110 + maxExpand);
  const maxY = HUD_BUTTON_BODY_Y + slotHeight + 50;

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function resolveHudButtonGeometry(button: HudButtonControls): HudButtonGeometry {
  const bodyX = HUD_BUTTON_BODY_X;
  const bodyWidth = Math.max(1, button.width);
  const bodyHeight = Math.max(1, button.bodyHeight ?? button.height);
  const slotHeight = Math.max(1, button.height, bodyHeight);
  const bodyY = HUD_BUTTON_BODY_Y + (slotHeight - bodyHeight) / 2;
  const centerX = bodyX + bodyWidth / 2;
  const centerY = bodyY + bodyHeight / 2;
  const baseLeftX = button.leftX ?? bodyX + button.sideInset;
  const baseRightX = button.rightX ?? bodyX + bodyWidth - button.sideInset;
  const safeDotInset = clampNumber(button.dotInset, 4, Math.min(bodyWidth / 4, bodyHeight / 3));
  const innerX = bodyX + safeDotInset;
  const innerY = bodyY + safeDotInset;
  const innerWidth = Math.max(20, bodyWidth - safeDotInset * 2);
  const innerHeight = Math.max(20, bodyHeight - safeDotInset * 2);
  const innerRadius = Math.max(4, Math.min(button.radius - safeDotInset, innerHeight / 2));
  const { width: artWidth, height: artHeight } = resolveHudButtonArtSize(button);
  const maxExpand = Math.max(button.hoverInsetExpand, button.clickInsetExpand);
  const minX = Math.min(bodyX - 110, baseLeftX - 110 - maxExpand);
  const minY = HUD_BUTTON_BODY_Y - 50;
  const maxX = Math.max(bodyX + bodyWidth + 110, baseRightX + 110 + maxExpand);
  const maxY = HUD_BUTTON_BODY_Y + slotHeight + 50;

  return {
    artHeight,
    artWidth,
    baseLeftX,
    baseRightX,
    bodyHeight,
    bodyWidth,
    bodyX,
    bodyY,
    centerX,
    centerY,
    innerHeight,
    innerRadius,
    innerWidth,
    innerX,
    innerY,
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
  };
}
