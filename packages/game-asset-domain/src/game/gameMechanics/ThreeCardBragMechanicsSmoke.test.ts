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
import { createFrench52DeckProvider } from './testDeckProviders';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const threeCardBragMechanicsAssetPath = path.resolve(
  repoRoot,
  'packages/asset-editor/Resources/GameMode/CardGames/Games/three-card-brag/three-card-bragMechanics.asset',
);

describe('Three Card Brag mechanics asset smoke', () => {
  it('validates, translates, and resolves a pilot hand through showdown', async () => {
    const parsed = JSON5.parse(fs.readFileSync(threeCardBragMechanicsAssetPath, 'utf8')) as unknown;
    const validation = validateAssetFile(parsed);
    expect(validation.success).toBe(true);

    const data = decodeCardGameMechanicsData((parsed as { data: unknown }).data);
    const spec = toMechanicsSpec(data);

    const engine = new GameEngine({
      deckProvider: createFrench52DeckProvider(19),
    });
    await engine.initializeGame({ maxPlayers: 3, enablePhysics: false, seed: 19 });
    engine.loadMechanicsSpec(spec);
    engine.addPlayer({ id: 'p1', name: 'Player 1' });
    engine.addPlayer({ id: 'p2', name: 'Player 2' });
    engine.addPlayer({ id: 'p3', name: 'Player 3' });

    await engine.startGame();

    const startedState = engine.getGameState()!;
    expect(startedState.mechanicsPhaseId).toBe('betting_round');
    expect(startedState.players.every((player) => player.hand.length === 3)).toBe(true);
    expect(startedState.mechanicsContext?.roundPot).toBe(3);

    const firstPlayer = startedState.players[startedState.currentPlayer];
    const betResult = engine.processPlayerAction({
      type: 'bet',
      playerId: firstPlayer.id,
      data: { amount: 2 },
      timestamp: new Date(startedState.lastAction.getTime() + 1000),
    });
    expect(betResult.isValid).toBe(true);

    const afterBet = engine.getGameState()!;
    const secondPlayer = afterBet.players[afterBet.currentPlayer];
    const foldResult = engine.processPlayerAction({
      type: 'fold',
      playerId: secondPlayer.id,
      timestamp: new Date(afterBet.lastAction.getTime() + 1000),
    });
    expect(foldResult.isValid).toBe(true);

    const afterFold = engine.getGameState()!;
    const thirdPlayer = afterFold.players[afterFold.currentPlayer];
    const showdownResult = engine.processPlayerAction({
      type: 'call_showdown',
      playerId: thirdPlayer.id,
      timestamp: new Date(afterFold.lastAction.getTime() + 1000),
    });
    expect(showdownResult.isValid).toBe(true);
    expect(engine.getGameState()?.phase).toBe(GamePhase.SHOWDOWN);

    const showdownState = engine.getGameState()!;
    const activePlayers = showdownState.players.filter(
      (player) => !showdownState.mechanicsContext?.foldedPlayerIds.includes(player.id),
    );

    for (const [index, player] of activePlayers.entries()) {
      const revealResult = engine.processPlayerAction({
        type: 'reveal_hand',
        playerId: player.id,
        timestamp: new Date(showdownState.lastAction.getTime() + (index + 1) * 1000),
      });
      expect(revealResult.isValid).toBe(true);
    }

    const nextRoundState = engine.getGameState()!;
    expect(nextRoundState.phase).toBe(GamePhase.PLAYER_ACTION);
    expect(nextRoundState.mechanicsPhaseId).toBe('betting_round');
    expect(nextRoundState.round).toBe(2);
    expect(nextRoundState.players.every((player) => player.hand.length === 3)).toBe(true);
    expect(nextRoundState.mechanicsContext?.roundPot).toBe(3);
    expect(nextRoundState.players.reduce((total, player) => total + player.score, 0)).toBe(5);
  });
});
