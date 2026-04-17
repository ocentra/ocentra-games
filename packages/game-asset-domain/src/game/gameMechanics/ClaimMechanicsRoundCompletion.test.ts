import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { describe, expect, it } from 'vitest';
import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import { GamePhase } from '@ocentra/game-domain/types/game';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { CardGameMechanicsDataSchema } from '@/schemas/asset/card-game-mechanics-data.schema';
import { toMechanicsSpec } from './MechanicsTranslator';
import { createFrench52DeckProvider } from './testDeckProviders';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const claimMechanicsAssetPath = path.resolve(
  repoRoot,
  'packages/asset-editor/Resources/GameMode/CardGames/Games/Claim/claimMechanics.asset',
);

describe('Claim mechanics round completion', () => {
  it('resolves repeated declared showdowns until the authored round config ends the game', async () => {
    const parsed = JSON5.parse(fs.readFileSync(claimMechanicsAssetPath, 'utf8')) as unknown;
    const validation = validateAssetFile(parsed);
    expect(validation.success).toBe(true);

    const data = CardGameMechanicsDataSchema.parse((parsed as { data: unknown }).data);
    const spec = toMechanicsSpec(data);

    const engine = new GameEngine({
      deckProvider: createFrench52DeckProvider(23),
    });
    await engine.initializeGame({ maxPlayers: 4, enablePhysics: false, seed: 23 });
    engine.loadMechanicsSpec(spec);
    engine.addPlayer({ id: 'p1', name: 'Player 1' });
    engine.addPlayer({ id: 'p2', name: 'Player 2' });
    engine.addPlayer({ id: 'p3', name: 'Player 3' });
    engine.addPlayer({ id: 'p4', name: 'Player 4' });

    await engine.startGame();

    let state = engine.getGameState()!;
    let guard = 0;

    while (state.phase !== GamePhase.GAME_END && guard < 160) {
      if (state.mechanicsPhaseId === 'turn_loop') {
        const activePlayer = state.players[state.currentPlayer];
        const nextAction = activePlayer.declaredSuit === null ? 'declare' : 'call_showdown';
        const result = engine.processPlayerAction({
          type: nextAction,
          playerId: activePlayer.id,
          data: nextAction === 'declare' ? { suit: activePlayer.hand[0].suit } : undefined,
          timestamp: new Date(state.lastAction.getTime() + 1000),
        });
        expect(result.isValid).toBe(true);
      } else if (state.mechanicsPhaseId === 'showdown') {
        const revealed = new Set(state.mechanicsContext?.revealedPlayerIds ?? []);
        const folded = new Set(state.mechanicsContext?.foldedPlayerIds ?? []);
        const nextPlayer = state.players.find((player) => !revealed.has(player.id) && !folded.has(player.id));
        expect(nextPlayer).toBeDefined();
        const result = engine.processPlayerAction({
          type: 'reveal_hand',
          playerId: nextPlayer!.id,
          timestamp: new Date(state.lastAction.getTime() + 1000),
        });
        expect(result.isValid).toBe(true);
      } else {
        throw new Error(`Unexpected mechanics phase: ${state.mechanicsPhaseId}`);
      }

      state = engine.getGameState()!;
      guard += 1;
    }

    expect(guard).toBeLessThan(160);
    expect(state.phase).toBe(GamePhase.GAME_END);
    expect(state.round).toBeGreaterThan(1);
    expect(state.players.some((player) => player.score !== 0)).toBe(true);
  });
});
