import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { PhaseActor } from '@ocentra/game-domain/game/phaseActor';
import { PlayerMode } from '@ocentra/game-domain/game/playerMode';
import { TurnDirection, TurnStartsWith } from '@ocentra/game-domain/game/turnOrder';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '@/AssetCreation';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';

class MechanicsPlayerConfig {
  @serializable({ label: 'Player Mode' })
  playerMode: PlayerMode = 'multiplayer';

  @serializable({ label: 'Min Players' })
  minPlayers: number = 2;

  @serializable({ label: 'Max Players' })
  maxPlayers: number = 4;

  @serializable({ label: 'Optimal Players' })
  optimalPlayers: number | null = null;

  @serializable({ label: 'Dealer Rotates' })
  dealerRotates: boolean = true;
}

class MechanicsPhaseConditional {
  @serializable({ label: 'Condition Expression' })
  condition: string = '';

  @serializable({ label: 'Next Phase ID' })
  nextPhase: string | null = null;
}

class MechanicsPhase {
  @serializable({ label: 'Phase ID' })
  id: string = '';

  @serializable({ label: 'Label' })
  label: string = '';

  @serializable({ label: 'Actor' })
  actor: PhaseActor = 'current_player';

  @serializable({ label: 'Legal Actions' })
  legalActions: string[] = [];

  @serializable({ label: 'Next Phase ID' })
  nextPhase: string | null = null;

  @serializable({ label: 'Mandatory Phase' })
  isMandatory: boolean = true;

  @serializable({ label: 'Loop Index' })
  loopIndex?: number | null = null;

  @serializable({ label: 'Total Loops' })
  totalLoops?: number | null = null;

  @serializable({ label: 'Conditional Next Phases', elementType: MechanicsPhaseConditional })
  conditionalNext: MechanicsPhaseConditional[] = [];

  @serializable({ label: 'Card Visibility Changes' })
  cardVisibilityChanges: Record<string, string> = {};

  @serializable({ label: 'Notes' })
  notes: string = '';
}

class MechanicsCustomAction {
  @serializable({ label: 'Action ID' })
  id: string = '';

  @serializable({ label: 'Supported' })
  supported: boolean = true;

  @serializable({ label: 'Description' })
  description: string = '';

  @serializable({ label: 'Cost' })
  cost: string | number | Record<string, unknown> | null = '0';

  @serializable({ label: 'Constraints' })
  constraints: string = '';

  @serializable({ label: 'Effect Type' })
  effectType: string = 'custom';

  @serializable({ label: 'Effect Hints' })
  effectHints: Record<string, unknown> = {};

  @serializable({ label: 'Terminates Round' })
  isTerminating: boolean = false;
}

class MechanicsZone {
  @serializable({ label: 'Zone ID' })
  id: string = '';

  @serializable({ label: 'Type' })
  type: string = 'stack';

  @serializable({ label: 'Owner' })
  owner: string = 'table';

  @serializable({ label: 'Visibility' })
  visibility: string = 'hidden';

  @serializable({ label: 'Capacity' })
  capacity?: number | null = null;
}

class MechanicsAction {
  @serializable({ label: 'Supported' })
  supported: boolean = true;

  @serializable({ label: 'Description' })
  description: string = '';

  @serializable({ label: 'Constraints' })
  constraints: string = '';

  @serializable({ label: 'Effect Type' })
  effectType: string = 'custom';

  @serializable({ label: 'Cost' })
  cost: string | number | Record<string, unknown> | null = '0';

  @serializable({ label: 'Effect Hints' })
  effectHints: Record<string, unknown> = {};

  @serializable({ label: 'Terminates Turn' })
  isTerminating: boolean = false;

  @serializable({ label: 'Unsupported Reason' })
  reason?: string;
}

class MechanicsTurnPolicy {
  @serializable({ label: 'Direction' })
  direction: TurnDirection = 'clockwise';

  @serializable({ label: 'Starts With' })
  startsWith: TurnStartsWith = 'left_of_dealer';

