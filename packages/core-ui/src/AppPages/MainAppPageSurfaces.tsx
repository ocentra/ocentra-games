import { useMemo, useState, type ReactNode } from 'react';
import { AppPageSvgSurface } from './AppPageSvgSurface';
import { LeaderboardPageSvgSurface } from './Leaderboard/LeaderboardPageSvgSurface';
import { LobbyPageSvgSurface } from './Lobby/LobbyPageSvgSurface';
import {
  PlayerHubPageSvgSurface,
  type PlayerHubAiSettingsDetailRenderProps,
  type PlayerHubCreditBalance,
  type PlayerHubDailyRewardLike,
  type PlayerHubLearningProgressLike,
  type PlayerHubPerformanceReportLike,
  type PlayerHubPlayerStatsLike,
  type PlayerHubSettingsLike,
} from './PlayerHub/PlayerHubPageSvgSurface';
import type {
  PlayerHubProfileUpdatePatch,
  PlayerHubSettingsUpdatePatch,
} from './PlayerHub/PlayerHubPageUpdatePatches';
import { ShopPageSvgSurface } from './Shop/ShopPageSvgSurface';
import { SocialWorldSurface } from './SocialWorld/SocialWorldSurface';
import type {
  AppPageSvgAction,
  AppPageSvgControls,
  AppPageSvgPanel,
} from './AppPageSvgSurfaceControls';
import type { SocialWorldPresence, SocialWorldQuickGame } from './SocialWorld/SocialWorldTypes';
import type { ShopPaymentProvider } from '@ocentra/endpoint-domain/schemas/shop';
import type {
  CompetitionCheckInResponse,
  CompetitionProgram,
  CompetitionProgramType,
  CompetitionRegistrationResponse,
} from '@ocentra/endpoint-domain/schemas/competition';
import type { LeaderboardPageMode } from './Leaderboard/LeaderboardPageSvgSurface';
import type { PartialLeaderboardPageContentData } from './Leaderboard/LeaderboardPageSvgContent';
import type { LeaderboardPageSvgControls } from './Leaderboard/LeaderboardPageSvgSurfaceControls';
import type { LobbyPageSvgControls } from './Lobby/LobbyPageSvgSurfaceControls';
import type {
  PlayerHubPageSvgControls,
  PlayerHubTabId,
} from './PlayerHub/PlayerHubPageSvgSurfaceControls';
import type { ShopPageSvgControls } from './Shop/ShopPageSvgSurfaceControls';
import {
  normalizeShopPageContent,
  type ShopPageContentData,
} from './Shop/ShopPageSvgContent';
import type { PlayerHubPageContentData } from './PlayerHub/PlayerHubPageSvgContent';
import {
  shopPageEventBundleImageUrl,
  shopPageWeeklyCupImageUrl,
} from '@ocentra/app-assets/shop-page';
import type {
  ShopAccountSummary,
  ShopDeckImageResolver,
  ShopPaymentPrompt,
  ShopProduct,
  ShopTab,
  ShopVaultDeckPreviewItem,
} from './Shop/ShopPageSvgTypes';
import type {
  LobbyAddAISeatDraft,
  LobbyCreateRoomDraft,
  LobbyChatMessageItem,
  LobbyFriendItem,
  LobbyHeroMedia,
  LobbyJoinCodeDraft,
  LobbyNavigationTarget,
  LobbyPartyStatus,
  LobbyQuickJoinDraft,
  LobbyRewardStatus,
  LobbyRoomListFilterDraft,
  LobbyRoomPlayer,
  LobbyServerStatus,
  LobbyUserSummary,
} from './Lobby/LobbyPageSvgTypes';
export type {
  AppPageSvgAction,
  AppPageSvgControls,
  AppPageSvgMetric,
  AppPageSvgPanel,
} from './AppPageSvgSurfaceControls';
export type {
  LeaderboardPageMode,
  LeaderboardPageRow,
} from './Leaderboard/LeaderboardPageSvgSurface';
export type { LeaderboardPageSvgControls } from './Leaderboard/LeaderboardPageSvgSurfaceControls';
export type { LobbyPageSvgControls } from './Lobby/LobbyPageSvgSurfaceControls';
export type {
  PlayerHubPageSvgControls,
  PlayerHubTabId,
} from './PlayerHub/PlayerHubPageSvgSurfaceControls';
export type { PlayerHubCreditBalance } from './PlayerHub/PlayerHubPageSvgSurface';
export type { PlayerHubAiSettingsDetailRenderProps } from './PlayerHub/PlayerHubPageSvgSurface';
export type { ShopPageSvgControls } from './Shop/ShopPageSvgSurfaceControls';
export type CompetitionPageSvgControls = ShopPageSvgControls;
export { SocialWorldSurface } from './SocialWorld/SocialWorldSurface';
export type { SocialWorldPresence, SocialWorldQuickGame } from './SocialWorld/SocialWorldTypes';
export type {
  ShopAccountSummary,
  ShopDeckImageResolver,
  ShopPaymentPrompt,
  ShopProduct,
  ShopTab,
  ShopVaultDeckPreviewItem,
} from './Shop/ShopPageSvgTypes';
export type {
  LobbyAddAISeatDraft,
  LobbyChatMessageItem,
  LobbyCreateRoomDraft,
  LobbyFriendItem,
  LobbyHeroMedia,
  LobbyJoinCodeDraft,
  LobbyNavigationTarget,
  LobbyPartyStatus,
  LobbyQuickJoinDraft,
  LobbyRewardStatus,
  LobbyRoomListFilterDraft,
  LobbyServerStatus,
} from './Lobby/LobbyPageSvgTypes';

export type SocialFriend = { friendId: string };
export type SocialPartyMember = { userId: string };
export type SocialMessage = { messageId: string; senderId: string; content: string };
export type SocialNotification = { id: string; type: string; title: string; body: string; read: boolean };
export type SocialFeedItem = { id: string; type: string; payload: Record<string, unknown> };

export type LeaderboardRow = {
  user_id: string;
  rank: number;
  score: number;
  wins?: number;
  losses?: number;
  bestGame?: string;
  game_type?: number;
  scope?: 'overall' | 'game' | 'category' | 'aiOverall' | 'aiGame' | 'aiCategory' | 'tournament' | 'friends';
  category?: string;
  subcategory?: string;
  trend?: string;
  tone?: 'cyan' | 'gold' | 'purple' | 'red' | 'muted';
};

export type TournamentRound = {
  round: number;
  matches?: unknown[];
};

export type PlayerHubProfile = Record<string, unknown>;
export type PlayerHubInventoryItem = { itemId: string; quantity: number; title?: string; itemType?: string };
export type PlayerHubMarketplaceListing = { id: string; title: string };

export type AdminUserRow = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  isAdmin: boolean;
  lastLogin?: string | number | Date | null;
};

export type AdminActivityRow = {
  adminEmail: string;
  targetEmail: string;
  action: 'grant' | 'revoke';
  timestamp: string | number | Date;
};

export type CompetitionPageMode =
  | 'competition'
  | 'events'
  | 'eventDetail'
  | 'tournaments'
  | 'tournamentDetail'
  | 'leaderboard'
  | 'gameLeaderboard'
  | 'aiBenchmarkLeaderboard'
  | 'matches'
  | 'matchDetail';

export type LobbyRoomLike = {
  roomId?: string;
  roomName?: string;
  roomType?: string;
  gameType?: string;
  mode?: string;
  visibility?: string;
  currentPlayers?: number;
  currentSpectators?: number;
  maxPlayers?: number;
  isPrivate?: boolean;
  gameStatus?: string;
  status?: string;
  hostId?: string;
  joinCode?: string;
  allowAI?: boolean;
  aiCount?: number;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: string;
  aiRole?: string;
  coachEnabled?: boolean;
  coachModelId?: string;
  guideMode?: string;
  allowSpectators?: boolean;
  stakeType?: string;
  stakeAmount?: number;
  stakeStatus?: string;
  stakeEscrowId?: string;
  chainStatus?: string;
  turnTimerSeconds?: number;
  region?: string;
  matchId?: string;
  stateVersion?: number;
  viewerJoined?: boolean;
  viewerSpectating?: boolean;
  players?: LobbyRoomPlayer[];
  createdAt?: number;
};

export type MatchmakingTicketLike = {
  ticketId?: string;
  queuePosition?: number;
  estimatedWaitMs?: number;
};

export type MatchmakingStatusLike = {
  status?: string;
  matchId?: string;
  queuePosition?: number;
};

type AppPageSurfaceControlProps = {
  layoutControls?: Partial<AppPageSvgControls> | null;
};

type LobbyPageSurfaceControlProps = {
  layoutControls?: Partial<LobbyPageSvgControls> | null;
};

type LeaderboardPageSurfaceControlProps = {
  leaderboardControls?: Partial<LeaderboardPageSvgControls> | null;
  leaderboardContent?: PartialLeaderboardPageContentData | null;
};

type CompetitionPageSurfaceControlProps = {
  competitionControls?: Partial<CompetitionPageSvgControls> | null;
  competitionContent?: Partial<ShopPageContentData> | null;
};

type PlayerHubPageSurfaceControlProps = {
  playerHubControls?: Partial<PlayerHubPageSvgControls> | null;
  playerHubContent?: PlayerHubPageContentData | null;
  renderAiSettingsDetail?: (props: PlayerHubAiSettingsDetailRenderProps) => ReactNode;
};

