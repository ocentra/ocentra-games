import { Schema } from '@ocentra/schema-domain/effect';

export const DominoTileIdSchema = Schema.String.pipe(
  Schema.filter((value) => /^\d+-\d+$/.test(value) || 'Expected domino tile id in n-n format'),
  Schema.brand('DominoTileId'),
);
export type DominoTileId = typeof DominoTileIdSchema.Type;
export const decodeDominoTileId = Schema.decodeUnknownSync(DominoTileIdSchema);

export function computeDominoTileId(leftPips: number, rightPips: number): DominoTileId {
  const a = Math.min(leftPips, rightPips);
  const b = Math.max(leftPips, rightPips);
  return decodeDominoTileId(`${a}-${b}`);
}

