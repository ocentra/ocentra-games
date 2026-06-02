export type PlayerModeFilter = 'all' | 'singleplayer' | 'multiplayer';

export interface GameSummary {
  slug: string;
  guid?: string;
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
  file_exists?: boolean;
  link_valid?: string;
  source?: 'asset' | 'catalog';
  releaseStatus?: string | null;
}

export interface GameMetadata {
  generatedAt: string;
  totalGames: number;
  stats: { complete: number; partial: number; placeholder: number };
  sectionStats: Record<string, { complete: number; percentage: number }>;
  categoryCounts?: Record<string, number>;
}

export interface GameDetail {
  filename: string;
  name: string;
  guid: string | undefined;
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
  source?: 'asset' | 'catalog';
  releaseStatus?: string | null;
  cursorFind?: unknown;
}

export interface Game extends GameSummary {
  normalizedName: string;
  category: string;
  completenessPercent: number;
}

export type QualityFilter = 'all' | 'available' | 'complete' | 'partial' | 'placeholder' | 'missing_json' | 'missing_name';
export type SortBy = 'name' | 'category' | 'completeness' | 'available';
export type ViewMode = 'grid' | 'list' | 'alphabet';

export const SECTIONS = ['overview', 'history', 'setup', 'rules', 'strategy', 'variations', 'ai', 'sources'] as const;
export type Section = typeof SECTIONS[number];

export const SECTION_LABELS: Record<string, { icon: string; label: string }> = {
  overview:   { icon: '📋', label: 'Overview' },
  history:    { icon: '📜', label: 'History' },
  setup:      { icon: '⚙',  label: 'Setup' },
  rules:      { icon: '📖', label: 'Rules' },
  strategy:   { icon: '🎯', label: 'Strategy' },
  variations: { icon: '🔄', label: 'Variations' },
  ai:         { icon: '🤖', label: 'AI Guide' },
  sources:    { icon: '📚', label: 'Sources' },
};

export const CATEGORY_ICONS: Record<string, string> = {
  Poker: '♠', Rummy: '🎴', 'Trick-taking': '🎯', 'Trick-Taking': '🎯',
  Fishing: '🎣', Shedding: '🗑', Domino: '🁣', Dominoes: '🁣',
  Patience: '🃏', Solitaire: '🃏', Accumulation: '📈', Climbing: '🧗',
  Vying: '⚔', Matching: '🃚', 'Abstract strategy': '♟', Banking: '🏦',
  Gambling: '🎰', Miscellaneous: '📦', Other: '📦', Race: '🏁',
  Social: '👥', Tile: '🀄', Unknown: '❓', War: '⚔',
};

export const QUALITY_EXPORT_LABEL: Record<string, string> = {
  all: 'All', available: 'Available Now', complete: 'Complete', partial: 'Partial',
  placeholder: 'Placeholder', missing_json: 'MissingJson', missing_name: 'MissingName',
};

export const PLAYER_MODE_LABELS: Record<PlayerModeFilter, { icon: string; label: string }> = {
  all: { icon: '🎮', label: 'All Games' },
  singleplayer: { icon: '🃏', label: 'Single player' },
  multiplayer: { icon: '👥', label: 'Multiplayer' },
};

export const ALPHABET_ALL_KEY = 'All';
export const ALPHABET_NUM_KEY = '0-9';

export interface UrlAuditEntry {
  url: string;
  listNames: string[];
  jsonSlugs: string[];
}

export interface UrlStatus {
  status?: number;
  ok?: boolean;
  log?: string;
}

export type UrlAuditFilter = 'all' | 'wrong' | '404' | 'no_list_name' | 'no_json';

export const EXPORT_FILTER_TO_FILENAME: Record<UrlAuditFilter, string> = {
  all: 'all',
  wrong: 'wrong',
  '404': '404',
  no_list_name: 'no_list_name',
  no_json: 'no_json',
};
