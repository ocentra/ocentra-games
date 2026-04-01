export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  eloRating?: number;
  gamesPlayed?: number;
  winRate?: number;
  isAdmin?: boolean;
}
