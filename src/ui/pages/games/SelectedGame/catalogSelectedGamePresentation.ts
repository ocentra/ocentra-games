import type {
  SelectedGamePresentation,
  SelectedGamePresentationChunk,
  SelectedGamePresentationMetric,
  SelectedGamePresentationTab,
  SelectedGameTabId,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';
import { loadRemoteCatalogGame, loadRemoteCatalogIndex } from '@/adapters/assets/GameCatalogRuntimeSource';

type LooseRecord = Record<string, unknown>;

interface CatalogIndexEntry {
  slug: string;
  name: string;
  description: string;
  origin: string;
  players: string;
  deck: string;
  difficulty: string;
  duration: string;
  category: string;
  subcategory: string | null;
  tags: string[];
}

interface CatalogIndex {
  games?: CatalogIndexEntry[];
}

export interface CatalogSelectedGameResolution {
  displayName: string;
  tagline: string;
  presentation: SelectedGamePresentation;
}

const TAB_ORDER: Array<{ id: SelectedGameTabId; label: string }> = [
  { id: 'about', label: 'About' },
  { id: 'rules', label: 'Rules' },
  { id: 'deck', label: 'Deck' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'systems', label: 'Systems' },
];

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanText(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(asText(value));
    if (text) {
      return text;
    }
  }
  return '';
}

function splitText(value: unknown, maxItems = 3): string[] {
  const text = cleanText(asText(value));
  if (!text) {
    return [];
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(Boolean);
  return (sentences.length > 0 ? sentences : [text]).slice(0, maxItems);
}

function objectLines(value: unknown, labels: Record<string, string>): string[] {
  const record = asRecord(value);
  return Object.entries(labels)
    .map(([key, label]) => {
      const text = firstText(record[key]);
      return text ? `${label}: ${text}` : '';
    })
    .filter(Boolean);
}

function variationsLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const record = asRecord(item);
        const name = firstText(record.name);
        const description = firstText(record.description);
        return name && description ? `${name}: ${description}` : firstText(name, description, item);
      })
      .filter(Boolean)
      .slice(0, 5);
  }
  return splitText(value, 5);
}

function metric(label: string, value: string, icon: string): SelectedGamePresentationMetric | null {
  return value ? { label, value, icon } : null;
}

function chunk(
  id: string,
  title: string,
  body: string[],
  bullets: string[] = [],
  kind: SelectedGamePresentationChunk['kind'] = 'text',
): SelectedGamePresentationChunk {
  return {
    id,
    title,
    kind,
    body: body.filter(Boolean),
    bullets: bullets.filter(Boolean),
  };
}

function tab(id: SelectedGameTabId, label: string, chunks: SelectedGamePresentationChunk[], tip: string): SelectedGamePresentationTab {
  return { id, label, chunks: chunks.filter((item) => item.body.length > 0 || item.bullets.length > 0), tip };
}

async function loadCatalogRecord(slug: string): Promise<LooseRecord | null> {
  const detail = await loadRemoteCatalogGame(slug);
  if (detail) {
    return asRecord(detail);
  }

  const index = await loadRemoteCatalogIndex() as CatalogIndex | null;
  return asRecord(index).games
    ? asRecord((index?.games ?? []).find((game) => game.slug === slug) ?? null)
    : null;
}

