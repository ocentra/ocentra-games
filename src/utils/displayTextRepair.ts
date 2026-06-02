const WINDOWS_1252_REVERSE = new Map<string, number>([
  ['\u20ac', 0x80],
  ['\u201a', 0x82],
  ['\u0192', 0x83],
  ['\u201e', 0x84],
  ['\u2026', 0x85],
  ['\u2020', 0x86],
  ['\u2021', 0x87],
  ['\u02c6', 0x88],
  ['\u2030', 0x89],
  ['\u0160', 0x8a],
  ['\u2039', 0x8b],
  ['\u0152', 0x8c],
  ['\u017d', 0x8e],
  ['\u2018', 0x91],
  ['\u2019', 0x92],
  ['\u201c', 0x93],
  ['\u201d', 0x94],
  ['\u2022', 0x95],
  ['\u2013', 0x96],
  ['\u2014', 0x97],
  ['\u02dc', 0x98],
  ['\u2122', 0x99],
  ['\u0161', 0x9a],
  ['\u203a', 0x9b],
  ['\u0153', 0x9c],
  ['\u017e', 0x9e],
  ['\u0178', 0x9f],
]);

const UTF8_DECODER = new TextDecoder('utf-8', { fatal: false });
const MOJIBAKE_MARKER = /[\u00c3\u00c2\u00e2\u00c4\u00c5]/u;

function normalizeDamagedMojibake(value: string): string {
  return value.replace(/\u00e2\u2122 (?==)/g, '\u00e2\u2122\u00a0');
}

function repairDisplayTextOnce(value: string): string {
  const normalized = normalizeDamagedMojibake(value);
  if (!MOJIBAKE_MARKER.test(normalized)) {
    return value;
  }

  const bytes: number[] = [];
  for (const char of normalized) {
    const mapped = WINDOWS_1252_REVERSE.get(char);
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }

    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    return normalized;
  }

  const repaired = UTF8_DECODER.decode(new Uint8Array(bytes));
  return repaired.includes('\uFFFD') ? normalized : repaired;
}

export function repairDisplayText(value: string): string {
  let repaired = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = repairDisplayTextOnce(repaired);
    if (next === repaired) {
      return repaired;
    }
    repaired = next;
  }
  return repaired;
}

export function repairDisplayValue<T>(value: T): T {
  if (typeof value === 'string') {
    return repairDisplayText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => repairDisplayValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [key, repairDisplayValue(entryValue)])
    ) as T;
  }

  return value;
}
