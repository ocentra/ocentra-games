import type {
  DeckPreviewCell,
  DeckPreviewModel,
} from '../../Common/DeckPreview/DeckPreviewView';

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

export type ShopDeckPreviewCard = Pick<DeckPreviewCell, 'id' | 'label' | 'imageHash' | 'imagePath' | 'assetType'>;

export type ShopAccountSummary = {
  displayName?: string;
  email?: string;
  photoUrl?: string;
  eloRating?: number;
  gamesPlayed?: number;
  winRate?: number;
  isGuest?: boolean;
};

export type ShopVaultDeckPreviewItem = {
  key: string;
  title: string;
  subtitle?: string;
  badge?: string;
  price?: string;
  assetGuid?: string;
  assetPath?: string;
  model: DeckPreviewModel | null;
  sampleCards: ShopDeckPreviewCard[];
};

export type ShopDeckImageResolver = (imageHash?: string, imagePath?: string) => string | null;