export async function loadCatalogSelectedGamePresentation(slug: string): Promise<CatalogSelectedGameResolution | null> {
  const record = await loadCatalogRecord(slug);
  if (!record || Object.keys(record).length === 0) {
    return null;
  }

  const overview = asRecord(record.overview);
  const history = asRecord(record.history);
  const setup = asRecord(record.setup);
  const rules = asRecord(record.rules);
  const strategy = asRecord(record.strategy);
  const scoring = asRecord(record.scoring);
  const synthesis = asRecord(record.synthesis);
  const hero = asRecord(synthesis.hero);
  const name = firstText(record.name, hero.title, slug);
  const category = firstText(record.category);
  const subcategory = firstText(record.subcategory);
  const description = firstText(overview.description, synthesis.shortDescription, record.description);
  const tagline = firstText(hero.tagline, hero.subtitle, category, 'Coming soon');
  const stats = [
    metric('Players', firstText(overview.players, record.players), '#'),
    metric('Deck', firstText(overview.deck, record.deck), 'D'),
    metric('Goal', firstText(scoring.winCondition, rules.objective), 'G'),
    metric('Timer', firstText(overview.duration, record.duration), 'T'),
  ].filter((item): item is SelectedGamePresentationMetric => item !== null);
  const aboutChunks = [
    chunk('catalog-overview', 'Overview', splitText(description, 3), objectLines(overview, {
      origin: 'Origin',
      players: 'Players',
      deck: 'Deck',
      difficulty: 'Difficulty',
      duration: 'Duration',
    })),
    chunk('catalog-history', 'History', [
      firstText(history.origins),
      firstText(history.cultural),
      firstText(history.evolution),
    ].filter(Boolean), asArray(history.timeline).map(asText).filter(Boolean).slice(0, 5)),
    chunk('catalog-status', 'Status', ['This catalog game is not playable yet.'], ['Coming soon in Ocentra Games']),
  ];
  const rulesChunks = [
    chunk('catalog-objective', 'Objective', splitText(rules.objective, 2)),
    chunk('catalog-gameplay', 'Gameplay', splitText(rules.gameplay, 4), asArray(rules.keyRules).map(asText).filter(Boolean).slice(0, 6)),
  ];
  const deckChunks = [
    chunk('catalog-setup', 'Setup', [], objectLines(setup, {
      players: 'Players',
      deck: 'Deck',
      dealing: 'Dealing',
      equipment: 'Equipment',
    })),
    chunk('catalog-deck', 'Deck', [firstText(overview.deck, setup.deck, record.deck)]),
  ];
  const scoringChunks = [
    chunk('catalog-scoring', 'Scoring', splitText(scoring.description, 3), objectLines(scoring, {
      winCondition: 'Win condition',
    })),
  ];
  const rankingChunks = [
    chunk('catalog-ranking', 'Ranking', splitText(firstText(record.ranking, scoring.ranking, rules.ranking), 3), [
      firstText(record.deck, setup.deck) ? `Deck: ${firstText(record.deck, setup.deck)}` : '',
      'Detailed ranking assets are pending authoring.',
    ].filter(Boolean)),
  ];
  const strategyChunks = [
    chunk('catalog-strategy', 'Strategy', [
      firstText(strategy.basic),
      firstText(strategy.intermediate),
      firstText(strategy.advanced),
    ].filter(Boolean), asArray(strategy.tips).map(asText).filter(Boolean).slice(0, 5)),
    chunk('catalog-variations', 'Variations', [], variationsLines(record.variations)),
  ];
  const systemsChunks = [
    chunk('catalog-readiness', 'Readiness', ['Catalog information is available. Gameplay assets are pending authoring.'], [
      category ? `Category: ${category}` : '',
      subcategory ? `Subcategory: ${subcategory}` : '',
    ].filter(Boolean)),
  ];
  const tabs = [
    tab('about', 'About', aboutChunks, 'Review the game overview before it becomes playable.'),
    tab('rules', 'Rules', rulesChunks, 'Rules are catalog-backed until authored assets replace them.'),
    tab('deck', 'Deck', deckChunks, 'Deck and setup come from the catalog profile.'),
    tab('ranking', 'Ranking', rankingChunks, 'Ranking details appear here when available.'),
    tab('scoring', 'Scoring', scoringChunks, 'Scoring comes from the catalog profile.'),
    tab('strategy', 'Strategy', strategyChunks, 'Strategy notes come from the catalog profile.'),
    tab('systems', 'Systems', systemsChunks, 'Gameplay systems are pending authoring.'),
  ];
  const quickInfo = Object.fromEntries(TAB_ORDER.map((item) => [
    item.id,
    tabs.find((candidate) => candidate.id === item.id)?.chunks.slice(0, 6) ?? [],
  ])) as SelectedGamePresentation['quickInfo'];
  const tip = Object.fromEntries(TAB_ORDER.map((item) => [
    item.id,
    tabs.find((candidate) => candidate.id === item.id)?.tip ?? '',
  ])) as SelectedGamePresentation['tip'];

  return {
    displayName: name,
    tagline,
    presentation: {
      hero: {
        title: name,
        taglineLines: [tagline, category ? `${category}${subcategory ? ` / ${subcategory}` : ''}` : 'Coming soon'].filter(Boolean),
        badges: ['Coming Soon', category, subcategory].filter(Boolean),
        media: [],
      },
      sideA: {
        stats,
        media: [],
      },
      tabs,
      quickInfo,
      tip,
      actions: [{ id: 'explore-card-games', label: 'Explore Games' }],
    },
  };
}
