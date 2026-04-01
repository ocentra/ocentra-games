import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { CATEGORY_VALUES } from '@ocentra/game-domain/game/categories';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const duckdb = require('duckdb');

const dbPath = path.join(__dirname, 'games.duckdb');
const processedDir = path.join(__dirname, '..', 'src', 'processed-games');

if (!fs.existsSync(dbPath)) {
  console.error('Run npm run db:init first');
  process.exit(1);
}
if (!fs.existsSync(processedDir)) {
  console.error('Processed games dir not found:', processedDir);
  process.exit(1);
}

const VALID_CATEGORIES = new Set(CATEGORY_VALUES as readonly string[]);

function resolveCategory(val: unknown): string | null {
  if (val == null || typeof val !== 'string') return null;
  const s = val.trim();
  if (!s) return null;
  return VALID_CATEGORIES.has(s) ? s : 'Other';
}

function resolvePlayers(data: unknown): {
  min: number | null;
  max: number | null;
  display: string | null;
} {
  if (data == null || typeof data !== 'object') return { min: null, max: null, display: null };
  const p = data as Record<string, unknown>;
  const min = typeof p.minPlayers === 'number' ? p.minPlayers : null;
  const max = typeof p.maxPlayers === 'number' ? p.maxPlayers : null;
  const display =
    typeof p.display === 'string' ? p.display : min != null && max != null ? `${min}-${max}` : null;
  return { min, max, display };
}

const files = fs.readdirSync(processedDir).filter((f) => f.endsWith('.json'));
const db = new duckdb.Database(dbPath);
const conn = db.connect();

conn.run('DELETE FROM game_names');
conn.run('DELETE FROM games');

let id = 0;
let nameId = 0;
let ok = 0;
let fail = 0;

