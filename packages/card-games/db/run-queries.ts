import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const duckdb = require('duckdb');

const dbPath = path.join(__dirname, 'games.duckdb');

if (!fs.existsSync(dbPath)) {
  console.error('Run npm run db:init first');
  process.exit(1);
}

const db = new duckdb.Database(dbPath);
const conn = db.connect();

function run(sql: string, params: unknown[] = []): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const cb = (err: Error | null, rows: unknown) => {
      if (err) reject(err);
      else resolve(Array.isArray(rows) ? rows : []);
    };
    if (params.length === 0) conn.all(sql, cb);
    else conn.all(sql, ...params, cb);
  });
}

async function badNames() {
  const rows = await run(`SELECT gn.slug, gn.display_name, gn.is_primary, g.source_file
 FROM game_names gn
 JOIN games g ON g.slug = gn.slug
 WHERE (gn.display_name LIKE '%(see %' OR gn.display_name LIKE '% see %' OR gn.display_name LIKE '%(see also%'
    OR TRIM(COALESCE(gn.display_name, '')) = '' OR LENGTH(TRIM(COALESCE(gn.display_name, ''))) < 2
    OR LOWER(TRIM(gn.display_name)) = 'placeholder' OR LOWER(TRIM(gn.display_name)) = 'tbd' OR LOWER(TRIM(gn.display_name)) = 'unknown')
 ORDER BY gn.slug, gn.is_primary DESC`);
  console.log('\n--- Bad names (see/empty/placeholder/tbd/unknown) ---');
  console.log('Count:', rows.length);
  (rows as Record<string, unknown>[]).slice(0, 50).forEach((r) => console.log(`  ${r.slug} | primary=${r.is_primary} | "${r.display_name}" | ${r.source_file}`));
  if (rows.length > 50) console.log('  ... and', rows.length - 50, 'more');
}

async function categorySummary() {
  const rows = await run(`SELECT category, subcategory, COUNT(*) as cnt FROM games GROUP BY category, subcategory ORDER BY category, subcategory`);
  console.log('\n--- Category + subcategory counts ---');
  (rows as Record<string, unknown>[]).forEach(r => console.log(`  ${r.category ?? 'NULL'} / ${r.subcategory ?? 'NULL'} : ${r.cnt}`));
}

async function categoryOnly() {
  const rows = await run(`SELECT category, COUNT(*) as cnt FROM games GROUP BY category ORDER BY cnt DESC`);
  console.log('\n--- Category counts ---');
  (rows as Record<string, unknown>[]).forEach(r => console.log(`  ${r.category ?? 'NULL'} : ${r.cnt}`));
}

async function totalGames() {
  const rows = await run('SELECT COUNT(*) as total FROM games');
  const raw = (rows[0] as Record<string, unknown>)?.total ?? 0;
  const total = typeof raw === 'bigint' ? Number(raw) : raw;
  console.log('\n--- Total games ---');
  console.log('  ', total);
}

async function listByCategory(rawCategory: string) {
  const cat = String(rawCategory).trim().toLowerCase();
  const rows = await run(
    `SELECT g.slug, g.primary_name, g.category, g.subcategory, g.source_file
     FROM games g
     WHERE LOWER(TRIM(COALESCE(g.category, ''))) = ?
     ORDER BY g.slug`,
    [cat]
  );
  console.log(`\n--- Games where category = "${rawCategory}" (${(rows as unknown[]).length} rows) ---`);
  (rows as Record<string, unknown>[]).forEach(r =>
    console.log(`  ${r.slug} | category="${r.category ?? ''}" sub="${r.subcategory ?? ''}" | ${r.source_file}`)
  );
}

async function listBySubcategory(rawSub: string) {
  const sub = String(rawSub).trim().toLowerCase();
  const rows = await run(
    `SELECT g.slug, g.primary_name, g.category, g.subcategory, g.source_file
     FROM games g
     WHERE LOWER(TRIM(COALESCE(g.subcategory, ''))) = ?
     ORDER BY g.category, g.slug`,
    [sub]
  );
  console.log(`\n--- Games where subcategory = "${rawSub}" (${(rows as unknown[]).length} rows) ---`);
  (rows as Record<string, unknown>[]).forEach(r =>
    console.log(`  ${r.slug} | category="${r.category ?? ''}" sub="${r.subcategory ?? ''}" | ${r.source_file}`)
  );
}

async function categoryUnknown() {
  await listByCategory('unknown');
}

async function categoryOther() {
  const rows = await run(
    `SELECT g.slug, g.primary_name, g.category, g.subcategory, g.source_file
     FROM games g
     WHERE g.category IS NULL OR TRIM(COALESCE(g.category, '')) = '' OR LOWER(TRIM(g.category)) = 'other'
     ORDER BY g.subcategory, g.slug`
  );
  console.log(`\n--- Games where category is Other / null / empty (${(rows as unknown[]).length} rows) ---`);
  (rows as Record<string, unknown>[]).forEach(r =>
    console.log(`  ${r.slug} | category="${r.category ?? ''}" sub="${r.subcategory ?? ''}" | ${r.source_file}`)
  );
}

async function subcategoryUnknown() {
  await listBySubcategory('unknown');
}

