import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { MarketplaceDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import type { Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
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

export interface DailyRewardStateResponse {
  available?: boolean;
  nextAt?: number | null;
  currentDay?: number;
  loginStreak?: number;
  lastClaimedAt?: number | null;
  rewardForNext?: {
    ac?: number;
    amount?: number;
    currency?: Currency;
    type?: string;
    xp?: number;
    gp?: number;
    [key: string]: unknown;
  };
  lastReward?: {
    ac?: number;
    amount?: number;
    currency?: Currency;
    type?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface CreditBalanceResponse {
  user_id?: string;
  gp_balance?: number;
  ac_balance?: number;
  last_updated?: string;
  [key: string]: unknown;
}

export interface DailyRewardClaimResponse {
  claimed?: boolean;
  alreadyClaimed?: boolean;
  reward?: {
    type?: string;
    currency?: Currency;
    amount?: number;
    ac?: number;
    gp?: number;
    xp?: number;
    [key: string]: unknown;
  };
  balance?: CreditBalanceResponse;
  nextAt?: number | null;
  currentDay?: number;
  loginStreak?: number;
  [key: string]: unknown;
}

export interface UserSettingsResponse {
  settings?: {
    theme?: string;
    notifications?: boolean;
    soundEnabled?: boolean;
    language?: string;
    preferredServerRegion?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface UserSettingsPatch {
  theme?: string;
  notifications?: boolean;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  language?: string;
  preferredServerRegion?: string;
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

export async function getDailyReward(): Promise<DailyRewardStateResponse> {
  return requestJson<DailyRewardStateResponse>(ApiEndpoint.Rewards.Daily, {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function claimDailyReward(idempotencyKey?: string): Promise<DailyRewardClaimResponse> {
  return requestJson<DailyRewardClaimResponse>(ApiEndpoint.Rewards.DailyClaim, {
    method: HttpMethod.Post,
    body: idempotencyKey ? { idempotencyKey } : {},
    authMode: 'required',
  });
}

export async function getCreditsBalance(userId: string): Promise<CreditBalanceResponse> {
  return requestJson<CreditBalanceResponse>(ApiEndpoint.Credits.Balance(userId), {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function getSettings(userId: string): Promise<UserSettingsResponse> {
  return requestJson<UserSettingsResponse>(ApiEndpoint.Settings.ByUser(userId), {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function updateSettings(userId: string, patch: UserSettingsPatch): Promise<UserSettingsResponse> {
  return requestJson<UserSettingsResponse>(ApiEndpoint.Settings.Update(userId), {
    method: HttpMethod.Post,
    body: patch,
    authMode: 'required',
  });
}
