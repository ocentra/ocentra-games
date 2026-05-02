import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import { TurnBasedGameMechanics } from './GameMechanics';

const CARD_GAME_MECHANICS_TEMPLATE = {
  cardVisibility: {},
  drawConfig: null,
  discardConfig: null,
  deckType: 'Standard 52',
  suitSet: 'French',
  rankSet: 'Standard_52',
  initialHandSize: 3,
  trumpConfig: null,
  meldConfig: null,
  trickConfig: null,
  declarationMechanism: null,
  handRanks: null,
  buyCosts: null,
  marketConfig: null,
  specialCards: null,
  shedding: null,
  fishingConfig: null,
  patienceConfig: null,
  deckModel: {},
  deckCount: 1,
} as const;

@serializableClass({
  assetType: 'CardGameMechanics',
  displayName: 'Card Game Mechanics',
  category: AssetTypeCategory.Game,
})
export class CardGameMechanics extends TurnBasedGameMechanics {
  static override schemaVersion = 2;
  static override readonly requiresInspector = true;

  static override createTemplate(): Record<string, unknown> {
    return {
      ...super.createTemplate(),
      ...cloneTemplate(CARD_GAME_MECHANICS_TEMPLATE),
      actions: {
        play_card: {
          supported: true,
          description: 'Play a card.',
          constraints: 'See game rules.',
          effectType: 'play',
          cost: '0',
          effectHints: {},
          isTerminating: false,
        },
      },
      phases: [
        {
          id: 'play',
          label: 'Play',
          actor: 'current_player',
          legalActions: ['play_card'],
          nextPhase: null,
          isMandatory: true,
          loopIndex: null,
          totalLoops: null,
          conditionalNext: [],
          cardVisibilityChanges: {},
          notes: 'Default card play phase.',
        },
      ],
    };
  }

  @serializable({ label: 'Card Visibility' })
  cardVisibility: Record<string, unknown> = {};

  @serializable({ label: 'Draw Config' })
  drawConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Discard Config' })
  discardConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Deck Type' })
  deckType: string = '';

  @serializable({ label: 'Suit Set' })
  suitSet: string = '';

  @serializable({ label: 'Rank Set' })
  rankSet: string = '';

  @serializable({ label: 'Initial Hand Size' })
  initialHandSize: number = 0;

  @serializable({ label: 'Trump Config' })
  trumpConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Meld Config' })
  meldConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Trick Config' })
  trickConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Declaration Mechanism' })
  declarationMechanism: Record<string, unknown> | null = null;

  @serializable({ label: 'Hand Ranks' })
  handRanks: Record<string, unknown> | null = null;

  @serializable({ label: 'Buy Costs' })
  buyCosts: Record<string, unknown> | null = null;

  @serializable({ label: 'Market Config' })
  marketConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Special Cards' })
  specialCards: Record<string, unknown> | null = null;

  @serializable({ label: 'Shedding' })
  shedding: Record<string, unknown> | null = null;

  @serializable({ label: 'Fishing Config' })
  fishingConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Patience Config' })
  patienceConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Deck Model' })
  deckModel: Record<string, unknown> = {};

  @serializable({ label: 'Deck Count' })
  deckCount: number = 1;

  static async create(
    context: AssetCreationContext,
    dataOverrides: Record<string, unknown> = {},
  ): Promise<CreatedAsset> {
    return this.createMechanicsAsset('CardGameMechanics', context, dataOverrides);
  }
}

function cloneTemplate(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
