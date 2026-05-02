export const BannerTransitionType = {
  CrossDissolve: 'crossDissolve',
  Swipe: 'swipe',
  Cut: 'cut',
} as const;

export type BannerTransitionTypeValue = (typeof BannerTransitionType)[keyof typeof BannerTransitionType];

export const BannerPlaybackMode = {
  Linear: 'linear',
  PingPong: 'pingPong',
} as const;

export type BannerPlaybackModeValue = (typeof BannerPlaybackMode)[keyof typeof BannerPlaybackMode];
