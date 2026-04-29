/**
 * export-game-catalog.ts
 *
 * Reads all processed-games JSON files and exports:
 *   - Resources/GameCatalog/index.json   — slim list of all catalog games
 *   - Resources/GameCatalog/games/<slug>.json — full detail per game
 *
 * "Made" games (already have a full asset in Resources/GameMode/CardGames/Games/<slug>/)
 * are excluded from the catalog output because they are served directly from their
 * info.asset file.
 *
 * Run from packages/card-games root:
 *   npm run export-catalog
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { walkProcessedGameFiles } from '../src/processed-game-files';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROCESSED_GAMES_DIR = path.join(__dirname, '..', 'src', 'processed-games');
const ASSET_EDITOR_RESOURCES = path.join(__dirname, '..', '..', 'asset-editor', 'Resources');
const CATALOG_OUT_DIR = path.join(ASSET_EDITOR_RESOURCES, 'catalog');
const CATALOG_GAMES_DIR = path.join(CATALOG_OUT_DIR, 'games');
const MADE_GAMES_DIR = path.join(ASSET_EDITOR_RESOURCES, 'GameMode', 'CardGames', 'Games');

type ProcessedGame = {
  filename?: string;
  name?: string;
  quality?: string;
  completeness?: Record<string, boolean>;
  overview?: {
    description?: string;
    category?: string;
    subCategory?: string;
    origin?: string;
    playerMode?: string;
    players?: {
      minPlayers?: number;
      maxPlayers?: number;
      display?: string;
    };
    deck?: string;
    difficulty?: string;
    duration?: string;
  };
  history?: {
    origins?: string;
    originCountries?: string[];
    timeline?: string[];
    cultural?: string;
    evolution?: string;
  };
  setup?: {
    players?: string;
    deck?: string;
    dealing?: string;
    equipment?: string;
  };
  rules?: {
    objective?: string;
    gameplay?: string;
    keyRules?: string[];
  };
  strategy?: {
    basic?: string;
    intermediate?: string;
    advanced?: string;
    tips?: string[];
  };
  variations?: {
    list?: Array<{ id: string; name: string; description: string }>;
  };
  alsoKnownAs?: string[];
  tags?: string[];
  scoring?: {
    description?: string;
    winCondition?: string;
  };
  synthesis?: {
    shortDescription?: string;
    hero?: { title?: string; subtitle?: string; tagline?: string };
  };
  sources?: {
    primary?: Array<{ name?: string; url?: string }>;
  };
};

type CatalogIndexEntry = {
  slug: string;
  name: string;
  quality: string;
  completeness: Record<string, boolean>;
  description: string;
  origin: string;
  players: string;
  deck: string;
  difficulty: string;
  duration: string;
  category: string;
  subcategory: string | null;
  playerMode: string | null;
  alsoKnownAs: string[];
  tags: string[];
  source: 'catalog';
};

type CatalogGameDetail = CatalogIndexEntry & {
  overview: {
    description: string;
    origin: string;
    players: string;
    deck: string;
    difficulty: string;
    duration: string;
    category: string;
    subcategory: string | null;
  };
  history: {
    origins: string;
    originCountries: string[];
    timeline: string[];
    cultural: string;
    evolution: string;
  } | null;
  setup: {
    players: string;
    deck: string;
    dealing: string;
    equipment: string;
  } | null;
  rules: {
    objective: string;
    gameplay: string;
    keyRules: string[];
  } | null;
  strategy: {
    basic: string;
    intermediate: string;
    advanced: string;
    tips: string[];
  } | null;
  variations: Array<{ id: string; name: string; description: string }>;
  scoring: {
    description: string;
    winCondition: string;
  } | null;
  sources: Array<{ name: string; url: string }>;
  synthesis: {
    shortDescription: string;
    hero: { title: string; subtitle: string; tagline: string };
  } | null;
};

function getMadeGameSlugs(): Set<string> {
  if (!fs.existsSync(MADE_GAMES_DIR)) return new Set();
  return new Set(
    fs.readdirSync(MADE_GAMES_DIR)
      .filter(name => fs.statSync(path.join(MADE_GAMES_DIR, name)).isDirectory())
      .map(name => name.toLowerCase())
  );
}

function buildIndexEntry(slug: string, game: ProcessedGame): CatalogIndexEntry {
  const ov = game.overview ?? {};
  return {
    slug,
    name: game.name ?? slug,
    quality: game.quality ?? 'placeholder',
    completeness: game.completeness ?? {},
    description: ov.description ?? game.synthesis?.shortDescription ?? '',
    origin: ov.origin ?? '',
    players: ov.players?.display ?? (ov.players?.minPlayers != null ? `${ov.players.minPlayers}-${ov.players.maxPlayers}` : ''),
    deck: ov.deck ?? '',
    difficulty: ov.difficulty ?? '',
    duration: ov.duration ?? '',
    category: ov.category ?? '',
    subcategory: ov.subCategory ?? null,
    playerMode: ov.playerMode ?? null,
    alsoKnownAs: game.alsoKnownAs ?? [],
    tags: game.tags ?? [],
    source: 'catalog',
  };
}

function buildGameDetail(slug: string, game: ProcessedGame): CatalogGameDetail {
  const index = buildIndexEntry(slug, game);
  const ov = game.overview ?? {};
  const h = game.history;
  const s = game.setup;
  const r = game.rules;
  const strat = game.strategy;
  const vars = game.variations?.list ?? [];
  const scoring = game.scoring;
  const synthesis = game.synthesis;
  const sources = (game.sources?.primary ?? []).map(src => ({ name: src.name ?? '', url: src.url ?? '' }));

  return {
    ...index,
    overview: {
      description: ov.description ?? synthesis?.shortDescription ?? '',
      origin: ov.origin ?? '',
      players: ov.players?.display ?? '',
      deck: ov.deck ?? '',
      difficulty: ov.difficulty ?? '',
      duration: ov.duration ?? '',
      category: ov.category ?? '',
      subcategory: ov.subCategory ?? null,
    },
    history: h ? {
      origins: h.origins ?? '',
      originCountries: h.originCountries ?? [],
      timeline: h.timeline ?? [],
      cultural: h.cultural ?? '',
      evolution: h.evolution ?? '',
    } : null,
    setup: s ? {
      players: s.players ?? '',
      deck: s.deck ?? '',
      dealing: s.dealing ?? '',
      equipment: s.equipment ?? '',
    } : null,
    rules: r ? {
      objective: r.objective ?? '',
      gameplay: r.gameplay ?? '',
      keyRules: r.keyRules ?? [],
    } : null,
    strategy: strat ? {
      basic: strat.basic ?? '',
      intermediate: strat.intermediate ?? '',
      advanced: strat.advanced ?? '',
      tips: strat.tips ?? [],
    } : null,
    variations: vars,
    scoring: scoring ? {
      description: scoring.description ?? '',
      winCondition: scoring.winCondition ?? '',
    } : null,
    sources,
    synthesis: synthesis ? {
      shortDescription: synthesis.shortDescription ?? '',
      hero: {
        title: synthesis.hero?.title ?? game.name ?? slug,
        subtitle: synthesis.hero?.subtitle ?? '',
        tagline: synthesis.hero?.tagline ?? '',
      },
    } : null,
  };
}

async function main() {
  console.log('📦 Ocentra Game Catalog Export');
  console.log('================================');

  const madeGameSlugs = getMadeGameSlugs();
  console.log(`✅ Made games (excluded from catalog): ${[...madeGameSlugs].join(', ')}`);

  if (!fs.existsSync(PROCESSED_GAMES_DIR)) {
    console.error(`❌ Processed games dir not found: ${PROCESSED_GAMES_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(CATALOG_GAMES_DIR, { recursive: true });

  const files = walkProcessedGameFiles(PROCESSED_GAMES_DIR);
  console.log(`📂 Found ${files.length} processed game files`);

  const indexEntries: CatalogIndexEntry[] = [];
  let exported = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of files) {
    const filename = entry.relativePath;
    const slug = entry.slug;

    if (madeGameSlugs.has(slug)) {
      skipped++;
      continue;
    }

    const filePath = entry.absolutePath;
    let game: ProcessedGame;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
      game = JSON.parse(raw) as ProcessedGame;
    } catch (e) {
      console.warn(`  ⚠️  Failed to parse ${filename}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
      continue;
    }

    try {
      const indexEntry = buildIndexEntry(slug, game);
      const detail = buildGameDetail(slug, game);

      indexEntries.push(indexEntry);

      const detailPath = path.join(CATALOG_GAMES_DIR, `${slug}.json`);
      fs.writeFileSync(detailPath, JSON.stringify(detail, null, 2), 'utf-8');

      exported++;
    } catch (e) {
      console.warn(`  ⚠️  Failed to export ${slug}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }

    if ((exported + skipped + failed) % 100 === 0) {
      process.stdout.write(`\r  Progress: ${exported + skipped + failed}/${files.length}`);
    }
  }

  process.stdout.write('\n');

  indexEntries.sort((a, b) => a.name.localeCompare(b.name));

  const indexPath = path.join(CATALOG_OUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    totalGames: indexEntries.length,
    games: indexEntries,
  }, null, 2), 'utf-8');

  console.log('\n✅ Export complete!');
  console.log(`   Catalog games exported : ${exported}`);
  console.log(`   Made games skipped     : ${skipped}`);
  console.log(`   Failed                 : ${failed}`);
  console.log(`   Index written to       : ${indexPath}`);
  console.log(`   Per-game JSONs in      : ${CATALOG_GAMES_DIR}`);
  console.log('\n💡 Next: seed to local wrangler R2 (npm run seed from root) and upload to prod.');
}

main().catch(e => {
  console.error('❌ Export failed:', e);
  process.exit(1);
});
