import {
  SHOP_HEADER_STATS,
  SHOP_INFO_DETAILS,
  SHOP_PREVIEWS,
  SHOP_QUESTS,
  SHOP_RIGHT_ROWS,
  SHOP_RIGHT_TABS,
  SHOP_SECTIONS,
  SHOP_SIDE_ITEMS,
  SHOP_STATIC_CREDIT_PACKS,
  SHOP_STATIC_PASSES,
  SHOP_UI_COPY,
  SHOP_VAULT_SHOWCASE_GROUPS,
  type ShopPreviewRow,
  type ShopQuest,
  type ShopRightTab,
  type ShopSection,
  type ShopSideItem,
  type ShopStaticItem,
  type ShopVaultShowcaseGroup,
} from './ShopPageSvgData';
import type { ShopTab } from './ShopPageSvgTypes';

export type ShopHeaderStat = {
  label: string;
  value: string;
};

export type ShopRightTabId = ShopRightTab['id'];

export type ShopRightWalletRow = [label: string, valueOrUnit: string];
export type ShopRightEventRow = [label: string, value: string, action: string];
export type ShopRightRecentRow = [label: string, value: string];

export type ShopRightRows = {
  wallet: ShopRightWalletRow[];
  events: ShopRightEventRow[];
  recent: ShopRightRecentRow[];
};

export type ShopRightDetailRow = {
  label: string;
  value: string;
  detail: string;
};

export type ShopRightDetailRows = Record<ShopRightTabId, ShopRightDetailRow[]>;

export type ShopPageContentData = {
  headerStats: ShopHeaderStat[];
  sideItems: ShopSideItem[];
  sections: Record<ShopTab, ShopSection>;
  vaultShowcaseGroups: ShopVaultShowcaseGroup[];
  creditPacks: ShopStaticItem[];
  passes: ShopStaticItem[];
  previews: ShopPreviewRow[];
  quests: ShopQuest[];
  rightTabs: ShopRightTab[];
  rightRows: ShopRightRows;
  rightDetails: ShopRightDetailRows;
  uiCopy: typeof SHOP_UI_COPY;
  infoDetails: typeof SHOP_INFO_DETAILS;
};

const DEFAULT_RIGHT_DETAILS: ShopRightDetailRows = {
  account: [
    { label: 'Profile', value: 'ocentra', detail: 'Identity shown on marketplace previews and shop receipts.' },
    { label: 'Rating', value: 'ELO 1200', detail: 'Competitive rating used for matchmaking and leaderboard context.' },
    { label: 'Owned items', value: '128', detail: 'Total decks, cosmetics, passes, tickets, and earned rewards.' },
    { label: 'Active tables', value: '4 / 6', detail: 'Live table usage compared with the account table limit.' },
    { label: 'Status', value: 'Linked', detail: 'Linked account and wallet state used for checkout and inventory sync.' },
  ],
  wallet: [
    { label: 'Arena Credits', value: 'AC', detail: 'Spendable balance used for packs, entries, cosmetics, and pass purchases.' },
    { label: 'Tournament Tickets', value: '3', detail: 'Tickets available for tournament and qualifier entry fees.' },
    { label: 'Season Points', value: '1,250 SP', detail: 'Season progress earned from ranked play and event finishes.' },
    { label: 'Owned Items', value: '128', detail: 'Total decks, cosmetics, passes, tickets, and earned rewards.' },
    { label: 'Active Tables', value: '4 / 6', detail: 'Live table usage compared with the account table limit.' },
  ],
  pass: [
    { label: 'Active pass', value: 'Champion', detail: 'Premium access and pass-linked benefits are active.' },
    { label: 'Monthly AC', value: '1,200 AC', detail: 'Recurring allowance available through the current pass tier.' },
    { label: 'Premium rooms', value: 'Enabled', detail: 'Extra room and table access for pass holders.' },
    { label: 'Season drops', value: 'Included', detail: 'Seasonal reward drops and priority matchmaking benefits.' },
    { label: 'Renewal', value: 'Monthly', detail: 'Management action will wire into pass/account settings later.' },
  ],
  events: [
    { label: 'Weekly Claim Cup', value: 'Sat, 8:00 PM', detail: 'Next scheduled Claim Cup window and entry action.' },
    { label: 'Season Ladder Reset', value: 'Sun, 12:00 AM', detail: 'Season ladder reset timing for standings and reward cadence.' },
    { label: 'Qualifier Entry', value: 'Coming Soon', detail: 'Qualifier access state for upcoming competitive events.' },
  ],
  recent: [
    { label: 'Champion Pass', value: '-1,499 AC', detail: 'Pass purchase that unlocked Champion benefits on this account.' },
    { label: '1500 AC Pack', value: '+1,500 AC', detail: 'Credit pack added to the Arena Credits balance.' },
    { label: 'Weekly Claim Cup', value: '-250 AC', detail: 'Tournament entry fee deducted from marketplace balance.' },
    { label: 'Neon Card Back', value: '-400 AC', detail: 'Cosmetic purchase added to inventory.' },
  ],
};

export const DEFAULT_SHOP_PAGE_CONTENT: ShopPageContentData = {
  headerStats: [...SHOP_HEADER_STATS],
  sideItems: [...SHOP_SIDE_ITEMS],
  sections: {
    Treasury: SHOP_SECTIONS.Treasury,
    Elite: SHOP_SECTIONS.Elite,
    Vault: SHOP_SECTIONS.Vault,
    'Play Access': SHOP_SECTIONS['Play Access'],
    Events: SHOP_SECTIONS.Events,
  },
  vaultShowcaseGroups: [...SHOP_VAULT_SHOWCASE_GROUPS],
  creditPacks: [...SHOP_STATIC_CREDIT_PACKS],
  passes: [...SHOP_STATIC_PASSES],
  previews: [...SHOP_PREVIEWS],
  quests: [...SHOP_QUESTS],
  rightTabs: [...SHOP_RIGHT_TABS],
  rightRows: {
    wallet: SHOP_RIGHT_ROWS.wallet.map(row => [row[0], row[1]]),
    events: SHOP_RIGHT_ROWS.events.map(row => [row[0], row[1], row[2]]),
    recent: SHOP_RIGHT_ROWS.recent.map(row => [row[0], row[1]]),
  },
  rightDetails: DEFAULT_RIGHT_DETAILS,
  uiCopy: SHOP_UI_COPY,
  infoDetails: SHOP_INFO_DETAILS,
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function cloneContent(): ShopPageContentData {
  return JSON.parse(JSON.stringify(DEFAULT_SHOP_PAGE_CONTENT)) as ShopPageContentData;
}

function mergeKnownValue<T>(fallback: T, source: unknown): T {
  if (Array.isArray(fallback)) {
    return Array.isArray(source) ? source as T : fallback;
  }
  if (fallback && typeof fallback === 'object') {
    const fallbackRecord = fallback as JsonRecord;
    const sourceRecord = asRecord(source);
    const merged: JsonRecord = { ...fallbackRecord };
    for (const [key, value] of Object.entries(fallbackRecord)) {
      merged[key] = mergeKnownValue(value, sourceRecord[key]);
    }
    return merged as T;
  }
  return typeof source === typeof fallback ? source as T : fallback;
}

export function normalizeShopPageContent(
  content?: Partial<ShopPageContentData> | null,
): ShopPageContentData {
  return mergeKnownValue(cloneContent(), content);
}
