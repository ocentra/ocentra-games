import { serializable } from '@ocentra/asset-domain/serialization/decorators';
import { PhaseActor } from '@ocentra/game-domain/game/phaseActor';
import { PlayerMode } from '@ocentra/game-domain/game/playerMode';
import { TurnDirection, TurnStartsWith } from '@ocentra/game-domain/game/turnOrder';

export class MechanicsPlayerConfig {
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

export class MechanicsPhaseConditional {
  @serializable({ label: 'Condition Expression' })
  condition: string = '';

  @serializable({ label: 'Next Phase ID' })
  nextPhase: string | null = null;
}

export class MechanicsPhase {
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

export class MechanicsCustomAction {
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

export class MechanicsZone {
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

export class MechanicsAction {
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

export class MechanicsTurnPolicy {
  @serializable({ label: 'Direction' })
  direction: TurnDirection = 'clockwise';

  @serializable({ label: 'Starts With' })
  startsWith: TurnStartsWith = 'left_of_dealer';

  @serializable({ label: 'Timer Seconds' })
  timerSeconds: number | null = null;
}

export class MechanicsEndCondition {
  @serializable({ label: 'ID' })
  id: string = '';

  @serializable({ label: 'Description' })
  description: string = '';

  @serializable({ label: 'Applies To Phase' })
  appliesToPhase: string | null = null;
}

export class MechanicsImplementationHints {
  @serializable({ label: 'RNG Used' })
  rngUsed: string[] = [];

  @serializable({ label: 'Authoritative Server' })
  authoritativeServer: boolean = false;

  @serializable({ label: 'Custom Logic Needed' })
  customLogicNeeded: string[] = [];
}
