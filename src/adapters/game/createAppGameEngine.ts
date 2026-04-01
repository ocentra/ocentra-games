import { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import type { IAIManager } from '@ocentra/game-domain/interfaces/IAIManager';
import type { IDeckProvider } from '@ocentra/game-domain/interfaces/IDeckProvider';
import { DeckManager } from '@ocentra/game-asset-domain/deck/DeckManager';
import { AIManager } from '@/lib/managers/ai/AIManager';

export async function createAppGameEngine(): Promise<GameEngine> {
  const deckManager = await DeckManager.getOrCreateInstance();
  deckManager.setSeed(Date.now());

  const deckProvider: IDeckProvider = {
    createStandardDeck: () => deckManager.createStandardDeck(),
    shuffleDeck: (deck) => deckManager.shuffleDeck(deck),
    dealInitialHands: (deck, playerCount, handSize) =>
      deckManager.dealInitialHands(deck, playerCount, handSize),
    drawCard: (deck) => deckManager.drawCard(deck),
    getSeed: () => deckManager.getSeed(),
    setSeed: (seed) => deckManager.setSeed(seed),
  };

  const aiManager: IAIManager = new AIManager('claim');

  return new GameEngine({ deckProvider, aiManager });
}
