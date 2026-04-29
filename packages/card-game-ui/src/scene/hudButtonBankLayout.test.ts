import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HUD_ARTWORK_CONTROLS,
  DEFAULT_HUD_BUTTON_CONTROLS,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { createHudButtonBankLayout } from './hudButtonBankLayout';
import { resolveHudButtonArtSize } from './hudButtonGeometry';

const createButtons = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    index,
    label: `B${index + 1}`,
    config: {
      ...DEFAULT_HUD_BUTTON_CONTROLS,
    },
  }));

describe('createHudButtonBankLayout', () => {
  it('responds to buttonScale relative to the fitted host size', () => {
    const layoutAtFit = createHudButtonBankLayout({
      buttons: createButtons(3),
      hostLeft: 0,
      hostTop: 0,
      hostWidth: 445,
      hostHeight: 76,
      align: 'start',
      buttonScale: 1,
      bankControls: DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank,
      offsetX: 0,
      offsetY: 0,
    });
    const layoutSmaller = createHudButtonBankLayout({
      buttons: createButtons(3),
      hostLeft: 0,
      hostTop: 0,
      hostWidth: 445,
      hostHeight: 76,
      align: 'start',
      buttonScale: 0.5,
      bankControls: DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank,
      offsetX: 0,
      offsetY: 0,
    });
    const layoutLarger = createHudButtonBankLayout({
      buttons: createButtons(3),
      hostLeft: 0,
      hostTop: 0,
      hostWidth: 445,
      hostHeight: 76,
      align: 'start',
      buttonScale: 1.1,
      bankControls: DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank,
      offsetX: 0,
      offsetY: 0,
    });

    expect(layoutAtFit).not.toBeNull();
    expect(layoutSmaller).not.toBeNull();
    expect(layoutLarger).not.toBeNull();
    expect(layoutSmaller?.scale).toBeLessThan(layoutAtFit?.scale ?? 0);
    expect(layoutLarger?.scale).toBeGreaterThan(layoutAtFit?.scale ?? 0);
  });

  it('keeps authored button widths in the natural bank layout size', () => {
    const layout = createHudButtonBankLayout({
      buttons: [
        {
          index: 0,
          label: 'A',
          config: {
            ...DEFAULT_HUD_BUTTON_CONTROLS,
            width: 300,
            height: 120,
          },
        },
        {
          index: 1,
          label: 'B',
          config: {
            ...DEFAULT_HUD_BUTTON_CONTROLS,
            width: 450,
            height: 180,
          },
        },
      ],
      hostLeft: 0,
      hostTop: 0,
      hostWidth: 900,
      hostHeight: 220,
      align: 'start',
      buttonScale: 1,
      bankControls: DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank,
      offsetX: 0,
      offsetY: 0,
    });

    expect(layout).not.toBeNull();
    expect(layout?.width).toBe(
      resolveHudButtonArtSize({
        ...DEFAULT_HUD_BUTTON_CONTROLS,
        width: 300,
        height: 120,
      }).width
      + resolveHudButtonArtSize({
        ...DEFAULT_HUD_BUTTON_CONTROLS,
        width: 450,
        height: 180,
      }).width
      + DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.gap,
    );
    expect(layout?.height).toBe(
      Math.max(
        resolveHudButtonArtSize({
          ...DEFAULT_HUD_BUTTON_CONTROLS,
          width: 300,
          height: 120,
        }).height,
        resolveHudButtonArtSize({
          ...DEFAULT_HUD_BUTTON_CONTROLS,
          width: 450,
          height: 180,
        }).height,
      ),
    );
  });
});
