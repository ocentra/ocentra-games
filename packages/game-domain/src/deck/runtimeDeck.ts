import { Suit, type Card, type CardValue, type RuntimePiece, type RuntimePieceAssetRef } from '@/types/game';

export interface RuntimeDeckDealResult {
  hands: RuntimePiece[][];
  remainingDeck: RuntimePiece[];
}

export interface RuntimeDeckDrawResult {
  piece: RuntimePiece | null;
  remainingDeck: RuntimePiece[];
}

export interface RuntimeDeckProvider {
  createDeck(): Promise<RuntimePiece[]>;
  shuffleDeck(deck: RuntimePiece[]): RuntimePiece[];
  dealInitialHands(deck: RuntimePiece[], playerCount: number, handSize: number): RuntimeDeckDealResult;
  drawPiece(deck: RuntimePiece[]): RuntimeDeckDrawResult;
  getSeed(): number;
  setSeed(seed: number): void;
}

export function isRuntimeCard(piece: RuntimePiece | null | undefined): piece is Card {
  return Boolean(piece) &&
    piece?.pieceKind === 'card' &&
    typeof piece.suit === 'string' &&
    Object.values(Suit).includes(piece.suit as Suit) &&
    typeof piece.value === 'number';
}

export function asRuntimeCard(piece: RuntimePiece | null | undefined): Card | null {
  return isRuntimeCard(piece) ? piece : null;
}

export function runtimePiecesToCards(pieces: readonly RuntimePiece[]): Card[] {
  return pieces.map(asRuntimeCard).filter((piece): piece is Card => piece !== null);
}

export function createRuntimeCard(card: {
  id: string;
  suit: Suit;
  value: CardValue;
  assetRef?: RuntimePieceAssetRef;
  imageHash?: string;
  copyIndex?: number;
  family?: string;
  logicalId?: string;
  tags?: string[];
}): Card {
  const logicalId = card.logicalId ?? card.id;
  return {
    id: card.copyIndex && card.copyIndex > 1 ? `${logicalId}#${card.copyIndex}` : card.id,
    logicalId,
    pieceKind: 'card',
    family: card.family ?? 'french_cards',
    identity: {
      family: card.family ?? 'French',
      suit: card.suit,
      value: card.value,
    },
    tags: card.tags ?? [],
    assetRef: card.assetRef,
    imageHash: card.imageHash,
    copyIndex: card.copyIndex ?? 1,
    suit: card.suit,
    value: card.value,
  };
}

export function cloneRuntimePiece(piece: RuntimePiece, copyIndex = piece.copyIndex): RuntimePiece {
  return {
    ...piece,
    identity: { ...piece.identity },
    tags: [...piece.tags],
    assetRef: piece.assetRef ? { ...piece.assetRef } : undefined,
    copyIndex,
  };
}

export function materializeRuntimePieces(pieces: readonly RuntimePiece[]): RuntimePiece[] {
  const seen = new Map<string, number>();
  return pieces.map((piece) => {
    const logicalId = piece.logicalId || piece.id;
    const copyIndex = (seen.get(logicalId) ?? 0) + 1;
    seen.set(logicalId, copyIndex);
    return {
      ...cloneRuntimePiece(piece, copyIndex),
      id: copyIndex === 1 ? logicalId : `${logicalId}#${copyIndex}`,
      logicalId,
    };
  });
}

export function shuffleRuntimePieces(pieces: readonly RuntimePiece[], seed: number): RuntimePiece[] {
  const shuffled = pieces.map((piece) => cloneRuntimePiece(piece));
  let currentIndex = shuffled.length;
  let workingSeed = seed;

  while (currentIndex !== 0) {
    workingSeed = nextSeed(workingSeed);
    const randomIndex = Math.floor((workingSeed / 233280) * currentIndex);
    currentIndex -= 1;
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
  }

  return shuffled;
}

export function dealRuntimePieces(
  deck: readonly RuntimePiece[],
  playerCount: number,
  handSize: number,
): RuntimeDeckDealResult {
  const hands: RuntimePiece[][] = Array.from({ length: playerCount }, () => []);
  const remainingDeck = deck.map((piece) => cloneRuntimePiece(piece));

  for (let pieceIndex = 0; pieceIndex < handSize; pieceIndex += 1) {
    for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
      const piece = remainingDeck.shift();
      if (piece) {
        hands[playerIndex].push(piece);
      }
    }
  }

  return { hands, remainingDeck };
}

export function drawRuntimePiece(deck: readonly RuntimePiece[]): RuntimeDeckDrawResult {
  const remainingDeck = deck.map((piece) => cloneRuntimePiece(piece));
  const piece = remainingDeck.shift() ?? null;
  return { piece, remainingDeck };
}

function nextSeed(seed: number): number {
  return (seed * 9301 + 49297) % 233280;
}
