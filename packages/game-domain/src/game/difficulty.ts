export const DIFFICULTY_VALUES = [
  "Beginner",
  "Intermediate",
  "Expert",
] as const;

export type Difficulty = (typeof DIFFICULTY_VALUES)[number];
