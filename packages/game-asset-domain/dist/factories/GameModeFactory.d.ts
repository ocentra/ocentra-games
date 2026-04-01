import { GameMode } from '../gameMode/core/GameMode';
type GameModeConstructor = new () => GameMode;
export declare class GameModeFactory {
    private static instances;
    static getGameMode(gameModeId: string): Promise<GameMode>;
    static getGameModeSync(gameModeId: string): GameMode;
    static registerGameMode(gameModeId: string, GameModeClass: GameModeConstructor): void;
    static getAllGameModeIds(): Promise<string[]>;
    static isAvailable(gameModeId: string): Promise<boolean>;
    static isRegistered(gameModeId: string): boolean;
    static getGameModeClass(gameModeId: string): GameModeConstructor | null;
    static getGameModeClassRegistry(): Record<string, GameModeConstructor>;
    static clearCache(): Promise<void>;
}
export {};
