import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
export declare class GameRules extends ScriptableObject {
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    LLM: string;
    Player: string;
    objective: string;
    gameplay: string;
    keyRules: string[];
    moveValidityConditions: Record<string, string> | null;
    exampleHands: string[];
    bonusRules: string;
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
