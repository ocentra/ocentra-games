export const W = 1536;
export const H = 930;

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

export type LobbyRoomPlayer = {
  userId: string;
  displayName?: string;
  seatIndex?: number;
  isHost?: boolean;
  isReady?: boolean;
  isAI?: boolean;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: string;
  role?: string;
};

export type LobbyCreateRoomDraft = {
  presetKey?: string;
  roomName?: string;
  mode?: 'casual' | 'ranked' | 'training' | 'benchmark' | 'stakes';
  visibility?: 'public' | 'private' | 'friends';
  maxPlayers?: number;
  allowAI?: boolean;
  aiCount?: number;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: 'easy' | 'normal' | 'hard' | 'expert';
  aiRole?: 'opponent' | 'coach' | 'benchmark';
  coachEnabled?: boolean;
  coachModelId?: string;
  guideMode?: 'off' | 'hints' | 'guided' | 'review';
  allowSpectators?: boolean;
  stakeType?: 'free' | 'game-coin' | 'real-money';
  stakeAmount?: number;
  turnTimerSeconds?: number;
  region?: string;
};

export type LobbyQuickJoinDraft = {
  presetKey?: string;
  mode?: 'casual' | 'ranked' | 'training' | 'benchmark' | 'stakes';
  allowAI?: boolean;
  stakeType?: 'free' | 'game-coin' | 'real-money';
  maxPlayers?: number;
};

export type LobbyAddAISeatDraft = {
  displayName?: string;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: 'easy' | 'normal' | 'hard' | 'expert';
  aiRole?: 'opponent' | 'coach' | 'benchmark';
};

export type LobbyRoomListFilterDraft = {
  search?: string;
  mode?: 'casual' | 'ranked' | 'training' | 'benchmark' | 'stakes';
  visibility?: 'public' | 'private' | 'friends';
  status?: string;
  stakeType?: 'free' | 'game-coin' | 'real-money';
  allowAI?: boolean;
  sort?: 'newest' | 'oldest' | 'fullest' | 'emptiest';
};

export type LobbyJoinCodeDraft = {
  code: string;
  displayName?: string;
};

export type LobbyNavigationTarget =
  | 'lobby'
  | 'tournaments'
  | 'leaderboard'
  | 'rewards'
  | 'shop'
  | 'profile'
  | 'settings'
  | 'social';

export type LobbyPanelRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LobbyCanvasRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LobbyTableRow = {
  code: string;
  title: string;
  tags: string[];
  players: string;
  spectators: string;
  entry: string | null;
  action: string;
  tone: 'cyan' | 'purple' | 'gold' | 'red';
  ai: boolean;
  live: boolean;
  full: boolean;
  viewerJoined?: boolean;
  viewerSpectating?: boolean;
  names: string[];
  avatarUrls?: Array<string | null>;
  roomId?: string;
};

export type LobbyUserSummary = {
  name: string;
  level: string;
  xp: string;
  balance?: string;
  xpRatio?: number;
  avatarUrl?: string | null;
};

export type LobbyHeaderStats = {
  playersOnline: string;
  activeMatches: string;
  openTables: string;
  balance: string;
};

export type LobbyHeroSlide = {
  id?: string;
  imageUrl: string;
  alt?: string;
};

export type LobbyHeroMedia = {
  slides?: LobbyHeroSlide[];
  logoUrl?: string | null;
  logoAlt?: string;
  titleText?: string;
  tagline?: string;
  overlayTintColor?: string;
  overlayTintOpacity?: number;
};

export type LobbyFriendItem = {
  userId?: string;
  name: string;
  state: string;
  avatarUrl?: string | null;
  inviteState?: 'idle' | 'inviting' | 'invited' | 'failed';
};

export type LobbyChatMessageItem = {
  messageId?: string;
  senderId?: string;
  name: string;
  msg: string;
  ago: string;
  timestamp?: number;
  avatarUrl?: string | null;
};

export type LobbyActiveFilterItem = {
  presetKey?: string;
  label: string;
  count: string;
  color: string;
  ai: boolean;
  live: boolean;
  create: boolean;
  imageUrl?: string;
};

export type LobbyServerOption = {
  regionId?: string;
  name: string;
  ping: string;
  active: boolean;
};

export type LobbyServerStatus = {
  active: string;
  ping: string;
  selectedRegionId?: string;
  selecting?: boolean;
  options: LobbyServerOption[];
};

export type LobbyRewardStatus = {
  available: boolean;
  claiming?: boolean;
  claimed?: boolean;
  alreadyClaimed?: boolean;
  currentDay?: number;
  loginStreak?: number;
  nextAt?: number | null;
  rewardLabel: string;
  readyLabel: string;
  balanceLabel?: string;
  spinRewardLabel?: string;
  spinRewardAmount?: number;
};

export type LobbyPartyStatus = {
  partyId?: string;
  leaderId?: string;
  memberCount: number;
  inviteCount: number;
  members: Array<{ userId: string; displayName?: string }>;
};

export type FeaturedCardData = {
  cardType?: 'starter' | 'room';
  presetKey?: string;
  roomId?: string;
  code: string;
  tag: string;
  title: string;
  subtitle?: string;
  description?: string;
  players: string;
  countLabel?: string;
  entry?: string;
  cta?: string;
  tone: 'cyan' | 'purple' | 'gold' | 'red';
  ai?: boolean;
  live?: boolean;
  badges: string[];
  variant: 'green' | 'purple' | 'brown';
  imageUrl?: string;
};
