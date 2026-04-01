import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { CATEGORY_VALUES } from '@ocentra/game-domain/game/categories';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import './App.css';

/* ------------------------------------------------------------------ */
/*  Types — summary from games-data.json (built from processed-games) */
/* ------------------------------------------------------------------ */

interface GameSummary {
  slug: string;
  file: string;
  name: string;
  quality: string;
  completeness: Record<string, boolean>;
  description: string;
  type?: string;
  origin: string;
  players: string;
  deck: string;
  difficulty: string;
  duration: string;
  alsoKnownAs: string[];
  category?: string;
  subcategory?: string | null;
  player_mode?: string | null;
  has_engine?: boolean;
  file_exists?: boolean;
  link_valid?: string;
  validation_status?: string | null;
}

interface Metadata {
  generatedAt: string;
  totalGames: number;
  stats: { complete: number; partial: number; placeholder: number };
  sectionStats: Record<string, { complete: number; percentage: number }>;
  categoryCounts?: Record<string, number>;
}

/* Full detail loaded on-demand from /games/{file} */
interface GameDetail {
  filename: string;
  name: string;
  completeness: Record<string, boolean>;
  quality: string;
  overview?: unknown;
  history?: unknown;
  setup?: unknown;
  rules?: unknown;
  strategy?: unknown;
  variations?: unknown;
  ai?: unknown;
  sources?: unknown;
  pagat?: unknown;
  source?: unknown;
  cursorFind?: unknown;
}

