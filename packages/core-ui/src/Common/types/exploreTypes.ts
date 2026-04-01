import type { ExploreGameSummary } from './ExploreGameSummary';

export type PlayerModeFilter = 'all' | 'singleplayer' | 'multiplayer';

export const CATEGORY_ICONS: Record<string, string> = {
  Poker: '♠', Rummy: '🎴', 'Trick-taking': '🎯', 'Trick-Taking': '🎯',
  Fishing: '🎣', Shedding: '🗑', Domino: '🁣', Dominoes: '🁣',
  Patience: '🃏', Solitaire: '🃏', Accumulation: '📈', Climbing: '🧗',
  Vying: '⚔', Matching: '🃚', 'Abstract strategy': '♟', Banking: '🏦',
  Gambling: '🎰', Miscellaneous: '📦', Other: '📦', Race: '🏁',
  Social: '👥', Tile: '🀄', Unknown: '❓', War: '⚔',
};

export const PLAYER_MODE_LABELS: Record<PlayerModeFilter, { icon: string; label: string }> = {
  all: { icon: '🎮', label: 'All Games' },
  singleplayer: { icon: '🃏', label: 'Single player' },
  multiplayer: { icon: '👥', label: 'Multiplayer' },
};

export type { ExploreGameSummary };
