import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { Card } from '@ocentra/game-domain/types/game';
import { Suit } from '@ocentra/game-domain/types/game';
import type { CardValue } from '@ocentra/game-domain/types/game';
import { createRuntimeCard } from '@ocentra/game-domain/deck/runtimeDeck';
import type { DeckFamily } from '@ocentra/game-domain/deck/deckFamily';
import { DECK_FAMILY_FRENCH } from '@ocentra/game-domain/deck/cardIdentity';
import { CardRankingType } from '@/card/cardRanking/CardRankingType';
import { SuitColor } from '@/card/cardRanking/SuitColor';
import { DeckType } from '@/deck/DeckType';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '@/AssetCreation';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { CardRankingFactory } from '@/card/cardRanking/CardRankingFactory';
import type { CardPieceId } from '@/pieces/piece-id';
import { computeCardPieceId } from '@/pieces/piece-id';
import { computeExpectedCardIdentities } from '@/schemas/asset/deck-cross-validators';

const log = MainAppLogger.instance;
log.register(import.meta.url);

@serializableClass({
  assetType: 'CardSuitEntry',
  displayName: 'Card Suit Entry',
})
export class CardSuitEntry {
  @serializable({ label: 'Suit Name' })
  SuitName!: string;

  @serializable({ label: 'Suit Symbol' })
  SuitSymbol!: string;

  @serializable({ label: 'Suit Color' })
  SuitColor: SuitColor = SuitColor.None;

  @serializable({ label: 'Display Order' })
  DisplayOrder!: number;
}

@serializableClass({
  assetType: 'CardRankingEntry',
  displayName: 'Card Ranking Entry',
})
export class CardRankingEntry {
  @serializable({ label: 'Card Name' })
  CardName!: string;

  @serializable({ label: 'Card Value' })
  Value!: number;

  @serializable({ label: 'Card Symbol' })
  CardSymbol!: string;

  @serializable({ label: 'Display Order' })
  DisplayOrder!: number;
}

@serializableClass({
  assetType: 'CardRankingExplicitEntry',
  displayName: 'Card Ranking Explicit Entry',
})
export class CardRankingExplicitEntry {
  @serializable({ label: 'Card ID' })
  id!: string;

  @serializable({ label: 'Copies' })
  copies: number = 1;

  @serializable({ label: 'Suit' })
  suit?: string | null;

  @serializable({ label: 'Rank' })
  rank?: string | number | null;

  @serializable({ label: 'Label' })
  label?: string | null;

  @serializable({ label: 'Order' })
  order?: number | null;

  @serializable({ label: 'Points' })
  points?: number | null;

  @serializable({ label: 'Kind' })
  kind?: string | null;
}

@serializableClass({
  assetType: 'CardRanking',
  displayName: 'Card Ranking',
  icon: '📊',
  category: AssetTypeCategory.Game,
})
export class CardRanking extends ScriptableObject {

  static readonly requiresInspector = true;
  static override createTemplate(): Record<string, unknown> {
    return {
      deckType: DeckType.Custom,
      expectedCardCount: 0,
      includesJokers: false,
      backCardCount: 1,
      deckFamily: DECK_FAMILY_FRENCH,
      cardEntries: [],
      familyPayload: undefined,
    };
  }

  constructor() {
    super();
    this.deckType = DeckType.Custom;
    this.expectedCardCount = 0;
    this.includesJokers = false;
    this.backCardCount = 1;
    this.deckFamily = DECK_FAMILY_FRENCH;
  }

  @required('Deck Type is required for card ranking metadata')
  @serializable({ label: 'Deck Type' })
  deckType: DeckType = DeckType.Custom;

  @required('Expected Card Count is required for card ranking metadata')
  @serializable({ label: 'Expected Card Count' })
  expectedCardCount: number = 0;

  @required('Includes Jokers flag is required for card ranking metadata')
  @serializable({ label: 'Includes Jokers' })
  includesJokers: boolean = false;

  @required('Back Card Count is required for card ranking metadata')
  @serializable({ label: 'Back Card Count' })
  backCardCount: number = 1;

  @serializable({ label: 'Deck Family' })
  deckFamily: DeckFamily = DECK_FAMILY_FRENCH;

  @serializable({ label: 'Explicit Card Entries', elementType: CardRankingExplicitEntry })
  cardEntries: CardRankingExplicitEntry[] = [];

  @serializable({ label: 'Family Payload' })
  familyPayload?: { french?: { suits: CardSuitEntry[]; rankings: CardRankingEntry[] } };

  @serializable({ label: 'Card Identities' })
  cardIdentities: string[] = [];

  getSuitsArray(): CardSuitEntry[] {
    return this.familyPayload?.french?.suits ?? [];
  }

  getRankingsArray(): CardRankingEntry[] {
    return this.familyPayload?.french?.rankings ?? [];
  }

  getSuitOrder(): string[] {
    return this.getSuitsArray()
      .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
      .map(s => s.SuitName);
  }

  getRankOrder(): number[] {
    return this.getRankingsArray()
      .sort((a, b) => b.DisplayOrder - a.DisplayOrder)
      .map(r => r.Value);
  }

