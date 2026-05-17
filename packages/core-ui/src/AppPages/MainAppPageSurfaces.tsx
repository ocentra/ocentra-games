import { useMemo, type ReactNode } from 'react';
import { AppPageSvgSurface } from './AppPageSvgSurface';
import { LobbyPageSvgSurface } from './Lobby/LobbyPageSvgSurface';
import { ShopPageSvgSurface } from './Shop/ShopPageSvgSurface';
import type {
  AppPageSvgAction,
  AppPageSvgControls,
  AppPageSvgPanel,
} from './AppPageSvgSurfaceControls';
import type { LobbyPageSvgControls } from './Lobby/LobbyPageSvgSurfaceControls';
import type { ShopPageSvgControls } from './Shop/ShopPageSvgSurfaceControls';
import type { ShopPageContentData } from './Shop/ShopPageSvgContent';
import type { ShopProduct, ShopTab, ShopVaultDeckPreviewItem } from './Shop/ShopPageSvgTypes';
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
export type { LobbyPageSvgControls } from './Lobby/LobbyPageSvgSurfaceControls';
export type { ShopPageSvgControls } from './Shop/ShopPageSvgSurfaceControls';
export type { ShopProduct, ShopTab, ShopVaultDeckPreviewItem } from './Shop/ShopPageSvgTypes';
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
};

export type TournamentRound = {
  round: number;
  matches?: unknown[];
};

export type PlayerHubProfile = Record<string, unknown>;
export type PlayerHubInventoryItem = { itemId: string; quantity: number };
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
  | 'tournaments'
  | 'tournamentDetail'
  | 'leaderboard'
  | 'gameLeaderboard'
  | 'aiBenchmarkLeaderboard';

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

type ShopPageSurfaceControlProps = {
  layoutControls?: Partial<ShopPageSvgControls> | null;
  shopContent?: Partial<ShopPageContentData> | null;
};

function formatValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '-';
  try {
    return JSON.stringify(value);
  } catch {
    return '-';
  }
}

function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleDateString();
}

function noopAction(label: string): AppPageSvgAction {
  return { label };
}

