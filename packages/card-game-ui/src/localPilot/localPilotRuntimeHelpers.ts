import type {
  CardGameCardStripCardToken,
  CardGameCardStripPresentation,
  CardGameLayoutDocument,
  CardGameScoreboardPresentation,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import {
  cloneCardGameLayoutDocument,
  normalizeCardGameLayoutDocument,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { Card, GameState, Player } from '@ocentra/game-domain/types/game';
import type { CardGameSeatPresentation, CardGameZonePresentation } from '../CardGamePreviewSurface';
import type { HudArtworkControls } from '../scene/HudArtwork.types';

export interface LocalPilotHudActionDescriptor {
  cardId?: string;
  kind:
    | 'call_showdown'
    | 'declare'
    | 'discard_card'
    | 'end_turn'
    | 'pass'
    | 'pick_up'
    | 'reveal_hand'
    | 'take_discard'
    | 'take_stock';
  label: string;
  playerId?: string;
  suit?: string;
}

interface BuildLocalPilotHudActionsOptions {
  currentPlayer: Player | null;
  distinctDeclareSuits: string[];
  gameState: GameState | null;
  legalActions: string[];
  revealablePlayers: Player[];
}

interface BuildLocalPilotSeatPresentationOptions {
  gameState: GameState | null;
  playerCount: number;
  turnTimerLabel?: string;
  turnTimerProgress?: number;
}

interface BuildLocalPilotZonePresentationOptions {
  deckSize: number;
  document: CardGameLayoutDocument;
  gameState: GameState | null;
}

interface BuildLocalPilotScoreboardPresentationOptions {
  document: CardGameLayoutDocument;
  gameMode: {
    baseBet?: number | null;
    maxRounds?: number | null;
  } | null;
  gameState: GameState | null;
}

interface BuildLocalPilotCardStripPresentationOptions {
  document: CardGameLayoutDocument;
  gameMode: {
    baseBet?: number | null;
    maxRounds?: number | null;
  } | null;
  gameState: GameState | null;
}

function getSeatName(index: number): string {
  return index === 0 ? 'You' : `Seat ${index + 1}`;
}

function ensureRuntimeLayoutDocument(document: CardGameLayoutDocument): CardGameLayoutDocument {
  return normalizeCardGameLayoutDocument(document as unknown as Record<string, unknown>);
}

function resolveBindingValue(source: unknown, path: string | undefined): unknown {
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      return Number.isFinite(index) ? current[index] : undefined;
    }

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function selectTopCardBindingValue(value: unknown, path: string | undefined): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  if (path?.toLowerCase().includes('discard')) {
    return value[value.length - 1];
  }

  return value[0] ?? value[value.length - 1];
}

function formatScoreboardBindingValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return String(value.length);
  }

  if (typeof value === 'object' && 'score' in (value as Record<string, unknown>)) {
    const score = (value as Record<string, unknown>).score;
    if (typeof score === 'number' || typeof score === 'string') {
      return String(score);
    }
  }

  return undefined;
}

function toCardStripCardToken(value: unknown): CardGameCardStripCardToken | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if ('card' in (value as Record<string, unknown>)) {
    return toCardStripCardToken((value as Record<string, unknown>).card);
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' && record.id.length > 0
    ? record.id
    : typeof record.cardId === 'string' && record.cardId.length > 0
      ? record.cardId
      : null;
  const suit = typeof record.suit === 'string' ? record.suit : null;
  const rawValue = record.value;
  const normalizedValue = typeof rawValue === 'string' || typeof rawValue === 'number'
    ? rawValue
    : null;

  if (!id && !suit && normalizedValue === null) {
    return null;
  }

  return {
    id: id ?? `${suit ?? 'card'}_${String(normalizedValue ?? 'unknown')}`,
    suit,
    value: normalizedValue,
  };
}

