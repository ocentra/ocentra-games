import { describe, expect, it } from 'vitest';
import { normalizeCardGameLayoutDocument } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import {
  buildLocalPilotHudControls,
  type LocalPilotHudActionDescriptor,
} from './localPilotRuntimeHelpers';

function createLayoutDocument(): CardGameLayoutDocument {
  return normalizeCardGameLayoutDocument({
    defaultPlayerCount: 4,
    presets: {
      '4': {
        table: {
          width: 960,
          height: 560,
          offsetX: 0,
          offsetY: -78,
          curvature: 0.88,
          feltInset: -8,
        },
        seats: [],
      },
    },
    gameplay: {},
    extensions: {},
    zones: [],
    cardStrip: {
      slots: [],
    },
  });
}

describe('local pilot runtime HUD controls', () => {
  it('uses an explicit waiting label when no player action is available', () => {
    const controls = buildLocalPilotHudControls(createLayoutDocument(), []);

    expect(controls.buttonCount).toBe(1);
    expect(controls.buttonLabels[0]).toBe('Waiting');
  });

  it('preserves runtime action labels for available player actions', () => {
    const actions: LocalPilotHudActionDescriptor[] = [
      {
        kind: 'bet',
        label: 'Bet 1',
      },
      {
        kind: 'fold',
        label: 'Fold',
      },
    ];

    const controls = buildLocalPilotHudControls(createLayoutDocument(), actions);

    expect(controls.buttonCount).toBe(2);
    expect(controls.buttonLabels.slice(0, 2)).toEqual(['Bet 1', 'Fold']);
  });
});
