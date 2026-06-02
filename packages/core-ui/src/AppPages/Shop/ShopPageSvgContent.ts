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
    { label: 'Profile', value: 'Sign in', detail: 'Identity appears here after a real account signs in.' },
    { label: 'Rating', value: 'No rating', detail: 'Competitive rating appears after ranked play is recorded.' },
    { label: 'Owned items', value: 'Sign in', detail: 'Inventory count appears after entitlement sync for the signed-in account.' },
    { label: 'Active tables', value: '0', detail: 'Live table usage appears after account capacity sync is connected.' },
    { label: 'Status', value: 'Signed out', detail: 'Account and wallet state appears after sign-in.' },
  ],
  wallet: [
    { label: 'Arena Credits', value: 'AC', detail: 'Spendable balance used for packs, entries, cosmetics, and pass purchases.' },
    { label: 'Tournament Tickets', value: 'Sign in', detail: 'Ticket balance appears after event inventory sync for the signed-in account.' },
    { label: 'Season Points', value: 'No season', detail: 'Season progress appears after a season is published.' },
    { label: 'Owned Items', value: 'Sign in', detail: 'Inventory count appears after entitlement sync for the signed-in account.' },
    { label: 'Active Tables', value: '0', detail: 'Live table usage appears after account capacity sync is connected.' },
  ],
  pass: [
    { label: 'Active pass', value: 'No pass', detail: 'Pass tier appears after subscription state is connected.' },
    { label: 'Monthly AC', value: 'No pass', detail: 'Recurring allowance appears after pass benefits sync is connected.' },
    { label: 'Premium rooms', value: 'No pass', detail: 'Room access appears after entitlement sync is connected.' },
    { label: 'Season drops', value: 'No season', detail: 'Seasonal drops appear after reward sync is connected.' },
    { label: 'Renewal', value: 'No pass', detail: 'Renewal cadence appears after billing state is connected.' },
  ],
  events: [
    { label: 'Published Schedule', value: 'No events', detail: 'Live event windows appear after the schedule feed is connected.' },
    { label: 'Open Entries', value: 'Closed', detail: 'Entry availability appears after event products are connected.' },
    { label: 'Reward Calendar', value: 'No season', detail: 'Reward timing appears after season cadence is connected.' },
  ],
  recent: [
    { label: 'Purchase History', value: 'No purchases', detail: 'Completed checkout activity appears after order history is connected.' },
    { label: 'Last Checkout', value: 'No checkout', detail: 'Most recent checkout status appears after checkout sync is connected.' },
    { label: 'Last Reward Sync', value: 'No sync', detail: 'Reward grants appear after entitlement sync is connected.' },
    { label: 'Inventory Change', value: 'No changes', detail: 'Cosmetic and deck changes appear after inventory sync is connected.' },
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

function isUnavailablePlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === 'N/A' || trimmed === 'NA' || trimmed.includes('N/A');
}

function replaceUnavailablePlaceholder(value: string, fallback: unknown): string {
  if (typeof fallback === 'string' && !isUnavailablePlaceholder(fallback)) {
    return fallback;
  }
  if (value.trim() === 'NA') {
    return 'Unavailable';
  }
  return value.replace(/N\/A/g, 'Unavailable');
}

function replaceUnavailablePlaceholders<T>(source: T, fallback: unknown): T {
  if (typeof source === 'string') {
    return (isUnavailablePlaceholder(source) ? replaceUnavailablePlaceholder(source, fallback) : source) as T;
  }
  if (Array.isArray(source)) {
    const fallbackArray = Array.isArray(fallback) ? fallback : [];
    return source.map((value, index) => replaceUnavailablePlaceholders(value, fallbackArray[index])) as T;
  }
  if (source && typeof source === 'object') {
    const fallbackRecord = asRecord(fallback);
    const next: JsonRecord = {};
    for (const [key, value] of Object.entries(source as JsonRecord)) {
      next[key] = replaceUnavailablePlaceholders(value, fallbackRecord[key]);
    }
    return next as T;
  }
  return source;
}

function sanitizeShopPageContent(content: ShopPageContentData): ShopPageContentData {
  return ShopPageContentDataSchema.parse(replaceUnavailablePlaceholders(content, DEFAULT_SHOP_PAGE_CONTENT));
}

export function normalizeShopPageContent(
  content?: Partial<ShopPageContentData> | null,
): ShopPageContentData {
  const merged = mergeKnownValue(cloneContent(), content);
  return sanitizeShopPageContent(ShopPageContentDataSchema.parse(merged));
}

export function parseShopPageContent(content: unknown): ShopPageContentData {
  return sanitizeShopPageContent(ShopPageContentDataSchema.parse(content));
}