export function formatLocalPilotCardShortLabel(card: Card): string {
  const valueMap: Record<number, string> = {
    14: 'A',
    13: 'K',
    12: 'Q',
    11: 'J',
  };
  const suitMap: Record<string, string> = {
    spades: 'SP',
    hearts: 'HE',
    diamonds: 'DI',
    clubs: 'CL',
  };

  return `${valueMap[card.value] ?? String(card.value)} ${suitMap[card.suit] ?? card.suit.slice(0, 2).toUpperCase()}`;
}

function formatLocalPilotCardTokenShortLabel(card: CardGameCardStripCardToken): string {
  const valueMap: Record<number, string> = {
    14: 'A',
    13: 'K',
    12: 'Q',
    11: 'J',
  };
  const suitMap: Record<string, string> = {
    spades: 'SP',
    hearts: 'HE',
    diamonds: 'DI',
    clubs: 'CL',
  };
  const value = typeof card.value === 'number'
    ? valueMap[card.value] ?? String(card.value)
    : typeof card.value === 'string'
      ? card.value
      : card.id;
  const suit = card.suit ? suitMap[card.suit] ?? card.suit.slice(0, 2).toUpperCase() : '';
  return [value, suit].filter(Boolean).join(' ');
}

export function formatLocalPilotCardLabel(card: Card): string {
  const valueMap: Record<number, string> = {
    14: 'A',
    13: 'K',
    12: 'Q',
    11: 'J',
  };
  const suitMap: Record<string, string> = {
    spades: 'Spades',
    hearts: 'Hearts',
    diamonds: 'Diamonds',
    clubs: 'Clubs',
  };
  const italianMatch = /^italian_(coppe|denari|spade|bastoni)_\d+$/i.exec(card.id);
  const italianSuitLabel = italianMatch?.[1];

  const valueLabel = valueMap[card.value] ?? String(card.value);
  const suitLabel = italianSuitLabel
    ? italianSuitLabel.charAt(0).toUpperCase() + italianSuitLabel.slice(1)
    : (suitMap[card.suit] ?? card.suit);
  return `${valueLabel} ${suitLabel}`;
}

export function describeLocalPilotPlayer(player: Player, gameState: GameState | null): string[] {
  const details: string[] = [];
  const familyState = gameState?.mechanicsContext?.familyState as {
    bankrollByPlayerId?: Record<string, number>;
    declaredSuitByPlayerId?: Record<string, string>;
    eliminatedPlayerIds?: string[];
    undeclaredDebtByPlayerId?: Record<string, number>;
  } | undefined;
  const declaredSuit = familyState?.declaredSuitByPlayerId?.[player.id] ?? player.declaredSuit;
  const bankroll = familyState?.bankrollByPlayerId?.[player.id];
  const debt = familyState?.undeclaredDebtByPlayerId?.[player.id] ?? 0;
  if (typeof bankroll === 'number') {
    details.push(`Bank: ${Math.round(bankroll)}`);
  }
  if (declaredSuit) {
    details.push(`Declared: ${declaredSuit}`);
  }
  if (debt > 0) {
    details.push(`Debt: ${debt}`);
  }
  if (familyState?.eliminatedPlayerIds?.includes(player.id)) {
    details.push('Observer');
  }
  if (gameState?.mechanicsContext?.foldedPlayerIds?.includes(player.id)) {
    details.push('Folded');
  }
  if (gameState?.mechanicsContext?.revealedPlayerIds?.includes(player.id)) {
    details.push('Revealed');
  }
  return details;
}

export function getLocalPilotWinnerText(players: Player[]): string | null {
  if (players.length === 0) {
    return null;
  }

  const topScore = Math.max(...players.map((player) => player.score));
  const winners = players.filter((player) => player.score === topScore);
  return winners.length > 1
    ? `Tie game between ${winners.map((player) => player.name).join(', ')}.`
    : `Winner: ${winners[0]?.name ?? 'Unknown'}.`;
}

