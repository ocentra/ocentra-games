export const EmphasisType = {
  Bold: 'bold',
  Italic: 'italic',
  Strong: 'strong',
} as const;

export type EmphasisType = typeof EmphasisType[keyof typeof EmphasisType];
