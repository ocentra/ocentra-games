export type HanafudaCardId = string & { readonly __brand: 'HanafudaCardId' };

export function computeHanafudaCardId(month: number, slot: number): HanafudaCardId {
  return `${month.toString().padStart(2, '0')}-${slot}` as HanafudaCardId;
}

