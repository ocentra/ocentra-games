import type { ContentBlock, Page, PageSection } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import {
  loadGameDetailAssetContent,
  loadSelectedGameAssetBundle,
} from '@/ui/pages/games/SelectedGame/gameDetailAssetSections';
import type { Game, GameDetail, GameSummary } from '@/ui/pages/dev/CardGamesExplorer/types';

type LooseRecord = Record<string, unknown>;

interface AssetExplorerContent {
  detail: GameDetail;
  summary: Partial<GameSummary>;
}

interface Metric {
  label: string;
  value: string;
}

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function dataOf(document: unknown): LooseRecord {
  return asRecord(asRecord(document).data);
}

function cleanText(value: string): string {
  return value
    .replace(/minimum viable playable table/gi, 'playable table')
    .replace(/local pilot/gi, 'local match')
    .replace(/playable pilot/gi, 'playable match')
    .replace(/pilot rule set/gi, 'rules at a glance')
    .replace(/\bpilot\b/gi, 'match')
    .trim();
}

function formatRange(min: number | null, max: number | null): string {
  if (min === null && max === null) {
    return '';
  }
  if (min !== null && max !== null && min !== max) {
    return `${min}-${max}`;
  }
  return String(min ?? max);
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value);
    if (text) {
      return cleanText(text);
    }
  }
  return '';
}

function metricValue(metrics: readonly Metric[], label: string): string {
  const normalized = label.toLowerCase();
  return metrics.find(metric => metric.label.toLowerCase() === normalized)?.value ?? '';
}