/* Enriched for grid display */
interface Game extends GameSummary {
  normalizedName: string;
  category: string;
  completenessPercent: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SECTIONS = ['overview', 'history', 'setup', 'rules', 'strategy', 'variations', 'ai', 'sources'] as const;

const SECTION_LABELS: Record<string, { icon: string; label: string }> = {
  overview: { icon: '📋', label: 'Overview' },
  history: { icon: '📜', label: 'History' },
  setup: { icon: '⚙', label: 'Setup' },
  rules: { icon: '📖', label: 'Rules' },
  strategy: { icon: '🎯', label: 'Strategy' },
  variations: { icon: '🔄', label: 'Variations' },
  ai: { icon: '🤖', label: 'AI Guide' },
  sources: { icon: '📚', label: 'Sources' },
};

const ALL_DISPLAY_CATEGORIES = [...CATEGORY_VALUES] as readonly string[];

function canonicalCategory(cat: string | null | undefined): string {
  if (!cat || !cat.trim()) return 'Other';
  const c = cat.trim();
  const found = ALL_DISPLAY_CATEGORIES.find(x => x.toLowerCase() === c.toLowerCase());
  return found ?? 'Other';
}

function canonicalSubLabel(sub: string): string {
  const t = sub.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

const CATEGORY_ICONS: Record<string, string> = {
  Poker: '♠', Patience: '🃏', 'Trick-taking': '🎯', Fishing: '🎣',
  Shedding: '🗑', Rummy: '🎴', Domino: '🁣', Banking: '🎰', Gambling: '🎲',
  Tarot: '🔮', Climbing: '🧗', War: '⚔', Vying: '♦', Matching: '🔀',
  Accumulation: '📚', Tile: '🀄', Other: '📦', Unknown: '❓',
};

const EXPORT_FILTER_TO_FILENAME: Record<string, string> = {
  all: 'AllUrls', wrong: 'Failed', '404': '404-only', no_list_name: 'NotInList', no_json: 'NotInJson',
};

const QUALITY_EXPORT_LABEL: Record<string, string> = {
  all: 'All', complete: 'Complete', partial: 'Partial', placeholder: 'Placeholder',
  missing_json: 'MissingJson', missing_name: 'MissingName',
};

const ALPHABET_ALL_KEY = 'All';
const ALPHABET_NUM_KEY = '0-9';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function categorize(g: GameSummary): string {
  const n = g.name.toLowerCase();
  const desc = g.description.toLowerCase();
  const type = (g.type ?? '').toLowerCase();

  if (n.includes('poker') || n.includes("hold'em") || n.includes('stud') || n.includes('omaha') || type.includes('poker')) return 'Poker';
  if (n.includes('solitaire') || n.includes('patience') || n.includes('klondike') || n.includes('freecell') || n.includes('spider')) return 'Solitaire';
  if (n.includes('domino')) return 'Dominoes';
  if (n.includes('rummy') || n.includes('gin') || n.includes('canasta') || n.includes('mahjong')) return 'Rummy';
  if (n.includes('bridge') || n.includes('whist') || n.includes('euchre') || n.includes('pinochle') || n.includes('spades') || n.includes('hearts') || desc.includes('trick-taking') || desc.includes('trick taking')) return 'Trick-Taking';
  if (n.includes('scopa') || n.includes('cassino') || n.includes('basra') || desc.includes('fishing')) return 'Fishing';
  if (n.includes('uno') || n.includes('crazy eights') || desc.includes('shedding')) return 'Shedding';
  if (n.includes('blackjack') || n.includes('baccarat') || n.includes('pontoon') || n.includes('casino')) return 'Casino';
  if (n.includes('tarot') || n.includes('tarok') || n.includes('tarock')) return 'Tarot';
  if (n.includes('war') || n.includes('battle')) return 'War';
  return 'Other';
}

function enrich(g: GameSummary): Game {
  const completeSections = SECTIONS.filter(s => g.completeness[s]).length;
  return {
    ...g,
    normalizedName: g.name.toLowerCase().replace(/^(the|a|an)\s+/i, ''),
    category: g.category ?? categorize(g),
    completenessPercent: Math.round((completeSections / SECTIONS.length) * 100),
  };
}

/** Render a section of a full GameDetail into readable text */
function renderSection(detail: GameDetail, section: string): string {
  const d = (detail as unknown as Record<string, unknown>)[section];
  if (!d) return '';
  if (typeof d === 'string') return d;
  const dObj = d as Record<string, unknown>;

  switch (section) {
    case 'overview': {
      const parts: string[] = [];
      if (dObj.description) parts.push(String(dObj.description));
      if (dObj.type) parts.push(`Type: ${dObj.type}`);
      if (dObj.origin) parts.push(`Origin: ${dObj.origin}`);
      if (dObj.players) parts.push(`Players: ${dObj.players}`);
      if (dObj.deck) parts.push(`Deck: ${dObj.deck}`);
      if (dObj.difficulty) parts.push(`Difficulty: ${dObj.difficulty}`);
      if (dObj.duration) parts.push(`Duration: ${dObj.duration}`);
      return parts.join('\n');
    }
    case 'history':
      return [dObj.origins, ...((dObj.timeline ?? []) as string[]).map((t: string) => `  - ${t}`), dObj.evolution, dObj.cultural].filter(Boolean).join('\n');
    case 'setup':
      return [dObj.players && `Players: ${dObj.players}`, dObj.deck && `Deck: ${dObj.deck}`, dObj.equipment && `Equipment: ${dObj.equipment}`, dObj.dealing && `Dealing: ${dObj.dealing}`].filter(Boolean).join('\n');
    case 'rules':
      return [dObj.objective && `Objective: ${dObj.objective}`, dObj.gameplay && `\nGameplay:\n${dObj.gameplay}`, dObj.scoring && `\nScoring:\n${dObj.scoring}`, ...((dObj.keyRules ?? []) as string[]).map((r: string) => `  - ${r}`)].filter(Boolean).join('\n');
    case 'strategy':
      return [dObj.basic && `Basic:\n${dObj.basic}`, dObj.intermediate && `\nIntermediate:\n${dObj.intermediate}`, dObj.advanced && `\nAdvanced:\n${dObj.advanced}`, ...((dObj.tips ?? []) as string[]).map((t: string) => `  - ${t}`)].filter(Boolean).join('\n');
    case 'variations':
      return ((dObj.list ?? []) as string[]).map((v: string) => `- ${v}`).join('\n');
    case 'ai': {
      const diff = dObj.difficulty as Record<string, string> | undefined;
      const parts: string[] = [];
      if (diff?.easy) parts.push(`Easy:\n${diff.easy}`);
      if (diff?.medium) parts.push(`Medium:\n${diff.medium}`);
      if (diff?.hard) parts.push(`Hard:\n${diff.hard}`);
      const considerations = (dObj.considerations ?? []) as string[];
      if (considerations.length) parts.push(`\nConsiderations:\n${considerations.map((c: string) => `  - ${c}`).join('\n')}`);
      return parts.join('\n\n');
    }
    case 'sources': {
      const primary = (dObj.primary ?? []) as { name?: string; url?: string }[];
      const links = primary.map((s) => `${s.name} — ${s.url}`);
      return [...links, ...((dObj.additional ?? []) as string[])].join('\n');
    }
    default:
      return JSON.stringify(d, null, 2);
  }
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentCategory, setCurrentCategory] = useState('all');
  const [currentSubcategory, setCurrentSubcategory] = useState<string | null>(null);
  const [categoryExpanded, setCategoryExpanded] = useState<Set<string>>(new Set());
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'completeness'>('name');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'complete' | 'partial' | 'placeholder' | 'missing_json' | 'missing_name'>('all');
  const [currentView, setCurrentView] = useState<'grid' | 'list' | 'alphabet' | 'urls' | 'names'>('grid');
  const [alphabetLayout, setAlphabetLayout] = useState<'grid' | 'list'>('grid');

  const [urlAuditUrls, setUrlAuditUrls] = useState<Array<{ url: string; listNames: string[]; listPaths: string[]; jsonSlugs: string[] }>>([]);
  const [urlAuditLoading, setUrlAuditLoading] = useState(false);
  const [urlAuditError, setUrlAuditError] = useState<string | null>(null);
  const [urlStatusMap, setUrlStatusMap] = useState<Record<string, { status: number; ok: boolean; log?: string }>>({});
  const [urlAuditFilter, setUrlAuditFilter] = useState<'all' | 'wrong' | '404' | 'no_list_name' | 'no_json'>('all');
  const [urlValidating, setUrlValidating] = useState(false);
  const [urlValidateProgress, setUrlValidateProgress] = useState({ done: 0, total: 0 });

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{ ok: number; fail: number; exitCode: number; results?: Array<{ file: string; valid: boolean; errors: string[] }> } | null>(null);

  const [namesAuditRows, setNamesAuditRows] = useState<Array<{ slug: string; display_name: string; is_primary: number; source_file: string }>>([]);
  const [namesAuditLoading, setNamesAuditLoading] = useState(false);
  const [namesAuditHasRun, setNamesAuditHasRun] = useState(false);
  const [reingestLoading, setReingestLoading] = useState(false);
  const [reingestResult, setReingestResult] = useState<{ ok: boolean; exitCode: number; stdout: string; stderr: string } | null>(null);

  const namesAuditSlugs = useMemo(() => new Set(namesAuditRows.map(r => r.slug)), [namesAuditRows]);

  useEffect(() => {
    if (currentSubcategory && currentCategory !== 'all') {
      setCategoryExpanded(prev => prev.has(currentCategory) ? prev : new Set(prev).add(currentCategory));
    }
  }, [currentCategory, currentSubcategory]);

  /* Sequence: app starts → after mount send GET /api/games → get back data → display + keep in state (memory) */
  useEffect(() => {
    console.log('[app] mounted → requesting /api/games');
    (async () => {
      try {
        setLoadError(null);
        const resp = await fetch(LocalApiEndpoint.CardGames.Games);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`${LocalApiEndpoint.CardGames.Games}: ${resp.status} ${text.slice(0, 200)}`);
        }
        const raw = await resp.json();
        const gamesList = Array.isArray(raw.games) ? raw.games : [];
        console.log('[app] /api/games response →', gamesList.length, 'games → display + memory');
        setMetadata(raw.metadata ?? null);
        setGames(gamesList.map((g: GameSummary) => enrich(g)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[app] /api/games failed:', msg);
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (currentView === 'alphabet') setCurrentLetter(null);
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'urls') return;
    setUrlAuditLoading(true);
    setUrlAuditError(null);
    fetch(LocalApiEndpoint.CardGames.UrlsAudit)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text();
          throw new Error(body ? `${r.status}: ${body.slice(0, 150)}` : `URL audit failed (${r.status})`);
        }
        return r.json();
      })
      .then((data) => setUrlAuditUrls(data.urls ?? []))
      .catch((e) => setUrlAuditError(String(e.message ?? e)))
      .finally(() => setUrlAuditLoading(false));
  }, [currentView]);

