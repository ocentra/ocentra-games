import type {
  CreditBalanceResponse,
  DailyRewardStateResponse,
  InventoryResponse,
  LearningProgressResponse,
  MarketplaceResponse,
  PerformanceReportResponse,
  PlayerStatsResponse,
  ProfileResponse,
  UserSettingsResponse,
} from '@ocentra/api-domain/playerHub';

export interface PlayerHubInventoryItem {
  itemId: string;
  quantity: number;
  title?: string;
  itemType?: string;
  equipped?: boolean;
  count?: number;
  type?: string;
  slot?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PlayerHubState {
  loading: boolean;
  error: string | null;
  targetUserId: string;
  profile: ProfileResponse | null;
  inventoryItems: PlayerHubInventoryItem[];
  rawInventory: InventoryResponse | null;
  marketplaceListings: MarketplaceResponse['listings'];
  creditBalance: CreditBalanceResponse | null;
  dailyReward: DailyRewardStateResponse | null;
  settings: UserSettingsResponse['settings'] | null;
  playerStats: PlayerStatsResponse | null;
  learningProgress: LearningProgressResponse | null;
  performanceReport: PerformanceReportResponse | null;
  serviceErrors: string[];
}
