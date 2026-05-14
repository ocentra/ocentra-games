export type ShopTab =
  | 'Treasury'
  | 'Elite'
  | 'Vault'
  | 'Play Access'
  | 'Events';

export type ShopProduct = {
  productId: string;
  productType: 'AC_CREDITS' | 'SUBSCRIPTION' | 'TOURNAMENT_ENTRY' | 'MARKETPLACE';
  displayName: string;
  description?: string;
  shopTab?: ShopTab;
  badge?: string;
  benefits?: string[];
  entitlementKind?: 'credits' | 'pass' | 'cosmetic' | 'play_access' | 'event_ticket';
  availability?: 'live' | 'preview' | 'coming_soon';
  acAmount?: number;
  acPrice?: number;
  unitPriceCents?: number;
  priceLabel?: string;
  currency: string;
  active: boolean;
};

export type ShopVaultDeckPreviewItem = {
  id: string;
  title: string;
  guid?: string;
  path?: string;
};
