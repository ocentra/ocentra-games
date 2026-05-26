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
  type ShopRightTab,
} from './ShopPageSvgData';
import {
  ShopPageContentDataSchema,
  type ShopPageContentData,
} from '@ocentra/game-asset-domain/schemas/shop-page-content-schema';

export type { ShopPageContentData };

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

export type ShopRightDetailRows =
  Record<Exclude<ShopRightTabId, 'settings' | 'ai'>, ShopRightDetailRow[]> &
  Partial<Record<'settings' | 'ai', ShopRightDetailRow[]>>;

const DEFAULT_RIGHT_DETAILS: ShopRightDetailRows = {
  account: [
    { label: 'Profile', value: 'N/A', detail: 'Identity appears here when the signed-in account summary is available.' },
    { label: 'Rating', value: 'N/A', detail: 'Competitive rating will display after the profile service is connected.' },
    { label: 'Owned items', value: 'N/A', detail: 'Inventory count will display after entitlement sync is connected.' },
    { label: 'Active tables', value: 'N/A', detail: 'Live table usage will display after account capacity sync is connected.' },
    { label: 'Status', value: 'N/A', detail: 'Account and wallet state will display after checkout sync is connected.' },
  ],
  wallet: [
    { label: 'Arena Credits', value: 'AC', detail: 'Spendable balance used for packs, entries, cosmetics, and pass purchases.' },
    { label: 'Tournament Tickets', value: 'N/A', detail: 'Ticket balance will display after event inventory sync is connected.' },
    { label: 'Season Points', value: 'N/A', detail: 'Season progress will display after ladder sync is connected.' },
    { label: 'Owned Items', value: 'N/A', detail: 'Inventory count will display after entitlement sync is connected.' },
    { label: 'Active Tables', value: 'N/A', detail: 'Live table usage will display after account capacity sync is connected.' },
  ],
  pass: [
    { label: 'Active pass', value: 'N/A', detail: 'Pass tier will display after subscription state is connected.' },
    { label: 'Monthly AC', value: 'N/A', detail: 'Recurring allowance will display after pass benefits sync is connected.' },
    { label: 'Premium rooms', value: 'N/A', detail: 'Room access will display after entitlement sync is connected.' },
    { label: 'Season drops', value: 'N/A', detail: 'Seasonal drops will display after reward sync is connected.' },
    { label: 'Renewal', value: 'N/A', detail: 'Renewal cadence will display after billing state is connected.' },
  ],
  events: [
    { label: 'Published Schedule', value: 'N/A', detail: 'Live event windows will display after the schedule feed is connected.' },
    { label: 'Open Entries', value: 'N/A', detail: 'Entry availability will display after event products are connected.' },
    { label: 'Reward Calendar', value: 'N/A', detail: 'Reward timing will display after season cadence is connected.' },
  ],
  recent: [
    { label: 'Purchase History', value: 'N/A', detail: 'Completed checkout activity will display after order history is connected.' },
    { label: 'Last Checkout', value: 'N/A', detail: 'Most recent checkout status will display after checkout sync is connected.' },
    { label: 'Last Reward Sync', value: 'N/A', detail: 'Reward grants will display after entitlement sync is connected.' },
    { label: 'Inventory Change', value: 'N/A', detail: 'Cosmetic and deck changes will display after inventory sync is connected.' },
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
  uiCopy: JSON.parse(JSON.stringify(SHOP_UI_COPY)) as ShopPageContentData['uiCopy'],
  infoDetails: JSON.parse(JSON.stringify(SHOP_INFO_DETAILS)) as ShopPageContentData['infoDetails'],
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
  const merged = mergeKnownValue(cloneContent(), content);
  return ShopPageContentDataSchema.parse(merged);
}

export function parseShopPageContent(content: unknown): ShopPageContentData {
  return ShopPageContentDataSchema.parse(content);
}
