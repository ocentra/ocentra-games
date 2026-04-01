import type { GameRow } from './game-db';
export interface GamesListPayload {
    metadata: {
        generatedAt: string;
        totalGames: number;
        uniqueGames: number;
        stats: {
            complete: number;
            partial: number;
            placeholder: number;
        };
        sectionStats: Record<string, {
            complete: number;
            percentage: number;
        }>;
        categoryCounts: Record<string, number>;
    };
    games: Record<string, unknown>[];
}
export declare function buildGamesListPayload(rows: GameRow[]): {
    payload: GamesListPayload;
    slugToNames: Map<string, string[]>;
};
export declare function emptyListPayload(): string;
