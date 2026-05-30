import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { describe, expect, it } from 'vitest';
import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import { GamePhase } from '@ocentra/game-domain/types/game';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { decodeCardGameMechanicsData } from '@/schemas/asset/card-game-mechanics-data.schema';
import { toMechanicsSpec } from './MechanicsTranslator';
import { createItalian40DeckProvider } from './testDeckProviders';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const briscolaMechanicsAssetPath = path.resolve(
  repoRoot,
  'packages/asset-editor/Resources/GameMode/CardGames/Games/briscola/briscolaMechanics.asset',
);

describe('Briscola mechanics asset smoke', () => {
  it('validates, translates, and completes a deterministic pilot hand', async () => {
    const parsed = JSON5.parse(fs.readFileSync(briscolaMechanicsAssetPath, 'utf8')) as unknown;
    const validation = validateAssetFile(parsed);
    expect(validation.success).toBe(true);

    const data = decodeCardGameMechanicsData((parsed as { data: unknown }).data);
    const spec = toMechanicsSpec(data);

    const engine = new GameEngine({
      deckProvider: createItalian40DeckProvider(11),
    });
    await engine.initializeGame({ maxPlayers: 2, enablePhysics: false, seed: 11 });
    engine.loadMechanicsSpec(spec);
    engine.addPlayer({ id: 'p1', name: 'Player 1' });
    engine.addPlayer({ id: 'p2', name: 'Player 2' });

    await engine.startGame();

    let state = engine.getGameState()!;
    expect(state.mechanicsPhaseId).toBe('trick_play');
    expect(state.players.every((player) => player.hand.length === 3)).toBe(true);
    expect(state.floorCard).not.toBeNull();

    let guard = 0;
    while (state.phase !== GamePhase.GAME_END && guard < 80) {
      const activePlayer = state.players[state.currentPlayer];
      const activeCard = activePlayer.hand[0];
      const result = engine.processPlayerAction({
        type: 'play_card',
        playerId: activePlayer.id,
        data: { cardId: activeCard.id },
        timestamp: new Date(state.lastAction.getTime() + 1000),
      });

      expect(result.isValid).toBe(true);
      state = engine.getGameState()!;
      guard += 1;
    }

    expect(guard).toBeLessThan(80);
    expect(state.phase).toBe(GamePhase.GAME_END);
    expect(state.round).toBe(2);
    expect(state.players.every((player) => player.hand.length === 0)).toBe(true);
    expect(state.players.reduce((total, player) => total + player.score, 0)).toBeGreaterThan(0);
  });
});
