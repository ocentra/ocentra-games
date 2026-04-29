
export interface PlainCardFrameSettings {
  width: number;
  height: number;
  cornerRadius: number;
  goldBorderWidth: number;
  greenBorderWidth: number;
  glowBlur: number;
  glowMargin: number;
  outerGreen: string;
  goldLight: string;
  goldMid: string;
  goldDark: string;
  fillTop: string;
  fillBottom: string;
  showInnerShadow: boolean;
  showBottomTitle: boolean;
  bottomTitle: string;
  bottomTitleHeight: number;
  bottomTitleSize: number;
  bottomTitleInsetX: number;
  bottomTitleBottomInset: number;
  bottomTitleCornerRadius: number;
  bottomTitleStrokeWidth: number;
  bottomTitleYOffset: number;
  bottomTitleFillLight: string;
  bottomTitleFillDark: string;
  bottomTitleText: string;
  bottomTitleTextPadding: number;
  bottomTitleTextYOffset: number;
}

export const PLAIN_CARD_FRAME_DEFAULTS: PlainCardFrameSettings = {
  width: 260,
  height: 390,
  cornerRadius: 18,
  goldBorderWidth: 7,
  greenBorderWidth: 11,
  glowBlur: 10,
  glowMargin: 22,
  outerGreen: "#0a6d30",
  goldLight: "#ffe449",
  goldMid: "#fff59b",
  goldDark: "#c99a00",
  fillTop: "#d8e7dc",
  fillBottom: "#7ea8a2",
  showInnerShadow: true,
  showBottomTitle: true,
  bottomTitle: "CARD TITLE",
  bottomTitleHeight: 42,
  bottomTitleSize: 18,
  bottomTitleInsetX: 12,
  bottomTitleBottomInset: 0,
  bottomTitleCornerRadius: 8,
  bottomTitleStrokeWidth: 2,
  bottomTitleYOffset: 0,
  bottomTitleFillLight: "#ffe449",
  bottomTitleFillDark: "#c99a00",
  bottomTitleText: "#fff9d2",
  bottomTitleTextPadding: 10,
  bottomTitleTextYOffset: 0,
};