  /* Validate: always runs on ALL URLs (ignores dropdown); server does HEAD to each URL. */
  const validateUrls = useCallback(async () => {
    const toCheck = urlAuditUrls.filter((u) => {
        const uu = u.url.trim();
        return uu.length > 10 && uu !== 'http' && uu !== 'https' && /^https?:\/\/[^/]+/.test(uu);
      });
    if (toCheck.length === 0) return;
    setUrlValidating(true);
    setUrlValidateProgress({ done: 0, total: toCheck.length });
    const CONCURRENCY = 20;
    for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
      const batch = toCheck.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async ({ url }) => {
          const r = await fetch(`${LocalApiEndpoint.CardGames.CheckUrl}?url=${encodeURIComponent(url)}`);
          const data = await r.json();
          const status = data.status ?? 0;
          const ok = data.ok ?? false;
          const log = data.error ?? (!ok && status ? `HTTP ${status}` : undefined);
          return { url, status, ok, log };
        }),
      );
      const batchMap: Record<string, { status: number; ok: boolean; log?: string }> = {};
      results.forEach((p, idx) => {
        const url = batch[idx].url;
        if (p.status === 'fulfilled') batchMap[url] = p.value;
        else batchMap[url] = { status: 0, ok: false, log: String((p as PromiseRejectedResult).reason?.message ?? (p as PromiseRejectedResult).reason ?? 'Request failed') };
      });
      setUrlStatusMap((prev) => ({ ...prev, ...batchMap }));
      setUrlValidateProgress({ done: Math.min(i + batch.length, toCheck.length), total: toCheck.length });
    }
    setUrlValidating(false);
    setUrlValidateProgress((p) => ({ ...p, done: p.total }));
  }, [urlAuditUrls]);

  const url404List = useMemo(() => urlAuditUrls.filter((u) => urlStatusMap[u.url]?.status === 404), [urlAuditUrls, urlStatusMap]);
  const urlFailedList = useMemo(() => urlAuditUrls.filter((u) => urlStatusMap[u.url] && !urlStatusMap[u.url].ok), [urlAuditUrls, urlStatusMap]);

  const urlAuditFiltered = useMemo(() => urlAuditUrls.filter((u) => {
    if (urlAuditFilter === 'wrong') return urlStatusMap[u.url] && !urlStatusMap[u.url].ok;
    if (urlAuditFilter === '404') return urlStatusMap[u.url]?.status === 404;
    if (urlAuditFilter === 'no_list_name') return u.listNames.length === 0;
    if (urlAuditFilter === 'no_json') return u.jsonSlugs.length === 0;
    return true;
  }), [urlAuditUrls, urlAuditFilter, urlStatusMap]);

  const exportUrlListAsNdjson = useCallback(
    async (list: Array<{ url: string; listNames: string[]; listPaths: string[]; jsonSlugs: string[] }>, logKey: 'urls-404' | 'urls-failed') => {
      const ndjson = list
        .map((u) => {
          const s = urlStatusMap[u.url];
          return JSON.stringify({
            url: u.url,
            status: s?.status ?? null,
            ok: s?.ok ?? false,
            log: s?.log ?? null,
            inList: u.listNames,
            inJson: u.jsonSlugs,
          });
        })
        .join('\n');
      try {
        const r = await fetch(`${LocalApiEndpoint.CardGames.ExportUrlAudit}?filter=${encodeURIComponent(logKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-ndjson' },
          body: ndjson,
        });
        if (r.ok) {
          const data = await r.json();
          console.log('[app] Export saved to', data.path ?? 'Log/');
        } else {
          console.warn('[app] Export save failed', r.status);
        }
      } catch (e) {
        console.warn('[app] Export: server save failed', e);
      }
    },
    [urlStatusMap],
  );

  const exportTableAsNdjson = useCallback(async () => {
    const rows = urlAuditFiltered.map((u) => {
      const s = urlStatusMap[u.url];
      return {
        url: u.url,
        status: s?.status ?? null,
        ok: s?.ok ?? false,
        log: s?.log ?? null,
        inList: u.listNames,
        inJson: u.jsonSlugs,
      };
    });
    const ndjson = rows.map((r) => JSON.stringify(r)).join('\n');
    const suffix = EXPORT_FILTER_TO_FILENAME[urlAuditFilter];
    try {
      const r = await fetch(`${LocalApiEndpoint.CardGames.ExportUrlAudit}?filter=${encodeURIComponent(suffix)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: ndjson,
      });
      if (r.ok) {
        const data = await r.json();
        console.log('[app] Export saved to', data.path ?? 'Log/');
      } else {
        console.warn('[app] Export save failed', r.status);
      }
    } catch (e) {
      console.warn('[app] Export: server save failed', e);
    }
  }, [urlAuditFiltered, urlStatusMap, urlAuditFilter]);

  const runValidation = useCallback(async () => {
    setValidationLoading(true);
    setValidationResult(null);
    try {
      const r = await fetch(LocalApiEndpoint.CardGames.RunValidate, { method: 'POST' });
      const data = await r.json();
      setValidationResult({
        ok: data.ok ?? 0,
        fail: data.fail ?? 0,
        exitCode: data.exitCode ?? (data.fail > 0 ? 1 : 0),
        results: data.results,
      });
    } catch {
      setValidationResult({ ok: 0, fail: 0, exitCode: 1 });
    } finally {
      setValidationLoading(false);
    }
  }, []);

  const runNamesAudit = useCallback(async () => {
    setNamesAuditLoading(true);
    setNamesAuditRows([]);
    try {
      const r = await fetch(LocalApiEndpoint.CardGames.NamesAudit);
      const data = await r.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setNamesAuditRows(rows);
      setNamesAuditHasRun(true);
      setCurrentView('names');
      if (!r.ok && data.error) console.error('[names-audit]', data.error);
    } catch (e) {
      setNamesAuditRows([]);
      setCurrentView('names');
      setNamesAuditHasRun(true);
      console.error('[names-audit]', e);
    } finally {
      setNamesAuditLoading(false);
    }
  }, []);

  const runReingest = useCallback(async () => {
    setReingestLoading(true);
    setReingestResult(null);
    try {
      const r = await fetch(LocalApiEndpoint.CardGames.Reingest, { method: 'POST' });
      const data = await r.json();
      setReingestResult({ ok: data.ok ?? false, exitCode: data.exitCode ?? 1, stdout: data.stdout ?? '', stderr: data.stderr ?? '' });
      if (data.ok) {
        const refresh = await fetch(`${LocalApiEndpoint.CardGames.Games}?refresh=1`);
        if (refresh.ok) {
          const raw = await refresh.json();
          setMetadata(raw.metadata ?? null);
          setGames((Array.isArray(raw.games) ? raw.games : []).map((g: GameSummary) => enrich(g)));
        }
      }
    } catch {
      setReingestResult({ ok: false, exitCode: 1, stdout: '', stderr: 'Request failed' });
    } finally {
      setReingestLoading(false);
    }
  }, []);

  /* Load detail on game select */
  const openDetail = useCallback(async (game: Game) => {
    setSelectedGame(game);
    setGameDetail(null);
    setDetailLoading(true);
    try {
      const resp = await fetch(LocalApiEndpoint.CardGames.GameBySlug(game.slug));
      if (resp.ok) {
        setGameDetail(await resp.json());
      }
    } catch (e) {
      console.error('Detail load error:', e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const categoryWithSubs = useMemo(() => {
    const byCategory = new Map<string, { total: number; subs: Map<string, number> }>();
    games.forEach(g => {
      const cat = canonicalCategory(g.category);
      const subRaw = (g.subcategory ?? '').trim() || null;
      const subKey = subRaw ? subRaw.toLowerCase() : null;
      let entry = byCategory.get(cat);
      if (!entry) {
        entry = { total: 0, subs: new Map<string, number>() };
        byCategory.set(cat, entry);
      }
      entry.total += 1;
      if (subKey) {
        entry.subs.set(subKey, (entry.subs.get(subKey) ?? 0) + 1);
      }
    });
    const order = Array.from(byCategory.entries()).sort((a, b) => b[1].total - a[1].total);
    return order.map(([cat, { total, subs }]) => ({
      category: cat,
      total,
      subList: Array.from(subs.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([subKey, cnt]) => [canonicalSubLabel(subKey), cnt] as const),
    }));
  }, [games]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, number>();
    categoryWithSubs.forEach(({ category, total }) => m.set(category, total));
    return m;
  }, [categoryWithSubs]);

  const availableLetters = useMemo(() => {
    const letters = new Set(games.map(g => g.normalizedName[0]?.toUpperCase()).filter(Boolean));
    if (games.some(g => /^[0-9]/.test(g.normalizedName))) letters.add(ALPHABET_NUM_KEY);
    return letters;
  }, [games]);

  /* Filtered + sorted */
  const filteredGames = useMemo(() => {
    let result = games;
    if (currentView === 'names') result = result.filter(g => namesAuditSlugs.has(g.slug));
    if (currentCategory !== 'all') {
      result = result.filter(g => canonicalCategory(g.category) === currentCategory);
      if (currentSubcategory) result = result.filter(g => (g.subcategory ?? '').trim().toLowerCase() === currentSubcategory.toLowerCase());
    }
    if (currentView === 'alphabet' && currentLetter && !searchQuery.trim()) {
      if (currentLetter === ALPHABET_NUM_KEY) result = result.filter(g => /^[0-9]/.test(g.normalizedName));
      else result = result.filter(g => g.normalizedName[0]?.toUpperCase() === currentLetter);
    }
    if (qualityFilter !== 'all') {
      if (qualityFilter === 'missing_json') result = result.filter(g => !g.file_exists);
      else if (qualityFilter === 'missing_name') result = result.filter(g => !g.name?.trim() || g.name.toLowerCase() === 'placeholder' || g.name.length < 2);
      else result = result.filter(g => g.quality === qualityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(g => {
        const name = (g.name ?? '').toLowerCase();
        const desc = typeof g.description === 'string' ? g.description : '';
        const cat = (g.category ?? '').toLowerCase();
        const slug = (g.slug ?? '').toLowerCase();
        const typeStr = (g.type ?? '').toLowerCase();
        const aka = Array.isArray(g.alsoKnownAs) ? g.alsoKnownAs : [];
        return name.includes(q) ||
          desc.toLowerCase().includes(q) ||
          cat.includes(q) ||
          slug.includes(q) ||
          typeStr.includes(q) ||
          aka.some((a: string) => String(a).toLowerCase().includes(q));
      });
    }
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.normalizedName.localeCompare(b.normalizedName);
        case 'category': return a.category.localeCompare(b.category) || a.normalizedName.localeCompare(b.normalizedName);
        case 'completeness': return b.completenessPercent - a.completenessPercent || a.normalizedName.localeCompare(b.normalizedName);
        default: return a.normalizedName.localeCompare(b.normalizedName);
      }
    });
  }, [games, currentCategory, currentSubcategory, currentView, currentLetter, qualityFilter, searchQuery, sortBy, namesAuditSlugs]);

  const gamesExportSuffix = useMemo(() => {
    if (currentView === 'names') return 'Names-audit';
    const cat = currentCategory === 'all' ? 'All' : currentSubcategory ? `${currentCategory}-${currentSubcategory}`.replace(/\s+/g, '-') : currentCategory.replace(/\s+/g, '-');
    const qual = QUALITY_EXPORT_LABEL[qualityFilter];
    return qual === 'All' ? cat : `${cat}-${qual}`;
  }, [currentView, currentCategory, currentSubcategory, qualityFilter]);

  const exportGamesAsNdjson = useCallback(async () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const rows = filteredGames.map(g => ({
      slug: g.slug,
      file: g.file,
      json_url: base ? `${base}/games/${g.file}` : null,
      name: g.name,
      quality: g.quality,
      file_exists: g.file_exists ?? false,
      link_valid: g.link_valid ?? 'unknown',
      category: g.category,
      completenessPercent: g.completenessPercent,
      description: (g.description ?? '').slice(0, 200),
      origin: g.origin ?? '',
      players: g.players ?? '',
      deck: g.deck ?? '',
      difficulty: g.difficulty ?? '',
      duration: g.duration ?? '',
    }));
    const ndjson = rows.map(r => JSON.stringify(r)).join('\n');
    const suffix = gamesExportSuffix;
    try {
      const r = await fetch(`${LocalApiEndpoint.CardGames.ExportGames}?filter=${encodeURIComponent(suffix)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: ndjson,
      });
      if (r.ok) {
        const data = await r.json();
        console.log('[app] Games export saved to', data.path ?? 'Log/');
      } else {
        console.warn('[app] Games export save failed', r.status);
      }
    } catch (e) {
      console.warn('[app] Games export: server save failed', e);
    }
  }, [filteredGames, gamesExportSuffix]);

  const alphabet = [ALPHABET_ALL_KEY, ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), ALPHABET_NUM_KEY];

  if (loading) {
    return <div className="loading-container"><div className="spinner" /><p>Loading games...</p></div>;
  }
  if (loadError) {
    return (
      <div className="loading-container" style={{ flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-error, #c00)', fontWeight: 600 }}>Failed to load games</p>
        <pre style={{ fontSize: '0.85rem', overflow: 'auto', maxWidth: '90vw', textAlign: 'left' }}>{loadError}</pre>
        <p style={{ fontSize: '0.9rem' }}>Restart the dev server (npm run dev) and refresh. Check Network tab for /api/games.</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🃏</span>
            <div className="logo-text">
              <h1>Card Games Explorer</h1>
              <p>Browse {games.length.toLocaleString()} card games from around the world</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <Panel icon="🔍" title="Search">
            <input type="text" className="search-box" placeholder="Search games..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </Panel>

          <Panel icon="📊" title="Quality & status">
            <div className="quality-filters">
              {(['all', 'complete', 'partial', 'placeholder', 'missing_json', 'missing_name'] as const).map(q => (
                <button key={q} type="button" className={`quality-btn ${q.replace('_', '-')} ${qualityFilter === q ? 'active' : ''}`} onClick={() => setQualityFilter(q)}>
                  {q === 'missing_json' ? 'Missing JSON' : q === 'missing_name' ? 'Missing name' : q.charAt(0).toUpperCase() + q.slice(1)}
                </button>
              ))}
            </div>
          </Panel>

          <Panel icon="📂" title="Categories">
            <div className="category-list">
              <div
                className={`category-item ${currentCategory === 'all' && !currentSubcategory ? 'active' : ''}`}
                onClick={() => { setCurrentCategory('all'); setCurrentSubcategory(null); setCurrentLetter(null); }}
              >
                <span className="category-name">
                  <span className="category-icon">🎮</span>
                  All Games
                </span>
                <span className="category-count">{games.length.toLocaleString()}</span>
              </div>
              {categoryWithSubs.map(({ category, total, subList }) => {
                const isExpanded = categoryExpanded.has(category);
                const hasSubs = subList.length > 0;
                const isCategoryActive = currentCategory === category && !currentSubcategory;
                return (
                  <div key={category} className="category-group">
                    <div
                      className={`category-item category-item-main ${isCategoryActive ? 'active' : ''}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.category-expand')) return;
                        setCurrentCategory(category);
                        setCurrentSubcategory(null);
                        setCurrentLetter(null);
                      }}
                    >
                      {hasSubs ? (
                        <button
                          type="button"
                          className="category-expand"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoryExpanded(prev => {
                              const next = new Set(prev);
                              if (next.has(category)) next.delete(category);
                              else next.add(category);
                              return next;
                            });
                          }}
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      ) : (
                        <span className="category-expand-placeholder" aria-hidden />
                      )}
                      <span className="category-name">
                        <span className="category-icon">{CATEGORY_ICONS[category] ?? '📦'}</span>
                        {category}
                      </span>
                      <span className="category-count">{total.toLocaleString()}</span>
                    </div>
                    {hasSubs && isExpanded && (
                      <div className="category-subs">
                        {subList.map(([sub, cnt]) => {
                          const isSubActive = currentCategory === category && currentSubcategory === sub;
                          return (
                            <button
                              key={sub}
                              type="button"
                              className={`category-sub-item ${isSubActive ? 'active' : ''}`}
                              onClick={() => {
                                setCurrentCategory(category);
                                setCurrentSubcategory(sub);
                                setCurrentLetter(null);
                                setCategoryExpanded(prev => new Set(prev).add(category));
                              }}
                            >
                              <span className="category-sub-name">{sub}</span>
                              <span className="category-count">{cnt.toLocaleString()}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {metadata && (
            <Panel icon="📈" title="Section Stats">
              {SECTIONS.map(s => {
                const stat = metadata.sectionStats[s];
                if (!stat) return null;
                return (
                  <div key={s} className="section-stat">
                    <div className="section-stat-label">{SECTION_LABELS[s]?.icon} {SECTION_LABELS[s]?.label}</div>
                    <div className="section-stat-bar-wrapper"><div className="section-stat-bar" style={{ width: `${stat.percentage}%` }} /></div>
                    <span className="section-stat-pct">{stat.percentage}%</span>
                  </div>
                );
              })}
            </Panel>
          )}

          <Panel icon="✔" title="Schema validation">
            <button
              type="button"
              className="quality-btn"
              onClick={runValidation}
              disabled={validationLoading}
            >
              {validationLoading ? 'Running…' : 'Run validation'}
            </button>
            {validationResult && (
              <div className="validation-result" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--success, #22c55e)' }}>{validationResult.ok} passed</span>
                <span style={{ marginLeft: '0.5rem', color: validationResult.fail > 0 ? 'var(--error, #ef4444)' : 'inherit' }}>{validationResult.fail} failed</span>
                {validationResult.results && validationResult.fail > 0 && (
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary>Failing files</summary>
                    <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, maxHeight: '200px', overflow: 'auto' }}>
                      {validationResult.results.filter(r => !r.valid).map(r => (
                        <li key={r.file}>
                          <button type="button" className="link-like" onClick={() => { const g = games.find(x => x.file === r.file); if (g) openDetail(g); }}>
                            {r.file}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </Panel>

          <Panel icon="📛" title="Names audit">
            <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0', color: 'var(--muted)' }}>
              Find bad names: &quot;(see …)&quot;, empty, placeholder, TBD, unknown. Results show in <strong>Names</strong> view.
            </p>
            <button
              type="button"
              className="quality-btn"
              onClick={runNamesAudit}
              disabled={namesAuditLoading}
            >
              {namesAuditLoading ? 'Checking…' : 'Check names'}
            </button>
            {namesAuditRows.length > 0 ? (
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--muted)' }}>
                {namesAuditRows.length} row(s) → switch to <strong>Names</strong> tab to see and open games.
              </p>
            ) : namesAuditHasRun && namesAuditRows.length === 0 ? (
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--muted)' }}>
                No suspicious names found (empty, placeholder, &quot;(see …)&quot;, TBD, unknown).
              </p>
            ) : null}
            <button
              type="button"
              className="quality-btn"
              onClick={runReingest}
              disabled={reingestLoading}
              style={{ marginTop: '0.5rem' }}
            >
              {reingestLoading ? 'Re-ingesting…' : 'Re-ingest'}
            </button>
            {reingestResult && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                {reingestResult.ok ? <span style={{ color: 'var(--success, #22c55e)' }}>OK</span> : <span style={{ color: 'var(--error, #ef4444)' }}>Failed ({reingestResult.exitCode})</span>}
                {reingestResult.stderr && <pre style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'auto' }}>{reingestResult.stderr}</pre>}
              </div>
            )}
          </Panel>
        </aside>

        <div className="content">
          <div className="content-bar">
            <div className="content-bar-left">
              <div className="view-tabs">
                {(['grid', 'list', 'alphabet', 'names', 'urls'] as const).map(v => (
                  <button key={v} className={`view-tab ${currentView === v ? 'active' : ''}`} onClick={() => setCurrentView(v)}>
                    {v === 'grid' ? 'Grid' : v === 'list' ? 'List' : v === 'alphabet' ? 'A–Z' : v === 'names' ? 'Names' : 'URL Audit'}
                  </button>
                ))}
              </div>
              <div className="content-bar-sort-wrap">
                <span className="content-bar-dot" aria-hidden>·</span>
                <label className="content-bar-sort">
                  <span className="content-bar-sort-icon" aria-hidden>↕</span>
                  <span className="content-bar-sort-text">Sort by</span>
                  <select className="content-bar-sort-select" value={sortBy} onChange={e => setSortBy((e.target.value || 'name') as 'name' | 'category' | 'completeness')} aria-label="Sort by">
                    <option value="name">Name</option>
                    <option value="category">Category</option>
                    <option value="completeness">Completeness</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="content-bar-right">
              {metadata && (
                <div className="content-stats">
                  <Stat value={filteredGames.length} label="Games" title={filteredGames.length !== metadata.totalGames ? `${filteredGames.length.toLocaleString()} of ${metadata.totalGames.toLocaleString()} (filtered)` : undefined} />
                  <Stat value={metadata.stats.complete} label="Complete" cls="complete" />
                  <Stat value={metadata.stats.partial} label="Partial" cls="partial" />
                  <Stat value={categoryMap.size} label="Categories" />
                </div>
              )}
              {(currentView === 'grid' || currentView === 'list' || currentView === 'alphabet' || currentView === 'names') && (
                <button
                  type="button"
                  className="content-export-btn"
                  onClick={exportGamesAsNdjson}
                  disabled={filteredGames.length === 0}
                  title={`Export to Log/games-${gamesExportSuffix}.ndjson (no download)`}
                  aria-label={`Export table to Log (${filteredGames.length} games)`}
                >
                  <span className="content-export-value" aria-hidden>📤</span>
                  <span className="content-export-label">Export</span>
                </button>
              )}
            </div>
          </div>

          {currentView === 'alphabet' && (
            <div className="alphabet-nav">
              <div className="alphabet-nav-layout">
                <button type="button" className={`alphabet-layout-tab ${alphabetLayout === 'grid' ? 'active' : ''}`} onClick={() => setAlphabetLayout('grid')} aria-label="Grid layout">⊞ Grid</button>
                <button type="button" className={`alphabet-layout-tab ${alphabetLayout === 'list' ? 'active' : ''}`} onClick={() => setAlphabetLayout('list')} aria-label="List layout">☰ List</button>
              </div>
              <div className="alphabet-nav-letters">
                {alphabet.map(l => {
                  const isDisabled = l !== ALPHABET_ALL_KEY && !availableLetters.has(l);
                  const isActive = l === ALPHABET_ALL_KEY ? currentLetter === null : l === currentLetter;
                  const handleClick = () => {
                    if (l === ALPHABET_ALL_KEY) setCurrentLetter(null);
                    else if (!isDisabled) setCurrentLetter(l === currentLetter ? null : l);
                  };
                  return (
                    <button
                      key={l}
                      type="button"
                      className={`alphabet-letter ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`}
                      onClick={handleClick}
                      disabled={isDisabled}
                      aria-label={l === ALPHABET_ALL_KEY ? 'Show all' : `Games starting with ${l}`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentView === 'urls' ? (
            <div className="url-audit-panel">
              <h2 className="url-audit-title">URL audit</h2>
              <p className="url-audit-desc">Source URLs from game JSONs, deduped. Validate to check if links work.</p>
              <div className="url-audit-toolbar">
                <select value={urlAuditFilter} onChange={e => setUrlAuditFilter(e.target.value as typeof urlAuditFilter)} aria-label="Filter">
                  <option value="all">All URLs</option>
                  <option value="wrong">Failed (any non-2xx)</option>
                  <option value="404">404 only</option>
                  <option value="no_list_name">No names</option>
                  <option value="no_json">No slugs</option>
                </select>
                <button type="button" className="url-audit-validate" onClick={validateUrls} disabled={urlValidating || urlAuditUrls.length === 0} title="Validates all URLs regardless of filter">
                  {urlValidating ? `Validating… ${urlValidateProgress.done} / ${urlValidateProgress.total}` : 'Validate all'}
                </button>
                <button type="button" className="url-audit-export" onClick={exportTableAsNdjson} disabled={urlAuditFiltered.length === 0} title="Save current table to Log/ via API (no download)">
                  Export table ({urlAuditFiltered.length})
                </button>
                {urlFailedList.length > 0 && (
                  <>
                    <button type="button" className="url-audit-export" onClick={() => exportUrlListAsNdjson(url404List, 'urls-404')} title="Save 404s to Log/urls-404.ndjson via API">
                      Export 404s ({url404List.length})
                    </button>
                    <button type="button" className="url-audit-export" onClick={() => exportUrlListAsNdjson(urlFailedList, 'urls-failed')} title="Save failed URLs to Log/urls-failed.ndjson via API">
                      Export failed ({urlFailedList.length})
                    </button>
                  </>
                )}
              </div>
              {urlValidating && urlValidateProgress.total > 0 && (
                <div className="url-audit-progress-wrap" role="status" aria-live="polite" aria-label={`Validation progress: ${urlValidateProgress.done} of ${urlValidateProgress.total} URLs checked`}>
                  <progress value={urlValidateProgress.done} max={urlValidateProgress.total} className="url-audit-progress-native" />
                  <span className="url-audit-progress-text">{urlValidateProgress.done} / {urlValidateProgress.total} URLs checked</span>
                </div>
              )}
              {urlAuditLoading ? (
                <div className="loading-container"><div className="spinner" /><p>Loading URLs…</p></div>
              ) : urlAuditError ? (
                <p className="url-audit-error">{urlAuditError}</p>
              ) : (
                  <div className="url-audit-table-wrap">
                    <p className="url-audit-count">{urlAuditFiltered.length} URL(s) · {urlAuditUrls.length} total (deduped)</p>
                    <table className="url-audit-table">
                      <thead>
                        <tr>
                          <th>URL</th>
                          <th>Status</th>
                          <th>Names</th>
                          <th>Slugs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {urlAuditFiltered.map((u) => (
                          <tr key={u.url}>
                            <td className="url-audit-url"><a href={u.url} target="_blank" rel="noopener noreferrer">{u.url}</a></td>
                            <td className="url-audit-status">
                              {urlStatusMap[u.url] != null
                                ? (urlStatusMap[u.url].ok ? <span className="status-ok">{urlStatusMap[u.url].status} OK</span> : <span className="status-missing">{urlStatusMap[u.url].status} fail</span>)
                                : '—'}
                            </td>
                            <td className="url-audit-list">{u.listNames.length ? u.listNames.slice(0, 3).join(', ') + (u.listNames.length > 3 ? ` +${u.listNames.length - 3}` : '') : '—'}</td>
                            <td className="url-audit-json">{u.jsonSlugs.length ? u.jsonSlugs.slice(0, 3).join(', ') + (u.jsonSlugs.length > 3 ? ` +${u.jsonSlugs.length - 3}` : '') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}
            </div>
          ) : (
            <>
          {/* Games */}
          {filteredGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{currentView === 'names' ? '📛' : '🔍'}</div>
              <h3>{currentView === 'names' ? (namesAuditHasRun && namesAuditRows.length === 0 ? 'No bad names found' : 'No names-audit results') : 'No games found'}</h3>
              <p>{currentView === 'names' ? (namesAuditHasRun && namesAuditRows.length === 0 ? 'Check names ran and found no suspicious names (empty, placeholder, "(see …)", etc.).' : 'Use the sidebar → Names audit → Check names to find games with bad names.') : 'Try adjusting your filters'}</p>
            </div>
          ) : (currentView === 'list' || (currentView === 'alphabet' && alphabetLayout === 'list')) ? (
            <div className="games-list">
              <div className="game-list-header" aria-hidden="true">
                <span className="game-list-name">Name</span>
                <span className="game-list-cat">Category</span>
                <span className="game-list-players">Players</span>
                <span className="game-list-quality">Quality</span>
                <span className="game-list-status">JSON / link</span>
                <div className="game-list-bar" />
                <span className="game-list-pct">%</span>
              </div>
              {filteredGames.map(game => (
                <div key={game.slug} className="game-list-row" onClick={() => openDetail(game)}>
                  <span className="game-list-name">
                    <span className="game-list-primary">{game.name}</span>
                    <span className="game-list-slug" title="slug"> {game.slug}</span>
                    {Array.isArray(game.alsoKnownAs) && game.alsoKnownAs.length > 0 && (
                      <span className="game-list-aka"> · Also: {game.alsoKnownAs.join(', ')}</span>
                    )}
                  </span>
                  <span className="game-list-cat">{CATEGORY_ICONS[game.category] ?? '📦'} {game.category}{game.subcategory ? ` / ${game.subcategory}` : ''}</span>
                  <span className="game-list-players">{game.players || '—'}</span>
                  <span className={`game-list-quality ${game.quality}`}>{game.quality}</span>
                  <span className="game-list-status" title="List vs JSON status">
                    {game.file_exists ? '✓ JSON' : '✗ No JSON'} · {game.link_valid ?? 'unknown'}
                  </span>
                  <div className="game-list-bar"><div className={`completeness-fill ${game.completenessPercent >= 75 ? 'high' : game.completenessPercent >= 40 ? 'medium' : 'low'}`} style={{ width: `${game.completenessPercent}%` }} /></div>
                  <span className="game-list-pct">{game.completenessPercent}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="games-grid">
              {filteredGames.map(game => (
                <div key={game.slug} className={`game-card quality-${game.quality}`} onClick={() => openDetail(game)}>
                  <div className="game-header">
                    <h3 className="game-name">{game.name}</h3>
                    <span className="game-card-slug" title="slug">{game.slug}</span>
                    <span className="game-type-badge">{game.category}{game.subcategory ? ` / ${game.subcategory}` : ''}</span>
                  </div>
                  {Array.isArray(game.alsoKnownAs) && game.alsoKnownAs.length > 0 && (
                    <p className="game-card-aka">Also: {game.alsoKnownAs.join(', ')}</p>
                  )}
                  <div className="game-status-row" title="List vs JSON status">
                    {game.file_exists ? <span className="status-ok">✓ JSON</span> : <span className="status-missing">✗ No JSON</span>}
                    <span className="status-link">link: {game.link_valid ?? 'unknown'}</span>
                  </div>
                  {game.description && (
                    <p className="game-desc">{game.description.length > 140 ? game.description.slice(0, 140) + '...' : game.description}</p>
                  )}
                  <div className="game-meta">
                    {game.players && <span>👥 {game.players}</span>}
                    {game.deck && <span>🃏 {game.deck}</span>}
                    {game.duration && <span>⏱ {game.duration}</span>}
                    {game.difficulty && <span>⚡ {game.difficulty}</span>}
                  </div>
                  <div className="game-sections-dots">
                    {SECTIONS.map(s => <span key={s} className={`section-dot ${game.completeness[s] ? 'filled' : 'empty'}`} title={s} />)}
                  </div>
                  <div className="game-completeness">
                    <div className="completeness-bar">
                      <div className={`completeness-fill ${game.completenessPercent >= 75 ? 'high' : game.completenessPercent >= 40 ? 'medium' : 'low'}`} style={{ width: `${game.completenessPercent}%` }} />
                    </div>
                    <span className="completeness-text">{game.completenessPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

            </>
          )}

          {/* Detail overlay */}
          {selectedGame && (
            <div className="detail-overlay" onClick={e => { if (e.target === e.currentTarget) { setSelectedGame(null); setGameDetail(null); } }}>
              <div className="detail-panel">
                <button className="detail-close" onClick={() => { setSelectedGame(null); setGameDetail(null); }}>✕</button>
                <div className="detail-header">
                  <h2 className="detail-title">{selectedGame.name}</h2>
                  <div className="detail-meta">
                    <span className="detail-slug" title="slug">{selectedGame.slug}</span>
                    <span className={`quality-badge ${selectedGame.quality}`}>{selectedGame.quality}</span>
                    <span>{CATEGORY_ICONS[selectedGame.category] ?? '📦'} {selectedGame.category}{selectedGame.subcategory ? ` / ${selectedGame.subcategory}` : ''}</span>
                    {selectedGame.players && <span>👥 {selectedGame.players}</span>}
                    {selectedGame.deck && <span>🃏 {selectedGame.deck}</span>}
                    {selectedGame.duration && <span>⏱ {selectedGame.duration}</span>}
                    {selectedGame.difficulty && <span>⚡ {selectedGame.difficulty}</span>}
                    <span>✅ {selectedGame.completenessPercent}%</span>
                  </div>
                  {((gameDetail?.cursorFind as { alsoKnownAs?: string[] } | undefined)?.alsoKnownAs ?? selectedGame.alsoKnownAs).length > 0 && (
                    <div className="detail-aka">Also known as: {((gameDetail?.cursorFind as { alsoKnownAs?: string[] } | undefined)?.alsoKnownAs ?? selectedGame.alsoKnownAs).join(', ')}</div>
                  )}
                  <div className="detail-dots">
                    {SECTIONS.map(s => (
                      <span key={s} className={`detail-dot ${selectedGame.completeness[s] ? 'filled' : 'empty'}`}>
                        {SECTION_LABELS[s]?.icon} {SECTION_LABELS[s]?.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="detail-content">
                  {detailLoading ? (
                    <div className="loading-container"><div className="spinner" /><p>Loading details...</p></div>
                  ) : gameDetail ? (
                    <div className="detail-sections">
                      {SECTIONS.map(s => {
                        const text = renderSection(gameDetail, s);
                        return (
                          <div key={s} className={`detail-section ${text ? 'has-content' : 'no-content'}`}>
                            <h4>{SECTION_LABELS[s]?.icon} {SECTION_LABELS[s]?.label}</h4>
                            {text ? <pre className="detail-text">{text}</pre> : <p className="no-data">No content</p>}
                          </div>
                        );
                      })}

                      {/* Pagat.com data */}
                      {((): ReactNode => {
                        if (!gameDetail.pagat || !Object.values(gameDetail.pagat as Record<string, unknown>).some(v => v)) return null;
                        const pagatEntries = Object.entries(gameDetail.pagat as Record<string, unknown>)
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 300) : String(v)}`)
                          .join('\n\n');
                        return (
                          <div className="detail-section has-content pagat-section">
                            <h4>🌐 Pagat.com Data</h4>
                            <pre className="detail-text">{pagatEntries}</pre>
                          </div>
                        );
                      })()}

                      {/* CursorFind extras */}
                      {((): ReactNode => {
                        if (!gameDetail.cursorFind) return null;
                        const cf = gameDetail.cursorFind as Record<string, unknown>;
                        const cursorFindText = Object.entries(cf)
                          .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
                          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                          .join('\n');
                        return (
                          <div className="detail-section has-content">
                            <h4>🔎 Additional Info</h4>
                            <pre className="detail-text">{cursorFindText}</pre>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="no-data">Could not load game details</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* Small reusable components */
function Stat({ value, label, cls, title }: { value: number; label: string; cls?: string; title?: string }) {
  return (
    <div className={`header-stat ${cls ?? ''}`} title={title}>
      <div className="header-stat-value">{value.toLocaleString()}</div>
      <div className="header-stat-label">{label}</div>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-header"><span>{icon}</span><h3>{title}</h3></div>
      <div className="panel-content">{children}</div>
    </div>
  );
}

export default App;
