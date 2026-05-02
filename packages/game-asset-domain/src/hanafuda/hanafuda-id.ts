import { Schema } from '@ocentra/schema-domain/effect';

export const HanafudaCardIdSchema = Schema.String.pipe(
  Schema.filter((value) => /^\d{2}-\d+$/.test(value) || 'Expected hanafuda card id in mm-slot format'),
  Schema.brand('HanafudaCardId'),
);
export type HanafudaCardId = typeof HanafudaCardIdSchema.Type;
export const decodeHanafudaCardId = Schema.decodeUnknownSync(HanafudaCardIdSchema);

export function computeHanafudaCardId(month: number, slot: number): HanafudaCardId {
  return decodeHanafudaCardId(`${month.toString().padStart(2, '0')}-${slot}`);
}

