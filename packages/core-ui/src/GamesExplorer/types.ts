export type PlayerModeFilter = 'all' | 'singleplayer' | 'multiplayer';

export interface GamesExplorerGame {
  slug: string;
  name: string;
  category: string;
  quality?: string;
  subcategory?: string | null;
  description?: string;
  players?: string;
  deck?: string;
  duration?: string;
  difficulty?: string;
  player_mode?: string | null;
  completeness?: Record<string, boolean>;
  completenessPercent?: number;
  file_exists?: boolean;
  link_valid?: string;
  file?: string;
}

export interface GamesExplorerMetadata {
  generatedAt?: string;
  totalGames: number;
  stats?: { complete: number; partial: number; placeholder: number };
  sectionStats?: Record<string, { complete: number; percentage: number }>;
  categoryCounts?: Record<string, number>;
}

export interface CategoryWithSubs {
  category: string;
  total: number;
  subList: ReadonlyArray<readonly [string, number]>;
}

export type SortBy = 'name' | 'category' | 'completeness';
export type ViewMode = 'grid' | 'list' | 'alphabet';

export const SECTIONS = ['overview', 'history', 'setup', 'rules', 'strategy', 'variations', 'ai', 'sources'] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<string, { icon: string; label: string }> = {
  overview: { icon: '📋', label: 'Overview' },
  history: { icon: '📜', label: 'History' },
  setup: { icon: '⚙', label: 'Setup' },
  rules: { icon: '📖', label: 'Rules' },
  strategy: { icon: '🎯', label: 'Strategy' },
  variations: { icon: '🔄', label: 'Variations' },
  ai: { icon: '🤖', label: 'AI Guide' },
  sources: { icon: '📚', label: 'Sources' },
};

export const CATEGORY_ICONS: Record<string, string> = {
  Poker: '♠',
  Rummy: '🎴',
  'Trick-taking': '🎯',
  'Trick-Taking': '🎯',
  Fishing: '🎣',
  Shedding: '🗑',
  Domino: '🁣',
  Dominoes: '🁣',
  Patience: '🃏',
  Solitaire: '🃏',
  Accumulation: '📈',
  Climbing: '🧗',
  Vying: '⚔',
  Matching: '🃚',
  'Abstract strategy': '♟',
  Banking: '🏦',
  Gambling: '🎰',
  Miscellaneous: '📦',
  Other: '📦',
  Race: '🏁',
  Social: '👥',
  Tile: '🀄',
  Unknown: '❓',
  War: '⚔',
};

export const PLAYER_MODE_LABELS: Record<PlayerModeFilter, { icon: string; label: string }> = {
  all: { icon: '🎮', label: 'All Games' },
  singleplayer: { icon: '🃏', label: 'Single player' },
  multiplayer: { icon: '👥', label: 'Multiplayer' },
};