export function buildLocalPilotHudActions({
  currentPlayer,
  distinctDeclareSuits,
  gameState,
  legalActions,
  revealablePlayers,
}: BuildLocalPilotHudActionsOptions): LocalPilotHudActionDescriptor[] {
  if (!currentPlayer) {
    return [];
  }

  const primaryActions: LocalPilotHudActionDescriptor[] = [];
  const cardChoiceActions: LocalPilotHudActionDescriptor[] = [];
  const terminalActions: LocalPilotHudActionDescriptor[] = [];
  const familyState = gameState?.mechanicsContext?.familyState as {
    declaredSuitByPlayerId?: Record<string, string>;
    turn?: { discarded?: boolean; taken?: boolean };
  } | undefined;
  const declaredSuit = familyState?.declaredSuitByPlayerId?.[currentPlayer.id] ?? currentPlayer.declaredSuit;
  const turn = familyState?.turn;

  if ((legalActions.includes('declare_suit') || legalActions.includes('declare')) && !declaredSuit) {
    distinctDeclareSuits.forEach((suit) => {
      primaryActions.push({
        kind: 'declare',
        label: `Declare ${suit.slice(0, 3).toUpperCase()}`,
        suit,
      });
    });
  }

  if (legalActions.includes('take_stock') && !turn?.taken && (gameState?.deck.length ?? 0) > 0) {
    const topCard = gameState?.deck[0];
    primaryActions.push({
      kind: 'take_stock',
      label: topCard ? `Stock ${formatLocalPilotCardShortLabel(topCard)}` : 'Take Stock',
    });
  }

  if (legalActions.includes('take_discard') && !turn?.taken && (gameState?.discardPile.length ?? 0) > 0) {
    const topCard = gameState?.discardPile[(gameState?.discardPile.length ?? 1) - 1];
    primaryActions.push({
      kind: 'take_discard',
      label: topCard ? `Discard ${formatLocalPilotCardShortLabel(topCard)}` : 'Take Discard',
    });
  }

  if (legalActions.includes('discard_card') && !turn?.discarded && currentPlayer.hand.length > 3) {
    currentPlayer.hand.forEach((card) => {
      cardChoiceActions.push({
        cardId: card.id,
        kind: 'discard_card',
        label: `Drop ${formatLocalPilotCardShortLabel(card)}`,
      });
    });
  }

  if (legalActions.includes('pick_up')) {
    currentPlayer.hand.forEach((card) => {
      cardChoiceActions.push({
        cardId: card.id,
        kind: 'pick_up',
        label: `Pick ${formatLocalPilotCardShortLabel(card)}`,
      });
    });
  }

  if (legalActions.includes('call_showdown')) {
    terminalActions.push({
      kind: 'call_showdown',
      label: 'Showdown',
    });
  }

  if (legalActions.includes('reveal_hand')) {
    revealablePlayers.forEach((player) => {
      terminalActions.push({
        kind: 'reveal_hand',
        label: `Reveal ${player.name}`,
        playerId: player.id,
      });
    });
  }

  if (legalActions.includes('pass')) {
    terminalActions.push({
      kind: 'pass',
      label: 'Pass',
    });
  }

  if (legalActions.includes('end_turn')) {
    terminalActions.push({
      kind: 'end_turn',
      label: 'Done',
    });
  }

  const primaryCapacity = Math.max(0, 6 - terminalActions.length);
  const resolvedPrimaryActions = primaryActions.slice(0, primaryCapacity);
  const cardChoiceCapacity = Math.max(0, 6 - terminalActions.length - resolvedPrimaryActions.length);
  return [
    ...resolvedPrimaryActions,
    ...cardChoiceActions.slice(0, cardChoiceCapacity),
    ...terminalActions,
  ].slice(0, 6);
}

