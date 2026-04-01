export type SerializablePlayerUIKey = 'baseArcRotation' | 'infoBoxAngle' | 'infoBoxRotation';

type PlayerUIOverrideMap = Partial<Record<SerializablePlayerUIKey, number>>;

export interface SeatPosition {
  x: number;
  y: number;
}

export interface SeatLayout {
  id: number;
  label?: string;
  position: SeatPosition;
  rotation: number;
  scale?: number;
  playerOverrides?: PlayerUIOverrideMap;
}

export interface TableShapeSettings {
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
  curvature?: number;
  rimThickness?: number;
  rimColor?: string;
  rimGlowColor?: string;
  rimGlowIntensity?: number;
  rimGlowSpread?: number;
  rimGlowThickness?: number;
  rimGlowBlendMode?: string;
  innerRimThickness?: number;
  innerRimColor?: string;
  innerRimTexture?: string;
  innerRimTextureBlendMode?: string;
  innerRimTextureOpacity?: number;
  feltInner?: string;
  feltOuter?: string;
  feltInset?: number;
  emblemSize?: number;
  emblemInnerColor?: string;
  emblemOuterColor?: string;
  emblemBlendMode?: string;
}
