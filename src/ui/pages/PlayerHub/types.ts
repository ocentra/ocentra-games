import type {
  InventoryResponse,
  MarketplaceResponse,
  ProfileResponse,
} from '@ocentra/api-domain/playerHub';

export interface PlayerHubState {
  loading: boolean;
  error: string | null;
  targetUserId: string;
  profile: ProfileResponse | null;
  inventoryItems: InventoryResponse['items'];
  marketplaceListings: MarketplaceResponse['listings'];
}