function blockText(block: ContentBlock): string {
  const record = asRecord(block);
  const type = asText(record.type);

  if (type === 'paragraph' || type === 'heading') {
    return cleanText(asText(record.text));
  }

  if (type === 'list') {
    return asArray(record.items)
      .map(item => cleanText(asText(asRecord(item).text)))
      .filter(Boolean)
      .map(text => `- ${text}`)
      .join('\n');
  }

  if (type === 'setup-grid') {
    return asArray(record.items)
      .map(item => {
        const row = asRecord(item);
        const label = firstText(row.label);
        const value = firstText(row.detail, row.value);
        return label && value ? `${label}: ${value}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (type === 'rule-block') {
    const title = firstText(record.title);
    const body = asArray(record.content)
      .map(child => blockText(child as ContentBlock))
      .filter(Boolean)
      .join('\n');
    return [title, body].filter(Boolean).join('\n');
  }

  if (type === 'formula') {
    return [firstText(record.label), firstText(record.formula)].filter(Boolean).join(': ');
  }

  if (type === 'example') {
    return [firstText(record.title), firstText(record.text), firstText(record.result)].filter(Boolean).join('\n');
  }

  if (type === 'card-values') {
    return asArray(record.values)
      .map(value => {
        const row = asRecord(value);
        return firstText(row.card) && row.value !== undefined ? `${firstText(row.card)}=${String(row.value)}` : '';
      })
      .filter(Boolean)
      .join(', ');
  }

  return firstText(record.text, record.value, record.description);
}

function pageText(page: Page): string {
  return [
    firstText(page.title),
    firstText(page.subtitle),
    ...asArray(page.content).map(block => blockText(block as ContentBlock)),
  ].filter(Boolean).join('\n');
}

function sectionText(section: PageSection): string {
  return asArray(section.pages)
    .map(page => pageText(page as Page))
    .filter(Boolean)
    .join('\n\n');
}

function findSectionText(sections: readonly PageSection[], names: readonly string[]): string {
  const normalizedNames = names.map(name => name.toLowerCase());
  const section = sections.find(candidate => {
    const record = asRecord(candidate);
    const keys = [
      asText(record.type),
      asText(record.tabLabel),
      ...asArray(record.pages).map(page => asText(asRecord(page).title)),
    ].map(value => value.toLowerCase());
    return keys.some(key => normalizedNames.some(name => key.includes(name)));
  });
  return section ? sectionText(section) : '';
}

function rulesText(rulesData: LooseRecord, generatedRulesText: string): string {
  const rules = asArray(rulesData.rules)
    .map(rule => asText(asRecord(rule).text))
    .filter(Boolean);
  return rules.length > 0 ? rules.map(text => `- ${cleanText(text)}`).join('\n') : generatedRulesText;
}

function strategyText(infoData: LooseRecord, strategyData: LooseRecord, generatedStrategyText: string): string {
  return firstText(
    infoData.Player,
    strategyData.Player,
    asRecord(strategyData.botProfile).summary,
    generatedStrategyText,
  );
}

function variationsText(infoData: LooseRecord, generatedVariationsText: string): string {
  const variations = asArray(asRecord(infoData.variationsContent).list)
    .map(variation => {
      const record = asRecord(variation);
      const name = firstText(record.name);
      const description = firstText(record.description);
      return name && description ? `${name}: ${description}` : firstText(name, description);
    })
    .filter(Boolean);
  return variations.length > 0 ? variations.map(text => `- ${text}`).join('\n') : generatedVariationsText;
}

function historyContent(infoData: LooseRecord, generatedHistoryText: string): unknown {
  const history = asRecord(infoData.historyContent);
  if (Object.keys(history).length > 0) {
    return history;
  }
  return generatedHistoryText;
}

function setupContent(
  infoData: LooseRecord,
  players: string,
  deck: string,
  generatedSetupText: string,
): unknown {
  const setup = asRecord(infoData.setupContent);
  if (Object.keys(setup).length > 0) {
    return {
      ...setup,
      players: firstText(setup.players, players),
      deck: firstText(setup.deck, deck),
    };
  }
  return generatedSetupText || { players, deck };
}

export async function loadAssetExplorerContent(game: Game): Promise<AssetExplorerContent | null> {
  if (!game.guid) {
    return null;
  }

  const [bundle, content] = await Promise.all([
    loadSelectedGameAssetBundle(game.guid),
    loadGameDetailAssetContent(game.guid, []),
  ]);

  const gameData = dataOf(bundle.gameMode);
  const infoData = dataOf(bundle.gameInfo);
  const rulesData = dataOf(bundle.rules);
  const strategyData = dataOf(bundle.strategy);
  const summary = content.summary;
  const metrics = (summary?.metrics ?? []) as Metric[];
  const sections = content.sections;
  const players = firstText(
    infoData.playersDisplay,
    metricValue(metrics, 'Players'),
    formatRange(asNumber(infoData.minPlayers) ?? asNumber(gameData.minPlayers), asNumber(infoData.maxPlayers) ?? asNumber(gameData.maxPlayers)),
    game.players,
  );
  const deck = firstText(infoData.deck, metricValue(metrics, 'Deck'), game.deck);
  const difficulty = firstText(infoData.difficulty, game.difficulty);
  const duration = firstText(infoData.duration, game.duration, metricValue(metrics, 'Timer'));
  const description = firstText(summary?.description, infoData.description, infoData.Player, game.description);
  const category = firstText(infoData.gameCategory, game.category);
  const subcategory = firstText(infoData.subcategory, game.subcategory);
  const generatedRulesText = findSectionText(sections, ['rules', 'scoring']);
  const generatedStrategyText = findSectionText(sections, ['strategy']);
  const generatedSetupText = findSectionText(sections, ['setup', 'deck']);

  return {
    summary: {
      description,
      players,
      deck,
      difficulty,
      duration,
      category,
      subcategory,
      quality: firstText(infoData.quality, game.quality) || game.quality,
      completeness: asRecord(infoData.completeness) as Record<string, boolean>,
      origin: firstText(infoData.origin, game.origin),
      player_mode: firstText(infoData.playerMode, game.player_mode),
      alsoKnownAs: asArray(infoData.alsoKnownAs).map(asText).filter(Boolean),
    },
    detail: {
      filename: firstText(infoData.routePath, game.slug),
      name: firstText(asRecord(infoData.hero).title, summary?.title, game.name),
      guid: game.guid,
      completeness: (asRecord(infoData.completeness) as Record<string, boolean>) ?? game.completeness,
      quality: firstText(infoData.quality, game.quality) || game.quality,
      source: 'asset',
      overview: {
        description,
        type: subcategory ? `${category} / ${subcategory}` : category,
        origin: firstText(infoData.origin, game.origin),
        players,
        deck,
        difficulty,
        duration,
      },
      history: historyContent(infoData, findSectionText(sections, ['history', 'origin'])),
      setup: setupContent(infoData, players, deck, generatedSetupText),
      rules: rulesText(rulesData, generatedRulesText),
      strategy: strategyText(infoData, strategyData, generatedStrategyText),
      variations: variationsText(infoData, findSectionText(sections, ['variation', 'variant'])),
      ai: asRecord(infoData.aiContent),
      sources: asRecord(infoData.sourcesContent),
      cursorFind: asArray(infoData.alsoKnownAs).length > 0 ? { alsoKnownAs: asArray(infoData.alsoKnownAs).map(asText).filter(Boolean) } : undefined,
    },
  };
}
