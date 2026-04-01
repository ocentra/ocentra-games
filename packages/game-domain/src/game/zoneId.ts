export const ZONE_ID_VALUES = [
  "stock",
  "hand",
  "discard",
  "market",
  "tableau",
  "kitty",
  "widow",
  "draw_pile",
  "talon",
  "pot",
  "trick",
  "foundation",
  "player",
  "table",
] as const;

export type ZoneIdEnum = (typeof ZONE_ID_VALUES)[number];
export type ZoneId = ZoneIdEnum | `custom:${string}`;

export function isValidZoneId(s: string): boolean {
  if (ZONE_ID_VALUES.includes(s as ZoneIdEnum)) return true;
  return s.startsWith("custom:") && s.length > 7;
}
