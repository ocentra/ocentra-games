export type SocialWorldDistrictTone = {
  primary: string;
  secondary: string;
  accent: string;
  ground: string;
};

export type SocialWorldPosition = {
  x: number;
  z: number;
};

export type SocialWorldDistrict = {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  boothCount: string;
  position: SocialWorldPosition;
  radius: number;
  tone: SocialWorldDistrictTone;
};

export type SocialWorldBoothKind =
  | 'category'
  | 'game'
  | 'reward'
  | 'party'
  | 'competition'
  | 'profile'
  | 'matchmaking';

export type SocialWorldBooth = {
  id: string;
  districtId: string;
  title: string;
  subtitle: string;
  summary: string;
  kind: SocialWorldBoothKind;
  actionLabel: string;
  boothCount?: string;
  gameId?: string;
  categoryId?: string;
  position: SocialWorldPosition;
  size: number;
  tone: SocialWorldDistrictTone;
};

export type SocialWorldPresence = {
  userName: string;
  status: string;
  friends: number;
  partyMembers: number;
  unread: number;
  messages: number;
  feedItems: number;
};

export type SocialWorldQuickGame = {
  gameId: string;
  name: string;
  category?: string | null;
  difficulty?: string | null;
  players?: string | null;
  imageUrl?: string | null;
};

export type SocialWorldAction =
  | { type: 'category'; categoryId: string }
  | { type: 'game'; gameId: string }
  | { type: 'lobby'; gameId?: string }
  | { type: 'shop' }
  | { type: 'party' }
  | { type: 'competition' }
  | { type: 'profile' }
  | { type: 'matchmaking' };
