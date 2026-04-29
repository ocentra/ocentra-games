import { describe, expect, it } from 'vitest';
import { normalizeCardGameLayoutDocument } from './cardGameLayoutRuntime';
import { resolveCardGameStageLayout } from './cardGameStageLayoutResolver';

describe('cardGameStageLayoutResolver', () => {
  it('seeds a V2 stage layout when reading legacy-shaped documents', () => {
    const document = normalizeCardGameLayoutDocument({
      defaultPlayerCount: 2,
      presets: {
        2: {
          table: { width: 960, height: 560, offsetX: 0, offsetY: -78, curvature: 0.88, feltInset: -8 },
          seats: [
            { id: 0, position: { x: 0.5, y: 0.8 } },
            { id: 1, position: { x: 0.5, y: 0.2 } },
          ],
        },
      },
    });

    expect(document.stageLayout?.authoredViewport).toEqual({ width: 1920, height: 1080 });
    expect(document.stageLayout?.hud.fitMode).toBe('width');
    expect(document.stageLayout?.arena.fitMode).toBe('contain');
    expect(document.zones?.map((zone) => zone.id)).toEqual(['deck', 'discard', 'floor', 'pot', 'trick']);
  });

  it('resolves HUD and arena with shared clamped scaling rules', () => {
    const document = normalizeCardGameLayoutDocument({});

    const fullHd = resolveCardGameStageLayout({
      document,
      playerCount: 4,
      viewport: { width: 1920, height: 1080 },
    });
    const ultraWide = resolveCardGameStageLayout({
      document,
      playerCount: 4,
      viewport: { width: 3840, height: 2160 },
    });

    expect(fullHd.hud.scale).toBe(1);
    expect(fullHd.hud.rect.width).toBe(1920);
    expect(ultraWide.hud.scale).toBe(1);
    expect(ultraWide.hud.rect.width).toBe(1920);
    expect(ultraWide.hud.rect.x).toBeGreaterThan(0);
    expect(fullHd.arena.rect.height).toBeLessThan(fullHd.workRect.height);
    expect(ultraWide.arena.rect.width).toBe(1000);
    expect(fullHd.scoreboard).not.toBeNull();
    expect(fullHd.scoreboard?.rect.x).toBeGreaterThan(fullHd.workRect.width / 2);
    expect(fullHd.scoreboard?.rect.y).toBeGreaterThanOrEqual(fullHd.workRect.y);
    expect(fullHd.scoreboard?.rect.y).toBeLessThan(fullHd.hud.rect.y);
  });

  it('applies scoreboard overall scale before resolving the scoreboard stage block', () => {
    const baseDocument = normalizeCardGameLayoutDocument({});
    const scaledDocument = normalizeCardGameLayoutDocument({});
    scaledDocument.scoreboard.overallScale = 0.5;

    const base = resolveCardGameStageLayout({
      document: baseDocument,
      playerCount: 4,
      viewport: { width: 1920, height: 1080 },
    });
    const scaled = resolveCardGameStageLayout({
      document: scaledDocument,
      playerCount: 4,
      viewport: { width: 1920, height: 1080 },
    });

    expect(base.scoreboard).not.toBeNull();
    expect(scaled.scoreboard).not.toBeNull();
    expect(scaled.scoreboard?.rect.width).toBeCloseTo(base.scoreboard?.rect.width ?? 0, 5);
    expect(scaled.scoreboard?.rect.height).toBeCloseTo(base.scoreboard?.rect.height ?? 0, 5);
    expect(scaled.scoreboard?.innerScale).toBeCloseTo(0.5, 5);
  });

  it('resolves a card strip block from authored slots and overall scale', () => {
    const document = normalizeCardGameLayoutDocument({});
    document.cardStrip.slots = [
      { id: 'slot_1', label: 'One', previewFaceUp: false },
      { id: 'slot_2', label: 'Two', previewFaceUp: false },
      { id: 'slot_3', label: 'Three', previewFaceUp: false },
    ];

    const base = resolveCardGameStageLayout({
      document,
      playerCount: 4,
      viewport: { width: 1920, height: 1080 },
    });

    document.cardStrip.overallScale = 0.5;

    const scaled = resolveCardGameStageLayout({
      document,
      playerCount: 4,
      viewport: { width: 1920, height: 1080 },
    });

    expect(base.cardStrip).not.toBeNull();
    expect(base.cardStrip?.rect.x).toBeGreaterThanOrEqual(base.workRect.x);
    expect(base.cardStrip?.rect.y).toBeGreaterThanOrEqual(base.workRect.y);
    expect(base.cardStrip?.rect.x).toBeLessThan(base.workRect.width / 2);
    expect(scaled.cardStrip?.rect.width).toBeCloseTo(base.cardStrip?.rect.width ?? 0, 5);
    expect(scaled.cardStrip?.rect.height).toBeCloseTo(base.cardStrip?.rect.height ?? 0, 5);
    expect(scaled.cardStrip?.innerScale).toBeCloseTo(0.5, 5);
  });

  it('resolves the arena against shell work bounds and produces arena-relative zones', () => {
    const document = normalizeCardGameLayoutDocument({});

    const resolved = resolveCardGameStageLayout({
      document,
      playerCount: 4,
      viewport: { width: 1920, height: 1080 },
      shellMetrics: {
        workTop: 120,
        workBottom: 80,
      },
    });

    expect(resolved.workRect.y).toBe(120);
    expect(resolved.workRect.height).toBe(880);
    expect(resolved.hud.rect.y + resolved.hud.rect.height).toBeLessThanOrEqual(1000);
    expect(resolved.zones.find((zone) => zone.zone.id === 'deck')?.arenaRect.width).toBeGreaterThan(0);
    expect(resolved.zones.find((zone) => zone.zone.id === 'trick')?.stageRect.height).toBeGreaterThan(0);
  });
});
