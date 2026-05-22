import type {
  DeckPreviewCell,
  DeckPreviewModel,
} from '../../Common/DeckPreview/DeckPreviewView';
import type { ShopPaymentProvider, ShopProduct, ShopTab } from '@ocentra/endpoint-domain/schemas/shop';

export type { ShopProduct, ShopTab };
export type ShopPaymentPhase = 'selecting' | 'processing' | 'redirecting' | 'success' | 'cancelled' | 'error';

export type ShopPaymentPrompt = {
  product?: ShopProduct | null;
  productName?: string;
  message?: string | null;
  busyProvider?: ShopPaymentProvider | null;
  provider?: ShopPaymentProvider | null;
  phase?: ShopPaymentPhase;
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