  getCanonicalCardPieceIds(): CardPieceId[] {
    const suits = this.getSuitOrder();
    const ranks = this.getRankOrder();
    const ids: CardPieceId[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        ids.push(computeCardPieceId(suit as Suit, rank as CardValue));
      }
    }
    return ids;
  }

  getSuitSymbol(suitName: string): string | undefined {
    return this.getSuitsArray().find(s => s.SuitName === suitName)?.SuitSymbol;
  }

  getSuitColor(suitName: string): SuitColor {
    return this.getSuitsArray().find(s => s.SuitName === suitName)?.SuitColor ?? SuitColor.None;
  }

  getRankSymbol(rankValue: number): string | undefined {
    return this.getRankingsArray().find(r => r.Value === rankValue)?.CardSymbol;
  }

  getRankName(rankValue: number): string {
    const entry = this.getRankingsArray().find(r => r.Value === rankValue);
    return entry?.CardName || entry?.CardSymbol || rankValue.toString();
  }

  getAllSuits(): string[] {
    return this.getSuitOrder();
  }

  getAllRanks(): number[] {
    return this.getRankOrder();
  }

  getCardSymbol(suitName: string, rankValue: number, coloured: boolean = true): string {
    const rankSymbol = this.getRankSymbol(rankValue) || rankValue.toString();
    const suitSymbol = this.getSuitSymbol(suitName);

    if (suitSymbol) {
      return coloured ? `${rankSymbol}${suitSymbol}` : `${rankSymbol}${suitSymbol}`;
    }

    return rankSymbol;
  }

  getCardFromSymbol(symbol: string): Card | null {
    const trimmed = symbol.trim();
    if (trimmed.length < 2) {
      return null;
    }

    const suitSymbol = trimmed[trimmed.length - 1];
    const rankSymbol = trimmed.slice(0, -1);

    const suitEntry = this.getSuitsArray().find(s => s.SuitSymbol === suitSymbol);
    if (!suitEntry) {
      return null;
    }

    const rankEntry = this.getRankingsArray().find(r =>
      r.CardSymbol === rankSymbol ||
      r.CardSymbol.toLowerCase() === rankSymbol.toLowerCase()
    );
    if (!rankEntry) {
      return null;
    }

    return createRuntimeCard({
      suit: suitEntry.SuitName as Suit,
      value: rankEntry.Value as CardValue,
      id: `${rankEntry.Value}_${suitSymbol}`,
    });
  }

  getRandomSuit(): string {
    const suits = this.getSuitOrder();
    if (suits.length === 0) return '';
    return suits[Math.floor(Math.random() * suits.length)];
  }

  getRandomRank(min?: number, max?: number): number {
    const ranks = this.getRankOrder();
    if (ranks.length === 0) return 2;

    const actualMin = min ?? Math.min(...ranks);
    const actualMax = max ?? Math.max(...ranks);
    const filteredRanks = ranks.filter(r => r >= actualMin && r <= actualMax);

    if (filteredRanks.length === 0) return ranks[0] || 2;
    return filteredRanks[Math.floor(Math.random() * filteredRanks.length)];
  }

  getRankSymbolToValue(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const entry of this.getRankingsArray()) {
      map[entry.CardSymbol] = entry.Value;
      map[entry.CardSymbol.toLowerCase()] = entry.Value;
    }
    return map;
  }

  getSuitSymbolToName(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const entry of this.getSuitsArray()) {
      map[entry.SuitSymbol] = entry.SuitName;
    }
    return map;
  }

  calculateExpectedCardCount(): number {
    return computeExpectedCardIdentities(this).length;
  }

  updateExpectedCardCount(): void {
    this.cardIdentities = computeExpectedCardIdentities(this);
    this.expectedCardCount = this.cardIdentities.length;
  }

  static async getDefault(): Promise<CardRanking> {
    return await ScriptableObject.getOrCreateDefault(
      CardRanking,
      CardRankingType.Standard,
      () => CardRankingFactory.createStandard52(),
      undefined,
      undefined,
      'CardRankingType.Standard'
    );
  }

  static async getCardRanking(type: CardRankingType): Promise<CardRanking | null> {
    return await ScriptableObject.FirstOrDefault(CardRanking, undefined, type);
  }

  static async create(context: AssetCreationContext, deckType: DeckType = DeckType.Standard52): Promise<CreatedAsset> {
    const deferred = new OperationDeferred<string>();
    const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
    let guid: AssetGUIDType;
    if (!publishResult.isSuccess) {
      guid = createAssetGuid();
      log.logWarn('[CardRanking] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
        assetType: 'CardRanking',
        gameId: context.gameId,
        fallbackGuid: guid,
      });
    } else {
      const result = await deferred.promise;
      const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
      guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;
      if (!result.isSuccess || !result.value) {
        log.logWarn('[CardRanking] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
          assetType: 'CardRanking',
          gameId: context.gameId,
          fallbackGuid: guid,
        });
      }
    }
    const assetId = `${context.gameId}CardRanking`;
    const instance = CardRankingFactory.create({ deckType });
    const data: Record<string, unknown> = {
      deckType: instance.deckType,
      expectedCardCount: instance.expectedCardCount,
      includesJokers: instance.includesJokers,
      backCardCount: instance.backCardCount,
      deckFamily: instance.deckFamily,
      cardEntries: instance.cardEntries,
      familyPayload: instance.familyPayload,
    };

    return {
      assetId,
      fileName: `${context.gameId}CardRanking.asset`,
      guid,
      data,
    };
  }
}
