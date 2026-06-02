import { useMemo, useState, type ReactNode } from 'react';
import { isUnsafePlayerDisplayName } from '@ocentra/endpoint-domain/schemas/players';
import { ShopPageSvgSurface, type ShopRightDetailRenderProps } from '../Shop/ShopPageSvgSurface';
import type { ShopStaticItem } from '../Shop/ShopPageSvgData';
import type { ShopAccountSummary, ShopProduct, ShopTab } from '../Shop/ShopPageSvgTypes';
import type { ShopPageContentData } from '@ocentra/game-asset-domain/schemas/shop-page-content-schema';
import { MainBottom } from '../Shop/ShopPageMainBottom';
import { mainBottomOverlayContentRect } from '../Shop/ShopPageSectionFrameGeometry';
import { roundedRectPath as lobbyRoundedRectPath } from '../Lobby/LobbyPageSvgGeometry';
import {
  normalizePlayerHubPageSvgControls,
  type PlayerHubPageSvgControls,
  type PlayerHubTabId,
} from './PlayerHubPageSvgSurfaceControls';
import {
  normalizePlayerHubPageContent,
  playerHubContentToShopContent,
  PLAYER_HUB_EMPTY_VALUE,
  type PlayerHubPageContentData,
} from './PlayerHubPageSvgContent';
import {
  buildPlayerHubProfileUpdatePatch,
  buildPlayerHubSettingsUpdatePatch,
  type PlayerHubProfileUpdatePatch,
  type PlayerHubSettingsUpdatePatch,
} from './PlayerHubPageUpdatePatches';
import './PlayerHubPageSvgSurface.css';

type PlayerHubRecord = Record<string, unknown>;
type ShopRightDetailRowList = NonNullable<ShopPageContentData['rightDetails'][keyof ShopPageContentData['rightDetails']]>;

export type PlayerHubCreditBalance = {
  gp_balance?: number;
  ac_balance?: number;
  [key: string]: unknown;
};

export type PlayerHubInventoryLike = {
  itemId: string;
  quantity: number;
  title?: string;
  itemType?: string;
  equipped?: boolean;
  [key: string]: unknown;
};

export type PlayerHubMarketplaceLike = {
  id: string;
  title: string;
  [key: string]: unknown;
};

export type PlayerHubSettingsLike = {
  theme?: string;
  notifications?: boolean;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  language?: string;
  preferredServerRegion?: string;
  [key: string]: unknown;
};

export type PlayerHubDailyRewardLike = {
  available?: boolean;
  claimed?: boolean;
  nextAt?: number | null;
  currentDay?: number;
  loginStreak?: number;
  rewardForNext?: PlayerHubRecord;
  lastReward?: PlayerHubRecord | null;
  [key: string]: unknown;
};

export type PlayerHubPlayerStatsLike = {
  user_id?: string;
  display_name?: string;
  joined_at?: string;
  stats?: {
    total_games?: number;
    wins?: number;
    losses?: number;
    win_rate?: number;
    by_game_type?: unknown;
  };
  credits?: {
    gp_balance?: number;
    ac_balance?: number;
    total_gp_earned?: number;
    total_ac_purchased?: number;
    total_ac_spent?: number;
  };
};

export type PlayerHubLearningProgressLike = {
  skill_areas?: Array<{
    area?: string;
    level?: number;
    progress?: number;
    next_milestone?: string;
  }>;
  overall_progress?: number;
  recommendations?: string[];
};

export type PlayerHubPerformanceReportLike = {
  user_id?: string;
  period?: string;
  generated_at?: string;
  summary?: {
    games_played?: number;
    win_rate?: number;
    avg_score?: number;
    improvement?: number;
  };
  highlights?: string[];
  areas_for_improvement?: string[];
};

export type PlayerHubPageSvgSurfaceProps = {
  loading: boolean;
  error: string | null;
  targetUserId: string;
  profile: PlayerHubRecord | null;
  inventoryItems: PlayerHubInventoryLike[];
  marketplaceListings: PlayerHubMarketplaceLike[];
  creditBalance?: PlayerHubCreditBalance | null;
  dailyReward?: PlayerHubDailyRewardLike | null;
  settings?: PlayerHubSettingsLike | null;
  playerStats?: PlayerHubPlayerStatsLike | null;
  learningProgress?: PlayerHubLearningProgressLike | null;
  performanceReport?: PlayerHubPerformanceReportLike | null;
  serviceErrors?: string[];
  initialTab?: PlayerHubTabId;
  matchId?: string;
  controls?: Partial<PlayerHubPageSvgControls> | null;
  content?: PlayerHubPageContentData | null;
  onRefresh: () => void;
  onShop: () => void;
  onPlay?: () => void;
  onLobby?: () => void;
  onCompetition?: () => void;
  onUpdateProfile?: (patch: PlayerHubProfileUpdatePatch) => Promise<void | string> | void | string;
  onUpdateSettings?: (patch: PlayerHubSettingsUpdatePatch) => Promise<void | string> | void | string;
  onClaimDailyReward?: () => Promise<void | string> | void | string;
  renderAiSettingsDetail?: (props: PlayerHubAiSettingsDetailRenderProps) => ReactNode;
};