type ShopPageSurfaceControlProps = {
  layoutControls?: Partial<ShopPageSvgControls> | null;
  shopContent: ShopPageContentData;
  vaultDecks?: ShopVaultDeckPreviewItem[];
  resolveDeckImageUrl?: ShopDeckImageResolver;
  onVaultDeckInspect?: (deck: ShopVaultDeckPreviewItem) => void;
  accountSummary?: ShopAccountSummary | null;
};

function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleDateString();
}

function noopAction(label: string): AppPageSvgAction {
  return { label };
}

function isLeaderboardPageMode(pageMode: CompetitionPageMode): pageMode is LeaderboardPageMode {
  return pageMode === 'leaderboard' || pageMode === 'gameLeaderboard' || pageMode === 'aiBenchmarkLeaderboard';
}

function competitionShopTabForPageMode(pageMode: CompetitionPageMode): ShopTab {
  if (pageMode === 'tournaments' || pageMode === 'tournamentDetail') return 'Play Access';
  if (pageMode === 'events' || pageMode === 'eventDetail') return 'Events';
  return 'Elite';
}

const COMPETITION_STATUS_LABELS: Record<CompetitionProgram['status'], string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  registration_open: 'Registration open',
  registration_closed: 'Registration closed',
  check_in: 'Check-in open',
  live: 'Live now',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function competitionDateTimeLabel(value?: string): string {
  if (!value) return 'Schedule pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Schedule pending';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function competitionShortDateLabel(value?: string): string {
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function competitionCapacityLabel(program: CompetitionProgram): string {
  const registered = program.stats.registered ?? 0;
  return typeof program.stats.capacity === 'number'
    ? `${registered}/${program.stats.capacity} registered`
    : `${registered} registered`;
}

function orderedCompetitionPrograms(
  programs: CompetitionProgram[],
  featuredProgramId?: string | null,
  selectedProgramId?: string | null,
): CompetitionProgram[] {
  return [...programs].sort((a, b) => {
    const aSelected = selectedProgramId && a.programId === selectedProgramId ? 1 : 0;
    const bSelected = selectedProgramId && b.programId === selectedProgramId ? 1 : 0;
    if (aSelected !== bSelected) return bSelected - aSelected;
    const aFeatured = (featuredProgramId && a.programId === featuredProgramId) || a.featured ? 1 : 0;
    const bFeatured = (featuredProgramId && b.programId === featuredProgramId) || b.featured ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    return new Date(a.lifecycle.startsAt).getTime() - new Date(b.lifecycle.startsAt).getTime();
  });
}

function featuredCompetitionPrograms(programs: CompetitionProgram[], featuredProgramId?: string | null): CompetitionProgram[] {
  const featured = programs.filter(program => program.featured || program.programId === featuredProgramId);
  return featured.length > 0 ? orderedCompetitionPrograms(featured, featuredProgramId) : orderedCompetitionPrograms(programs, featuredProgramId).slice(0, 1);
}

function competitionProgramsForShopTab(programs: CompetitionProgram[], tab: ShopTab, featuredProgramId?: string | null): CompetitionProgram[] {
  if (tab === 'Events') return orderedCompetitionPrograms(programs.filter(program => program.programType === 'event'), featuredProgramId);
  if (tab === 'Play Access') return orderedCompetitionPrograms(programs.filter(program => program.programType === 'tournament'), featuredProgramId);
  if (tab === 'Elite') return featuredCompetitionPrograms(programs, featuredProgramId);
  if (tab === 'Vault') {
    const rewardPrograms = programs.filter(program => program.rewards.length > 0);
    return orderedCompetitionPrograms(rewardPrograms.length > 0 ? rewardPrograms : programs, featuredProgramId);
  }
  return orderedCompetitionPrograms(programs, featuredProgramId);
}

function competitionProductPriceLabel(program: CompetitionProgram): string {
  if (program.entry.mode === 'free') return 'Free entry';
  return program.entry.priceLabel ?? program.entry.requirementLabel ?? 'Entry required';
}

function competitionProductAvailability(program: CompetitionProgram): ShopProduct['availability'] {
  if (program.status === 'cancelled' || program.status === 'completed') return 'coming_soon';
  if (program.status === 'scheduled') return 'preview';
  return 'live';
}

function competitionLobbyHandoffOpen(program: CompetitionProgram): boolean {
  return program.status === 'check_in' || program.status === 'live';
}

function competitionProductForProgram(program: CompetitionProgram, tab: ShopTab): ShopProduct {
  return {
    productId: program.entry.productId ?? program.programId,
    productType: 'TOURNAMENT_ENTRY',
    displayName: program.title,
    description: program.description,
    shopTab: tab,
    badge: program.programType === 'tournament' ? 'Tournament' : 'Event',
    benefits: [
      program.subtitle,
      `${competitionDateTimeLabel(program.lifecycle.startsAt)} start`,
      competitionCapacityLabel(program),
      COMPETITION_STATUS_LABELS[program.status],
      program.rewards[0]?.detail ?? program.stats.prizePoolLabel ?? 'Competition rewards',
    ].filter(Boolean).slice(0, 4),
    entitlementKind: 'event_ticket',
    availability: competitionProductAvailability(program),
    priceLabel: competitionProductPriceLabel(program),
    currency: 'usd',
    active: program.status !== 'cancelled' && program.status !== 'completed',
    competitionProgramId: program.programId,
  };
}

function competitionStaticItems(
  programs: CompetitionProgram[],
  tab: ShopTab,
  imageUrls: string[],
): ShopPageContentData['creditPacks'] {
  const tones = ['cyan', 'gold', 'violet', 'green', 'orange', 'silver'] as const;
  return programs.map((program, index) => ({
    title: program.title,
    subtitle: program.subtitle,
    tone: program.programType === 'tournament' ? 'gold' : tones[index % tones.length],
    icon: program.programType === 'tournament' ? 'trophy' : 'cards',
    badge: COMPETITION_STATUS_LABELS[program.status],
    imageUrl: imageUrls[index % Math.max(1, imageUrls.length)] ?? TRANSPARENT_COMPETITION_IMAGE_URL,
    price: competitionProductPriceLabel(program),
    benefits: competitionProductForProgram(program, tab).benefits,
  }));
}

function compactCompetitionItems(programs: CompetitionProgram[], fallback: string): string[] {
  const items = programs.map(program => `${program.title} - ${competitionShortDateLabel(program.lifecycle.startsAt)}`).slice(0, 6);
  return items.length > 0 ? items : [fallback];
}

type CompetitionBetaEmptyKind = 'all' | 'featured' | 'events' | 'tournaments' | 'rewards';
const TRANSPARENT_COMPETITION_IMAGE_URL = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%221%22%20height=%221%22/%3E';
const COMPETITION_EVENT_IMAGE_URL = shopPageWeeklyCupImageUrl;
const COMPETITION_TOURNAMENT_IMAGE_URL = shopPageEventBundleImageUrl;

const COMPETITION_BETA_EMPTY_COPY: Record<CompetitionBetaEmptyKind, {
  title: string;
  subtitle: string;
  badge: string;
  icon: 'cards' | 'trophy' | 'shield';
  tone: 'cyan' | 'gold' | 'violet' | 'silver';
  benefits: string[];
}> = {
  all: {
    title: 'Coming Soon',
    subtitle: 'Official events and tournaments will appear here when registration opens.',
    badge: 'Soon',
    icon: 'trophy',
    tone: 'cyan',
    benefits: ['No registration is open right now', 'New drops will be posted here before start time', 'Live programs will connect to Shop access and the game lobby'],
  },
  featured: {
    title: 'Coming Soon',
    subtitle: 'Featured competitions will appear here once Ocentra opens registration.',
    badge: 'Soon',
    icon: 'trophy',
    tone: 'gold',
    benefits: ['No featured event is open right now', 'Only real published programs will show here', 'Tickets and passes appear only when entry is available'],
  },
  events: {
    title: 'Coming Soon',
    subtitle: 'Ocentra events will appear here when a date and entry window are published.',
    badge: 'Not Open',
    icon: 'cards',
    tone: 'silver',
    benefits: ['No event registration is open right now', 'Fixed-date sessions will be listed here first', 'Come back for official event announcements'],
  },
  tournaments: {
    title: 'Coming Soon',
    subtitle: 'Tournament brackets will appear here after Ocentra publishes a schedule.',
    badge: 'Not Open',
    icon: 'trophy',
    tone: 'silver',
    benefits: ['No tournament registration is open right now', 'Brackets and stages will be visible before play starts', 'Come back for official tournament announcements'],
  },
  rewards: {
    title: 'Coming Soon',
    subtitle: 'Prize pools, badges, and season rewards will appear with official programs.',
    badge: 'Soon',
    icon: 'shield',
    tone: 'violet',
    benefits: ['No prize pool is active right now', 'Rewards are published with real events and tournaments', 'Player rewards will be visible before entry opens'],
  },
};

function competitionBetaEmptyItems(kind: CompetitionBetaEmptyKind, imageUrl = TRANSPARENT_COMPETITION_IMAGE_URL): ShopPageContentData['creditPacks'] {
  const copy = COMPETITION_BETA_EMPTY_COPY[kind];
  return [{
    title: copy.title,
    subtitle: copy.subtitle,
    tone: copy.tone,
    icon: copy.icon,
    badge: copy.badge,
    imageUrl,
    price: 'Coming soon',
    benefits: copy.benefits,
  }];
}

function imageUrlsFromItems(items: Array<{ imageUrl?: string } | undefined>): string[] {
  return items.map(item => item?.imageUrl ?? '').filter(Boolean);
}

function competitionPreferredImages(primaryImageUrl: string, imageUrls: string[], excludedImageUrls: string[] = []): string[] {
  const excluded = new Set(excludedImageUrls);
  return [
    primaryImageUrl,
    ...imageUrls.filter(imageUrl => imageUrl !== primaryImageUrl && !excluded.has(imageUrl)),
  ];
}

function competitionImagePools(base: ShopPageContentData) {
  const eventImages = competitionPreferredImages(COMPETITION_EVENT_IMAGE_URL, imageUrlsFromItems([
    ...(base.sections.Events.featured ?? []),
    ...(base.sections.Events.categories ?? []),
    base.sideItems.find(item => item.key === 'Events'),
  ]), [COMPETITION_TOURNAMENT_IMAGE_URL]);
  const tournamentImages = competitionPreferredImages(COMPETITION_TOURNAMENT_IMAGE_URL, imageUrlsFromItems([
    ...(base.sections['Play Access'].featured ?? []),
    ...(base.sections['Play Access'].categories ?? []),
    base.sideItems.find(item => item.key === 'Play Access'),
  ]), [COMPETITION_EVENT_IMAGE_URL]);
  const featuredImages = [
    ...imageUrlsFromItems([base.sideItems.find(item => item.key === 'Elite')]),
    ...eventImages,
    ...tournamentImages,
  ];
  const rewardImages = [
    ...tournamentImages,
    ...eventImages,
    ...featuredImages,
  ];
  return {
    all: [...featuredImages, ...eventImages, ...tournamentImages],
    events: eventImages,
    featured: featuredImages,
    rewards: rewardImages,
    tournaments: tournamentImages,
  };
}

function competitionRewardGroups(programs: CompetitionProgram[], imageUrls: string[]): ShopPageContentData['vaultShowcaseGroups'] {
  return programs
    .filter(program => program.rewards.length > 0)
    .map((program, index) => ({
      key: `competition-rewards-${program.programId}`,
      title: `${program.title} Rewards`,
      subtitle: program.stats.prizePoolLabel ?? program.rewards[0]?.detail ?? 'Competition rewards',
      tone: program.programType === 'tournament' ? 'gold' : 'violet',
      icon: 'trophy',
      badge: program.stats.prizePoolLabel ?? COMPETITION_STATUS_LABELS[program.status],
      heroImageUrl: imageUrls[index % Math.max(1, imageUrls.length)] ?? TRANSPARENT_COMPETITION_IMAGE_URL,
      items: program.rewards.map((reward, rewardIndex) => ({
        title: reward.title,
        subtitle: reward.detail,
        tone: rewardIndex === 0 ? 'gold' : 'cyan',
        icon: reward.place === 1 ? 'trophy' : 'shield',
        badge: reward.place ? `Place ${reward.place}` : program.programType,
        imageUrl: imageUrls[(index + rewardIndex) % Math.max(1, imageUrls.length)] ?? TRANSPARENT_COMPETITION_IMAGE_URL,
        price: reward.amount && reward.currency ? `${reward.amount.toLocaleString()} ${reward.currency}` : program.stats.prizePoolLabel,
        benefits: [
          reward.detail,
          `${program.title} reward track`,
          `${competitionCapacityLabel(program)} capacity`,
        ],
      })),
    }));
}

function buildCompetitionShopContent(
  programs: CompetitionProgram[],
  pageMode: CompetitionPageMode,
  activeTab: ShopTab,
  featuredProgramId?: string | null,
  selectedProgram?: CompetitionProgram | null,
  contentOverride?: Partial<ShopPageContentData> | null,
): ShopPageContentData {
  const base = normalizeShopPageContent(contentOverride);
  const pools = competitionImagePools(base);
  const fallbackCompetitionImageUrl = pools.all[0] ?? TRANSPARENT_COMPETITION_IMAGE_URL;
  const rewardFallbackImageUrl = pools.rewards[0] ?? fallbackCompetitionImageUrl;
  const selectedProgramId = selectedProgram?.programId ?? null;
  const orderedPrograms = orderedCompetitionPrograms(programs, featuredProgramId, selectedProgramId);
  const hasPrograms = orderedPrograms.length > 0;
  const events = orderedCompetitionPrograms(programs.filter(program => program.programType === 'event'), featuredProgramId, selectedProgramId);
  const tournaments = orderedCompetitionPrograms(programs.filter(program => program.programType === 'tournament'), featuredProgramId, selectedProgramId);
  const featuredPrograms = featuredCompetitionPrograms(orderedPrograms, featuredProgramId);
  const rewardPrograms = orderedCompetitionPrograms(programs.filter(program => program.rewards.length > 0), featuredProgramId, selectedProgramId);
  const tabPrograms = competitionProgramsForShopTab(programs, activeTab, featuredProgramId);
  const eventItems = events.length > 0
    ? competitionStaticItems(events, 'Events', pools.events.length > 0 ? pools.events : pools.all)
    : competitionBetaEmptyItems('events', pools.events[0] ?? fallbackCompetitionImageUrl);
  const tournamentItems = tournaments.length > 0
    ? competitionStaticItems(tournaments, 'Play Access', pools.tournaments.length > 0 ? pools.tournaments : pools.all)
    : competitionBetaEmptyItems('tournaments', pools.tournaments[0] ?? fallbackCompetitionImageUrl);
  const featuredItems = featuredPrograms.length > 0
    ? competitionStaticItems(featuredPrograms, 'Elite', pools.featured.length > 0 ? pools.featured : pools.all)
    : competitionBetaEmptyItems('featured', pools.featured[0] ?? fallbackCompetitionImageUrl);
  const rewardItems = rewardPrograms.length > 0
    ? competitionStaticItems(rewardPrograms, 'Vault', pools.rewards.length > 0 ? pools.rewards : pools.all)
    : competitionBetaEmptyItems('rewards', rewardFallbackImageUrl);
  const allItems = hasPrograms
    ? competitionStaticItems(tabPrograms.length > 0 ? tabPrograms : orderedPrograms, activeTab, pools.all)
    : competitionBetaEmptyItems('all', fallbackCompetitionImageUrl);
  const ticketedPrograms = orderedPrograms.filter(program => program.entry.mode === 'ticket' || program.entry.mode === 'pass');
  const liveRooms = orderedPrograms.reduce((total, program) => total + (program.stats.liveRooms ?? 0), 0);
  const rewardGroups = hasPrograms
    ? competitionRewardGroups(rewardPrograms.length > 0 ? rewardPrograms : orderedPrograms, pools.rewards.length > 0 ? pools.rewards : pools.all)
    : [];
  const primaryProgram = selectedProgram ?? featuredPrograms[0] ?? orderedPrograms[0] ?? null;
  const primaryLabel = primaryProgram ? `${primaryProgram.title} - ${competitionDateTimeLabel(primaryProgram.lifecycle.startsAt)}` : 'No live programs yet';
  const comparisonPrograms = (featuredPrograms.length > 0 ? featuredPrograms : orderedPrograms).slice(0, 4);

  return normalizeShopPageContent({
    ...base,
    headerStats: [],
    sideItems: base.sideItems.map(item => {
      const competitionSideItem = {
        ...item,
        imageUrl: item.key === 'Vault' ? rewardFallbackImageUrl : item.imageUrl,
      };
      if (item.key === 'Treasury') return { ...competitionSideItem, title: 'OPEN PROGRAMS', subtitle: `${orderedPrograms.length} open / ${liveRooms} live`, icon: 'trophy', tone: 'cyan' };
      if (item.key === 'Elite') return { ...competitionSideItem, title: 'FEATURED', subtitle: hasPrograms ? 'Main events' : 'Pending', icon: 'crown', tone: 'gold' };
      if (item.key === 'Vault') return { ...competitionSideItem, title: 'REWARDS', subtitle: hasPrograms ? 'Prize tracks' : 'No prize track', icon: 'chest', tone: 'orange' };
      if (item.key === 'Play Access') return { ...competitionSideItem, imageUrl: COMPETITION_TOURNAMENT_IMAGE_URL, title: 'TOURNAMENTS', subtitle: tournaments.length > 0 ? 'Brackets and stages' : 'None scheduled', icon: 'cards', tone: 'silver' };
      return { ...competitionSideItem, imageUrl: COMPETITION_EVENT_IMAGE_URL, title: 'EVENTS', subtitle: events.length > 0 ? 'Fixed-date play' : 'None scheduled', icon: 'trophy', tone: 'gold' };
    }),
    sections: {
      ...base.sections,
      Treasury: {
        ...base.sections.Treasury,
        title: pageMode === 'competition' ? 'ALL PROGRAMS' : pageMode.toUpperCase(),
        subtitle: hasPrograms
          ? 'Scheduled events and tournaments with entry, check-in, lobby handoff, and rewards.'
          : 'No official competition is open right now. New events and tournaments will appear here when registration opens.',
        footerTitle: hasPrograms ? 'Competition flow:' : 'What happens next:',
        footerItems: hasPrograms
          ? ['Pick a program', 'Enter or buy access', 'Check in before start', 'Join lobby when live', 'Play rounds', 'Track rewards']
          : ['Official drops will be posted here before start time', 'Registration opens only for real events and tournaments', 'Ticket or pass entries will send players to Shop', 'Live programs will hand off to the correct game lobby'],
        categories: allItems,
      },
      Elite: {
        ...base.sections.Elite,
        title: 'FEATURED PROGRAMS',
        subtitle: primaryProgram ? primaryLabel : 'No featured competition is open right now. Published drops will appear here automatically.',
        footerTitle: primaryProgram ? 'Featured program state:' : 'Featured program:',
        footerItems: primaryProgram
          ? [COMPETITION_STATUS_LABELS[primaryProgram.status], competitionProductPriceLabel(primaryProgram), competitionCapacityLabel(primaryProgram), primaryProgram.routes.lobbyPath ? 'Lobby handoff ready' : 'Lobby path pending']
          : ['Nothing to enter today', 'No ticket or pass is for sale', 'Stay tuned for the first official schedule drop'],
        categories: featuredItems,
        featured: featuredItems,
      },
      Vault: {
        ...base.sections.Vault,
        title: 'REWARDS',
        subtitle: hasPrograms
          ? 'Prize pools, badges, profile rewards, and season placement.'
          : 'Prize pools, badges, and season rewards will publish only with official competitions.',
        footerTitle: hasPrograms ? 'Reward views:' : 'Reward status:',
        footerItems: hasPrograms
          ? ['Prize pool', 'Badge grants', 'Season points', 'Placement rewards', 'Final table rewards']
          : ['No active prize pool', 'No beta reward claims', 'Rewards will be visible before entry opens'],
        categories: rewardItems,
        featured: rewardItems,
      },
      'Play Access': {
        ...base.sections['Play Access'],
        title: 'TOURNAMENTS',
        subtitle: tournaments.length > 0
          ? 'Bracket, group, semifinal, and final paths authored ahead of time.'
          : 'No tournament registration is open right now. Brackets will appear here once a tournament is published.',
        categories: tournamentItems,
        featured: tournamentItems,
      },
      Events: {
        ...base.sections.Events,
        title: 'EVENTS',
        subtitle: events.length > 0
          ? 'Scheduled competitive sessions with registration and check-in windows.'
          : 'No scheduled event is open right now. Event drops will appear here once registration opens.',
        footerTitle: events.length > 0 ? 'Event path:' : 'Event status:',
        footerItems: events.length > 0
          ? ['Registration window', 'Entry requirement', 'Check-in window', 'Lobby handoff', 'Event leaderboard']
          : ['No event registration open', 'Come back for official dates', 'Lobby handoff appears on event day'],
        categories: eventItems,
        featured: eventItems,
      },
    },
    vaultShowcaseGroups: rewardGroups.length > 0 ? rewardGroups : [{
      key: 'competition-rewards-empty',
      title: 'Coming Soon',
      subtitle: 'Prize tracks will appear here with official events and tournaments.',
      tone: 'violet',
      icon: 'shield',
      badge: 'Soon',
      heroImageUrl: rewardFallbackImageUrl,
      items: rewardItems,
    }],
    creditPacks: hasPrograms ? competitionStaticItems(orderedPrograms, 'Treasury', pools.all) : allItems,
    passes: hasPrograms
      ? featuredItems.length > 0 ? featuredItems : competitionStaticItems(ticketedPrograms.length > 0 ? ticketedPrograms : orderedPrograms, 'Elite', pools.featured.length > 0 ? pools.featured : pools.all)
      : featuredItems,
    previews: [
      { title: 'FEATURED PROGRAMS', tab: 'Elite', subtitle: primaryProgram ? primaryLabel : 'No featured competition is open right now', items: compactCompetitionItems(featuredPrograms, 'Coming soon'), accent: '#ffd36a', imageUrls: pools.featured.slice(0, 6) },
      { title: 'EVENTS', tab: 'Events', subtitle: events.length > 0 ? 'Fixed-date sessions players can enter before start' : 'No event registration is open right now', items: compactCompetitionItems(events, 'Events will appear here when announced'), accent: '#54e2ff', imageUrls: pools.events.slice(0, 6) },
      { title: 'TOURNAMENTS', tab: 'Play Access', subtitle: tournaments.length > 0 ? 'Brackets, groups, semifinals, and finals' : 'No tournament registration is open right now', items: compactCompetitionItems(tournaments, 'Tournaments will appear here when announced'), accent: '#20e39d', imageUrls: pools.tournaments.slice(0, 6) },
      { title: 'REWARDS', tab: 'Vault', subtitle: hasPrograms ? 'Prize pools and placement rewards' : 'No competition reward track is active right now', items: hasPrograms ? rewardPrograms.flatMap(program => program.rewards.map(reward => `${program.title} - ${reward.title}`)).slice(0, 6) : ['Coming soon'], accent: '#bd76ff', imageUrls: pools.rewards.slice(0, 6) },
      { title: 'CHECK-IN + LOBBY', tab: 'Treasury', subtitle: hasPrograms ? 'Enter now, check in near start, then join the game lobby' : 'Lobby handoff appears after an official program opens', items: compactCompetitionItems(orderedPrograms, 'Live programs will route to the game lobby'), accent: '#f59e0b', imageUrls: pools.all.slice(0, 6) },
    ],
    quests: [],
    rightTabs: [
      { id: 'account', title: 'PROGRAM PREVIEW', accent: '#54e2ff' },
      { id: 'wallet', title: 'ENTRY STATUS', accent: '#ffd36a' },
      { id: 'pass', title: 'FEATURED PROGRAM', accent: '#bd76ff' },
      { id: 'events', title: 'SCHEDULE', accent: '#de4fe8' },
      { id: 'recent', title: 'LOBBY HANDOFF', accent: '#20e39d' },
    ],
    rightRows: {
      wallet: [
        ['Open Programs', String(orderedPrograms.length)],
        ['Events', String(events.length)],
        ['Tournaments', String(tournaments.length)],
        ['Ticketed', String(ticketedPrograms.length)],
        ['Live Rooms', String(liveRooms)],
      ],
      events: hasPrograms
        ? orderedPrograms.slice(0, 3).map(program => [
          program.title,
          competitionDateTimeLabel(program.lifecycle.startsAt),
          COMPETITION_STATUS_LABELS[program.status],
        ])
        : [['No programs yet', 'Check back regularly', 'Beta schedule pending']],
      recent: hasPrograms
        ? orderedPrograms.slice(0, 4).map(program => [
          program.title,
          program.routes.lobbyPath ? 'Lobby route ready' : 'Lobby route pending',
        ])
        : [['Lobby handoff', 'No scheduled handoff yet']],
    },
    rightDetails: {
      account: [
        { label: 'Featured', value: primaryProgram?.title ?? 'N/A', detail: primaryProgram?.subtitle ?? 'Featured program appears here when available.' },
        { label: 'Starts', value: primaryProgram ? competitionDateTimeLabel(primaryProgram.lifecycle.startsAt) : 'N/A', detail: 'Fixed competitive programs have scheduled start times.' },
        { label: 'Entry', value: primaryProgram ? competitionProductPriceLabel(primaryProgram) : 'N/A', detail: 'Free programs register directly; paid programs open shop entry access.' },
        { label: 'Capacity', value: primaryProgram ? competitionCapacityLabel(primaryProgram) : 'N/A', detail: 'Capacity comes from the authored competition program.' },
      ],
      wallet: [
        { label: 'Open programs', value: String(orderedPrograms.length), detail: 'Programs currently available in the competition feed.' },
        { label: 'Ticketed', value: String(ticketedPrograms.length), detail: 'Programs that require a ticket or pass before registration completes.' },
        { label: 'Free entry', value: String(orderedPrograms.filter(program => program.entry.mode === 'free').length), detail: 'Programs that can be registered without a shop purchase.' },
        { label: 'Live rooms', value: String(liveRooms), detail: 'Live room counts hand off to the lobby layer when play starts.' },
      ],
      pass: [
        { label: 'Program', value: primaryProgram?.title ?? 'N/A', detail: primaryProgram?.description ?? 'Featured program detail appears here.' },
        { label: 'Status', value: primaryProgram ? COMPETITION_STATUS_LABELS[primaryProgram.status] : 'N/A', detail: 'Status controls whether players enter, check in, join, or wait.' },
        { label: 'Check-in', value: primaryProgram ? competitionDateTimeLabel(primaryProgram.lifecycle.checkInOpensAt) : 'N/A', detail: 'Check-in opens shortly before lobby handoff.' },
        { label: 'Reward', value: primaryProgram?.stats.prizePoolLabel ?? primaryProgram?.rewards[0]?.title ?? 'N/A', detail: 'Reward data comes from the authored event or tournament.' },
      ],
      events: hasPrograms
        ? orderedPrograms.slice(0, 5).map(program => ({
          label: program.title,
          value: competitionDateTimeLabel(program.lifecycle.startsAt),
          detail: `${COMPETITION_STATUS_LABELS[program.status]} - ${competitionProductPriceLabel(program)}`,
        }))
        : [
          { label: 'Events', value: 'None yet', detail: 'No public beta event registration is open.' },
          { label: 'Tournaments', value: 'None yet', detail: 'No public beta tournament bracket is scheduled.' },
          { label: 'Reminder', value: 'Check back', detail: 'Official programs will be published here before registration opens.' },
        ],
      recent: hasPrograms
        ? orderedPrograms.slice(0, 5).map(program => ({
          label: program.title,
          value: program.routes.lobbyPath ? 'Lobby ready' : 'Pending',
          detail: program.routes.lobbyPath ?? 'Lobby path is not authored yet.',
        }))
        : [
          { label: 'Lobby handoff', value: 'Inactive', detail: 'Competition will send players to the lobby only when an official event is live.' },
          { label: 'Shop access', value: 'Inactive', detail: 'Ticket or pass purchase links appear only with real programs.' },
        ],
    },
    uiCopy: {
      ...base.uiCopy,
      header: {
        ...base.uiCopy.header,
        title: 'Competition',
        subtitle: hasPrograms
          ? 'Find scheduled events and tournaments, enter before registration closes, then check in for lobby handoff.'
          : 'Official events and tournaments will appear here when registration opens.',
        badges: [
          { title: 'Schedule', sub: 'Fixed start', icon: 'trophy', tone: 'cyan' },
          { title: 'Entry', sub: 'Ticket/pass', icon: 'link', tone: 'green' },
          { title: 'Lobby', sub: 'Check-in', icon: 'cards', tone: 'gold' },
        ],
        balanceTitle: 'Open Programs',
        balanceUnit: 'Live',
        balanceSub: hasPrograms ? 'Registration' : 'None yet',
      },
      passCard: {
        ...base.uiCopy.passCard,
        compactSummary: 'Featured competitive program.',
        summary: 'Scheduled program entry, check-in, lobby handoff, and rewards.',
        compactBenefits: ['Fixed start time', 'Lobby handoff'],
        benefits: ['Entry requirement', 'Registration window', 'Check-in window', 'Lobby handoff', 'Reward track'],
        lifetimeButton: hasPrograms ? 'View Program' : 'Stay Tuned',
        selectButton: hasPrograms ? 'View Program' : 'Stay Tuned',
      },
      earnPanel: {
        ...base.uiCopy.earnPanel,
        title: hasPrograms ? 'FEATURED EVENT' : 'NO EVENT YET',
        description: primaryProgram?.subtitle ?? 'Official competition announcements will appear here when registration opens.',
        buttonLabel: hasPrograms ? 'View Program' : 'Stay Tuned',
      },
      actions: {
        ...base.uiCopy.actions,
        purchase: hasPrograms ? 'Enter' : 'Not Open',
        topUp: hasPrograms ? 'Open Entry' : 'Not Open',
        select: hasPrograms ? 'View Program' : 'Stay Tuned',
        view: hasPrograms ? 'Details' : 'Stay Tuned',
        open: hasPrograms ? 'Open Program' : 'Stay Tuned',
        claimFree: hasPrograms ? 'Register Free' : 'Not Open',
        buyDigital: hasPrograms ? 'Enter Program' : 'Not Open',
        openVaultGroup: hasPrograms ? 'View Rewards' : 'Stay Tuned',
        backToShop: 'Back To Competition',
        backToPrefix: 'Back To',
      },
      status: {
        ...base.uiCopy.status,
        loadingMarketplace: 'Loading competitions...',
      },
      footer: [
        { title: 'Scheduled Play', sub: 'Events and tournaments have fixed start times', icon: 'trophy', tone: 'cyan' },
        { title: 'Entry Access', sub: 'Free, ticketed, or pass-based programs', icon: 'link', tone: 'green' },
        { title: 'Lobby Handoff', sub: 'Check in before live rooms open', icon: 'cards', tone: 'gold' },
        { title: 'Tracked Rewards', sub: 'Prize pools, badges, and season points', icon: 'shield', tone: 'violet' },
      ],
    },
    infoDetails: {
      arenaCredits: {
        title: 'HOW ENTRY WORKS',
        subtitle: hasPrograms
          ? 'Competition programs are authored ahead of time. Players enter before registration closes, check in near start, then move into the game lobby when live.'
          : 'Competition is the schedule hub for official Ocentra drops. Right now there are no public events or tournaments open.',
        cta: 'Back To Competition',
        bullets: [
          'Events and tournaments are scheduled per game or variant.',
          'Free programs register directly; ticketed or pass programs open shop entry access.',
          'Check-in opens shortly before the fixed start time.',
          'Lobby routes handle live tables, private rooms, public rooms, and match execution.',
          'When the first official program is published, this waiting state is replaced by the real entry flow.',
        ],
      },
      eliteBenefits: {
        title: 'FEATURED PROGRAMS',
        subtitle: 'Featured programs are the main competitive items to surface first on the Competition hub.',
        cta: 'Back To Featured',
        tiers: comparisonPrograms.length > 0 ? comparisonPrograms.map((program, index) => ({
          key: program.programId,
          title: program.title,
          price: competitionProductPriceLabel(program),
          tone: index === 0 ? 'gold' : program.programType === 'tournament' ? 'violet' : 'cyan',
        })) : [{ key: 'pending', title: 'Schedule pending', price: 'N/A', tone: 'silver' }],
        rows: [
          { label: 'Type', values: comparisonPrograms.length > 0 ? comparisonPrograms.map(program => program.programType) : ['N/A'] },
          { label: 'Starts', values: comparisonPrograms.length > 0 ? comparisonPrograms.map(program => competitionShortDateLabel(program.lifecycle.startsAt)) : ['N/A'] },
          { label: 'Status', values: comparisonPrograms.length > 0 ? comparisonPrograms.map(program => COMPETITION_STATUS_LABELS[program.status]) : ['N/A'] },
          { label: 'Capacity', values: comparisonPrograms.length > 0 ? comparisonPrograms.map(competitionCapacityLabel) : ['N/A'] },
          { label: 'Reward', values: comparisonPrograms.length > 0 ? comparisonPrograms.map(program => program.stats.prizePoolLabel ?? program.rewards[0]?.title ?? 'Rewards') : ['N/A'] },
        ],
      },
    },
  });
}

export function SocialPageContent({
  loading,
  error,
  presenceStatus,
  friends,
  partyId,
  partyMembers,
  messages,
  activeConversationId,
  notifications,
  feedItems,
  onRefresh,
  onMatchmaking,
  onLobby,
  onAddFriend,
  onRemoveFriend,
  onCreateParty,
  onLoadParty,
  onJoinParty,
  onLeaveParty,
  onInvite,
  onLoadMessages,
  onSendMessage,
  onMarkRead,
  onMarkAllNotificationsRead,
  onAppendActivity,
  layoutControls,
}: {
  loading: boolean;
  error: string | null;
  presenceStatus: string;
  friends: SocialFriend[];
  partyId: string;
  partyMembers: SocialPartyMember[];
  messages: SocialMessage[];
  activeConversationId: string;
  notifications: SocialNotification[];
  feedItems: SocialFeedItem[];
  onRefresh: () => void;
  onMatchmaking: () => void;
  onLobby: () => void;
  onAddFriend: (friendId: string) => void;
  onRemoveFriend: (friendId: string) => void;
  onCreateParty: () => void;
  onLoadParty: (partyId: string) => void;
  onJoinParty: (partyId: string) => void;
  onLeaveParty: () => void;
  onInvite: (inviteeId: string) => void;
  onLoadMessages: (conversationId: string) => void;
  onSendMessage: (conversationId: string, content: string) => void;
  onMarkRead: (conversationId: string, messageIds: string[]) => void;
  onMarkAllNotificationsRead: () => void;
  onAppendActivity: (type: string, payload: Record<string, unknown>) => void;
} & AppPageSurfaceControlProps) {
  const unreadCount = notifications.filter(notification => !notification.read).length;
  const messageIds = useMemo(() => messages.map(message => message.messageId), [messages]);
  const firstFriend = friends[0]?.friendId ?? 'preview-friend';
  const conversationId = activeConversationId || 'general';
  const panels: AppPageSvgPanel[] = [
    {
      title: 'Friends',
      subtitle: 'Presence and friend graph',
      rows: [
        { label: 'Presence', value: presenceStatus },
        { label: 'Friends', value: friends.length },
        { label: 'First friend', value: firstFriend },
      ],
      actions: [
        { label: 'Add Demo', onClick: () => onAddFriend('demo-friend') },
        { label: 'Remove', onClick: () => onRemoveFriend(firstFriend), disabled: friends.length === 0 },
      ],
    },
    {
      title: 'Party',
      subtitle: 'Lobby party state',
      rows: [
        { label: 'Party ID', value: partyId || '-' },
        { label: 'Members', value: partyMembers.length },
        { label: 'Invite target', value: firstFriend },
      ],
      actions: [
        { label: partyId ? 'Load' : 'Create', onClick: partyId ? () => onLoadParty(partyId) : onCreateParty },
        { label: partyId ? 'Leave' : 'Join', onClick: partyId ? onLeaveParty : () => onJoinParty('preview-party') },
      ],
    },
    {
      title: 'Messages',
      subtitle: 'Conversation handoff',
      rows: [
        { label: 'Conversation', value: conversationId },
        { label: 'Messages', value: messages.length },
        { label: 'Unread', value: unreadCount },
      ],
      actions: [
        { label: 'Load', onClick: () => onLoadMessages(conversationId) },
        { label: 'Mark Read', onClick: () => onMarkRead(conversationId, messageIds), disabled: messageIds.length === 0 },
      ],
    },
    {
      title: 'Activity',
      subtitle: 'Notifications and feed',
      rows: [
        { label: 'Notifications', value: notifications.length },
        { label: 'Feed items', value: feedItems.length },
        { label: 'Last feed', value: feedItems[0]?.type ?? '-' },
      ],
      actions: [
        { label: 'Clear', onClick: onMarkAllNotificationsRead, disabled: unreadCount === 0 },
        { label: 'Append', onClick: () => onAppendActivity('social.preview', { conversationId }) },
      ],
    },
    {
      title: 'Routing',
      subtitle: 'Community bridges',
      rows: [
        { label: 'Matchmaking', value: 'available' },
        { label: 'Lobby', value: 'available' },
      ],
      actions: [
        { label: 'Matchmaking', onClick: onMatchmaking },
        { label: 'Lobby', onClick: onLobby },
      ],
    },
    {
      title: 'Invite',
      subtitle: 'Send a party invite',
      rows: [
        { label: 'Invitee', value: firstFriend },
        { label: 'Party', value: partyId || 'preview-party' },
      ],
      actions: [
        { label: 'Invite', onClick: () => onInvite(firstFriend) },
        { label: 'Send', onClick: () => onSendMessage(conversationId, 'Ready for the next table.') },
      ],
    },
  ];

  return (
    <AppPageSvgSurface
      title="Social Hub"
      eyebrow="Community"
      subtitle="Friends, parties, messages, notifications, and activity in one route-owned page surface."
      routeLabel="/social"
      metrics={[
        { label: 'Friends', value: friends.length },
        { label: 'Party', value: partyMembers.length },
        { label: 'Messages', value: messages.length },
        { label: 'Unread', value: unreadCount },
        { label: 'Feed', value: feedItems.length },
      ]}
      panels={panels}
      actions={[
        { label: 'Refresh', onClick: onRefresh },
        { label: 'Matchmaking', onClick: onMatchmaking },
        { label: 'Lobby', onClick: onLobby },
      ]}
      loading={loading}
      error={error}
      controls={layoutControls}
    />
  );
}

export function SocialWorldPageContent({
  loading,
  error,
  presence,
  quickGames,
  favoriteGameIds,
  onToggleFavorite,
  onCreateParty,
  onOpenLobby,
  onOpenGame,
  onOpenCategory,
  onOpenShop,
  onOpenCompetition,
  onOpenPlayerHub,
  onOpenMatchmaking,
}: {
  loading: boolean;
  error: string | null;
  presence: SocialWorldPresence;
  quickGames?: SocialWorldQuickGame[];
  favoriteGameIds?: string[];
  onToggleFavorite?: (gameId: string) => void;
  onCreateParty: () => void;
  onOpenLobby: (gameId?: string) => void;
  onOpenGame: (gameId: string) => void;
  onOpenCategory: (categoryId: string) => void;
  onOpenShop: () => void;
  onOpenCompetition: () => void;
  onOpenPlayerHub: () => void;
  onOpenMatchmaking: () => void;
}) {
  return (
    <SocialWorldSurface
      loading={loading}
      error={error}
      presence={presence}
      quickGames={quickGames}
      favoriteGameIds={favoriteGameIds}
      onToggleFavorite={onToggleFavorite}
      onCreateParty={onCreateParty}
      onOpenLobby={onOpenLobby}
      onOpenGame={onOpenGame}
      onOpenCategory={onOpenCategory}
      onOpenShop={onOpenShop}
      onOpenCompetition={onOpenCompetition}
      onOpenPlayerHub={onOpenPlayerHub}
      onOpenMatchmaking={onOpenMatchmaking}
    />
  );
}

export function CompetitionPageContent({
  loading,
  error,
  gameType,
  seasonId,
  lastUpdated,
  leaderboardEntries,
  aiBenchmarkEntries = [],
  userEntry,
  nearbyAbove,
  nearbyBelow,
  programs = [],
  featuredProgramId = null,
  selectedProgram = null,
  registeringProgramId = null,
  checkingInProgramId = null,
  pageMode = 'competition',
  gameId,
  onRefreshLeaderboard,
  onMatchmaking,
  onRefreshPrograms = () => undefined,
  onRegisterProgram = () => undefined,
  onOpenShop = () => undefined,
  onOpenLobby = () => undefined,
  competitionControls,
  competitionContent,
  leaderboardControls,
  leaderboardContent,
}: {
  loading: boolean;
  registering: boolean;
  error: string | null;
  gameType: number;
  seasonId: string;
  lastUpdated: string;
  leaderboardEntries: LeaderboardRow[];
  aiBenchmarkEntries?: LeaderboardRow[];
  showPersonalizedStats: boolean;
  userEntry: LeaderboardRow | null;
  nearbyAbove: LeaderboardRow[];
  nearbyBelow: LeaderboardRow[];
  tournamentId: string;
  tournamentRounds: TournamentRound[];
  programs?: CompetitionProgram[];
  featuredProgramId?: string | null;
  selectedProgram?: CompetitionProgram | null;
  registeringProgramId?: string | null;
  checkingInProgramId?: string | null;
  registrationResult?: CompetitionRegistrationResponse | null;
  checkInResult?: CompetitionCheckInResponse | null;
  pageMode?: CompetitionPageMode;
  gameId?: string;
  eventId?: string;
  matchId?: string;
  onRefreshLeaderboard: (gameType: number) => void;
  onLoadBracket: (tournamentId: string) => void;
  onRegister: (tournamentId: string) => void;
  onMatchmaking: () => void;
  onRefreshPrograms?: (filter?: { type?: CompetitionProgramType }) => void;
  onSelectProgram?: (programId: string) => void;
  onRegisterProgram?: (programId: string) => void;
  onCheckInProgram?: (programId: string) => void;
  onOpenProgram?: (program: CompetitionProgram) => void;
  onOpenShop?: (program: CompetitionProgram) => void;
  onOpenLobby?: (program: CompetitionProgram) => void;
  onOpenLeaderboard?: (program: CompetitionProgram) => void;
} & AppPageSurfaceControlProps & CompetitionPageSurfaceControlProps & LeaderboardPageSurfaceControlProps) {
  const [competitionShopTabState, setCompetitionShopTabState] = useState<{ pageMode: CompetitionPageMode; tab: ShopTab }>(() => ({
    pageMode,
    tab: competitionShopTabForPageMode(pageMode),
  }));
  const competitionShopTab = competitionShopTabState.pageMode === pageMode
    ? competitionShopTabState.tab
    : competitionShopTabForPageMode(pageMode);

  if (isLeaderboardPageMode(pageMode)) {
    return (
      <LeaderboardPageSvgSurface
        key={`${pageMode}:${gameId ?? ''}`}
        pageMode={pageMode}
        gameType={gameType}
        seasonId={seasonId}
        lastUpdated={lastUpdated}
        leaderboardEntries={leaderboardEntries}
        aiBenchmarkEntries={aiBenchmarkEntries}
        userEntry={userEntry}
        nearbyAbove={nearbyAbove}
        nearbyBelow={nearbyBelow}
        gameId={gameId}
        loading={loading}
        error={error}
        controls={leaderboardControls}
        content={leaderboardContent}
        onRefreshLeaderboard={onRefreshLeaderboard}
        onMatchmaking={onMatchmaking}
      />
    );
  }

  const visiblePrograms = competitionProgramsForShopTab(programs, competitionShopTab, featuredProgramId);
  const competitionProducts = (visiblePrograms.length > 0 ? visiblePrograms : programs)
    .map(program => competitionProductForProgram(program, competitionShopTab));
  const programByProductId = new Map(
    programs.map(program => [program.entry.productId ?? program.programId, program])
  );
  const shopContent = buildCompetitionShopContent(programs, pageMode, competitionShopTab, featuredProgramId, selectedProgram, competitionContent);
  const busyProgramId = registeringProgramId ?? checkingInProgramId;
  const handleCompetitionTabChange = (tab: ShopTab) => {
    setCompetitionShopTabState({ pageMode, tab });
  };
  const handleCompetitionBuy = (product: ShopProduct) => {
    const program = programByProductId.get(product.productId);
    if (!program) return;
    if (competitionLobbyHandoffOpen(program)) {
      onOpenLobby(program);
      return;
    }
    if (program.entry.mode === 'free') {
      onRegisterProgram(program.programId);
      return;
    }
    onOpenShop(program);
  };

  return (
    <ShopPageSvgSurface
      activeTab={competitionShopTab}
      products={competitionProducts}
      loadingProducts={loading}
      loadingId={busyProgramId}
      error={error}
      acBalance={programs.length}
      onTabChange={handleCompetitionTabChange}
      onClearError={() => onRefreshPrograms()}
      onBuy={handleCompetitionBuy}
      controls={competitionControls}
      content={shopContent}
      chrome={{
        ariaLabel: 'Competition events and tournaments page layout',
        headerIcon: 'trophy',
        balanceIcon: 'cards',
        productTileMode: 'programs',
        showHeaderIcon: false,
        showHeaderPanel: false,
        showHeaderBadges: false,
        showHeaderSubtitle: false,
        showHeaderBalance: false,
        showTopStats: false,
        showRightPanel: false,
        showEarnPanel: false,
        showMainHeaderCount: false,
        showMainTopRightAction: false,
        sideInfoItemKey: 'Treasury',
      }}
    />
  );
}

export function PlayerHubPageContent({
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
  serviceErrors,
  initialTab,
  matchId,
  onRefresh,
  onShop,
  onPlay,
  onLobby,
  onCompetition,
  onUpdateProfile,
  onUpdateSettings,
  onClaimDailyReward,
  renderAiSettingsDetail,
  playerHubControls,
  playerHubContent,
}: {
  loading: boolean;
  error: string | null;
  targetUserId: string;
  profile: PlayerHubProfile | null;
  inventoryItems: PlayerHubInventoryItem[];
  marketplaceListings: PlayerHubMarketplaceListing[];
  creditBalance?: PlayerHubCreditBalance | null;
  dailyReward?: PlayerHubDailyRewardLike | null;
  settings?: PlayerHubSettingsLike | null;
  playerStats?: PlayerHubPlayerStatsLike | null;
  learningProgress?: PlayerHubLearningProgressLike | null;
  performanceReport?: PlayerHubPerformanceReportLike | null;
  serviceErrors?: string[];
  initialTab?: PlayerHubTabId;
  matchId?: string;
  onRefresh: () => void;
  onShop: () => void;
  onPlay?: () => void;
  onLobby?: () => void;
  onCompetition?: () => void;
  onUpdateProfile?: (patch: PlayerHubProfileUpdatePatch) => Promise<void | string> | void | string;
  onUpdateSettings?: (patch: PlayerHubSettingsUpdatePatch) => Promise<void | string> | void | string;
  onClaimDailyReward?: () => Promise<void | string> | void | string;
} & PlayerHubPageSurfaceControlProps) {
  return (
    <PlayerHubPageSvgSurface
      loading={loading}
      error={error}
      targetUserId={targetUserId}
      profile={profile}
      inventoryItems={inventoryItems}
      marketplaceListings={marketplaceListings}
      creditBalance={creditBalance}
      dailyReward={dailyReward}
      settings={settings}
      playerStats={playerStats}
      learningProgress={learningProgress}
      performanceReport={performanceReport}
      serviceErrors={serviceErrors}
      initialTab={initialTab}
      matchId={matchId}
        controls={playerHubControls}
        content={playerHubContent}
        onRefresh={onRefresh}
      onShop={onShop}
      onPlay={onPlay}
      onLobby={onLobby}
      onCompetition={onCompetition}
      onUpdateProfile={onUpdateProfile}
      onUpdateSettings={onUpdateSettings}
      onClaimDailyReward={onClaimDailyReward}
      renderAiSettingsDetail={renderAiSettingsDetail}
    />
  );
}

export function SettingsPageToolbar({
  activeTab,
  showAssetsTab,
  onTabChange,
}: {
  activeTab: string;
  showAssetsTab: boolean;
  onTabChange: (tab: 'models' | 'inference' | 'providers' | 'native' | 'assets') => void;
}) {
  const tabs: Array<{ id: 'models' | 'inference' | 'providers' | 'native' | 'assets'; label: string; visible: boolean }> = [
    { id: 'models', label: 'Models', visible: true },
    { id: 'inference', label: 'Inference', visible: true },
    { id: 'providers', label: 'Providers', visible: true },
    { id: 'native', label: 'Native', visible: true },
    { id: 'assets', label: 'Assets', visible: showAssetsTab },
  ];
  return (
    <div className="app-page-svg-toolbar">
      <div className="app-page-svg-toolbar__tabs">
        {tabs.filter(tab => tab.visible).map(tab => (
          <button
            key={tab.id}
            className={`app-page-svg-toolbar__button ${activeTab === tab.id ? 'is-active' : ''}`}
            type="button"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <span className="app-page-svg-toolbar__pill">Settings Surface</span>
    </div>
  );
}

export function SettingsPageContent({
  activeTab = 'models',
  showAssetsTab = true,
  footer,
  layoutControls,
}: {
  children?: ReactNode;
  activeTab?: string;
  showAssetsTab?: boolean;
  footer?: ReactNode;
} & AppPageSurfaceControlProps) {
  const panels: AppPageSvgPanel[] = [
    {
      title: 'Model Selection',
      subtitle: 'Browser and local AI model routing',
      rows: [
        { label: 'Active tab', value: activeTab },
        { label: 'Local models', value: 'available' },
        { label: 'Provider fallback', value: 'configured' },
      ],
    },
    {
      title: 'Inference',
      subtitle: 'Runtime generation parameters',
      rows: [
        { label: 'Temperature', value: 'configurable' },
        { label: 'Token budget', value: 'configurable' },
        { label: 'Persistence', value: 'browser storage' },
      ],
    },
    {
      title: 'Native And Assets',
      subtitle: 'Desktop bridge and asset delivery',
      rows: [
        { label: 'Native bridge', value: 'detected at runtime' },
        { label: 'Asset delivery', value: showAssetsTab ? 'visible' : 'hidden' },
        { label: 'Updates', value: footer ? 'available' : 'n/a' },
      ],
    },
  ];

  return (
    <AppPageSvgSurface
      title="Settings"
      eyebrow="Control Center"
      subtitle="Models, inference, providers, native integrations, and asset delivery share one SVG settings surface."
      routeLabel="/settings"
      metrics={[
        { label: 'Tab', value: activeTab },
        { label: 'Assets', value: showAssetsTab ? 'shown' : 'hidden' },
        { label: 'Providers', value: 'ready' },
        { label: 'Native', value: 'optional' },
      ]}
      panels={panels}
      actions={[noopAction('Configure'), noopAction('Sync'), noopAction('Native')]}
      controls={layoutControls}
      footer={footer}
    />
  );
}

export function AdminUsersPageContent({
  permissionDenied,
  users,
  activities,
  loading,
  searchQuery,
  selectedUser,
  pendingAction,
  onSearchChange,
  onRefresh,
  onToggleAdmin,
  onCancelDialog,
  onConfirmDialog,
  currentUserId,
  layoutControls,
}: {
  permissionDenied: boolean;
  users: AdminUserRow[];
  activities: AdminActivityRow[];
  loading: boolean;
  searchQuery: string;
  selectedUser: AdminUserRow | null;
  pendingAction: 'grant' | 'revoke' | null;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onToggleAdmin: (user: AdminUserRow) => void;
  onCancelDialog: () => void;
  onConfirmDialog: () => void;
  currentUserId?: string;
} & AppPageSurfaceControlProps) {
  const filteredUsers = users.filter(user => user.email.toLowerCase().includes(searchQuery.toLowerCase()) || user.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
  const targetUser = selectedUser ?? filteredUsers.find(user => user.uid !== currentUserId) ?? null;
  const panels: AppPageSvgPanel[] = [
    {
      title: 'Users',
      subtitle: searchQuery ? `Filter ${searchQuery}` : 'User administration',
      rows: filteredUsers.slice(0, 5).map(user => ({
        label: user.displayName || user.uid,
        value: user.isAdmin ? 'Admin' : 'User',
      })),
      actions: [
        { label: 'Refresh', onClick: onRefresh },
        { label: 'Clear', onClick: () => onSearchChange('') },
      ],
    },
    {
      title: 'Admin State',
      subtitle: targetUser ? targetUser.email : 'No target selected',
      rows: [
        { label: 'Total users', value: users.length },
        { label: 'Admins', value: users.filter(user => user.isAdmin).length },
        { label: 'Target', value: targetUser?.displayName ?? '-' },
        { label: 'Last login', value: formatDate(targetUser?.lastLogin) },
      ],
      actions: [
        { label: targetUser?.isAdmin ? 'Revoke' : 'Grant', onClick: () => targetUser && onToggleAdmin(targetUser), disabled: !targetUser || targetUser.uid === currentUserId },
      ],
    },
    {
      title: 'Activity Log',
      subtitle: 'Recent admin changes',
      rows: activities.slice(0, 5).map(activity => ({
        label: activity.action,
        value: `${activity.targetEmail} ${formatDate(activity.timestamp)}`,
      })),
      actions: [
        { label: 'Cancel', onClick: onCancelDialog, disabled: !pendingAction },
        { label: 'Confirm', onClick: onConfirmDialog, disabled: !pendingAction },
      ],
    },
  ];

  return (
    <AppPageSvgSurface
      title="Admin"
      eyebrow="Operations"
      subtitle="User administration and audit surfaces are shared SVG layouts with admin callbacks bridged by the app."
      routeLabel="/admin"
      metrics={[
        { label: 'Users', value: users.length },
        { label: 'Admins', value: users.filter(user => user.isAdmin).length },
        { label: 'Activity', value: activities.length },
        { label: 'Filtered', value: filteredUsers.length },
      ]}
      panels={panels}
      actions={[
        { label: 'Refresh', onClick: onRefresh },
        { label: 'Clear Filter', onClick: () => onSearchChange('') },
        { label: pendingAction ? 'Confirm' : 'Review', onClick: pendingAction ? onConfirmDialog : undefined },
      ]}
      loading={loading}
      error={permissionDenied ? 'Admin user list is unavailable in this runtime due to Firebase permissions.' : null}
      controls={layoutControls}
    />
  );
}

export function ShopPageContent({
  activeTab,
  products,
  loadingProducts,
  loadingId,
  error,
  acBalance,
  onTabChange,
  onClearError,
  onBuy,
  purchasePrompt,
  onPurchaseProviderSelect,
  onPurchaseCancel,
  layoutControls,
  shopContent,
  vaultDecks,
  resolveDeckImageUrl,
  onVaultDeckInspect,
  accountSummary,
  dailyRewardStatus,
  onDailyRewardSpin,
}: {
  activeTab: ShopTab;
  products: ShopProduct[];
  loadingProducts: boolean;
  loadingId: string | null;
  error: string | null;
  acBalance: number | null;
  onTabChange: (tab: ShopTab) => void;
  onClearError: () => void;
  onBuy: (product: ShopProduct) => void;
  purchasePrompt?: ShopPaymentPrompt | null;
  onPurchaseProviderSelect?: (product: ShopProduct, provider: ShopPaymentProvider) => void;
  onPurchaseCancel?: () => void;
  dailyRewardStatus?: LobbyRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
} & ShopPageSurfaceControlProps) {
  return (
    <ShopPageSvgSurface
      activeTab={activeTab}
      products={products}
      loadingProducts={loadingProducts}
      loadingId={loadingId}
      error={error}
      acBalance={acBalance}
      onTabChange={onTabChange}
      onClearError={onClearError}
      onBuy={onBuy}
      purchasePrompt={purchasePrompt}
      onPurchaseProviderSelect={onPurchaseProviderSelect}
      onPurchaseCancel={onPurchaseCancel}
      controls={layoutControls}
      content={shopContent}
      vaultDecks={vaultDecks}
      resolveDeckImageUrl={resolveDeckImageUrl}
      onVaultDeckInspect={onVaultDeckInspect}
      accountSummary={accountSummary}
      dailyRewardStatus={dailyRewardStatus}
      onDailyRewardSpin={onDailyRewardSpin}
    />
  );
}

export function LobbyPageContent({
  loading,
  creating,
  error,
  gameId,
  gameName,
  rooms,
  busyRoomId,
  useSampleData,
  viewer,
  viewerUserId,
  joinedRoom,
  friends,
  chatMessages,
  lobbyChatMessages,
  reward,
  party,
  server,
  minPlayers,
  maxPlayers,
  gameTagline,
  heroMedia,
  onRefresh,
  onCreateRoom,
  onQuickJoin,
  onJoinRoom,
  onJoinRoomCode,
  onSpectateRoom,
  onLeaveRoom,
  onReadyRoom,
  onUnreadyRoom,
  onStartRoom,
  onAddAIRoom,
  onSendRoomChat,
  onSendLobbyChat,
  onAddFriend,
  onInviteFriend,
  onCreateParty,
  onLeaveParty: onLeavePartyService,
  onClaimReward,
  onSelectServer,
  onRefreshLobbyServices,
  onShareRoomCode,
  onMatchmaking,
  filters,
  onFilterRooms,
  onNavigate,
  onWallet,
  layoutControls,
}: {
  loading: boolean;
  creating: boolean;
  error: string | null;
  gameId: string;
  gameName?: string;
  rooms: LobbyRoomLike[];
  busyRoomId: string | null;
  useSampleData?: boolean;
  viewer?: LobbyUserSummary | null;
  viewerUserId?: string | null;
  joinedRoom?: LobbyRoomLike | null;
  friends?: LobbyFriendItem[];
  chatMessages?: LobbyChatMessageItem[];
  lobbyChatMessages?: LobbyChatMessageItem[];
  reward?: LobbyRewardStatus | null;
  party?: LobbyPartyStatus | null;
  server?: LobbyServerStatus | null;
  minPlayers?: number;
  maxPlayers?: number;
  gameTagline?: string;
  heroMedia?: LobbyHeroMedia;
  onRefresh: () => void;
  onCreateRoom: (draft?: LobbyCreateRoomDraft) => void;
  onQuickJoin: (draft?: LobbyQuickJoinDraft) => void;
  onJoinRoom: (roomId: string) => void;
  onJoinRoomCode: (draft: LobbyJoinCodeDraft) => void;
  onSpectateRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onReadyRoom?: (roomId: string) => void;
  onUnreadyRoom?: (roomId: string) => void;
  onStartRoom?: (roomId: string) => void;
  onAddAIRoom?: (roomId: string, draft?: LobbyAddAISeatDraft) => void;
  onSendRoomChat?: (message: string) => void;
  onSendLobbyChat?: (message: string) => void;
  onAddFriend?: (friendId: string) => void;
  onInviteFriend?: (friendId: string) => void;
  onCreateParty?: () => void;
  onLeaveParty?: () => void;
  onClaimReward?: () => void;
  onSelectServer?: (regionId: string) => void;
  onRefreshLobbyServices?: () => void;
  onShareRoomCode?: (room: LobbyRoomLike) => void;
  onMatchmaking: () => void;
  filters?: LobbyRoomListFilterDraft;
  onFilterRooms?: (filters: LobbyRoomListFilterDraft) => void;
  onNavigate?: (target: LobbyNavigationTarget) => void;
  onWallet?: () => void;
} & LobbyPageSurfaceControlProps) {
  return (
    <LobbyPageSvgSurface
      loading={loading}
      creating={creating}
      error={error}
      gameId={gameId}
      gameName={gameName}
      rooms={rooms}
      busyRoomId={busyRoomId}
      useSampleData={useSampleData}
      viewer={viewer}
      viewerUserId={viewerUserId ?? undefined}
      joinedRoom={joinedRoom}
      friends={friends}
      chatMessages={chatMessages}
      lobbyChatMessages={lobbyChatMessages}
      reward={reward}
      party={party}
      server={server}
      minPlayers={minPlayers}
      maxPlayers={maxPlayers}
      gameTagline={gameTagline}
      heroMedia={heroMedia}
      onRefresh={onRefresh}
      onCreateRoom={onCreateRoom}
      onQuickJoin={onQuickJoin}
      onJoinRoom={onJoinRoom}
      onJoinRoomCode={onJoinRoomCode}
      onSpectateRoom={onSpectateRoom}
      onLeaveRoom={onLeaveRoom}
      onReadyRoom={onReadyRoom}
      onUnreadyRoom={onUnreadyRoom}
      onStartRoom={onStartRoom}
      onAddAIRoom={onAddAIRoom}
      onSendRoomChat={onSendRoomChat}
      onSendLobbyChat={onSendLobbyChat}
      onAddFriend={onAddFriend}
      onInviteFriend={onInviteFriend}
      onCreateParty={onCreateParty}
      onLeaveParty={onLeavePartyService}
      onClaimReward={onClaimReward}
      onSelectServer={onSelectServer}
      onRefreshLobbyServices={onRefreshLobbyServices}
      onShareRoomCode={onShareRoomCode}
      onMatchmaking={onMatchmaking}
      filters={filters}
      onFilterRooms={onFilterRooms}
      onNavigate={onNavigate}
      onWallet={onWallet}
      controls={layoutControls}
    />
  );
}

export function MatchmakingPageContent({
  gameId,
  gameName,
  humans,
  ai,
  ticket,
  status,
  loading,
  leaving,
  error,
  hasMatch,
  queueStatusLabel,
  onQueue,
  onLeave,
  onRefreshStatus,
  onOpenLobby,
  layoutControls,
}: {
  gameId: string;
  gameName: string;
  humans: number;
  ai: number;
  ticket: MatchmakingTicketLike | null;
  status: MatchmakingStatusLike | null;
  loading: boolean;
  leaving: boolean;
  error: string | null;
  hasMatch: boolean;
  queueStatusLabel: string;
  onQueue: () => void;
  onLeave: () => void;
  onRefreshStatus: () => void;
  onOpenLobby: () => void;
} & AppPageSurfaceControlProps) {
  const panels: AppPageSvgPanel[] = [
    {
      title: 'Queue Status',
      subtitle: gameName,
      rows: [
        { label: 'Status', value: queueStatusLabel },
        { label: 'Ticket', value: ticket?.ticketId ?? '-' },
        { label: 'Match', value: status?.matchId ?? (hasMatch ? 'found' : '-') },
        { label: 'Position', value: status?.queuePosition ?? ticket?.queuePosition ?? '-' },
      ],
      actions: [
        { label: loading ? 'Queueing' : 'Queue', onClick: onQueue, disabled: loading || Boolean(ticket) },
        { label: leaving ? 'Leaving' : 'Leave', onClick: onLeave, disabled: leaving || !ticket },
      ],
    },
    {
      title: 'Table Shape',
      subtitle: 'Player composition',
      rows: [
        { label: 'Game ID', value: gameId },
        { label: 'Humans', value: humans },
        { label: 'AI seats', value: ai },
        { label: 'Total seats', value: humans + ai },
      ],
      actions: [
        { label: 'Refresh', onClick: onRefreshStatus, disabled: !ticket },
        { label: 'Open Lobby', onClick: onOpenLobby },
      ],
    },
    {
      title: 'Match Result',
      subtitle: hasMatch ? 'Match found' : 'Waiting for compatible players',
      rows: [
        { label: 'Has match', value: hasMatch ? 'yes' : 'no' },
        { label: 'Status', value: status?.status ?? '-' },
        { label: 'Route', value: gameId ? `/games/${gameId}/matchmaking` : '/matchmaking' },
      ],
    },
  ];

  return (
    <AppPageSvgSurface
      title="Matchmaking"
      eyebrow="Queue"
      subtitle="Find players, queue up, and move into a lobby through a shared SVG route surface."
      routeLabel={gameId ? `/games/${gameId}/matchmaking` : '/matchmaking'}
      metrics={[
        { label: 'Status', value: queueStatusLabel },
        { label: 'Humans', value: humans },
        { label: 'AI', value: ai },
        { label: 'Match', value: hasMatch ? 'found' : 'pending' },
      ]}
      panels={panels}
      actions={[
        { label: loading ? 'Queueing' : 'Queue', onClick: onQueue, disabled: loading || Boolean(ticket) },
        { label: leaving ? 'Leaving' : 'Leave', onClick: onLeave, disabled: leaving || !ticket },
        { label: 'Lobby', onClick: onOpenLobby },
      ]}
      loading={loading}
      error={error}
      controls={layoutControls}
    />
  );
}