export function buildLocalPilotHudControls(
  document: CardGameLayoutDocument,
  hudActions: LocalPilotHudActionDescriptor[],
): HudArtworkControls {
  const nextDocument = cloneCardGameLayoutDocument(ensureRuntimeLayoutDocument(document));
  const nextLabels = Array.from({ length: 6 }, (_, index) => hudActions[index]?.label ?? '');
  nextDocument.hud.buttonLabels = nextLabels;
  nextDocument.hud.buttonCount = Math.max(1, Math.min(6, hudActions.length || 1));
  nextDocument.renderToggles = {
    ...nextDocument.renderToggles,
    seats: true,
    table: true,
  };
  return nextDocument.hud;
}

export function buildLocalPilotSeatPresentation({
  gameState,
  playerCount,
  turnTimerLabel,
  turnTimerProgress,
}: BuildLocalPilotSeatPresentationOptions): Partial<Record<number, CardGameSeatPresentation>> {
  const presentations: Partial<Record<number, CardGameSeatPresentation>> = {};

  for (let seatId = 0; seatId < playerCount; seatId += 1) {
    const player = gameState?.players[seatId] ?? null;
    const details = player ? describeLocalPilotPlayer(player, gameState) : [];
    presentations[seatId] = {
      cardTokens: (player?.hand ?? []).map((card) => formatLocalPilotCardShortLabel(card)),
      infoBoxText: details.filter(Boolean).join(' | '),
      labelText: player?.name ?? getSeatName(seatId),
      state: player ? (seatId === gameState?.currentPlayer ? 'active' : 'default') : 'placeholder',
      turnTimerLabel: seatId === gameState?.currentPlayer ? turnTimerLabel : undefined,
      turnTimerProgress: seatId === gameState?.currentPlayer ? turnTimerProgress : undefined,
    };
  }

  return presentations;
}

export function buildLocalPilotZonePresentation({
  deckSize,
  document,
  gameState,
}: BuildLocalPilotZonePresentationOptions): Partial<Record<string, CardGameZonePresentation>> {
  const runtimeDocument = ensureRuntimeLayoutDocument(document);
  const source = (gameState ?? {
    deck: Array.from({ length: deckSize }, () => null),
    discardPile: [],
    floorCard: null,
    mechanicsContext: {
      roundPot: 0,
      tableCards: [],
    },
  }) as unknown;
  const playerNameById = Object.fromEntries(
    (gameState?.players ?? []).map((player, index) => [player.id, player.name || getSeatName(index)]),
  );

  return Object.fromEntries(
    (runtimeDocument.zones ?? []).map((zone) => {
      const rawValue = resolveBindingValue(source, zone.engineBinding);
      let presentation: CardGameZonePresentation = {
        emptyText: '',
        showLabel: false,
        testId: `claim-pilot-${zone.id}-zone`,
      };

      if (zone.type === 'list') {
        const items = Array.isArray(rawValue)
          ? rawValue.map((entry, index) => {
              if (entry && typeof entry === 'object' && 'card' in entry) {
                const record = entry as { card?: Card; playerId?: string };
                const card = record.card ? toCardStripCardToken(record.card) : null;
                const detail = record.playerId ? playerNameById[record.playerId] ?? record.playerId : undefined;
                return {
                  accent: true,
                  card,
                  detail,
                  id: record.playerId ?? `${zone.id}-${index}`,
                  label: record.card ? formatLocalPilotCardShortLabel(record.card) : 'Unknown',
                };
              }

              const card = toCardStripCardToken(entry);
              if (card) {
                return {
                  accent: true,
                  card,
                  id: card.id,
                  label: formatLocalPilotCardTokenShortLabel(card),
                };
              }

              if (entry && typeof entry === 'object' && 'id' in entry) {
                const record = entry as { id?: string; value?: string };
                return {
                  id: record.id ?? `${zone.id}-${index}`,
                  label: String(record.value ?? record.id ?? 'Item'),
                };
              }

              return {
                id: `${zone.id}-${index}`,
                label: String(entry),
              };
            })
          : [];

        presentation = {
          ...presentation,
          items,
        };
      } else if (zone.type === 'card') {
        const cardSource = selectTopCardBindingValue(rawValue, zone.engineBinding);
        const valueCard = cardSource && typeof cardSource === 'object'
          ? toCardStripCardToken(cardSource)
          : null;
        presentation = {
          ...presentation,
          valueAccent: true,
          valueCard,
          valueText: valueCard ? formatLocalPilotCardTokenShortLabel(valueCard) : undefined,
        };
      } else if (zone.type === 'deck' || zone.type === 'pot') {
        presentation = {
          ...presentation,
          valueText: Array.isArray(rawValue)
            ? String(rawValue.length)
            : typeof rawValue === 'number'
              ? String(rawValue)
              : undefined,
        };
        if (zone.type === 'deck') {
          const stackCount = Array.isArray(rawValue)
            ? rawValue.length
            : typeof rawValue === 'number'
              ? rawValue
              : undefined;
          presentation = {
            ...presentation,
            deckTray: stackCount !== undefined
              ? {
                  stackCount,
                }
              : undefined,
          };
        }
      } else {
        const valueCard = Array.isArray(rawValue)
          ? toCardStripCardToken(rawValue[rawValue.length - 1])
          : rawValue && typeof rawValue === 'object'
            ? toCardStripCardToken(rawValue)
            : null;
        presentation = {
          ...presentation,
          valueCard,
          valueText: Array.isArray(rawValue)
            ? rawValue.length
              ? formatLocalPilotCardLabel(rawValue[rawValue.length - 1] as Card)
              : undefined
            : rawValue && typeof rawValue === 'object'
              ? formatLocalPilotCardLabel(rawValue as Card)
              : rawValue !== undefined && rawValue !== null
                ? String(rawValue)
                : undefined,
        };
      }

      return [zone.id, presentation];
    }),
  );
}

