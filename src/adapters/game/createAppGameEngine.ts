import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import type { IAIManager } from '@ocentra/game-domain/interfaces/IAIManager';
import type { IDeckProvider } from '@ocentra/game-domain/interfaces/IDeckProvider';
import { runtimePiecesToCards } from '@ocentra/game-domain/deck/runtimeDeck';
import { DeckManager } from '@ocentra/game-asset-domain/deck/DeckManager';
import { AIManager } from '@/lib/managers/ai/AIManager';

export async function createAppGameEngine(): Promise<GameEngine> {
  const deckManager = await DeckManager.getOrCreateInstance();
  deckManager.setSeed(Date.now());

  const deckProvider: IDeckProvider = {
    createDeck: () => deckManager.createStandardDeck(),
    createStandardDeck: () => deckManager.createStandardDeck(),
    shuffleDeck: (deck) => deckManager.shuffleDeck(runtimePiecesToCards(deck)),
    dealInitialHands: (deck, playerCount, handSize) =>
      deckManager.dealInitialHands(runtimePiecesToCards(deck), playerCount, handSize),
    drawPiece: (deck) => {
      const result = deckManager.drawCard(runtimePiecesToCards(deck));
      return {
        piece: result.card,
        remainingDeck: result.remainingDeck,
      };
    },
    drawCard: (deck) => deckManager.drawCard(runtimePiecesToCards(deck)),
    getSeed: () => deckManager.getSeed(),
    setSeed: (seed) => deckManager.setSeed(seed),
  };

  const aiManager: IAIManager = new AIManager('claim');

  return new GameEngine({ deckProvider, aiManager });
}
