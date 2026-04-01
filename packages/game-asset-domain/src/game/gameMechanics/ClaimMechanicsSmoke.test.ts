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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const claimMechanicsAssetPath = path.resolve(
  repoRoot,
  'packages/asset-editor/Resources/GameMode/CardGames/Games/Claim/claimMechanics.asset',
);

describe('Claim mechanics asset smoke', () => {
  it('validates, translates, and starts in the engine', async () => {
    const parsed = JSON5.parse(fs.readFileSync(claimMechanicsAssetPath, 'utf8')) as unknown;
    const validation = validateAssetFile(parsed);
    expect(validation.success).toBe(true);

    const data = CardGameMechanicsDataSchema.parse((parsed as { data: unknown }).data);
    const spec = toMechanicsSpec(data);

    const engine = new GameEngine();
    await engine.initializeGame({ maxPlayers: 2, enablePhysics: false, seed: 7 });
    engine.loadMechanicsSpec(spec);
    engine.addPlayer({ id: 'p1', name: 'Player 1' });
    engine.addPlayer({ id: 'p2', name: 'Player 2' });

    await engine.startGame();

    const state = engine.getGameState();
    expect(state?.mechanicsPhaseId).toBe('turn_loop');
    expect(state?.phase).toBe(GamePhase.PLAYER_ACTION);
    expect(state?.floorCard).not.toBeNull();
    expect(state?.players.every((player) => player.hand.length === 3)).toBe(true);

    const activePlayer = state!.players[state!.currentPlayer];
    const declareResult = engine.processPlayerAction({
      type: 'declare',
      playerId: activePlayer.id,
      data: { suit: activePlayer.hand[0].suit },
      timestamp: new Date(state!.lastAction.getTime() + 1000),
    });

    expect(declareResult.isValid).toBe(true);
    expect(engine.getGameState()?.players.find((player) => player.id === activePlayer.id)?.declaredSuit).toBe(activePlayer.hand[0].suit);
  });
});
