export type DominoTileId = string & { readonly __brand: 'DominoTileId' };

export function computeDominoTileId(leftPips: number, rightPips: number): DominoTileId {
  const a = Math.min(leftPips, rightPips);
  const b = Math.max(leftPips, rightPips);
  return `${a}-${b}` as DominoTileId;
}

