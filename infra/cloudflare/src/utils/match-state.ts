export function isMatchActive(phase: number | undefined): boolean {
  return phase !== 3 && phase !== undefined;
}

export function isMatchFinalized(phase: number | undefined): boolean {
  return phase === 3;
}
