export const HanafudaGroup = {
  Bright: 'Bright',
  Animal: 'Animal',
  Ribbon: 'Ribbon',
  Chaff: 'Chaff',
  Special: 'Special',
} as const;

export type HanafudaGroup = typeof HanafudaGroup[keyof typeof HanafudaGroup];

