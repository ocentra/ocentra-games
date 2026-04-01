export const ListStyleType = {
  Unordered: 'unordered',
  Ordered: 'ordered',
} as const;

export type ListStyleType = typeof ListStyleType[keyof typeof ListStyleType];