function processOne(i: number) {
  if (i >= files.length) {
    conn.close();
    db.close();
    console.log('Games ingest done.');
    console.log('  Total game files:', files.length);
    console.log('  Games inserted:', ok);
    console.log('  Game names (primary + alsoKnownAs):', nameId);
    console.log('  Failed:', fail);
    return;
  }
  const filename = files[i];
  const slug = filename.slice(0, -5);
  const filePath = path.join(processedDir, filename);
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  } catch {
    fail++;
    processOne(i + 1);
    return;
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    fail++;
    processOne(i + 1);
    return;
  }

  const ov = (data.overview && typeof data.overview === 'object')
    ? (data.overview as Record<string, unknown>)
    : {};
  const eng = (data.engine && typeof data.engine === 'object') ? (data.engine as Record<string, unknown>) : null;
  const comp = (data.completeness && typeof data.completeness === 'object')
    ? (data.completeness as Record<string, boolean>)
    : {};

  const category =
    resolveCategory(ov.category ?? ov.type ?? null) ??
    resolveCategory(data.category) ??
    'Other';
  const subcategory =
    (typeof ov.subCategory === 'string' ? ov.subCategory : null) ??
    (typeof (ov as { subcategory?: string }).subcategory === 'string'
      ? (ov as { subcategory: string }).subcategory
      : null);
  const primaryName = (data.name as string) ?? (ov.name as string) ?? slug;
  const description = (ov.description as string) ?? null;
  const origin = (ov.origin as string) ?? null;
  const playerMode =
    (ov.playerMode as string) ?? (eng?.playerConfig && typeof eng.playerConfig === 'object'
      ? ((eng.playerConfig as Record<string, unknown>).playerMode as string)
      : null);
  const playersObj = resolvePlayers(ov.players);
  const deck = (ov.deck as string) ?? null;
  const deckType = eng ? (eng.deckType as string) ?? null : null;
  const suitSet = eng ? (eng.suitSet as string) ?? null : null;
  const rankSet = eng ? (eng.rankSet as string) ?? null : null;
  const difficulty = (ov.difficulty as string) ?? null;
  const duration = (ov.duration as string) ?? null;
  const quality = (data.quality as string) ?? 'placeholder';
  const schemaVersion = (data.schemaVersion as string) ?? null;
  const engineModelVersion = (data.engineModelVersion as string) ?? null;

  const phases = eng?.phases;
  const phaseCount = Array.isArray(phases) ? phases.length : 0;
  const hasPlayerActions = eng?.playerActions != null && typeof eng.playerActions === 'object' ? 1 : 0;
  const zones = eng?.zones;
  const hasZones = Array.isArray(zones) && zones.length > 0 ? 1 : 0;
  const hasEngine = eng != null ? 1 : 0;

  const overviewComplete = comp.overview === true ? 1 : 0;
  const historyComplete = comp.history === true ? 1 : 0;
  const setupComplete = comp.setup === true ? 1 : 0;
  const rulesComplete = comp.rules === true ? 1 : 0;
  const strategyComplete = comp.strategy === true ? 1 : 0;
  const variationsComplete = comp.variations === true ? 1 : 0;
  const aiComplete = comp.ai === true ? 1 : 0;
  const sourcesComplete = comp.sources === true ? 1 : 0;

  const sources = (data.sources && typeof data.sources === 'object') ? data.sources as Record<string, unknown> : {};
  const primaryArr = Array.isArray(sources.primary) ? sources.primary : [];
  const firstPrimary = primaryArr[0] && typeof primaryArr[0] === 'object' && (primaryArr[0] as Record<string, unknown>).url
    ? (primaryArr[0] as Record<string, unknown>).url as string
    : null;
  const source = (data.source && typeof data.source === 'object') ? data.source as Record<string, unknown> : {};
  const sourceUrl = (source.url as string) ?? firstPrimary ?? null;

  const tags = data.tags != null ? JSON.stringify(data.tags) : null;
  const alsoKnownAs = data.alsoKnownAs != null ? JSON.stringify(data.alsoKnownAs) : null;
  const completeness = data.completeness != null ? JSON.stringify(data.completeness) : null;

  id++;
  const alsoKnownAsArr = Array.isArray(data.alsoKnownAs)
    ? (data.alsoKnownAs as string[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];
  try {
    conn.run(
      `INSERT INTO games (
        id, slug, source_file, primary_name, category, subcategory, description, origin,
        player_mode, players_min, players_max, players_display, deck, deck_type, suit_set, rank_set,
        difficulty, duration, quality, schema_version, engine_model_version, has_engine,
        phase_count, has_player_actions, has_zones,
        overview_complete, history_complete, setup_complete, rules_complete, strategy_complete,
        variations_complete, ai_complete, sources_complete, completeness, source_url, tags, also_known_as,
        validation_status, content
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      slug,
      filename,
      primaryName,
      category,
      subcategory,
      description,
      origin,
      playerMode,
      playersObj.min,
      playersObj.max,
      playersObj.display,
      deck,
      deckType,
      suitSet,
      rankSet,
      difficulty,
      duration,
      quality,
      schemaVersion,
      engineModelVersion,
      hasEngine,
      phaseCount,
      hasPlayerActions,
      hasZones,
      overviewComplete,
      historyComplete,
      setupComplete,
      rulesComplete,
      strategyComplete,
      variationsComplete,
      aiComplete,
      sourcesComplete,
      completeness,
      sourceUrl,
      tags,
      alsoKnownAs,
      'not_run',
      raw
    );
    nameId++;
    conn.run(
      'INSERT INTO game_names (id, slug, display_name, is_primary, sort_order) VALUES (?, ?, ?, 1, 0)',
      nameId,
      slug,
      primaryName
    );
    for (let j = 0; j < alsoKnownAsArr.length; j++) {
      nameId++;
      conn.run(
        'INSERT INTO game_names (id, slug, display_name, is_primary, sort_order) VALUES (?, ?, ?, 0, ?)',
        nameId,
        slug,
        alsoKnownAsArr[j].trim(),
        j + 1
      );
    }
    ok++;
  } catch (e) {
    if (fail === 0) console.error('First insert error:', e);
    fail++;
  }
  if ((ok + fail) % 200 === 0) process.stdout.write(`\r  ${ok + fail}/${files.length}`);
  processOne(i + 1);
}

processOne(0);
