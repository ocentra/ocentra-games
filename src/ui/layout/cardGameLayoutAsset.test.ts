import { describe, expect, it } from 'vitest';
import {
  readCardGameLayoutDocument,
  resolveLayoutPreset,
  toSerializedGameAssetFromLayoutSource,
} from '@/ui/layout/cardGameLayoutAsset';

describe('cardGameLayoutAsset', () => {
  it('reads legacy nested layout payloads', () => {
    const document = readCardGameLayoutDocument({
      data: {
        layout: {
          defaultPlayerCount: 4,
          presets: {
            '4': {
              table: { width: 960, height: 560 },
              seats: [{ id: 0, label: 'p1', position: { x: 0.5, y: 0.8 }, rotation: 0, scale: 0.5 }],
            },
          },
          gameplay: { mode: 'legacy' },
          extensions: { theme: 'claim' },
        },
      },
    });

    expect(document.defaultPlayerCount).toBe(4);
    expect(document.presets['4']?.seats).toHaveLength(1);
    expect(document.gameplay).toEqual({ mode: 'legacy' });
    expect(document.extensions).toEqual({ theme: 'claim' });
    expect(document.layoutStructure).toEqual({ type: 'custom', sections: [] });
  });

  it('reads canonical flat layout payloads without confusing the layout structure for seat data', () => {
    const serialized = toSerializedGameAssetFromLayoutSource({
      metadata: { gameId: 'claim', schemaVersion: 1 },
      defaultPlayerCount: 4,
      presets: {
        '4': {
          table: { width: 960, height: 560, offsetY: -78 },
          seats: [{ id: 0, label: 'p1', position: { x: 0.5, y: 0.8 }, rotation: 0, scale: 0.5 }],
        },
      },
      gameplay: { mode: 'flat' },
      extensions: { theme: 'claim' },
      layout: { type: 'custom', sections: [] },
    }, 'claim');

    expect(serialized.layout?.defaultPlayerCount).toBe(4);
    expect(serialized.layout?.presets?.['4']?.table?.offsetY).toBe(-78);
    expect(serialized.gameplay).toEqual({ mode: 'flat' });
  });

  it('falls back to the default preset when the requested seat count is missing', () => {
    const document = readCardGameLayoutDocument({
      defaultPlayerCount: 4,
      presets: {
        '4': {
          table: { width: 960, height: 560 },
          seats: [{ id: 0, label: 'p1', position: { x: 0.5, y: 0.8 }, rotation: 0, scale: 0.5 }],
        },
      },
      layout: { type: 'custom', sections: [] },
    });

    const preset = resolveLayoutPreset(document, 6);

    expect(preset?.seats).toHaveLength(1);
    expect(preset?.table.width).toBe(960);
  });
});