function routeScopeLabel(value?: string): string {
  return value && value.trim().length > 0 ? value : 'all games';
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

export function CompetitionPageContent({
  loading,
  registering,
  error,
  gameType,
  seasonId,
  lastUpdated,
  leaderboardEntries,
  showPersonalizedStats,
  userEntry,
  nearbyAbove,
  nearbyBelow,
  tournamentId,
  tournamentRounds,
  pageMode = 'competition',
  gameId,
  onRefreshLeaderboard,
  onLoadBracket,
  onRegister,
  onMatchmaking,
  layoutControls,
}: {
  loading: boolean;
  registering: boolean;
  error: string | null;
  gameType: number;
  seasonId: string;
  lastUpdated: string;
  leaderboardEntries: LeaderboardRow[];
  showPersonalizedStats: boolean;
  userEntry: LeaderboardRow | null;
  nearbyAbove: LeaderboardRow[];
  nearbyBelow: LeaderboardRow[];
  tournamentId: string;
  tournamentRounds: TournamentRound[];
  pageMode?: CompetitionPageMode;
  gameId?: string;
  onRefreshLeaderboard: (gameType: number) => void;
  onLoadBracket: (tournamentId: string) => void;
  onRegister: (tournamentId: string) => void;
  onMatchmaking: () => void;
} & AppPageSurfaceControlProps) {
  const topEntry = leaderboardEntries[0];
  const currentTournamentId = tournamentId || 'season-main';
  const titleByMode: Record<CompetitionPageMode, string> = {
    competition: 'Competition',
    tournaments: 'Tournaments',
    tournamentDetail: 'Tournament Detail',
    leaderboard: 'Leaderboard',
    gameLeaderboard: 'Game Leaderboard',
    aiBenchmarkLeaderboard: 'AI Benchmark Leaderboard',
  };
  const routeByMode: Record<CompetitionPageMode, string> = {
    competition: '/competition',
    tournaments: '/tournaments',
    tournamentDetail: `/tournaments/${currentTournamentId}`,
    leaderboard: '/leaderboard',
    gameLeaderboard: `/games/${routeScopeLabel(gameId)}/leaderboard`,
    aiBenchmarkLeaderboard: '/leaderboard/ai-benchmarks',
  };
  const panels: AppPageSvgPanel[] = [
    {
      title: pageMode === 'aiBenchmarkLeaderboard' ? 'Model Standings' : 'Leaderboard',
      subtitle: `Season ${seasonId || '-'}`,
      rows: [
        { label: 'Rows', value: leaderboardEntries.length },
        { label: 'Top player', value: topEntry?.user_id ?? '-' },
        { label: 'Top score', value: topEntry?.score ?? '-' },
        { label: 'Updated', value: lastUpdated || '-' },
      ],
      actions: [
        { label: 'Refresh', onClick: () => onRefreshLeaderboard(gameType) },
        { label: 'Matchmaking', onClick: onMatchmaking },
      ],
    },
    {
      title: 'Personal Rank',
      subtitle: showPersonalizedStats ? 'Signed-in player stats' : 'Account required',
      rows: [
        { label: 'Rank', value: userEntry?.rank ?? '-' },
        { label: 'Score', value: userEntry?.score ?? '-' },
        { label: 'Wins', value: userEntry?.wins ?? 0 },
        { label: 'Losses', value: userEntry?.losses ?? 0 },
        { label: 'Nearby', value: nearbyAbove.length + nearbyBelow.length },
      ],
      actions: [noopAction(showPersonalizedStats ? 'Rank Ready' : 'Sign In')],
    },
    {
      title: 'Tournament Bracket',
      subtitle: `Tournament ${currentTournamentId}`,
      rows: [
        { label: 'Rounds', value: tournamentRounds.length },
        { label: 'Matches', value: tournamentRounds.reduce((sum, round) => sum + (Array.isArray(round.matches) ? round.matches.length : 0), 0) },
        { label: 'Game type', value: gameType },
      ],
      actions: [
        { label: 'Load Bracket', onClick: () => onLoadBracket(currentTournamentId) },
        { label: registering ? 'Registering' : 'Register', onClick: () => onRegister(currentTournamentId), disabled: registering },
      ],
    },
    {
      title: 'Route Scope',
      subtitle: 'SEO addressable page identity',
      rows: [
        { label: 'Mode', value: pageMode },
        { label: 'Route', value: routeByMode[pageMode] },
        { label: 'Game', value: routeScopeLabel(gameId) },
      ],
    },
  ];

  return (
    <AppPageSvgSurface
      title={titleByMode[pageMode]}
      eyebrow="Competitive Play"
      subtitle="Overall standings, per-game ranking, AI benchmarking, and tournament bracket pages are route-addressable surfaces."
      routeLabel={routeByMode[pageMode]}
      metrics={[
        { label: 'Entries', value: leaderboardEntries.length },
        { label: 'Season', value: seasonId || '-' },
        { label: 'Rounds', value: tournamentRounds.length },
        { label: 'Mode', value: pageMode },
        { label: 'Game', value: routeScopeLabel(gameId) },
      ]}
      panels={panels}
      actions={[
        { label: 'Refresh', onClick: () => onRefreshLeaderboard(gameType) },
        { label: 'Bracket', onClick: () => onLoadBracket(currentTournamentId) },
        { label: 'Queue', onClick: onMatchmaking },
      ]}
      loading={loading}
      error={error}
      controls={layoutControls}
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
  onRefresh,
  onShop,
  onSettings,
  onLoadUser,
  layoutControls,
}: {
  loading: boolean;
  error: string | null;
  targetUserId: string;
  profile: PlayerHubProfile | null;
  inventoryItems: PlayerHubInventoryItem[];
  marketplaceListings: PlayerHubMarketplaceListing[];
  onRefresh: () => void;
  onShop: () => void;
  onSettings: () => void;
  onLoadUser: (userId: string) => void;
} & AppPageSurfaceControlProps) {
  const profileRows = profile ? Object.entries(profile).slice(0, 5) : [];
  const panels: AppPageSvgPanel[] = [
    {
      title: 'Profile',
      subtitle: `User ${targetUserId || '-'}`,
      rows: profileRows.length > 0
        ? profileRows.map(([label, value]) => ({ label, value: formatValue(value) }))
        : [{ label: 'Status', value: 'No profile loaded' }],
      actions: [
        { label: 'Refresh', onClick: onRefresh },
        { label: 'Load User', onClick: () => onLoadUser(targetUserId), disabled: !targetUserId },
      ],
    },
    {
      title: 'Inventory',
      subtitle: 'Owned items',
      rows: inventoryItems.slice(0, 5).map(item => ({ label: item.itemId, value: `x${item.quantity}` })),
      actions: [{ label: 'Open Shop', onClick: onShop }],
    },
    {
      title: 'Marketplace',
      subtitle: 'Available listings',
      rows: marketplaceListings.slice(0, 5).map(listing => ({ label: listing.id, value: listing.title })),
      actions: [{ label: 'Settings', onClick: onSettings }],
    },
  ];

  return (
    <AppPageSvgSurface
      title="Player Hub"
      eyebrow="Account"
      subtitle="Profile, inventory, marketplace, and account context are rendered by the shared SVG surface."
      routeLabel="/player-hub"
      metrics={[
        { label: 'Inventory', value: inventoryItems.length },
        { label: 'Listings', value: marketplaceListings.length },
        { label: 'Profile keys', value: profileRows.length },
        { label: 'User', value: targetUserId || '-' },
      ]}
      panels={panels}
      actions={[
        { label: 'Refresh', onClick: onRefresh },
        { label: 'Shop', onClick: onShop },
        { label: 'Settings', onClick: onSettings },
      ]}
      loading={loading}
      error={error}
      controls={layoutControls}
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

export function ShopPageToolbar({
  activeTab,
  acBalance,
  onTabChange,
}: {
  activeTab: ShopTab;
  acBalance: number;
  onTabChange: (tab: ShopTab) => void;
}) {
  const tabs: ShopTab[] = ['Treasury', 'Elite', 'Vault', 'Play Access', 'Events'];
  return (
    <div className="app-page-svg-toolbar">
      <div className="app-page-svg-toolbar__tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`app-page-svg-toolbar__button ${activeTab === tab ? 'is-active' : ''}`}
            type="button"
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <span className="app-page-svg-toolbar__pill">{acBalance.toLocaleString()} AC</span>
    </div>
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
  layoutControls,
  shopContent,
  dailyRewardStatus,
  onDailyRewardSpin,
  vaultDeckItems,
  renderVaultDeckPreview,
}: {
  activeTab: ShopTab;
  products: ShopProduct[];
  loadingProducts: boolean;
  loadingId: string | null;
  error: string | null;
  acBalance: number;
  onTabChange: (tab: ShopTab) => void;
  onClearError: () => void;
  onBuy: (product: ShopProduct) => void;
  dailyRewardStatus?: LobbyRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
  vaultDeckItems?: ShopVaultDeckPreviewItem[];
  renderVaultDeckPreview?: (item: ShopVaultDeckPreviewItem | null) => ReactNode;
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
      controls={layoutControls}
      content={shopContent}
      dailyRewardStatus={dailyRewardStatus}
      onDailyRewardSpin={onDailyRewardSpin}
      vaultDeckItems={vaultDeckItems}
      renderVaultDeckPreview={renderVaultDeckPreview}
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
