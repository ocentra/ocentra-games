export const ContentType = {
  Gameplay: 'gameplay',
  Patterns: 'patterns',
  Formulas: 'formulas',
  Calculations: 'calculations',
  Values: 'values',
} as const;

export type ContentType = typeof ContentType[keyof typeof ContentType];
