export const SuitColor = {
  Black: 'Black',
  Red: 'Red',
  None: 'None',
} as const;

export type SuitColor = typeof SuitColor[keyof typeof SuitColor];

