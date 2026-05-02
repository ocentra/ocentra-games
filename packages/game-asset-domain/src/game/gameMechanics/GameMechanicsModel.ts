import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { generateAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import type { MechanicsAssetReference } from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
import type { MechanicsModelKind } from '@ocentra/game-domain/schema/mechanics-model';
import {
  MechanicsAction,
  MechanicsCustomAction,
  MechanicsEndCondition,
  MechanicsPhase,
  MechanicsPlayerConfig,
  MechanicsTurnPolicy,
  MechanicsZone,
} from './MechanicsSerializableFields';

export type GameMechanicsModelRefKey =
  | 'player'
  | 'session'
  | 'deck'
  | 'zones'
  | 'phaseFlow'
  | 'actions'
  | 'stateEvents'
  | 'validation';

interface MechanicsModelDefinition {
  readonly assetType: string;
  readonly fileSuffix: string;
  readonly modelKind: MechanicsModelKind;
  readonly defaultModelId: string;
  readonly defaultData: Record<string, unknown>;
}

const MODEL_DEFINITIONS = {
  player: {
    assetType: 'GamePlayerModel',
    fileSuffix: 'PlayerModel',
    modelKind: 'player_model',
    defaultModelId: 'custom.player-model.v1',
    defaultData: {
      playerConfig: {
        playerMode: 'multiplayer',
        minPlayers: 2,
        maxPlayers: 4,
        optimalPlayers: null,
        dealerRotates: true,
      },
      playerModel: {},
    },
  },
  session: {
    assetType: 'GameSessionModel',
    fileSuffix: 'SessionModel',
    modelKind: 'session_model',
    defaultModelId: 'custom.session-model.v1',
    defaultData: {
      sessionModel: {},
      bankingConfig: {},
      roundConfig: {},
      endConditions: [],
    },
  },
  deck: {
    assetType: 'CardGameDeckModel',
    fileSuffix: 'DeckModel',
    modelKind: 'deck_model',
    defaultModelId: 'custom.deck-model.v1',
    defaultData: {
      deckType: 'Standard 52',
      suitSet: 'French',
      rankSet: 'Standard_52',
      deckCount: 1,
      initialHandSize: 3,
      drawConfig: {},
      discardConfig: {},
      deckModel: {},
      handRanks: {},
      specialCards: {},
    },
  },
  zones: {
    assetType: 'GameZoneModel',
    fileSuffix: 'ZoneModel',
    modelKind: 'zone_model',
    defaultModelId: 'custom.zone-model.v1',
    defaultData: {
      zones: [],
      zoneModel: {},
      cardVisibility: {},
    },
  },
  phaseFlow: {
    assetType: 'GamePhaseFlowModel',
    fileSuffix: 'PhaseFlowModel',
    modelKind: 'phase_flow_model',
    defaultModelId: 'custom.phase-flow-model.v1',
    defaultData: {
      phases: [],
      turnPolicy: {
        direction: 'clockwise',
        startsWith: 'left_of_dealer',
        timerSeconds: null,
      },
      setupModel: {},
      turnModel: {},
      runtimeIntegration: {},
      progression: [],
    },
  },
  actions: {
    assetType: 'GameActionSet',
    fileSuffix: 'ActionSet',
    modelKind: 'action_set_model',
    defaultModelId: 'custom.action-set.v1',
    defaultData: {
      actionModel: {
        actionIds: [],
        payloadSchemas: {},
        actionEndsTurn: {},
      },
      actions: {},
      customActions: [],
    },
  },
  stateEvents: {
    assetType: 'GameStateEventModel',
    fileSuffix: 'StateEventModel',
    modelKind: 'state_event_model',
    defaultModelId: 'custom.state-event-model.v1',
    defaultData: {
      stateModel: {},
      eventModel: {},
    },
  },
  validation: {
    assetType: 'GameValidationFixtures',
    fileSuffix: 'ValidationFixtures',
    modelKind: 'validation_fixture_model',
    defaultModelId: 'custom.validation-fixtures.v1',
    defaultData: {
      validationSuites: [],
      examples: [],
    },
  },
} as const satisfies Record<GameMechanicsModelRefKey, MechanicsModelDefinition>;

abstract class GameMechanicsModelBase extends ScriptableObject {
  static schemaVersion = 1;
  static readonly requiresInspector = true;
  protected static readonly definition: MechanicsModelDefinition;

  constructor() {
    super();
    const constructor = this.constructor as typeof GameMechanicsModelBase;
    this.modelKind = constructor.definition.modelKind;
    this.modelId = constructor.definition.defaultModelId;
  }

  static createTemplate(): Record<string, unknown> {
    const definition = this.definition;
    return {
      modelKind: definition.modelKind,
      modelId: definition.defaultModelId,
      modelVersion: '1.0.0',
      familyKernel: 'custom',
      familyVariant: 'default',
      inheritsFrom: null,
      executorId: 'custom.executor.v1',
      assetRefs: {},
      ...cloneRecord(definition.defaultData),
      examples: [],
    };
  }

  @serializable({ label: 'Model Kind', readonly: true })
  modelKind: MechanicsModelKind = 'player_model';

  @serializable({ label: 'Model ID' })
  modelId: string = '';

  @serializable({ label: 'Model Version' })
  modelVersion: string = '1.0.0';

  @serializable({ label: 'Family Kernel' })
  familyKernel?: string;

  @serializable({ label: 'Family Variant' })
  familyVariant?: string;

  @serializable({ label: 'Inherits From' })
  inheritsFrom: string | null = null;

  @serializable({ label: 'Executor ID' })
  executorId?: string;

  @serializable({ label: 'Linked Assets' })
  assetRefs: Record<string, MechanicsAssetReference> = {};

  @serializable({ label: 'Examples' })
  examples: unknown[] = [];

  protected static async createWithDefinition(
    context: AssetCreationContext,
    dataOverrides: Record<string, unknown>,
  ): Promise<CreatedAsset> {
    const definition = this.definition;
    const guid = await generateAssetGuid(definition.assetType, context.gameId);
    return {
      assetId: `${context.gameId}-${definition.fileSuffix.toLowerCase()}`,
      fileName: `${context.gameId}${definition.fileSuffix}.asset`,
      guid,
      data: {
        ...this.createTemplate(),
        ...dataOverrides,
      },
    };
  }
}

@serializableClass({
  assetType: 'GamePlayerModel',
  displayName: 'Game Player Model',
  category: AssetTypeCategory.Game,
})
export class GamePlayerModel extends GameMechanicsModelBase {
  protected static override readonly definition = MODEL_DEFINITIONS.player;

  @serializable({ label: 'Player Config', elementType: MechanicsPlayerConfig })
  playerConfig: MechanicsPlayerConfig = new MechanicsPlayerConfig();

  @serializable({ label: 'Player Model' })
  playerModel: Record<string, unknown> = {};

  static async create(context: AssetCreationContext, dataOverrides: Record<string, unknown> = {}): Promise<CreatedAsset> {
    return this.createWithDefinition(context, dataOverrides);
  }
}

@serializableClass({
  assetType: 'GameSessionModel',
  displayName: 'Game Session Model',
  category: AssetTypeCategory.Game,
})
export class GameSessionModel extends GameMechanicsModelBase {
  protected static override readonly definition = MODEL_DEFINITIONS.session;

  @serializable({ label: 'Session Model' })
  sessionModel: Record<string, unknown> = {};

  @serializable({ label: 'Banking Config' })
  bankingConfig: Record<string, unknown> | null = {};

  @serializable({ label: 'Round Config' })
  roundConfig: Record<string, unknown> | null = {};

  @serializable({ label: 'End Conditions', elementType: MechanicsEndCondition })
  endConditions: MechanicsEndCondition[] = [];

  static async create(context: AssetCreationContext, dataOverrides: Record<string, unknown> = {}): Promise<CreatedAsset> {
    return this.createWithDefinition(context, dataOverrides);
  }
}

@serializableClass({
  assetType: 'CardGameDeckModel',
  displayName: 'Card Game Deck Model',
  category: AssetTypeCategory.Game,
})
export class CardGameDeckModel extends GameMechanicsModelBase {
  protected static override readonly definition = MODEL_DEFINITIONS.deck;

  @serializable({ label: 'Deck Type' })
  deckType: string = '';

  @serializable({ label: 'Suit Set' })
  suitSet: string = '';

  @serializable({ label: 'Rank Set' })
  rankSet: string = '';

  @serializable({ label: 'Deck Count' })
  deckCount: number = 1;

  @serializable({ label: 'Initial Hand Size' })
  initialHandSize: number = 0;

  @serializable({ label: 'Draw Config' })
  drawConfig: Record<string, unknown> = {};

  @serializable({ label: 'Discard Config' })
  discardConfig: Record<string, unknown> = {};

  @serializable({ label: 'Deck Model' })
  deckModel: Record<string, unknown> = {};

  @serializable({ label: 'Hand Ranks' })
  handRanks: Record<string, unknown> = {};

  @serializable({ label: 'Special Cards' })
  specialCards: Record<string, unknown> = {};

  static async create(context: AssetCreationContext, dataOverrides: Record<string, unknown> = {}): Promise<CreatedAsset> {
    return this.createWithDefinition(context, dataOverrides);
  }
}

@serializableClass({
  assetType: 'GameZoneModel',
  displayName: 'Game Zone Model',
  category: AssetTypeCategory.Game,
})
export class GameZoneModel extends GameMechanicsModelBase {
  protected static override readonly definition = MODEL_DEFINITIONS.zones;

  @serializable({ label: 'Zones', elementType: MechanicsZone })
  zones: MechanicsZone[] = [];

  @serializable({ label: 'Zone Model' })
  zoneModel: Record<string, unknown> = {};

  @serializable({ label: 'Card Visibility' })
  cardVisibility: Record<string, unknown> = {};

  static async create(context: AssetCreationContext, dataOverrides: Record<string, unknown> = {}): Promise<CreatedAsset> {
    return this.createWithDefinition(context, dataOverrides);
  }
}

@serializableClass({
  assetType: 'GamePhaseFlowModel',
  displayName: 'Game Phase Flow Model',
  category: AssetTypeCategory.Game,
})
export class GamePhaseFlowModel extends GameMechanicsModelBase {
  protected static override readonly definition = MODEL_DEFINITIONS.phaseFlow;

  @serializable({ label: 'Phases', elementType: MechanicsPhase })
  phases: MechanicsPhase[] = [];

  @serializable({ label: 'Turn Policy', elementType: MechanicsTurnPolicy })
  turnPolicy: MechanicsTurnPolicy = new MechanicsTurnPolicy();

  @serializable({ label: 'Setup Model' })
  setupModel: Record<string, unknown> = {};

  @serializable({ label: 'Turn Model' })
  turnModel: Record<string, unknown> = {};

  @serializable({ label: 'Runtime Integration' })
  runtimeIntegration: Record<string, unknown> = {};

  @serializable({ label: 'Progression' })
  progression: string[] = [];

  static async create(context: AssetCreationContext, dataOverrides: Record<string, unknown> = {}): Promise<CreatedAsset> {
    return this.createWithDefinition(context, dataOverrides);
  }
}

@serializableClass({
  assetType: 'GameActionSet',
  displayName: 'Game Action Set',
  category: AssetTypeCategory.Game,
})
export class GameActionSet extends GameMechanicsModelBase {
  protected static override readonly definition = MODEL_DEFINITIONS.actions;

  @serializable({ label: 'Action Model' })
  actionModel: Record<string, unknown> = {
    actionIds: [],
    payloadSchemas: {},
    actionEndsTurn: {},
  };

  @serializable({ label: 'Actions' })
  actions: Record<string, MechanicsAction> = {};

  @serializable({ label: 'Custom Actions', elementType: MechanicsCustomAction })
  customActions: MechanicsCustomAction[] = [];

  static async create(context: AssetCreationContext, dataOverrides: Record<string, unknown> = {}): Promise<CreatedAsset> {
    return this.createWithDefinition(context, dataOverrides);
  }
}

@serializableClass({
  assetType: 'GameStateEventModel',
  displayName: 'Game State Event Model',
  category: AssetTypeCategory.Game,
})
export class GameStateEventModel extends GameMechanicsModelBase {
  protected static override readonly definition = MODEL_DEFINITIONS.stateEvents;

  @serializable({ label: 'State Model' })
  stateModel: Record<string, unknown> = {};

  @serializable({ label: 'Event Model' })
  eventModel: Record<string, unknown> = {};

  static async create(context: AssetCreationContext, dataOverrides: Record<string, unknown> = {}): Promise<CreatedAsset> {
    return this.createWithDefinition(context, dataOverrides);
  }
}

@serializableClass({
  assetType: 'GameValidationFixtures',
  displayName: 'Game Validation Fixtures',
  category: AssetTypeCategory.Game,
})
export class GameValidationFixtures extends GameMechanicsModelBase {
  protected static override readonly definition = MODEL_DEFINITIONS.validation;

  @serializable({ label: 'Validation Suites' })
  validationSuites: unknown[] = [];

  static async create(context: AssetCreationContext, dataOverrides: Record<string, unknown> = {}): Promise<CreatedAsset> {
    return this.createWithDefinition(context, dataOverrides);
  }
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(value)) as unknown;
  return cloned && typeof cloned === 'object' && !Array.isArray(cloned)
    ? cloned as Record<string, unknown>
    : {};
}
