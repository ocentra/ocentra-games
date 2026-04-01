import { CATEGORY_VALUES } from '@ocentra/game-domain/game/categories';
const SECTIONS = ['overview', 'history', 'setup', 'rules', 'strategy', 'variations', 'ai', 'sources'];
const ALL_CATEGORIES = [...CATEGORY_VALUES];
function parseJson(val) {
    if (val == null)
        return undefined;
    if (typeof val === 'object')
        return val;
    try {
        return typeof val === 'string' ? JSON.parse(val) : val;
    }
    catch {
        return undefined;
    }
}
function zeroSectionStats() {
    const out = {};
    for (const s of SECTIONS)
        out[s] = { complete: 0, percentage: 0 };
    return out;
}
function zeroCategoryCounts() {
    const out = {};
    for (const c of ALL_CATEGORIES)
        out[c] = 0;
    return out;
}
function rowToSummary(row, alsoKnownAs) {
    const slug = row.slug;
    const comp = parseJson(row.completeness) ?? {};
    const displayName = row.display_name ?? row.primary_name ?? slug;
    return {
        slug,
        file: row.source_file,
        name: displayName,
        file_exists: true,
        link_valid: 'unknown',
        quality: row.quality ?? 'placeholder',
        completeness: comp,
        description: row.description ?? '',
        origin: row.origin ?? '',
        players: row.players_display ?? '',
        deck: row.deck ?? '',
        difficulty: row.difficulty ?? '',
        duration: row.duration ?? '',
        alsoKnownAs,
        category: row.category ?? 'Other',
        subcategory: row.subcategory ?? null,
        player_mode: row.player_mode ?? null,
        has_engine: row.has_engine === 1,
        validation_status: row.validation_status ?? null,
    };
}
export function buildGamesListPayload(rows) {
    const slugToNames = new Map();
    const slugToRow = new Map();
    for (const row of rows) {
        const slug = row.slug;
        if (!slug)
            continue;
        const name = row.display_name ?? row.primary_name ?? slug;
        if (name) {
            const arr = slugToNames.get(slug) ?? [];
            if (!arr.includes(name))
                arr.push(name);
            slugToNames.set(slug, arr);
        }
        if (!slugToRow.has(slug))
            slugToRow.set(slug, row);
    }
    const games = Array.from(slugToRow.values()).map((row) => {
        const slug = row.slug;
        const primary = row.display_name ?? row.primary_name ?? slug;
        const allNames = slugToNames.get(slug) ?? [];
        const alsoKnownAs = allNames.filter((n) => n !== primary);
        return rowToSummary(row, alsoKnownAs);
    });
    const categoryCounts = zeroCategoryCounts();
    let complete = 0, partial = 0, placeholder = 0;
    const sectionCounts = {};
    SECTIONS.forEach((s) => (sectionCounts[s] = 0));
    for (const row of slugToRow.values()) {
        const cat = row.category ?? 'Other';
        const key = ALL_CATEGORIES.includes(cat) ? cat : 'Other';
        categoryCounts[key]++;
        if (row.quality === 'complete')
            complete++;
        else if (row.quality === 'partial')
            partial++;
        else
            placeholder++;
        const comp = parseJson(row.completeness) ?? {};
        for (const s of SECTIONS)
            if (comp[s])
                sectionCounts[s]++;
    }
    const total = games.length;
    const denom = total > 0 ? total : 1;
    const sectionStats = {};
    for (const s of SECTIONS) {
        sectionStats[s] = {
            complete: sectionCounts[s],
            percentage: Math.round((sectionCounts[s] / denom) * 100),
        };
    }
    return {
        payload: {
            metadata: {
                generatedAt: new Date().toISOString(),
                totalGames: total,
                uniqueGames: total,
                stats: { complete, partial, placeholder },
                sectionStats,
                categoryCounts,
            },
            games,
        },
        slugToNames,
    };
}
export function emptyListPayload() {
    return JSON.stringify({
        metadata: {
            generatedAt: new Date().toISOString(),
            totalGames: 0,
            stats: { complete: 0, partial: 0, placeholder: 0 },
            sectionStats: zeroSectionStats(),
            categoryCounts: zeroCategoryCounts(),
        },
        games: [],
    });
}