async function suspiciousDataQuality() {
  const rows = await run(
    `SELECT g.slug, g.primary_name, g.category, g.quality, g.difficulty, g.source_file,
            SUBSTR(TRIM(COALESCE(g.description, '')), 1, 80) AS desc_preview
     FROM games g
     WHERE LOWER(TRIM(COALESCE(g.category, ''))) = 'unknown'
        OR (LOWER(TRIM(COALESCE(g.quality, ''))) = 'stub'
            AND (g.description LIKE '%See %for%' OR g.description LIKE '%see %for%'))
        OR LOWER(TRIM(COALESCE(g.difficulty, ''))) IN ('na', 'unknown')
     ORDER BY g.category, g.slug`
  );
  console.log('\n--- Suspicious data quality (category=Unknown, stub+"See...for", or difficulty NA/Unknown) ---');
  console.log('Count:', (rows as unknown[]).length);
  (rows as Record<string, unknown>[]).forEach(r =>
    console.log(`  ${r.slug} | ${r.category ?? ''} / ${r.quality ?? ''} diff=${r.difficulty ?? ''} | "${String(r.desc_preview ?? '').slice(0, 50)}..." | ${r.source_file}`)
  );
}

async function containsPagatStub() {
  const rows = await run(
    `SELECT slug, primary_name, source_file FROM games WHERE LOWER(content) LIKE '%pagat%' ORDER BY slug`
  );
  console.log('\n--- Games whose JSON contains "pagat" (see Pagat / Pagat refs — stub content) ---');
  console.log('Count:', (rows as unknown[]).length);
  (rows as Record<string, unknown>[]).forEach(r =>
    console.log(`  ${r.slug} | ${r.primary_name ?? ''} | ${r.source_file}`)
  );
}

async function completenessMismatch() {
  const rows = await run(
    `SELECT slug, primary_name, source_file,
       history_complete, setup_complete, rules_complete, strategy_complete, variations_complete, ai_complete,
       CASE WHEN LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.history.origins') AS VARCHAR), ''))) > 5 THEN 1 ELSE 0 END AS has_history,
       CASE WHEN LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.setup.players') AS VARCHAR), ''))) > 2 THEN 1 ELSE 0 END AS has_setup,
       CASE WHEN LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.rules.objective') AS VARCHAR), ''))) > 5 THEN 1 ELSE 0 END AS has_rules,
       CASE WHEN LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.strategy.basic') AS VARCHAR), ''))) > 5
         OR LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.strategy.intermediate') AS VARCHAR), ''))) > 5
         OR LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.strategy.advanced') AS VARCHAR), ''))) > 5 THEN 1 ELSE 0 END AS has_strategy,
       CASE WHEN content LIKE '%"variations":{"list":[{%' THEN 1 ELSE 0 END AS has_variations,
       CASE WHEN content LIKE '%"considerations":[%' AND content NOT LIKE '%"considerations":[]%' THEN 1 ELSE 0 END AS has_ai
     FROM games
     WHERE (history_complete = 0 AND LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.history.origins') AS VARCHAR), ''))) > 5)
        OR (setup_complete = 0 AND LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.setup.players') AS VARCHAR), ''))) > 2)
        OR (rules_complete = 0 AND LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.rules.objective') AS VARCHAR), ''))) > 5)
        OR (strategy_complete = 0 AND (LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.strategy.basic') AS VARCHAR), ''))) > 5 OR LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.strategy.intermediate') AS VARCHAR), ''))) > 5 OR LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.strategy.advanced') AS VARCHAR), ''))) > 5))
        OR (variations_complete = 0 AND content LIKE '%"variations":{"list":[{%')
        OR (ai_complete = 0 AND content LIKE '%"considerations":[%' AND content NOT LIKE '%"considerations":[]%')
     ORDER BY slug`
  );
  console.log('\n--- Completeness mismatch: flag=false but section has content (update completeness in JSON) ---');
  console.log('Strategy=must; variations=can be null; ai=optional');
  console.log('Count:', (rows as unknown[]).length);
  (rows as Record<string, unknown>[]).forEach(r => {
    const fixes: string[] = [];
    if (r.history_complete === 0 && r.has_history === 1) fixes.push('history');
    if (r.setup_complete === 0 && r.has_setup === 1) fixes.push('setup');
    if (r.rules_complete === 0 && r.has_rules === 1) fixes.push('rules');
    if (r.strategy_complete === 0 && r.has_strategy === 1) fixes.push('strategy');
    if (r.variations_complete === 0 && r.has_variations === 1) fixes.push('variations');
    if (r.ai_complete === 0 && r.has_ai === 1) fixes.push('ai');
    if (fixes.length > 0) console.log(`  ${r.slug} | ${r.primary_name ?? ''} | fix: ${fixes.join(', ')} | ${r.source_file}`);
  });
}

const QUERIES: Record<string, () => Promise<void>> = {
  'bad-names': badNames,
  'completeness-mismatch': completenessMismatch,
  'categories': categorySummary,
  'category-only': categoryOnly,
  'total': totalGames,
  'category-unknown': categoryUnknown,
  'category-other': categoryOther,
  'subcategory-unknown': subcategoryUnknown,
  'suspicious': suspiciousDataQuality,
  'pagat': containsPagatStub,
};

async function main() {
  const name = process.argv[2];
  if (name && name in QUERIES) {
    await QUERIES[name]();
  } else {
    if (process.argv[2] === '--help' || process.argv[2] === '-h') {
      console.log('Usage: npm run query -- [query]');
      console.log('Queries:', Object.keys(QUERIES).sort().join(', '));
      console.log('\nAudit: category-unknown, category-other, subcategory-unknown, suspicious, pagat, completeness-mismatch');
      return;
    }
    await totalGames();
    await categoryOnly();
    await categorySummary();
    await badNames();
  }
  conn.close();
  db.close();
}

main().catch(e => { console.error(e); conn.close(); db.close(); process.exit(1); });
