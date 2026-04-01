import type { IDeckProvider } from '@/interfaces/IDeckProvider';
import type { ValidationResult } from '@/engine/logic/StateValidator';
import type { GameState, PlayerAction } from '@/types/game';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';

export interface MechanicsFamilyResolver {
  family: string;
  supports(spec: MechanicsSpec): boolean;
  onSetupRound?(gameState: GameState, spec: MechanicsSpec, deckProvider: IDeckProvider): void;
  validateAction?(gameState: GameState, action: PlayerAction, spec: MechanicsSpec): ValidationResult | null;
  processAction?(gameState: GameState, action: PlayerAction, spec: MechanicsSpec, deckProvider: IDeckProvider): boolean;
  onScoreRound?(gameState: GameState, spec: MechanicsSpec): boolean;
  shouldEndGame?(gameState: GameState, spec: MechanicsSpec): boolean | null;
}
