import { describe, expect, it } from 'vitest';
import { repairDisplayText, repairDisplayValue } from '@/utils/displayTextRepair';

describe('display text repair', () => {
  it('repairs UTF-8 text decoded through Windows-1252', () => {
    const value = `Tysi${String.fromCharCode(0xc4)}${String.fromCharCode(0x2026)}c`;

    expect(repairDisplayText(value)).toBe('Tysiąc');
  });

  it('repairs card suit mojibake with a flattened spade byte', () => {
    const value = [
      `Tysi${String.fromCharCode(0xc4)}${String.fromCharCode(0x2026)}c`,
      '(',
      `${String.fromCharCode(0xe2)}${String.fromCharCode(0x2122)}${String.fromCharCode(0xa5)}=100,`,
      `${String.fromCharCode(0xe2)}${String.fromCharCode(0x2122)}${String.fromCharCode(0xa6)}=80,`,
      `${String.fromCharCode(0xe2)}${String.fromCharCode(0x2122)}${String.fromCharCode(0xa3)}=60,`,
      `${String.fromCharCode(0xe2)}${String.fromCharCode(0x2122)} =40`,
      ')',
    ].join(' ');

    expect(repairDisplayText(value)).toContain('Tysiąc');
    expect(repairDisplayText(value)).toContain('♥=100');
    expect(repairDisplayText(value)).toContain('♦=80');
    expect(repairDisplayText(value)).toContain('♣=60');
    expect(repairDisplayText(value)).toContain('♠=40');
  });

  it('repairs nested display values without changing shape', () => {
    const value = {
      title: `Tysi${String.fromCharCode(0xc4)}${String.fromCharCode(0x2026)}c`,
      nested: [{ text: `${String.fromCharCode(0xe2)}${String.fromCharCode(0x2122)}${String.fromCharCode(0xa5)}` }],
    };

    expect(repairDisplayValue(value)).toEqual({
      title: 'Tysiąc',
      nested: [{ text: '♥' }],
    });
  });
});