  @serializable({ label: 'Timer Seconds' })
  timerSeconds: number | null = null;
}

class MechanicsEndCondition {
  @serializable({ label: 'ID' })
  id: string = '';

  @serializable({ label: 'Description' })
  description: string = '';

  @serializable({ label: 'Applies To Phase' })
  appliesToPhase: string | null = null;
}

class MechanicsImplementationHints {
  @serializable({ label: 'RNG Used' })
  rngUsed: string[] = [];

  @serializable({ label: 'Authoritative Server' })
  authoritativeServer: boolean = false;

  @serializable({ label: 'Custom Logic Needed' })
  customLogicNeeded: string[] = [];
}

@serializableClass({
  assetType: 'CardGameMechanics',
  displayName: 'Card Game Mechanics',
  category: AssetTypeCategory.Game,
})
export class CardGameMechanics extends ScriptableObject {
  static schemaVersion = 1;
  static readonly requiresInspector = true;

  static createTemplate(): Record<string, unknown> {
    return {
      familyKernel: 'custom',
      kernelVersion: '1.0',
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
          legalActions: ['play_card'],
          nextPhase: null,
          isMandatory: true,
          loopIndex: null,
          totalLoops: null,
          conditionalNext: [],
          cardVisibilityChanges: {},
          notes: '',
        },
      ],
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
      customActions: [],
      zones: [],
      turnPolicy: {
        direction: 'clockwise',
        startsWith: 'left_of_dealer',
        timerSeconds: null,
      },
      endConditions: [],
      cardVisibility: {},
      drawConfig: null,
      discardConfig: null,
      deckType: '',
      suitSet: '',
      rankSet: '',
      initialHandSize: 0,
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
      bankingConfig: null,
      roundConfig: null,
      constants: {},
      finalHandSize: 0,
      deckCount: 1,
      implementationHints: {
        rngUsed: [],
        authoritativeServer: false,
        customLogicNeeded: [],
      },
      progression: [],
      roles: [],
      determinismNotes: '',
    };
  }

  @serializable({ label: 'Family Kernel' })
  familyKernel: string = '';

  @serializable({ label: 'Kernel Version' })
  kernelVersion: string = '1.0';

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

  @serializable({ label: 'Banking Config' })
  bankingConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Round Config' })
  roundConfig: Record<string, unknown> | null = null;

  @serializable({ label: 'Constants' })
  constants: Record<string, unknown> = {};

  @serializable({ label: 'Final Hand Size' })
  finalHandSize: number = 0;

  @serializable({ label: 'Deck Count' })
  deckCount: number = 1;

  @serializable({ label: 'Implementation Hints' })
  implementationHints: MechanicsImplementationHints = new MechanicsImplementationHints();

  @serializable({ label: 'Progression' })
  progression: unknown[] = [];

  @serializable({ label: 'Roles' })
  roles: unknown[] = [];

  @serializable({ label: 'Determinism Notes' })
  determinismNotes: string = '';

  static async create(
    context: AssetCreationContext,
    dataOverrides: Record<string, unknown> = {},
  ): Promise<CreatedAsset> {
    const deferred = new OperationDeferred<string>();
    const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
    let guid: AssetGUIDType;

    if (!publishResult.isSuccess) {
      guid = createAssetGuid();
      MainAppLogger.instance.logWarn('[CardGameMechanics] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
        assetType: 'CardGameMechanics',
        gameId: context.gameId,
        fallbackGuid: guid,
      });
    } else {
      const result = await deferred.promise;
      const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
      guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;
      if (!result.isSuccess || !result.value) {
        MainAppLogger.instance.logWarn('[CardGameMechanics] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
          assetType: 'CardGameMechanics',
          gameId: context.gameId,
          fallbackGuid: guid,
        });
      }
    }

    return {
      assetId: `${context.gameId}-mechanics`,
      fileName: `${context.gameId}Mechanics.asset`,
      guid,
      data: {
        ...this.createTemplate(),
        ...dataOverrides,
      },
    };
  }
}
