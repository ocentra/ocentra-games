import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { MarketplaceDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { requestJson } from './httpClient';

export interface ProfileResponse {
  userId: string;
  displayName: string;
  [key: string]: unknown;
}

export interface InventoryResponse {
  items: Array<{
    itemId: string;
    quantity: number;
    [key: string]: unknown;
  }>;
}

export interface MarketplaceResponse {
  listings: Array<{
    id: string;
    title: string;
    [key: string]: unknown;
  }>;
}

export async function getProfile(userId: string): Promise<ProfileResponse> {
  return requestJson<ProfileResponse>(ApiEndpoint.Profile.ById(userId), {
    authMode: 'required',
  });
}

export async function getInventory(userId: string): Promise<InventoryResponse> {
  return requestJson<InventoryResponse>(ApiEndpoint.Inventory.ByUser(userId), {
    authMode: 'required',
  });
}

export async function getMarketplaceListings(): Promise<MarketplaceResponse> {
  return requestJson<MarketplaceResponse>(`${ApiEndpoint.Marketplace.Base}/${MarketplaceDOSegment.List}`);
}
