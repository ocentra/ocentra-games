import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type {
  MechanicsAssetReference,
  MechanicsEnabledModule,
  MechanicsRuntimeIntegration,
} from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
import { generateAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import {
  MechanicsAction,
  MechanicsCustomAction,
  MechanicsEndCondition,
  MechanicsImplementationHints,
  MechanicsPhase,
  MechanicsPlayerConfig,
  MechanicsTurnPolicy,
  MechanicsZone,
} from './MechanicsSerializableFields';

export const GAME_MECHANICS_TEMPLATE = {
  gameId: 'custom',
  mechanicsId: 'custom-mechanics',
  mechanicsVersion: '2.0.0',
  familyKernel: 'custom',
  familyVariant: 'default',
  kernelVersion: '1.0',
  inheritsFrom: null,
  enabledModules: [],
  assetRefs: {},
  modelRefs: {},
  constants: {},
  familyConfig: null,
  implementationHints: {
    rngUsed: [],
    authoritativeServer: false,
      customLogicNeeded: [],
    },
  ruleModel: {},
  scoringModel: {},
  strategyHooks: {},
  stateModel: {},
  eventModel: {},
  validationSuites: [],
  runtimeIntegration: {},
  examples: [],
  roles: [],
  determinismNotes: 'No determinism requirements configured.',
} as const;

export const TURN_BASED_GAME_MECHANICS_TEMPLATE = {
  playerConfig: {
    playerMode: 'multiplayer',
    minPlayers: 2,
    maxPlayers: 4,
    optimalPlayers: null,
    dealerRotates: true,
  },
  phases: [
    {
      id: 'play',
      label: 'Play',
      actor: 'current_player',
      legalActions: ['play'],
      nextPhase: null,
      isMandatory: true,
      loopIndex: null,
      totalLoops: null,
      conditionalNext: [],
      cardVisibilityChanges: {},
      notes: 'Default turn phase.',
    },
  ],
  actions: {
    play: {
      supported: true,
      description: 'Take the active turn action.',
      constraints: 'See game rules.',
      effectType: 'play',
      cost: '0',
      effectHints: {},
      isTerminating: false,
    },
  },
  customActions: [],
  zones: [],
  turnPolicy: {
    direction: 'clockwise',
    startsWith: 'left_of_dealer',
    timerSeconds: null,
  },
  endConditions: [],
  bankingConfig: null,
  roundConfig: null,
  finalHandSize: 0,
  playerModel: {},
  sessionModel: {},
  zoneModel: {},
  setupModel: {},
  turnModel: {},
  actionModel: {},
  progression: [],
} as const;

@serializableClass({
  assetType: 'GameMechanics',
  displayName: 'Game Mechanics',
  category: AssetTypeCategory.Game,
})
export abstract class GameMechanics extends ScriptableObject {
  static schemaVersion = 2;
  static readonly requiresInspector = true;

  static createTemplate(): Record<string, unknown> {
    return cloneTemplate(GAME_MECHANICS_TEMPLATE);
  }

  @serializable({ label: 'Game ID' })
  gameId: string = '';

  @serializable({ label: 'Mechanics ID' })
  mechanicsId: string = '';

  @serializable({ label: 'Mechanics Version' })
  mechanicsVersion: string = '2.0.0';

  @serializable({ label: 'Family Kernel' })
  familyKernel: string = '';

  @serializable({ label: 'Family Variant' })
  familyVariant: string = '';

  @serializable({ label: 'Kernel Version' })
  kernelVersion: string = '1.0';

  @serializable({ label: 'Inherits From' })
  inheritsFrom: string | null = null;

  @serializable({ label: 'Enabled Modules' })
  enabledModules: MechanicsEnabledModule[] = [];

  @serializable({ label: 'Linked Assets' })
  assetRefs: Record<string, MechanicsAssetReference> = {};

  @serializable({ label: 'Linked Mechanics Models' })
  modelRefs: Record<string, MechanicsAssetReference> = {};

  @serializable({ label: 'Constants' })
  constants: Record<string, unknown> = {};

  @serializable({ label: 'Family Config' })
  familyConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Implementation Hints' })
  implementationHints: MechanicsImplementationHints = new MechanicsImplementationHints();

  @serializable({ label: 'Rule Model' })
  ruleModel: Record<string, unknown> = {};

  @serializable({ label: 'Scoring Model' })
  scoringModel: Record<string, unknown> = {};

  @serializable({ label: 'Strategy Hooks' })
  strategyHooks: Record<string, unknown> = {};

  @serializable({ label: 'State Model' })
  stateModel: Record<string, unknown> = {};

  @serializable({ label: 'Event Model' })
  eventModel: Record<string, unknown> = {};

  @serializable({ label: 'Validation Suites' })
  validationSuites: unknown[] = [];

  @serializable({ label: 'Runtime Integration' })
  runtimeIntegration: MechanicsRuntimeIntegration = {};

  @serializable({ label: 'Examples' })
  examples: unknown[] = [];

  @serializable({ label: 'Roles' })
  roles: unknown[] = [];

  @serializable({ label: 'Determinism Notes' })
  determinismNotes: string = '';

  protected static async createMechanicsAsset(
    assetType: string,
    context: AssetCreationContext,
    dataOverrides: Record<string, unknown>,
  ): Promise<CreatedAsset> {
    const guid = await generateAssetGuid(assetType, context.gameId);
    const template = this.createTemplate();
    return {
      assetId: `${context.gameId}-mechanics`,
      fileName: `${context.gameId}Mechanics.asset`,
      guid,
      data: {
        ...template,
        gameId: context.gameId,
        mechanicsId: `${context.gameId}-mechanics`,
        ...dataOverrides,
      },
    };
  }
}

@serializableClass({
  assetType: 'TurnBasedGameMechanics',
  displayName: 'Turn Based Game Mechanics',
  category: AssetTypeCategory.Game,
})
export abstract class TurnBasedGameMechanics extends GameMechanics {
  static override createTemplate(): Record<string, unknown> {
    return {
      ...super.createTemplate(),
      ...cloneTemplate(TURN_BASED_GAME_MECHANICS_TEMPLATE),
    };
  }

  @serializable({ label: 'Player Config', elementType: MechanicsPlayerConfig })
  playerConfig: MechanicsPlayerConfig = new MechanicsPlayerConfig();

  @serializable({ label: 'Phases', elementType: MechanicsPhase })
  phases: MechanicsPhase[] = [];

  @serializable({ label: 'Actions' })
  actions: Record<string, MechanicsAction> = {};

  @serializable({ label: 'Custom Actions', elementType: MechanicsCustomAction })
  customActions: MechanicsCustomAction[] = [];

  @serializable({ label: 'Zones', elementType: MechanicsZone })
  zones: MechanicsZone[] = [];

  @serializable({ label: 'Turn Policy' })
  turnPolicy: MechanicsTurnPolicy = new MechanicsTurnPolicy();

  @serializable({ label: 'End Conditions', elementType: MechanicsEndCondition })
  endConditions: MechanicsEndCondition[] = [];

  @serializable({ label: 'Banking Config' })
  bankingConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Round Config' })
  roundConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Final Hand Size' })
  finalHandSize: number = 0;

  @serializable({ label: 'Player Model' })
  playerModel: Record<string, unknown> = {};

  @serializable({ label: 'Session Model' })
  sessionModel: Record<string, unknown> = {};

  @serializable({ label: 'Zone Model' })
  zoneModel: Record<string, unknown> = {};

  @serializable({ label: 'Setup Model' })
  setupModel: Record<string, unknown> = {};

  @serializable({ label: 'Turn Model' })
  turnModel: Record<string, unknown> = {};

  @serializable({ label: 'Action Model' })
  actionModel: Record<string, unknown> = {};

  @serializable({ label: 'Progression' })
  progression: unknown[] = [];
}

function cloneTemplate(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
