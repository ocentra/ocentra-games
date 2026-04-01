import 'reflect-metadata';
import { BettingGameMode } from '../../gameMode/core/BettingGameMode';
export declare abstract class TurnBasedGameMode extends BettingGameMode {
    minRounds: number;
    maxRounds: number | null;
    turnDuration: number;
}
