import type { GameSummary, GameDetail } from '../types';

/** Duck API → GameInfo-shaped display. Same shape will be used when loading real GameInfo scriptables. */

export interface DuckGameListItem {
  slug?: string;
  file?: string;
  name?: string;
  quality?: string;
  completeness?: Record<string, boolean>;
  description?: string;
  origin?: string;
  players?: string;
  deck?: string;
  difficulty?: string;
  duration?: string;
  alsoKnownAs?: string[];
  category?: string;
  subcategory?: string | null;
  player_mode?: string | null;
  file_exists?: boolean;
  link_valid?: string;
  [key: string]: unknown;
}

export interface DuckGameDetail {
  filename?: string;
  name?: string;
  completeness?: Record<string, boolean>;
  quality?: string;
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
  [key: string]: unknown;
}

export function duckGameToGameInfoSummary(raw: DuckGameListItem): GameSummary {
  return {
    slug: raw.slug ?? '',
    file: raw.file ?? '',
    name: raw.name ?? '',
    quality: raw.quality ?? 'placeholder',
    completeness: raw.completeness ?? {},
    description: raw.description ?? '',
    origin: raw.origin ?? '',
    players: raw.players ?? '',
    deck: raw.deck ?? '',
    difficulty: raw.difficulty ?? '',
    duration: raw.duration ?? '',
    alsoKnownAs: Array.isArray(raw.alsoKnownAs) ? raw.alsoKnownAs : [],
    category: raw.category ?? undefined,
    subcategory: raw.subcategory ?? null,
    player_mode: raw.player_mode ?? null,
    file_exists: raw.file_exists,
    link_valid: raw.link_valid,
  };
}

export function duckDetailToGameInfoDetail(raw: DuckGameDetail): GameDetail {
  return {
    filename: raw.filename ?? '',
    name: raw.name ?? '',
    completeness: raw.completeness ?? {},
    quality: raw.quality ?? 'placeholder',
    overview: raw.overview,
    history: raw.history,
    setup: raw.setup,
    rules: raw.rules,
    strategy: raw.strategy,
    variations: raw.variations,
    ai: raw.ai,
    sources: raw.sources,
    pagat: raw.pagat,
    source: raw.source,
    cursorFind: raw.cursorFind,
  };
}
