export const MahjongWind = {
  East: 'East',
  South: 'South',
  West: 'West',
  North: 'North',
} as const;

export type MahjongWind = typeof MahjongWind[keyof typeof MahjongWind];

export const MahjongDragon = {
  Red: 'Red',
  Green: 'Green',
  White: 'White',
} as const;

export type MahjongDragon = typeof MahjongDragon[keyof typeof MahjongDragon];

