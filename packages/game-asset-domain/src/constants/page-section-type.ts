export const PageSectionType = {
  About: 'about',
  Rules: 'rules',
  Strategy: 'strategy',
  Scoring: 'scoring',
  Text: 'text',
  Screenshots: 'screenshots',
  Custom: 'custom',
} as const;

export type PageSectionType = typeof PageSectionType[keyof typeof PageSectionType];
