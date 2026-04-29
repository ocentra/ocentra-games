import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CARD_FAN_CONTROLS,
  adjustSeatsForTableChange,
  cloneCardGameLayoutDocument,
  createDefaultCardGameLayoutAsset,
  createDefaultCardGameLayoutDocument,
  generateSeatRing,
  hydrateCardGameLayoutAsset,
  normalizeCardGameLayoutDocument,
  resolveLayoutPreset,
} from './cardGameLayoutRuntime';

describe('cardGameLayoutRuntime', () => {
  it('creates a default document with the expected preset range', () => {
    const document = createDefaultCardGameLayoutDocument();

    expect(document.defaultPlayerCount).toBe(4);
    expect(Object.keys(document.presets)).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(document.playerUiDefaults.baseArcRotation).toBe(0);

    const cloned = cloneCardGameLayoutDocument(document);
    cloned.playerUiDefaults.baseArcRotation = 99;

    expect(document.playerUiDefaults.baseArcRotation).toBe(0);
  });

  it('generates a ring of seats within normalized bounds', () => {
    const seats = generateSeatRing(4);

    expect(seats).toHaveLength(4);
    expect(seats[0]).toMatchObject({
      id: 0,
      label: 'p1',
      rotation: 0,
      scale: 0.5,
    });
    expect(seats.every((seat) => seat.position.x >= 0 && seat.position.x <= 1)).toBe(true);
    expect(seats.every((seat) => seat.position.y >= 0 && seat.position.y <= 1)).toBe(true);
  });

  it('normalizes partial documents against fallback defaults', () => {
    const normalized = normalizeCardGameLayoutDocument({
      defaultPlayerCount: 11,
      presets: {
        3: {
          table: {
            width: 1200,
          },
          seats: [
            {
              id: 7,
              label: 'front',
              position: {
                x: 1.5,
                y: -0.25,
              },
              rotation: 45,
              scale: 0.75,
              playerOverrides: {
                baseArcRotation: 123,
              },
            },
          ],
        },
      },
      views: {
        preview: {
          seats: [
            {
              id: 2,
              position: {
                x: 0.1,
                y: 0.2,
              },
            },
          ],
        },
      },
      gameplay: {
        draftMode: true,
      },
      extensions: {
        experimental: 'enabled',
      },
    });

    expect(normalized.defaultPlayerCount).toBe(10);
    expect(normalized.presets['3'].table.width).toBe(1200);
    expect(normalized.presets['3'].seats.find((seat) => seat.id === 7)).toMatchObject({
      id: 7,
      label: 'front',
      rotation: 45,
      scale: 0.75,
      playerOverrides: {
        baseArcRotation: 123,
      },
    });
    expect(normalized.views.preview.seats.find((seat) => seat.id === 2)).toMatchObject({
      id: 2,
      position: {
        x: 0.1,
        y: 0.2,
      },
    });
    expect(normalized.gameplay).toEqual({ draftMode: true });
    expect(normalized.extensions).toEqual({ experimental: 'enabled' });
    expect(normalized.cardFan.cardHeightScale).toBe(DEFAULT_CARD_FAN_CONTROLS.cardHeightScale);
  });

  it('migrates legacy HUD visibility without persisting editor-only HUD fields', () => {
    const normalized = normalizeCardGameLayoutDocument({
      hud: {
        button: {
          buttonOffsetX: 14,
          buttonOffsetY: -6,
        },
        layerVisibility: {
          header: false,
          hud: false,
          cards: false,
          zones: false,
        },
        showDebugGuides: true,
      },
    });

    expect(normalized.renderToggles.header).toBe(false);
    expect(normalized.renderToggles.hud).toBe(false);
    expect(normalized.renderToggles.cardFan).toBe(false);
    expect(normalized.renderToggles.zones).toBe(false);
    expect(normalized.renderToggles.deckTray).toBe(false);
    expect(normalized.hud.button.buttonOffsetX).toBe(0);
    expect(normalized.hud.button.buttonOffsetY).toBe(0);
    expect(normalized.hud.buttonBank.leftOffsetX).toBe(14);
    expect(normalized.hud.buttonBank.leftOffsetY).toBe(-6);
    expect(Object.prototype.hasOwnProperty.call(normalized.hud, 'layerVisibility')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(normalized.hud, 'showDebugGuides')).toBe(false);
  });

  it('resolves presets with fallback behavior', () => {
    const document = createDefaultCardGameLayoutDocument();
    const exact = resolveLayoutPreset(document, 3);
    const fallback = resolveLayoutPreset(document, 11);

    expect(exact.seats).toHaveLength(3);
    expect(fallback.seats).toHaveLength(4);
    expect(exact).not.toBe(document.presets['3']);
    expect(fallback).not.toBe(document.presets['4']);
  });

  it('adjusts seat positions when the table size changes', () => {
    const seats = adjustSeatsForTableChange(
      {
        width: 1000,
        height: 500,
        offsetX: 0,
        offsetY: 0,
        curvature: 0.9,
      },
      {
        width: 2000,
        height: 1000,
        offsetX: 0,
        offsetY: 0,
        curvature: 0.9,
      },
      [
        {
          id: 1,
          label: 'seat',
          position: {
            x: 0.25,
            y: 0.75,
          },
          rotation: 0,
        },
      ],
    );

    expect(seats[0].position.x).toBe(0);
    expect(seats[0].position.y).toBe(1);
  });

  it('hydrates a layout asset with metadata and layout defaults', () => {
    const asset = hydrateCardGameLayoutAsset(
      {
        layout: {
          defaultPlayerCount: 6,
          gameplay: {
            seed: 1,
          },
        },
      },
      'card-game',
    );

    expect(asset.metadata.gameId).toBe('card-game');
    expect(asset.metadata.displayName).toBe('CardGame');
    expect(asset.metadata.schemaVersion).toBe(2);
    expect(typeof asset.metadata.createdAt).toBe('string');
    expect(typeof asset.metadata.updatedAt).toBe('string');
    expect(asset.layout.defaultPlayerCount).toBe(6);
    expect(asset.gameplay).toEqual({});
  });

  it('creates a default asset for a game id', () => {
    const asset = createDefaultCardGameLayoutAsset('claim-game');

    expect(asset.metadata.displayName).toBe('ClaimGame');
    expect(asset.layout.defaultPlayerCount).toBe(4);
  });
});
