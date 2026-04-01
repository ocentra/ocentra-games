import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const duckdb = require('duckdb') as typeof import('duckdb');

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

export function getDefaultDbPath(): string {
  return path.join(__dirname, '..', '..', 'db', 'games.duckdb');
}

export function getProcessedGamesDir(): string {
  return path.join(__dirname, '..', '..', 'src', 'processed-games');
}

export function openDb(dbPath: string): DbHandle | null {
  if (!fs.existsSync(dbPath)) return null;
  try {
    const db = new duckdb.Database(dbPath);
    const conn = db.connect();
    return { db, conn };
  } catch {
    return null;
  }
}

export function closeDb(handle: DbHandle): void {
  try {
    handle.conn.close();
    handle.db.close();
  } catch {
    // ignore
  }
}

export function runQuery<T>(conn: Conn, sql: string, ...params: unknown[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const cb = (err: Error | null, rows: unknown) => {
      if (err) reject(err);
      else resolve(Array.isArray(rows) ? (rows as T[]) : []);
    };
    if (params.length === 0) {
      (conn.all as (sql: string, cb: (err: Error | null, rows: unknown) => void) => void)(sql, cb);
    } else {
      (conn.all as (sql: string, ...args: unknown[]) => void)(sql, ...params, cb);
    }
  });
}

const SQL_GAMES_LIST = `SELECT gn.display_name, gn.is_primary, gn.sort_order,
    g.slug, g.source_file, g.primary_name, g.category, g.subcategory, g.description,
    g.origin, g.player_mode, g.players_display, g.deck, g.deck_type, g.difficulty, g.duration,
    g.quality, g.completeness, g.also_known_as, g.has_engine, g.validation_status
 FROM game_names gn
 JOIN games g ON gn.slug = g.slug
 ORDER BY gn.display_name, gn.is_primary DESC, gn.sort_order`;

export function queryGamesList(conn: Conn): Promise<GameRow[]> {
  return runQuery<GameRow>(conn, SQL_GAMES_LIST);
}

const SQL_NAMES_FOR_SLUG = 'SELECT display_name FROM game_names WHERE slug = ? ORDER BY is_primary DESC, sort_order';

export function queryNamesForSlug(conn: Conn, slug: string): Promise<string[]> {
  return runQuery<{ display_name: string }>(conn, SQL_NAMES_FOR_SLUG, slug).then((rows) =>
    rows.map((r) => r.display_name)
  );
}

const SQL_NAMES_AUDIT = `SELECT gn.slug, gn.display_name, gn.is_primary, g.source_file
 FROM game_names gn
 JOIN games g ON g.slug = gn.slug
 WHERE (gn.display_name LIKE '%(see %' OR gn.display_name LIKE '% see %' OR gn.display_name LIKE '%(see also%'
    OR TRIM(COALESCE(gn.display_name, '')) = '' OR LENGTH(TRIM(COALESCE(gn.display_name, ''))) < 2
    OR LOWER(TRIM(gn.display_name)) = 'placeholder' OR LOWER(TRIM(gn.display_name)) = 'tbd' OR LOWER(TRIM(gn.display_name)) = 'unknown')
 ORDER BY gn.slug, gn.is_primary DESC, gn.sort_order`;

export function queryNamesAudit(conn: Conn): Promise<NamesAuditRow[]> {
  return runQuery<Record<string, unknown>>(conn, SQL_NAMES_AUDIT).then((raw) =>
    raw.map((r) => ({
      slug: String(r.slug ?? ''),
      display_name: String(r.display_name ?? ''),
      is_primary: typeof r.is_primary === 'bigint' ? Number(r.is_primary) : Number(r.is_primary ?? 0),
      source_file: String(r.source_file ?? ''),
    }))
  );
}

const SQL_URLS_AUDIT = `SELECT g.slug, g.source_url, gn.display_name
 FROM games g
 LEFT JOIN game_names gn ON gn.slug = g.slug
 WHERE g.source_url IS NOT NULL AND g.source_url != ''`;

export function queryUrlsAudit(conn: Conn): Promise<UrlAuditRow[]> {
  return runQuery<UrlAuditRow>(conn, SQL_URLS_AUDIT);
}

const SQL_ALL_SLUGS = 'SELECT DISTINCT slug FROM games ORDER BY slug';

export function queryAllSlugs(conn: Conn): Promise<string[]> {
  return runQuery<{ slug: string }>(conn, SQL_ALL_SLUGS).then((rows) => rows.map((r) => r.slug));
}

const SQL_ALL_DISPLAY_NAMES = 'SELECT slug, display_name, is_primary FROM game_names ORDER BY slug, is_primary DESC, sort_order';

export function queryAllDisplayNames(conn: Conn): Promise<{ slug: string; display_name: string; is_primary: number }[]> {
  return runQuery<Record<string, unknown>>(conn, SQL_ALL_DISPLAY_NAMES).then((raw) =>
    raw.map((r) => ({
      slug: String(r.slug ?? ''),
      display_name: String(r.display_name ?? ''),
      is_primary: typeof r.is_primary === 'bigint' ? Number(r.is_primary) : Number(r.is_primary ?? 0),
    }))
  );
}

const SQL_ALTERNATIVE_NAMES = `SELECT slug, display_name FROM game_names WHERE is_primary = 0 ORDER BY slug, sort_order`;

export function queryAllAlternativeNames(conn: Conn): Promise<{ slug: string; display_name: string }[]> {
  return runQuery<{ slug: string; display_name: string }>(conn, SQL_ALTERNATIVE_NAMES);
}

export { buildGamesListPayload, emptyListPayload, type GamesListPayload } from './games-list-payload';
export { buildUrlsAuditPayload, type UrlAuditEntry } from './urls-audit-payload';