export function buildLocalPilotScoreboardPresentation({
  document,
  gameMode,
  gameState,
}: BuildLocalPilotScoreboardPresentationOptions): CardGameScoreboardPresentation {
  const runtimeDocument = ensureRuntimeLayoutDocument(document);
  const source = {
    gameMode,
    gameState,
  };

  return {
    round:
      formatScoreboardBindingValue(
        resolveBindingValue(source, runtimeDocument.scoreboard.roundBinding),
      ) ?? String(runtimeDocument.scoreboard.round),
    totalRounds:
      formatScoreboardBindingValue(
        resolveBindingValue(source, runtimeDocument.scoreboard.totalRoundsBinding),
      ) ?? String(runtimeDocument.scoreboard.totalRounds),
    rowsById: Object.fromEntries(
      runtimeDocument.scoreboard.rows.map((row) => [
        row.id,
        {
          value: formatScoreboardBindingValue(resolveBindingValue(source, row.valueBinding)) ?? row.value,
        },
      ]),
    ),
  };
}

export function buildLocalPilotCardStripPresentation({
  document,
  gameMode,
  gameState,
}: BuildLocalPilotCardStripPresentationOptions): CardGameCardStripPresentation {
  const runtimeDocument = ensureRuntimeLayoutDocument(document);
  const source = {
    gameMode,
    gameState,
  };

  return {
    slotsById: Object.fromEntries(
      runtimeDocument.cardStrip.slots.map((slot) => {
        const rawValue = resolveBindingValue(source, slot.binding);
        const card = toCardStripCardToken(selectTopCardBindingValue(rawValue, slot.binding));
        if (card) {
          return [slot.id, {
            card,
            faceUp: true,
          }];
        }

        if (typeof rawValue === 'string' || typeof rawValue === 'number') {
          return [slot.id, {
            faceUp: true,
            text: String(rawValue),
          }];
        }

        return [slot.id, {
          faceUp: slot.previewFaceUp === true,
          text: slot.previewFaceUp ? slot.previewText : undefined,
        }];
      }),
    ),
  };
}
