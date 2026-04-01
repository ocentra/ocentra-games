export const GameSlug = {
  Claim: 'claim',
} as const;

export type GameSlug = (typeof GameSlug)[keyof typeof GameSlug];
