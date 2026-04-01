import { useState, useMemo } from 'react';
import type { Game, GameMetadata, PlayerModeFilter, QualityFilter, SortBy, ViewMode } from '../types';
import { ALPHABET_NUM_KEY } from '../types';

export function useGamesFilter(games: Game[], metadata: GameMetadata | null) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerModeFilter, setPlayerModeFilter] = useState<PlayerModeFilter>('all');
  const [currentCategory, setCurrentCategoryRaw] = useState('all');
  const [currentSubcategory, setCurrentSubcategoryRaw] = useState<string | null>(null);
  const [categoryExpanded, setCategoryExpanded] = useState<Set<string>>(new Set());
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [currentView, setCurrentViewRaw] = useState<ViewMode>('grid');

  const gamesByPlayerMode = useMemo(() => {
    if (playerModeFilter === 'all') return games;
    return games.filter(g => (g.player_mode ?? '').toLowerCase() === playerModeFilter);
  }, [games, playerModeFilter]);

  const playerModeCounts = useMemo(() => {
    let single = 0;
    let multi = 0;
    for (const g of games) {
      const m = (g.player_mode ?? '').toLowerCase();
      if (m === 'singleplayer') single++;
      else if (m === 'multiplayer') multi++;
    }
    return {
      all: games.length,
      singleplayer: single,
      multiplayer: multi,
    };
  }, [games]);

  const setCurrentCategory = (cat: string) => {
    setCurrentCategoryRaw(cat);
    setCurrentSubcategoryRaw(null);
    setCurrentLetter(null);
  };

  const setCurrentSubcategory = (sub: string | null) => {
    setCurrentSubcategoryRaw(sub);
    setCurrentLetter(null);
  };

  const setPlayerModeFilterAndReset = (mode: PlayerModeFilter) => {
    setPlayerModeFilter(mode);
    setCurrentCategoryRaw('all');
    setCurrentSubcategoryRaw(null);
    setCurrentLetter(null);
  };

  const toggleCategoryExpanded = (cat: string) => {
    setCategoryExpanded(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const setCurrentView = (view: ViewMode) => {
    setCurrentViewRaw(view);
    if (view === 'alphabet') setCurrentLetter(null);
  };

  const sortedCategories = useMemo(() => {
    const counts = metadata?.categoryCounts ?? {};
    const fromGames = new Map<string, number>();
    for (const g of gamesByPlayerMode) {
      const c = g.category || 'Other';
      fromGames.set(c, (fromGames.get(c) ?? 0) + 1);
    }
    const merged = new Map<string, number>();
    for (const [cat, n] of Object.entries(counts)) {
      if (n > 0) merged.set(cat, n);
    }
    for (const [cat, n] of fromGames) {
      const existing = merged.get(cat);
      merged.set(cat, existing != null ? Math.max(existing, n) : n);
    }
    const withCounts = [...merged.entries()]
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, n]) => [cat, n] as const);
    return [['all', gamesByPlayerMode.length] as const, ...withCounts];
  }, [metadata?.categoryCounts, gamesByPlayerMode]);

  const categoryWithSubs = useMemo(() => {
    const byCategory = new Map<string, { total: number; subs: Map<string, number> }>();
    for (const g of gamesByPlayerMode) {
      const cat = g.category || 'Other';
      const sub = g.subcategory?.trim() || '(none)';
      let entry = byCategory.get(cat);
      if (!entry) {
        entry = { total: 0, subs: new Map() };
        byCategory.set(cat, entry);
      }
      entry.total += 1;
      entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + 1);
    }
    return [...byCategory.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cat, { total, subs }]) => ({
        category: cat,
        total,
        subList: [...subs.entries()].sort((a, b) => b[1] - a[1]) as ReadonlyArray<readonly [string, number]>,
      }));
  }, [gamesByPlayerMode]);

  const sortedSubcategories = useMemo(() => {
    if (currentCategory === 'all') return [];
    const entry = categoryWithSubs.find(c => c.category.toLowerCase() === currentCategory.toLowerCase());
    return entry?.subList ?? [];
  }, [categoryWithSubs, currentCategory]);

  const availableLetters = useMemo(() => {
    const letters = new Set(
      gamesByPlayerMode.map(g => g.normalizedName[0]?.toUpperCase()).filter(Boolean)
    );
    if (gamesByPlayerMode.some(g => /^[0-9]/.test(g.normalizedName))) letters.add(ALPHABET_NUM_KEY);
    return letters;
  }, [gamesByPlayerMode]);

  const filteredGames = useMemo(() => {
    let result = gamesByPlayerMode;

    if (currentCategory !== 'all')
      result = result.filter(g => g.category.toLowerCase() === currentCategory.toLowerCase());

    if (currentSubcategory != null && currentSubcategory !== '(none)')
      result = result.filter(g => (g.subcategory?.trim() || '(none)') === currentSubcategory);
    else if (currentSubcategory === '(none)')
      result = result.filter(g => !g.subcategory?.trim());

    if (currentView === 'alphabet' && currentLetter) {
      if (currentLetter === ALPHABET_NUM_KEY)
        result = result.filter(g => /^[0-9]/.test(g.normalizedName));
      else
        result = result.filter(g => g.normalizedName[0]?.toUpperCase() === currentLetter);
    }

    if (qualityFilter !== 'all') {
      if (qualityFilter === 'missing_json')
        result = result.filter(g => !g.file_exists);
      else if (qualityFilter === 'missing_name')
        result = result.filter(g => !g.name?.trim() || g.name.toLowerCase() === 'placeholder' || g.name.length < 2);
      else
        result = result.filter(g => g.quality === qualityFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.subcategory ?? '').toLowerCase().includes(q) ||
        (g.type ?? '').toLowerCase().includes(q) ||
        g.alsoKnownAs.some(a => a.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':         return a.normalizedName.localeCompare(b.normalizedName);
        case 'category':     return a.category.localeCompare(b.category) || a.normalizedName.localeCompare(b.normalizedName);
        case 'completeness': return b.completenessPercent - a.completenessPercent || a.normalizedName.localeCompare(b.normalizedName);
        default:             return a.normalizedName.localeCompare(b.normalizedName);
      }
    });
  }, [gamesByPlayerMode, currentCategory, currentSubcategory, currentView, currentLetter, qualityFilter, searchQuery, sortBy]);

  return {
    searchQuery, setSearchQuery,
    playerModeFilter,
    setPlayerModeFilter: setPlayerModeFilterAndReset,
    playerModeCounts,
    currentCategory, setCurrentCategory,
    currentSubcategory, setCurrentSubcategory,
    categoryWithSubs,
    categoryExpanded,
    toggleCategoryExpanded,
    currentLetter, setCurrentLetter,
    sortBy, setSortBy,
    qualityFilter, setQualityFilter,
    currentView, setCurrentView,
    sortedCategories,
    sortedSubcategories,
    availableLetters,
    filteredGames,
  };
}
