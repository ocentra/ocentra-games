import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import { Suit } from '@ocentra/game-domain/types/game';
import type { CardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { frenchCardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { CardRanking } from '@/card/cardRanking/CardRanking';
import { DeckRanking } from '@/deck/DeckRanking';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import JSON5 from 'json5';
import { PieceKind } from '@/pieces/PieceKind';
import type { CardPieceId } from '@/pieces/piece-id';
import { computeCardPieceId } from '@/pieces/piece-id';

@serializableClass({
  schemaVersion: 1,
  assetType: 'Card',
  displayName: 'Card',
  icon: '🃏',
  category: AssetTypeCategory.Game,
})
export class Card extends ScriptableObject {

  static override schemaVersion = 1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static parentPathForSave: string | null = null;

  static override createTemplate(): Record<string, unknown> {
    return {
      cardIdentity: frenchCardIdentity(Suit.SPADES, 2),
      imageHash: '',
      imagePath: '',
      cardId: '2_of_spades',
      rankingAsset: undefined,
      cardRankingAsset: undefined,
    };
  }

  constructor() {
    super();
    const template = Card.createTemplate();
    this.cardIdentity = template.cardIdentity as CardIdentity;
    this.imageHash = template.imageHash as ImageHash;
    this.cardId = template.cardId as string;
    this.rankingAsset = new AssetResourceEntry<DeckRanking>(DeckRanking.assetType! as AssetType);
    this.cardRankingAsset = new AssetResourceEntry<CardRanking>(CardRanking.assetType! as AssetType);
  }

  @required('Card Identity is required')
  @serializable({ label: 'Card Identity' })
  cardIdentity!: CardIdentity;

  @required('Image Hash is required for card to function properly')
  @serializable({ label: 'Image Hash' })
  imageHash!: ImageHash;

  @serializable({ label: 'Image Path' })
  imagePath?: string;

  @required('Card ID is required for card to function properly')
  @serializable({ label: 'Card ID' })
  cardId!: string;

  @required('Card Ranking Asset is required for card to function properly')
  @serializable({ label: 'Ranking Asset', elementType: AssetResourceEntry })
  rankingAsset!: AssetResourceEntry<DeckRanking>;

  @serializable({ label: 'Card Ranking Asset', elementType: AssetResourceEntry })
  cardRankingAsset?: AssetResourceEntry<CardRanking>;

  get pieceKind(): PieceKind {
    return PieceKind.Card;
  }

  get pieceId(): CardPieceId {
    return computeCardPieceId(this.cardIdentity);
  }

  getCardId(cardRanking?: CardRanking): string {
    if (this.cardId) {
      return this.cardId;
    }
    return this.computeCardId(cardRanking);
  }

  private computeCardId(cardRanking?: CardRanking): string {
    if (this.cardIdentity.family !== 'French' || !('suit' in this.cardIdentity && 'value' in this.cardIdentity)) {
      return computeCardPieceId(this.cardIdentity);
    }
    if (cardRanking) {
      const rankName = cardRanking.getRankName(this.cardIdentity.value);
      return `${rankName.toLowerCase()}_of_${this.cardIdentity.suit}`;
    }
    return `${this.cardIdentity.value}_of_${this.cardIdentity.suit}`;
  }

  protected override onLoad(): void {
    super.onLoad();
    void this.syncCardId();
  }

  protected override onBeforeSave(): void {
    super.onBeforeSave();
    void this.syncCardId();
  }

  private async syncCardId(): Promise<void> {
    let cardRanking: CardRanking | undefined;

    if (this.rankingAsset?.guid) {
      try {
        const loaded = await this.rankingAsset.load(DeckRanking);
        cardRanking = loaded || undefined;
      } catch {
        cardRanking = undefined;
      }
    }

    if (!cardRanking && this.cardRankingAsset?.guid) {
      try {
        const loaded = await this.cardRankingAsset.load(CardRanking);
        cardRanking = loaded || undefined;
      } catch {
        cardRanking = undefined;
      }
    }

    const expectedCardId = this.computeCardId(cardRanking);
    if (this.cardId !== expectedCardId) {
      this.cardId = expectedCardId;
      this.displayName = this.cardId;
      this.variant = this.cardId;
    }
  }

  override serialize(): string {
    const json5Content = super.serialize();
    if (Card.parentPathForSave) {
      try {
        const parsed = JSON5.parse(json5Content) as { system?: Record<string, unknown> };
        if (parsed.system) {
          parsed.system.parentPath = Card.parentPathForSave;
        }
        return JSON.stringify(parsed, null, 2).replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '$1:');
      } catch {
        return json5Content;
      }
    }
    return json5Content;
  }
}

