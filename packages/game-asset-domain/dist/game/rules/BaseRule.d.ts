import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { GameRulesContainer } from '../../gameMode/types/GameRulesContainer';
import type { GameMode } from '../../gameMode/core/GameMode';
export declare abstract class BaseRule extends ScriptableObject {
    abstract ruleName: string;
    description: string;
    abstract priority: number;
    examples: GameRulesContainer;
    abstract initialize(gameMode: GameMode): Promise<boolean>;
    abstract isApplicable(gameMode: GameMode): boolean;
}
