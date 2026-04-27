export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  eloRating?: number;
  gamesPlayed?: number;
  winRate?: number;
  isAdmin?: boolean;
  isGuest?: boolean;
}
