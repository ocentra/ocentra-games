export const W = 1536;
export const H = 930;

export type LobbyRoomLike = {
  roomId?: string;
  roomType?: string;
  gameType?: string;
  currentPlayers?: number;
  maxPlayers?: number;
  isPrivate?: boolean;
  status?: string;
};

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
  name: string;
  state: string;
  avatarUrl?: string | null;
};

export type LobbyChatMessageItem = {
  name: string;
  msg: string;
  ago: string;
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
  name: string;
  ping: string;
  active: boolean;
};

export type LobbyServerStatus = {
  active: string;
  ping: string;
  options: LobbyServerOption[];
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
