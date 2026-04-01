declare const duckdb: typeof import("duckdb");
export interface GameRow {
    display_name: string | null;
    is_primary: number;
    slug: string;
    source_file: string;
    primary_name: string | null;
    category: string | null;
    subcategory: string | null;
    description: string | null;
    origin: string | null;
    player_mode: string | null;
    players_display: string | null;
    deck: string | null;
    deck_type: string | null;
    difficulty: string | null;
    duration: string | null;
    quality: string | null;
    completeness: string | null | unknown;
    also_known_as: string | null | unknown;
    has_engine: number;
    validation_status: string | null;
}
export interface NamesAuditRow {
    slug: string;
    display_name: string;
    is_primary: number;
    source_file: string;
}
export interface UrlAuditRow {
    slug: string;
    source_url: string;
    display_name: string | null;
}
export type Conn = ReturnType<typeof duckdb.Database.prototype.connect>;
export type DbHandle = {
    db: InstanceType<typeof duckdb.Database>;
    conn: Conn;
};
export declare function getDefaultDbPath(): string;
export declare function getProcessedGamesDir(): string;
export declare function openDb(dbPath: string): DbHandle | null;
export declare function closeDb(handle: DbHandle): void;
export declare function runQuery<T>(conn: Conn, sql: string, ...params: unknown[]): Promise<T[]>;
export declare function queryGamesList(conn: Conn): Promise<GameRow[]>;
export declare function queryNamesForSlug(conn: Conn, slug: string): Promise<string[]>;
export declare function queryNamesAudit(conn: Conn): Promise<NamesAuditRow[]>;
export declare function queryUrlsAudit(conn: Conn): Promise<UrlAuditRow[]>;
export declare function queryAllSlugs(conn: Conn): Promise<string[]>;
export declare function queryAllDisplayNames(conn: Conn): Promise<{
    slug: string;
    display_name: string;
    is_primary: number;
}[]>;
export declare function queryAllAlternativeNames(conn: Conn): Promise<{
    slug: string;
    display_name: string;
}[]>;
export { buildGamesListPayload, emptyListPayload, type GamesListPayload } from './games-list-payload';
export { buildUrlsAuditPayload, type UrlAuditEntry } from './urls-audit-payload';
