export type AnchorValue = number | string;
export type AlignAxis = "start" | "center" | "end";

export type AnchorPoint = {
  x: number;
  y: number;
  radius: number;
};

export interface CardInHandProps {
  cardCount?: number;
  cardImage?: string;
  radius?: number;
  arcStart?: number;
  arcEnd?: number;
  cardWidth?: number;
  cardHeight?: number;
  fanTilt?: number;
  centerOffsetX?: number;
  centerOffsetY?: number;
  position?: "absolute" | "fixed";
  anchor?: {
    top?: AnchorValue;
    right?: AnchorValue;
    bottom?: AnchorValue;
    left?: AnchorValue;
  };
  align?: {
    x?: AlignAxis;
    y?: AlignAxis;
  };
  anchorPoint?: AnchorPoint;
  radiusOffset?: number;
  zIndex?: number;
  className?: string;
  style?: React.CSSProperties;
}
