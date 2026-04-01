export interface PlayerProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