export type PlayerHubAiSettingsDetailRenderProps = {
  onClose: () => void;
  onRefresh: () => void;
};

const PLAYER_HUB_RENDER_TAB_BY_SECTION: Record<PlayerHubTabId, ShopTab> = {
  overview: 'Treasury',
  matches: 'Play Access',
  learning: 'Elite',
  ai: 'Treasury',
  competition: 'Events',
  inventory: 'Vault',
  rewards: 'Treasury',
  account: 'Treasury',
};

function readString(value: unknown, fallback = PLAYER_HUB_EMPTY_VALUE): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function shortAccountId(value: string): string {
  const text = readString(value, '');
  if (!text) return PLAYER_HUB_EMPTY_VALUE;
  if (text.length <= 12) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function numberLabel(value: unknown, fallback = PLAYER_HUB_EMPTY_VALUE): string {
  const number = readNumber(value);
  return number === null ? fallback : number.toLocaleString();
}

function percentLabel(value: unknown, fallback = PLAYER_HUB_EMPTY_VALUE): string {
  const number = readNumber(value);
  if (number === null) return fallback;
  const normalized = number > 0 && number <= 1 ? number * 100 : number;
  return `${Math.round(normalized)}%`;
}

function profileValue(profile: PlayerHubRecord | null, keys: string[], fallback = PLAYER_HUB_EMPTY_VALUE): string {
  if (!profile) return fallback;
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function playerProfileLabel(profile: PlayerHubRecord | null, targetUserId: string): string {
  const value = profileValue(profile, ['displayName', 'name', 'username'], '');
  if (!value || isUnsafePlayerDisplayName(value, targetUserId)) {
    return PLAYER_HUB_EMPTY_VALUE;
  }
  return value;
}

function replaceRowValue(row: string[], value: string): string[] {
  const next = [...row];
  next[1] = value;
  return next;
}

function fillDetailValues(
  rows: ShopRightDetailRowList | undefined,
  values: string[],
): ShopRightDetailRowList {
  return (rows ?? []).map((row, index) => ({
    ...row,
    value: values[index] ?? row.value,
  }));
}

function contentProduct(item: ShopStaticItem, productId: string, shopTab: ShopTab): ShopProduct {
  return {
    productId,
    productType: 'MARKETPLACE',
    displayName: item.title,
    description: item.subtitle,
    shopTab,
    badge: item.badge,
    benefits: item.benefits,
    availability: 'preview',
    priceLabel: item.price,
    active: true,
    currency: 'usd',
  };
}

function inventoryProduct(item: PlayerHubInventoryLike, index: number): ShopProduct | null {
  const title = readString(item.title, '');
  if (!title) return null;
  const subtitle = readString(item.itemType);
  return {
    productId: `player-hub-inventory-${readString(item.itemId, String(index))}`,
    productType: 'MARKETPLACE',
    displayName: title,
    description: subtitle,
    shopTab: 'Vault',
    badge: item.equipped ? 'Equipped' : undefined,
    availability: 'preview',
    priceLabel: `x${numberLabel(item.quantity)}`,
    active: true,
    currency: 'usd',
  };
}

function addContentItems(
  products: ShopProduct[],
  tab: ShopTab,
  items: ShopStaticItem[] | undefined,
  prefix: string,
  seen: Set<string>,
) {
  (items ?? []).forEach((item, index) => {
    const key = `${tab}:${item.title.trim().toLowerCase()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    products.push(contentProduct(item, `player-hub-${prefix}-${index}`, tab));
  });
}

function buildContentProducts(
  content: ShopPageContentData,
  inventoryItems: PlayerHubInventoryLike[],
): ShopProduct[] {
  const products: ShopProduct[] = [];
  const seen = new Set<string>();
  addContentItems(products, 'Treasury', content.creditPacks, 'treasury', seen);
  addContentItems(products, 'Treasury', content.sections.Treasury.featured, 'treasury-featured', seen);
  addContentItems(products, 'Elite', content.passes, 'elite', seen);
  addContentItems(products, 'Elite', content.sections.Elite.featured, 'elite-featured', seen);
  addContentItems(products, 'Vault', content.sections.Vault.featured, 'vault-featured', seen);
  addContentItems(products, 'Vault', content.sections.Vault.categories, 'vault-category', seen);
  addContentItems(products, 'Play Access', content.sections['Play Access'].featured, 'play-access', seen);
  addContentItems(products, 'Play Access', content.sections['Play Access'].categories, 'play-access-category', seen);
  addContentItems(products, 'Events', content.sections.Events.featured, 'events', seen);
  addContentItems(products, 'Events', content.sections.Events.categories, 'events-category', seen);
  inventoryItems.forEach((item, index) => {
    const product = inventoryProduct(item, index);
    if (product) products.push(product);
  });
  return products;
}

function competitionOwnedItems(items: PlayerHubInventoryLike[]): PlayerHubInventoryLike[] {
  return items.filter((item) => {
    const haystack = `${item.itemId} ${item.title ?? ''} ${item.itemType ?? ''}`.toLowerCase();
    return haystack.includes('ticket') || haystack.includes('pass') || haystack.includes('event') || haystack.includes('tournament');
  });
}

function dailyRewardStatus(dailyReward: PlayerHubDailyRewardLike | null | undefined): string {
  if (!dailyReward) return PLAYER_HUB_EMPTY_VALUE;
  if (dailyReward.available) return 'Ready';
  if (dailyReward.claimed) return 'Claimed';
  return 'Waiting';
}

function settingBooleanLabel(value: unknown): string {
  if (value === true) return 'Enabled';
  if (value === false) return 'Disabled';
  return PLAYER_HUB_EMPTY_VALUE;
}

function buildPlayerHubShopContent({
  authoredContent,
  controls,
  profileName,
  targetUserId,
  accountStatus,
  inventoryItems,
  marketplaceListings,
  gpBalance,
  acBalance,
  gamesPlayed,
  winRate,
  profileLevel,
  dailyReward,
  settings,
  learningProgress,
  performanceReport,
  serviceErrors,
  matchId,
}: {
  authoredContent?: PlayerHubPageContentData | null;
  controls: PlayerHubPageSvgControls;
  profileName: string;
  targetUserId: string;
  accountStatus: string;
  inventoryItems: PlayerHubInventoryLike[];
  marketplaceListings: PlayerHubMarketplaceLike[];
  gpBalance: string;
  acBalance: string;
  gamesPlayed: string;
  winRate: string;
  profileLevel: string;
  dailyReward?: PlayerHubDailyRewardLike | null;
  settings?: PlayerHubSettingsLike | null;
  learningProgress?: PlayerHubLearningProgressLike | null;
  performanceReport?: PlayerHubPerformanceReportLike | null;
  serviceErrors: string[];
  matchId?: string;
}): ShopPageContentData {
  const hubContent = normalizePlayerHubPageContent(authoredContent);
  const next = playerHubContentToShopContent(hubContent);
  const ownedCompetitionItems = competitionOwnedItems(inventoryItems);
  const dailyStatus = dailyRewardStatus(dailyReward);
  const learningAreas = learningProgress?.skill_areas ?? [];
  const safeProfileLevel = profileLevel === PLAYER_HUB_EMPTY_VALUE && performanceReport?.summary
    ? percentLabel(performanceReport.summary.win_rate)
    : profileLevel;

  const headerValues = {
    gp: gpBalance,
    ac: acBalance,
    ownedItems: String(inventoryItems.length),
    gamesPlayed,
    winRate,
    profileLevel,
  };
  next.headerStats = hubContent.headerMetrics.map((metric) => ({
    label: metric.label,
    value: headerValues[metric.key] ?? metric.fallbackValue,
  }));
  next.rightRows = {
    wallet: next.rightRows.wallet.map((row, index) => replaceRowValue(row, [gpBalance, acBalance, String(inventoryItems.length), String(marketplaceListings.length), accountStatus][index] ?? PLAYER_HUB_EMPTY_VALUE)),
    events: next.rightRows.events.map((row, index) => replaceRowValue(row, [String(ownedCompetitionItems.length), PLAYER_HUB_EMPTY_VALUE, PLAYER_HUB_EMPTY_VALUE][index] ?? PLAYER_HUB_EMPTY_VALUE)),
    recent: next.rightRows.recent.map((row, index) => replaceRowValue(row, [matchId ? shortAccountId(matchId) : gamesPlayed, dailyStatus, serviceErrors.length > 0 ? `${serviceErrors.length}` : PLAYER_HUB_EMPTY_VALUE][index] ?? PLAYER_HUB_EMPTY_VALUE)),
  };
  next.rightDetails = {
    account: fillDetailValues(next.rightDetails.account, [
      profileName,
      shortAccountId(targetUserId),
      profileName,
      readString(settings?.theme),
      settings?.notificationsEnabled === true || settings?.notifications === true ? 'Enabled' : settings?.notificationsEnabled === false || settings?.notifications === false ? 'Disabled' : PLAYER_HUB_EMPTY_VALUE,
      PLAYER_HUB_EMPTY_VALUE,
      'Private',
    ]),
    settings: fillDetailValues(next.rightDetails.settings ?? [], [
      readString(settings?.theme),
      settingBooleanLabel(settings?.notificationsEnabled ?? settings?.notifications),
      settingBooleanLabel(settings?.soundEnabled),
      readString(settings?.language),
      readString(settings?.preferredServerRegion),
      PLAYER_HUB_EMPTY_VALUE,
    ]),
    wallet: fillDetailValues(next.rightDetails.wallet, [
      gpBalance,
      acBalance,
      String(inventoryItems.length),
      String(marketplaceListings.length),
      accountStatus,
    ]),
    pass: fillDetailValues(next.rightDetails.pass, [
      learningAreas.length > 0 ? `${numberLabel(learningProgress?.overall_progress)}%` : PLAYER_HUB_EMPTY_VALUE,
      performanceReport?.summary ? 'Ready' : PLAYER_HUB_EMPTY_VALUE,
    ]),
    events: fillDetailValues(next.rightDetails.events, [
      String(ownedCompetitionItems.length),
      ownedCompetitionItems.length > 0 ? String(ownedCompetitionItems.length) : PLAYER_HUB_EMPTY_VALUE,
    ]),
    recent: fillDetailValues(next.rightDetails.recent, [
      matchId ? shortAccountId(matchId) : gamesPlayed,
      dailyStatus,
      serviceErrors.length > 0 ? `${serviceErrors.length}` : PLAYER_HUB_EMPTY_VALUE,
    ]),
    ai: fillDetailValues(next.rightDetails.ai ?? [], [
      PLAYER_HUB_EMPTY_VALUE,
      PLAYER_HUB_EMPTY_VALUE,
      PLAYER_HUB_EMPTY_VALUE,
      PLAYER_HUB_EMPTY_VALUE,
    ]),
  };
  next.uiCopy = {
    ...next.uiCopy,
    header: {
      ...next.uiCopy.header,
      title: controls.header.title || next.uiCopy.header.title,
      subtitle: controls.header.showSubtitle ? controls.header.subtitle : next.uiCopy.header.subtitle,
    },
    rightPanel: {
      ...next.uiCopy.rightPanel,
      profileName,
      profileElo: safeProfileLevel,
    },
  };
  next.infoDetails = {
    ...next.infoDetails,
    eliteBenefits: {
      ...next.infoDetails.eliteBenefits,
      tiers: next.infoDetails.eliteBenefits.tiers.map((tier, index) => ({
        ...tier,
        price: [
          learningAreas.length > 0 ? `${learningAreas.length}` : PLAYER_HUB_EMPTY_VALUE,
          performanceReport?.summary ? 'Ready' : PLAYER_HUB_EMPTY_VALUE,
          learningProgress?.recommendations?.length ? `${learningProgress.recommendations.length}` : PLAYER_HUB_EMPTY_VALUE,
        ][index] ?? tier.price,
      })),
    },
  };
  return next;
}

function visibilityValue(value: unknown): 'public' | 'friends' | 'private' {
  return value === 'public' || value === 'friends' || value === 'private' ? value : 'private';
}

function themeValue(value: unknown): '' | 'light' | 'dark' | 'auto' {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : '';
}

function boolValue(value: unknown): '' | 'true' | 'false' {
  if (value === true || value === 'true') return 'true';
  if (value === false || value === 'false') return 'false';
  return '';
}

function playerHubDetailPanelRect({ x, y, w, h }: Pick<ShopRightDetailRenderProps, 'x' | 'y' | 'w' | 'h'>) {
  const body = mainBottomOverlayContentRect(x, y, w, h, false);
  const pad = Math.max(10, Math.min(18, body.w * 0.012));
  return {
    x: body.x + pad,
    y: body.y + pad,
    w: Math.max(260, body.w - pad * 2),
    h: Math.max(160, body.h - pad * 2),
  };
}

function PlayerHubProfileEditor({
  profile,
  targetUserId,
  x,
  y,
  w,
  h,
  content,
  onClose,
  onUpdateProfile,
}: Pick<ShopRightDetailRenderProps, 'x' | 'y' | 'w' | 'h' | 'content' | 'onClose'> & {
  profile: PlayerHubRecord | null;
  targetUserId: string;
  onUpdateProfile?: PlayerHubPageSvgSurfaceProps['onUpdateProfile'];
}) {
  const safeProfileName = playerProfileLabel(profile, targetUserId);
  const initialDisplayName = safeProfileName === PLAYER_HUB_EMPTY_VALUE ? '' : safeProfileName;
  const initialBio = profileValue(profile, ['bio'], '');
  const initialVisibility = visibilityValue(profile?.visibility);
  const initialCustomTitle = profileValue(profile, ['customTitle'], '');
  const initialProfileTheme = profileValue(profile, ['profileTheme'], '');
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [customTitle, setCustomTitle] = useState(initialCustomTitle);
  const [profileTheme, setProfileTheme] = useState(initialProfileTheme);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const panel = playerHubDetailPanelRect({ x, y, w, h });

  const handleApply = async () => {
    if (!onUpdateProfile) {
      setStatus('Profile updates are not connected in this runtime.');
      return;
    }
    const { patch, error, hasChanges } = buildPlayerHubProfileUpdatePatch(
      {
        displayName: initialDisplayName,
        bio: initialBio,
        visibility: initialVisibility,
        customTitle: initialCustomTitle,
        profileTheme: initialProfileTheme,
      },
      {
        displayName,
        bio,
        visibility,
        customTitle,
        profileTheme,
      },
      targetUserId,
    );
    if (error) {
      setStatus(error);
      return;
    }
    if (!hasChanges) {
      setStatus('No editable profile changes to apply.');
      return;
    }
    setSaving(true);
    try {
      const result = await onUpdateProfile(patch);
      setStatus(typeof result === 'string' && result.trim() ? result : 'Profile changes applied.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <g>
      <MainBottom x={x} y={y} w={w} h={h} label="PROFILE & IDENTITY" rightActionLabel={content.uiCopy.actions.backToShop} onRightAction={onClose} showHeaderCount={false} showNavigation={false} />
      <path d={lobbyRoundedRectPath(panel.x, panel.y, panel.w, panel.h, 8)} fill="rgba(5,22,34,.84)" stroke="#54e2ff" strokeWidth="1.1" strokeOpacity="0.48" />
      <foreignObject x={panel.x + 18} y={panel.y + 16} width={panel.w - 36} height={panel.h - 32}>
        <form className="player-hub-edit-panel" onSubmit={(event) => { event.preventDefault(); void handleApply(); }}>
          <div className="player-hub-edit-panel__head">
            <h2>Profile & Identity</h2>
            <span>{shortAccountId(targetUserId)}</span>
          </div>
          <div className="player-hub-edit-panel__grid">
            <label>
              Display name
              <input value={displayName} maxLength={128} onChange={event => setDisplayName(event.target.value)} placeholder="Not set" />
            </label>
            <label>
              Visibility
              <select value={visibility} onChange={event => setVisibility(visibilityValue(event.target.value))}>
                <option value="private">Private</option>
                <option value="friends">Friends</option>
                <option value="public">Public</option>
              </select>
            </label>
            <label>
              Custom title
              <input value={customTitle} maxLength={128} onChange={event => setCustomTitle(event.target.value)} placeholder="Not set" />
            </label>
            <label>
              Profile theme
              <input value={profileTheme} maxLength={64} onChange={event => setProfileTheme(event.target.value)} placeholder="Not set" />
            </label>
            <label className="player-hub-edit-panel__wide">
              Bio
              <textarea value={bio} maxLength={512} onChange={event => setBio(event.target.value)} placeholder="Not set" />
            </label>
          </div>
          <div className="player-hub-edit-panel__readonly">
            <span>Email: {profileValue(profile, ['email'])}</span>
            <span>Account ID is private and cannot be edited.</span>
          </div>
          <div className="player-hub-edit-panel__actions">
            <span>{status}</span>
            <button type="submit" disabled={saving}>{saving ? 'Applying...' : 'Apply Profile'}</button>
          </div>
        </form>
      </foreignObject>
    </g>
  );
}

function PlayerHubSettingsEditor({
  settings,
  x,
  y,
  w,
  h,
  content,
  onClose,
  onUpdateSettings,
}: Pick<ShopRightDetailRenderProps, 'x' | 'y' | 'w' | 'h' | 'content' | 'onClose'> & {
  settings?: PlayerHubSettingsLike | null;
  onUpdateSettings?: PlayerHubPageSvgSurfaceProps['onUpdateSettings'];
}) {
  const initialTheme = themeValue(settings?.theme);
  const initialNotifications = boolValue(settings?.notificationsEnabled ?? settings?.notifications);
  const initialSound = boolValue(settings?.soundEnabled);
  const initialLanguage = readString(settings?.language, '');
  const initialRegion = readString(settings?.preferredServerRegion, '');
  const [theme, setTheme] = useState(initialTheme);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [sound, setSound] = useState(initialSound);
  const [language, setLanguage] = useState(initialLanguage);
  const [region, setRegion] = useState(initialRegion);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const panel = playerHubDetailPanelRect({ x, y, w, h });

  const handleApply = async () => {
    if (!onUpdateSettings) {
      setStatus('Settings updates are not connected in this runtime.');
      return;
    }
    const { patch, hasChanges } = buildPlayerHubSettingsUpdatePatch(
      {
        theme: initialTheme,
        notifications: initialNotifications,
        sound: initialSound,
        language: initialLanguage,
        region: initialRegion,
      },
      {
        theme,
        notifications,
        sound,
        language,
        region,
      },
    );
    if (!hasChanges) {
      setStatus('No editable settings changes to apply.');
      return;
    }
    setSaving(true);
    try {
      const result = await onUpdateSettings(patch);
      setStatus(typeof result === 'string' && result.trim() ? result : 'Settings changes applied.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Settings update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <g>
      <MainBottom x={x} y={y} w={w} h={h} label="SETTINGS & PRIVACY" rightActionLabel={content.uiCopy.actions.backToShop} onRightAction={onClose} showHeaderCount={false} showNavigation={false} />
      <path d={lobbyRoundedRectPath(panel.x, panel.y, panel.w, panel.h, 8)} fill="rgba(5,22,34,.84)" stroke="#ffd36a" strokeWidth="1.1" strokeOpacity="0.5" />
      <foreignObject x={panel.x + 18} y={panel.y + 16} width={panel.w - 36} height={panel.h - 32}>
        <form className="player-hub-edit-panel player-hub-edit-panel--settings" onSubmit={(event) => { event.preventDefault(); void handleApply(); }}>
          <div className="player-hub-edit-panel__head">
            <h2>Settings & Privacy</h2>
            <span>Editable account preferences only</span>
          </div>
          <div className="player-hub-edit-panel__grid">
            <label>
              Theme
              <select value={theme} onChange={event => setTheme(themeValue(event.target.value))}>
                <option value="">Not set</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </label>
            <label>
              Notifications
              <select value={notifications} onChange={event => setNotifications(boolValue(event.target.value))}>
                <option value="">Not set</option>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </label>
            <label>
              Sound
              <select value={sound} onChange={event => setSound(boolValue(event.target.value))}>
                <option value="">Not set</option>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </label>
            <label>
              Language
              <input value={language} maxLength={16} onChange={event => setLanguage(event.target.value)} placeholder="Not set" />
            </label>
            <label>
              Server region
              <input value={region} maxLength={32} onChange={event => setRegion(event.target.value)} placeholder="Not set" />
            </label>
          </div>
          <div className="player-hub-edit-panel__readonly">
            <span>AI, API, local server, browser model, and inference settings open in Settings.</span>
            <span>Settings here only apply account preferences that this form can update.</span>
          </div>
          <div className="player-hub-edit-panel__actions">
            <span>{status}</span>
            <button type="submit" disabled={saving}>{saving ? 'Applying...' : 'Apply Settings'}</button>
          </div>
        </form>
      </foreignObject>
    </g>
  );
}

function PlayerHubAiSettingsDetailPanel({
  x,
  y,
  w,
  h,
  content,
  onClose,
  onRefresh,
  renderAiSettingsDetail,
}: Pick<ShopRightDetailRenderProps, 'x' | 'y' | 'w' | 'h' | 'content' | 'onClose'> & {
  onRefresh: PlayerHubPageSvgSurfaceProps['onRefresh'];
  renderAiSettingsDetail?: PlayerHubPageSvgSurfaceProps['renderAiSettingsDetail'];
}) {
  const panel = playerHubDetailPanelRect({ x, y, w, h });

  return (
    <g>
      <MainBottom x={x} y={y} w={w} h={h} label="AI SETUP" rightActionLabel={content.uiCopy.actions.backToShop} onRightAction={onClose} showHeaderCount={false} showNavigation={false} />
      <path d={lobbyRoundedRectPath(panel.x, panel.y, panel.w, panel.h, 8)} fill="rgba(5,22,34,.84)" stroke="#20e39d" strokeWidth="1.1" strokeOpacity="0.5" />
      <foreignObject x={panel.x + 18} y={panel.y + 16} width={panel.w - 36} height={panel.h - 32}>
        {renderAiSettingsDetail ? (
          renderAiSettingsDetail({ onClose, onRefresh })
        ) : (
          <div className="player-hub-data-panel player-hub-data-panel--ai">
            <div className="player-hub-data-panel__head">
              <h2>AI Setup</h2>
              <span>Open Settings in the main app to configure live AI settings.</span>
            </div>
            <div className="player-hub-data-panel__rows">
              {(content.rightDetails.ai ?? []).map(row => (
                <div key={`${row.label}:${row.detail}`} className="player-hub-data-panel__row">
                  <strong>{row.label}</strong>
                  <span>{row.value || PLAYER_HUB_EMPTY_VALUE}</span>
                  <em>{row.detail}</em>
                </div>
              ))}
            </div>
            <div className="player-hub-data-panel__actions">
              <span>Runtime controls are injected by the main app.</span>
              <button type="button" onClick={onRefresh}>Refresh</button>
            </div>
          </div>
        )}
      </foreignObject>
    </g>
  );
}

function detailPanelRows(active: ShopRightDetailRenderProps['active'], content: ShopPageContentData): Array<{ label: string; value: string; detail: string }> {
  if (active === 'ai') {
    return content.rightDetails.ai ?? [];
  }
  if (active === 'wallet') {
    return content.rightRows.wallet.map((row, index) => ({
      label: row[0],
      value: row[1] ?? PLAYER_HUB_EMPTY_VALUE,
      detail: content.rightDetails.wallet[index]?.detail ?? '',
    }));
  }
  if (active === 'events') {
    return content.rightRows.events.map((row, index) => ({
      label: row[0],
      value: row[1] ?? PLAYER_HUB_EMPTY_VALUE,
      detail: content.rightDetails.events[index]?.detail ?? '',
    }));
  }
  if (active === 'recent') {
    return content.rightRows.recent.map((row, index) => ({
      label: row[0],
      value: row[1] ?? PLAYER_HUB_EMPTY_VALUE,
      detail: content.rightDetails.recent[index]?.detail ?? '',
    }));
  }
  return content.rightDetails[active] ?? [];
}

function detailPanelTitle(active: ShopRightDetailRenderProps['active'], content: ShopPageContentData): string {
  if (active === 'ai') return content.rightTabs.find(tab => tab.id === 'ai')?.title ?? 'AI SETUP';
  if (active === 'wallet') return content.uiCopy.rightPanel.walletTitle;
  if (active === 'pass') return content.uiCopy.rightPanel.passTitle;
  if (active === 'events') return content.uiCopy.rightPanel.eventsTitle;
  if (active === 'recent') return content.uiCopy.rightPanel.recentTitle;
  return content.uiCopy.rightPanel.accountTitle;
}

function detailPanelSubtitle(active: ShopRightDetailRenderProps['active'], content: ShopPageContentData): string {
  if (active === 'ai') return 'Cloud API keys, local endpoints, browser-local models, and inference preferences open in Settings.';
  if (active === 'wallet') return content.infoDetails.arenaCredits.subtitle;
  if (active === 'pass') return content.infoDetails.eliteBenefits.subtitle;
  if (active === 'events') return 'Owned tickets, passes, check-ins, and official records appear only when account services return them.';
  if (active === 'recent') return content.uiCopy.earnRewards.subtitle;
  return '';
}

function PlayerHubDataDetailPanel({
  active,
  x,
  y,
  w,
  h,
  content,
  onClose,
  onShop,
  onCompetition,
  onRefresh,
  onClaimDailyReward,
  dailyReward,
  serviceErrors,
}: Pick<ShopRightDetailRenderProps, 'active' | 'x' | 'y' | 'w' | 'h' | 'content' | 'onClose'> & {
  onShop: PlayerHubPageSvgSurfaceProps['onShop'];
  onCompetition?: PlayerHubPageSvgSurfaceProps['onCompetition'];
  onRefresh: PlayerHubPageSvgSurfaceProps['onRefresh'];
  onClaimDailyReward?: PlayerHubPageSvgSurfaceProps['onClaimDailyReward'];
  dailyReward?: PlayerHubDailyRewardLike | null;
  serviceErrors: string[];
}) {
  const [status, setStatus] = useState('');
  const [claiming, setClaiming] = useState(false);
  const panel = playerHubDetailPanelRect({ x, y, w, h });
  const rows = detailPanelRows(active, content);
  const title = detailPanelTitle(active, content);
  const subtitle = detailPanelSubtitle(active, content);
  const canClaim = active === 'recent' && dailyReward?.available === true;

  const handleClaim = async () => {
    if (!onClaimDailyReward) {
      setStatus('Daily reward claim is not connected in this runtime.');
      return;
    }
    setClaiming(true);
    try {
      const result = await onClaimDailyReward();
      setStatus(typeof result === 'string' && result.trim() ? result : 'Daily reward claimed.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Daily reward claim failed.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <g>
      <MainBottom x={x} y={y} w={w} h={h} label={title} rightActionLabel={content.uiCopy.actions.backToShop} onRightAction={onClose} showHeaderCount={false} showNavigation={false} />
      <path d={lobbyRoundedRectPath(panel.x, panel.y, panel.w, panel.h, 8)} fill="rgba(5,22,34,.84)" stroke="#54e2ff" strokeWidth="1.1" strokeOpacity="0.48" />
      <foreignObject x={panel.x + 18} y={panel.y + 16} width={panel.w - 36} height={panel.h - 32}>
        <div className={`player-hub-data-panel player-hub-data-panel--${active}`}>
          <div className="player-hub-data-panel__head">
            <h2>{title}</h2>
            <span>{subtitle}</span>
          </div>
          <div className="player-hub-data-panel__rows">
            {rows.map(row => (
              <div key={`${row.label}:${row.detail}`} className="player-hub-data-panel__row">
                <strong>{row.label}</strong>
                <span>{row.value || PLAYER_HUB_EMPTY_VALUE}</span>
                <em>{row.detail}</em>
              </div>
            ))}
            {active === 'recent' && serviceErrors.length > 0 && (
              <div className="player-hub-data-panel__row player-hub-data-panel__row--warning">
                <strong>Service warnings</strong>
                <span>{serviceErrors.length}</span>
                <em>{serviceErrors.slice(0, 3).join(' | ')}</em>
              </div>
            )}
          </div>
          <div className="player-hub-data-panel__actions">
            <span>{status || (active === 'recent' ? `Daily reward: ${dailyRewardStatus(dailyReward)}` : '')}</span>
            {active === 'wallet' && <button type="button" onClick={onShop}>Open Shop</button>}
            {active === 'events' && <button type="button" onClick={onCompetition ?? onRefresh}>Open Competition</button>}
            {active === 'recent' && <button type="button" disabled={!canClaim || claiming} onClick={() => { void handleClaim(); }}>{claiming ? 'Claiming...' : content.uiCopy.actions.claimFree}</button>}
            <button type="button" onClick={onRefresh}>Refresh</button>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

function productIntent(product: ShopProduct): string {
  return `${product.productId} ${product.displayName} ${product.description ?? ''} ${product.badge ?? ''} ${product.priceLabel ?? ''}`.toLowerCase();
}

export function PlayerHubPageSvgSurface({
  loading,
  error,
  targetUserId,
  profile,
  inventoryItems,
  marketplaceListings,
  creditBalance,
  dailyReward,
  settings,
  playerStats,
  learningProgress,
  performanceReport,
  serviceErrors = [],
  initialTab,
  matchId,
  controls,
  content: authoredContent,
  onRefresh,
  onShop,
  onPlay,
  onLobby,
  onCompetition,
  onUpdateProfile,
  onUpdateSettings,
  onClaimDailyReward,
  renderAiSettingsDetail,
}: PlayerHubPageSvgSurfaceProps) {
  const normalizedControls = useMemo(() => normalizePlayerHubPageSvgControls(controls), [controls]);
  const routeRenderTab = PLAYER_HUB_RENDER_TAB_BY_SECTION[initialTab ?? normalizedControls.defaultTab];
  const [renderTabState, setRenderTabState] = useState<{ routeTab: ShopTab; tab: ShopTab | null }>({
    routeTab: routeRenderTab,
    tab: null,
  });
  const activeRenderTab = renderTabState.routeTab === routeRenderTab && renderTabState.tab ? renderTabState.tab : routeRenderTab;
  const profileName = playerProfileLabel(profile, targetUserId);
  const accountStatus = profileValue(profile, ['accountType', 'status']);
  const avatarUrl = profileValue(profile, ['avatarUrl', 'photoURL', 'photoUrl'], '');
  const gpBalance = numberLabel(creditBalance?.gp_balance ?? playerStats?.credits?.gp_balance);
  const acBalance = numberLabel(creditBalance?.ac_balance ?? playerStats?.credits?.ac_balance);
  const profileLevel = profileValue(profile, ['level', 'rank', 'rating']);
  const gamesPlayed = numberLabel(playerStats?.stats?.total_games ?? profile?.totalGamesPlayed ?? profile?.gamesPlayed ?? profile?.matchesPlayed ?? profile?.totalMatches);
  const winRate = percentLabel(playerStats?.stats?.win_rate ?? profile?.winRate);
  const playerHubRenderContent = useMemo(() => buildPlayerHubShopContent({
    authoredContent,
    controls: normalizedControls,
    profileName,
    targetUserId,
    accountStatus,
    inventoryItems,
    marketplaceListings,
    gpBalance,
    acBalance,
    gamesPlayed,
    winRate,
    profileLevel,
    dailyReward,
    settings,
    learningProgress,
    performanceReport,
    serviceErrors,
    matchId,
  }), [accountStatus, acBalance, authoredContent, dailyReward, gamesPlayed, gpBalance, inventoryItems, learningProgress, marketplaceListings, matchId, normalizedControls, performanceReport, profileLevel, profileName, serviceErrors, settings, targetUserId, winRate]);
  const renderProducts = useMemo(
    () => buildContentProducts(playerHubRenderContent, inventoryItems),
    [inventoryItems, playerHubRenderContent],
  );
  const accountSummary = useMemo<ShopAccountSummary>(() => ({
    displayName: profileName,
    email: profileValue(profile, ['email'], ''),
    photoUrl: avatarUrl,
    eloRating: readNumber(profile?.rating ?? profile?.eloRating) ?? undefined,
    gamesPlayed: readNumber(playerStats?.stats?.total_games ?? profile?.gamesPlayed ?? profile?.matchesPlayed ?? profile?.totalMatches) ?? undefined,
    winRate: readNumber(playerStats?.stats?.win_rate ?? profile?.winRate) ?? undefined,
    isGuest: !targetUserId,
  }), [avatarUrl, playerStats, profile, profileName, targetUserId]);

  const handleTabChange = (tab: ShopTab) => {
    setRenderTabState({ routeTab: routeRenderTab, tab });
  };

  const handleBuy = (product: ShopProduct) => {
    const intent = productIntent(product);
    if (intent.includes('open shop') || intent.includes('checkout')) {
      onShop();
      return;
    }
    if (intent.includes('room handoff') || intent.includes('game-specific handoff')) {
      onLobby?.();
      return;
    }
    if (product.shopTab === 'Events' || intent.includes('open competition')) {
      onCompetition?.();
      return;
    }
    if (intent.includes('browse games')) {
      onPlay?.();
      return;
    }
    onRefresh();
  };

  const renderRightDetail = (props: ShopRightDetailRenderProps) => {
    if (props.active === 'account') {
      return (
        <PlayerHubProfileEditor
          key={`${targetUserId}:${profileValue(profile, ['displayName'], '')}:${profileValue(profile, ['bio'], '')}:${profileValue(profile, ['visibility'], '')}:${profileValue(profile, ['customTitle'], '')}:${profileValue(profile, ['profileTheme'], '')}`}
          {...props}
          profile={profile}
          targetUserId={targetUserId}
          onUpdateProfile={onUpdateProfile}
        />
      );
    }
    if (props.active === 'settings') {
      return (
        <PlayerHubSettingsEditor
          key={`${readString(settings?.theme, '')}:${boolValue(settings?.notificationsEnabled ?? settings?.notifications)}:${boolValue(settings?.soundEnabled)}:${readString(settings?.language, '')}:${readString(settings?.preferredServerRegion, '')}`}
          {...props}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );
    }
    if (props.active === 'ai') {
      return (
        <PlayerHubAiSettingsDetailPanel
          {...props}
          onRefresh={onRefresh}
          renderAiSettingsDetail={renderAiSettingsDetail}
        />
      );
    }
    if (props.active === 'wallet' || props.active === 'pass' || props.active === 'events' || props.active === 'recent') {
      return (
        <PlayerHubDataDetailPanel
          {...props}
          onShop={onShop}
          onCompetition={onCompetition}
          onRefresh={onRefresh}
          onClaimDailyReward={onClaimDailyReward}
          dailyReward={dailyReward}
          serviceErrors={serviceErrors}
        />
      );
    }
    return null;
  };

  return (
    <ShopPageSvgSurface
      activeTab={activeRenderTab}
      products={renderProducts}
      loadingProducts={loading}
      loadingId={null}
      error={error}
      acBalance={readNumber(creditBalance?.ac_balance)}
      onTabChange={handleTabChange}
      onClearError={onRefresh}
      onBuy={handleBuy}
      content={playerHubRenderContent}
      accountSummary={accountSummary}
      renderRightDetail={renderRightDetail}
      chrome={{
        ariaLabel: 'Player Hub account dashboard page layout',
        headerIcon: 'crown',
        balanceIcon: 'ac',
        productTileMode: 'programs',
        programsTopCardAction: 'right-detail',
        showHeaderIcon: false,
        showHeaderPanel: false,
        showHeaderBadges: false,
        showHeaderSubtitle: false,
        showHeaderBalance: false,
        showTopStats: false,
        showRightPanel: true,
        showEarnPanel: false,
        showFooter: true,
        showMainHeaderCount: false,
        showMainTopRightAction: false,
        sideInfoItemKey: activeRenderTab,
      }}
    />
  );
}
