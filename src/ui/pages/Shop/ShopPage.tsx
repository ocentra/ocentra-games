import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { createShopMarketplaceHeaderLogoConfig } from '@ocentra/core-ui/Header/createOcentraHeaderConfig';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { shopPageMarketplaceLogoImageUrl } from '@ocentra/app-assets/shop-page';
import { Resources } from '@ocentra/asset-domain/resources/Resources';
import { isImageHash, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { auth } from '@/adapters/firebase/config';
import type { ShopPaymentProvider } from '@ocentra/endpoint-domain/schemas/shop';
import type { UserProfile } from '@/adapters/firebase/service';
import { APP_VERSION } from '@/constants/version';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { getHeaderAvatarUrl } from '@/ui/header/getHeaderAvatarUrl';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import {
  fetchShopPlayerStats,
  fetchShopProducts,
  playerStatsToShopAccountState,
  capturePayPalOrder as capturePayPalOrderApi,
  startShopPurchase,
  verifyRazorpayPayment as verifyRazorpayPaymentApi,
  type ShopCloudAccountState,
} from '@/ui/pages/Shop/shopApi';
import { getShopApiBaseUrl, getShopAppOrigin } from '@/ui/pages/Shop/shopApiBase';
import {
  ShopPageContent,
  type ShopAccountSummary,
  type ShopDeckImageResolver,
  type ShopProduct,
  type ShopTab,
  type ShopVaultDeckPreviewItem,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { parseShopPageContent, type ShopPageContentData } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent';
import type { ShopPaymentPrompt } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgTypes';
import type { ShopPageSvgControls } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';
import {
  buildDeckPreviewModel,
  collectDeckPreviewRefs,
  uniqueDeckPreviewRefs,
  type DeckPreviewCell,
  type DeckPreviewModel,
  type DeckPreviewReference,
} from '@ocentra/game-asset-domain/deckPreview/DeckPreviewModel';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import { useDailyRewardSpin } from '@/ui/rewards/dailyRewardSpinState';
import { ScreenLoadingFallback } from '@/ui/components/Loading/ScreenLoadingFallback';

interface ShopPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

type ResourceEntryRef = {
  guid?: string;
  path?: string;
  assetType?: string;
  displayName?: string;
  name?: string;
  checksum?: string;
};
type LooseRecord = Record<string, unknown>;
type DeckImageUrlMap = Record<string, string>;
type RazorpaySuccessPayload = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};
type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessPayload) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

const SHOP_PAGE_LAYOUT_ASSET_PATH = 'Resources/Pages/ShopPageLayout.asset';
const SHOP_MARKETPLACE_HEADER_CONFIG = createShopMarketplaceHeaderLogoConfig(shopPageMarketplaceLogoImageUrl);
const RAZORPAY_CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const VAULT_INITIAL_DECK_MODEL_LIMIT = 5;
const VAULT_DECK_REFERENCE_LOAD_CONCURRENCY = 8;
const VAULT_PREFERRED_DECK_PATHS = [
  'Resources/GameMode/CardGames/Decks/Standard_52.asset',
  'Resources/GameMode/CardGames/Decks/Standard_40.asset',
  'Resources/GameMode/CardGames/Decks/Standard_32.asset',
  'Resources/GameMode/CardGames/Decks/Hanafuda_48.asset',
  'Resources/GameMode/CardGames/Decks/Tarot_78_(French_Tarock).asset',
] as const;
const SHOP_PAYMENT_PROVIDERS = ['stripe', 'paypal', 'razorpay', 'solana'] as const satisfies readonly ShopPaymentProvider[];
const CHECKOUT_SUCCESS_MESSAGE = 'Thank you. Checkout completed. Your account will refresh after payment sync finishes.';
const CHECKOUT_CANCELLED_MESSAGE = 'Checkout was cancelled. No payment was completed.';

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function dataOf(document: unknown): LooseRecord {
  const record = asRecord(document);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function findResourceByPath(resources: ResourceEntryRef[], path: string, assetType = ''): ResourceEntryRef | null {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return null;
  return resources.find((resource) => (
    resource.guid &&
    normalizePath(resource.path ?? '') === normalizedPath &&
    (!assetType || !resource.assetType || resource.assetType === assetType)
  )) ?? null;
}

function findGuidByPath(resources: ResourceEntryRef[], path: string, assetType = ''): string {
  return findResourceByPath(resources, path, assetType)?.guid ?? '';
}

function imagePathToBrowserUrl(path?: string): string | null {
  if (!path) return null;
  return /^(https?:|data:|blob:)/i.test(path) ? path : null;
}

function deckPathSortKey(resource: ResourceEntryRef): string {
  return normalizePath(resource.path ?? '');
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function providerDataString(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key];
  return typeof value === 'string' ? value : '';
}

function providerDataNumber(data: Record<string, unknown> | undefined, key: string): number {
  const value = data?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function loadRazorpayCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay checkout failed to load')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay checkout failed to load'));
    document.head.appendChild(script);
  });
}

function parseShopPaymentProvider(value: string | null): ShopPaymentProvider | null {
  return SHOP_PAYMENT_PROVIDERS.includes(value as ShopPaymentProvider) ? value as ShopPaymentProvider : null;
}

function findProductForCheckout(products: ShopProduct[], productId: string): ShopProduct | null {
  if (!productId) return null;
  return products.find(product => product.productId === productId) ?? null;
}

function checkoutUrl(appOrigin: string, checkout: 'success' | 'cancel', provider: ShopPaymentProvider, product: ShopProduct): string {
  const url = new URL('/shop', appOrigin);
  url.searchParams.set('checkout', checkout);
  url.searchParams.set('provider', provider);
  url.searchParams.set('productId', product.productId);
  return url.toString();
}

function preferredDeckResources(resources: ResourceEntryRef[]): ResourceEntryRef[] {
  const deckResources = resources
    .filter(resource => resource.guid && resource.assetType === 'Deck' && normalizePath(resource.path ?? '').includes('/decks/'))
    .sort((a, b) => deckPathSortKey(a).localeCompare(deckPathSortKey(b)));
  const byPath = new Map(deckResources.map(resource => [normalizePath(resource.path ?? ''), resource]));
  const preferred = VAULT_PREFERRED_DECK_PATHS
    .map(path => byPath.get(normalizePath(path)))
    .filter((resource): resource is ResourceEntryRef => Boolean(resource));
  const preferredGuids = new Set(preferred.map(resource => resource.guid));
  const fallback = deckResources.filter(resource => !preferredGuids.has(resource.guid));
  return [...preferred, ...fallback];
}

async function loadDeckResourceCandidates(): Promise<{ resources: ResourceEntryRef[]; deckResources: ResourceEntryRef[] }> {
  let resources: ResourceEntryRef[] = [];
  let deckResources: ResourceEntryRef[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    resources = await getEntryIndexResourceEntries();
    deckResources = preferredDeckResources(resources);
    if (deckResources.length > 0) break;
    await wait(320 * (attempt + 1));
  }
  return { resources, deckResources };
}

async function loadAssetDocumentByCandidateGuids(primaryGuid: string, fallbackGuid = ''): Promise<LooseRecord | null> {
  const candidateGuids = [primaryGuid, fallbackGuid].filter((guid, index, guids) => guid && guids.indexOf(guid) === index);
  for (const guid of candidateGuids) {
    const document = await loadRawAssetDocumentByGuid(guid);
    if (document) return document;
  }
  return null;
}

async function loadDeckReference(ref: DeckPreviewReference, resources: ResourceEntryRef[]): Promise<LooseRecord | null> {
  const pathGuid = findGuidByPath(resources, ref.path ?? '', ref.assetType);
  return await loadAssetDocumentByCandidateGuids(pathGuid, ref.guid);
}

async function loadDeckReferences(refs: DeckPreviewReference[], resources: ResourceEntryRef[]): Promise<LooseRecord[]> {
  const documents: Array<LooseRecord | null> = Array.from({ length: refs.length }, () => null);
  const workerCount = Math.min(VAULT_DECK_REFERENCE_LOAD_CONCURRENCY, refs.length);
  await Promise.all(Array.from({ length: workerCount }, async (_, workerIndex) => {
    for (let index = workerIndex; index < refs.length; index += workerCount) {
      documents[index] = await loadDeckReference(refs[index], resources);
    }
  }));
  return documents.filter((document): document is LooseRecord => document !== null);
}

function displayNameForDeck(document: LooseRecord, resource: ResourceEntryRef): string {
  const data = dataOf(document);
  const system = asRecord(document.system);
  const rawName = typeof data.name === 'string'
    ? data.name
    : typeof system.displayName === 'string'
      ? system.displayName
      : typeof resource.displayName === 'string'
        ? resource.displayName
        : typeof resource.name === 'string'
          ? resource.name
          : resource.path?.split(/[\\/]/).pop()?.replace(/\.asset$/i, '') ?? 'Deck';
  return rawName.replace(/_/g, ' ');
}

function displayNameForDeckResource(resource: ResourceEntryRef): string {
  const rawName = typeof resource.displayName === 'string'
    ? resource.displayName
    : typeof resource.name === 'string'
      ? resource.name
      : resource.path?.split(/[\\/]/).pop()?.replace(/\.asset$/i, '') ?? 'Deck';
  return rawName.replace(/_/g, ' ');
}

function fallbackVaultDeckPreviewItem(resource: ResourceEntryRef): ShopVaultDeckPreviewItem | null {
  if (!resource.guid) return null;
  return {
    key: resource.guid,
    title: displayNameForDeckResource(resource),
    assetGuid: resource.guid,
    assetPath: resource.path,
    model: null,
    sampleCards: [],
  };
}

function replaceVaultDeckPreviewItem(items: ShopVaultDeckPreviewItem[], nextItem: ShopVaultDeckPreviewItem): ShopVaultDeckPreviewItem[] {
  const index = items.findIndex(item => item.key === nextItem.key);
  if (index < 0) {
    return [...items, nextItem];
  }
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function findDeckResourceForPreview(deck: ShopVaultDeckPreviewItem, resources: ResourceEntryRef[]): ResourceEntryRef | null {
  const guid = deck.assetGuid || deck.key;
  return resources.find(resource => (
    (guid && resource.guid === guid) ||
    (deck.assetPath && normalizePath(resource.path ?? '') === normalizePath(deck.assetPath))
  )) ?? (guid ? {
    guid,
    path: deck.assetPath,
    assetType: 'Deck',
    displayName: deck.title,
  } : null);
}

function collectDeckSampleCards(model: DeckPreviewModel): DeckPreviewCell[] {
  const scoredSections = [...model.sections].sort((a, b) => deckSampleSectionScore(b) - deckSampleSectionScore(a));
  const seen = new Set<string>();
  const imageCards: DeckPreviewCell[] = [];
  const fallbackCards: DeckPreviewCell[] = [];
  for (const section of scoredSections) {
    const sectionCards = section.cells ?? section.items ?? [];
    for (const card of sectionCards) {
      if (!card || seen.has(card.id)) continue;
      seen.add(card.id);
      if (card.imageHash || card.imagePath) {
        imageCards.push(card);
      } else {
        fallbackCards.push(card);
      }
    }
  }
  return [...imageCards, ...fallbackCards].slice(0, 3);
}

function collectDeckPreviewImageRefs(items: ShopVaultDeckPreviewItem[]): Array<{ imageHash?: string; imagePath?: string }> {
  const refs: Array<{ imageHash?: string; imagePath?: string }> = [];
  for (const item of items) {
    if (item.model?.backImageHash) {
      refs.push({ imageHash: item.model.backImageHash });
    }
    for (const section of item.model?.sections ?? []) {
      for (const axis of [...(section.rows ?? []), ...(section.columns ?? [])]) {
        refs.push({ imageHash: axis.imageHash, imagePath: axis.imagePath });
      }
      for (const cell of [...(section.cells ?? []), ...(section.items ?? [])]) {
        refs.push({ imageHash: cell.imageHash, imagePath: cell.imagePath });
      }
    }
  }
  return refs;
}

async function resolveDeckPreviewImageUrls(items: ShopVaultDeckPreviewItem[]): Promise<DeckImageUrlMap> {
  const refs = collectDeckPreviewImageRefs(items);
  const urlEntries = await Promise.all(refs.map(async (ref) => {
    const hash = typeof ref.imageHash === 'string' && isImageHash(ref.imageHash) ? ref.imageHash as ImageHash : null;
    if (hash) {
      try {
        return [hash, String(await Resources.getUrl(hash))] as const;
      } catch {
        return null;
      }
    }
    return null;
  }));
  const imageUrls: DeckImageUrlMap = {};
  for (const entry of urlEntries) {
    if (entry) {
      imageUrls[entry[0]] = entry[1];
    }
  }
  return imageUrls;
}

function deckSampleSectionScore(section: DeckPreviewModel['sections'][number]): number {
  const value = `${section.id} ${section.title}`.toLowerCase();
  if (value.includes('trump')) return 4;
  if (value.includes('card')) return 3;
  if (value.includes('piece')) return 2;
  return 1;
}

async function loadVaultDeckPreviewItem(resource: ResourceEntryRef, resources: ResourceEntryRef[]): Promise<ShopVaultDeckPreviewItem | null> {
  if (!resource.guid) return null;
  const deckDocument = await loadRawAssetDocumentByGuid(resource.guid);
  if (!deckDocument) return fallbackVaultDeckPreviewItem(resource);
  const refs = collectDeckPreviewRefs(deckDocument);
  const [pieces, rankings] = await Promise.all([
    loadDeckReferences(uniqueDeckPreviewRefs(refs.pieceRefs), resources),
    loadDeckReferences(refs.rankingRefs, resources),
  ]);
  const title = displayNameForDeck(deckDocument, resource);
  const model = buildDeckPreviewModel({
    deck: deckDocument,
    pieces,
    rankings,
    title: `${title} Deck`,
  });
  return {
    key: resource.guid,
    title,
    subtitle: `${model.totalPieces} pieces`,
    assetGuid: resource.guid,
    assetPath: resource.path,
    model,
    sampleCards: collectDeckSampleCards(model),
  };
}

async function loadShopPageLayoutData(): Promise<{
  controls?: Partial<ShopPageSvgControls>;
  content: ShopPageContentData;
}> {
  const resources = await getEntryIndexResourceEntries();
  const resource = findResourceByPath(resources, SHOP_PAGE_LAYOUT_ASSET_PATH, 'PageLayout');
  if (!resource?.guid) throw new Error('Shop layout asset not found');
  const layoutDocument = await loadRawAssetDocumentByGuid(resource.guid, {
    cache: 'no-store',
    checksum: resource.checksum,
  });
  const data = dataOf(layoutDocument);
  const controls = asRecord(data.shopControls);
  const content = parseShopPageContent(data.shopContent);
  return {
    controls: Object.keys(controls).length > 0 ? controls as Partial<ShopPageSvgControls> : undefined,
    content,
  };
}

export function ShopPage({ user, onLogout, onLogoutClick: _onLogoutClick }: ShopPageProps) {
  const { runWithAccount } = useAuthAccess();
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout });
  const { status: dailyRewardStatus, claim: handleDailyRewardSpin } = useDailyRewardSpin(user?.uid);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShopTab>('Treasury');
  const [layoutControls, setLayoutControls] = useState<Partial<ShopPageSvgControls> | undefined>(undefined);
  const [shopContent, setShopContent] = useState<ShopPageContentData | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [cloudAccountState, setCloudAccountState] = useState<ShopCloudAccountState | null>(null);
  const [vaultDecks, setVaultDecks] = useState<ShopVaultDeckPreviewItem[]>([]);
  const [vaultDeckImageUrls, setVaultDeckImageUrls] = useState<DeckImageUrlMap>({});
  const vaultDeckResourceContextRef = useRef<{ resources: ResourceEntryRef[]; deckResources: ResourceEntryRef[] } | null>(null);
  const hydratingVaultDeckGuidsRef = useRef(new Set<string>());
  const [purchasePrompt, setPurchasePrompt] = useState<ShopPaymentPrompt | null>(null);
  const productsRef = useRef<ShopProduct[]>([]);

  const appOrigin = getShopAppOrigin();
  const apiBaseUrl = getShopApiBaseUrl();

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    if (!auth?.currentUser) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('provider') !== 'paypal' || params.get('checkout') !== 'success') return;
    const paymentId = params.get('paymentId') ?? '';
    const orderId = params.get('token') ?? '';
    if (!paymentId || !orderId) return;
    let cancelled = false;
    setError(null);
    void auth.currentUser.getIdToken(true)
      .then(token => capturePayPalOrderApi({ apiBaseUrl, token, paymentId, orderId }))
      .then(() => {
        if (cancelled) return;
        const params = new URLSearchParams(window.location.search);
        const product = findProductForCheckout(productsRef.current, params.get('productId') ?? '');
        setPurchasePrompt({
          product,
          productName: product?.displayName ?? 'PayPal checkout',
          provider: 'paypal',
          phase: 'success',
          message: CHECKOUT_SUCCESS_MESSAGE,
        });
        const url = new URL(window.location.href);
        url.searchParams.delete('provider');
        url.searchParams.delete('paymentId');
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
      })
      .catch(errorValue => {
        if (!cancelled) {
          setError(errorValue instanceof Error ? errorValue.message : 'PayPal checkout capture failed.');
        }
      });
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout !== 'success' && checkout !== 'cancel') return;
    if (params.get('provider') === 'paypal' && params.get('paymentId') && params.get('token')) return;
    const productId = params.get('productId') ?? '';
    if (productId && products.length === 0) return;
    const provider = parseShopPaymentProvider(params.get('provider'));
    const product = findProductForCheckout(products, productId);
    setPurchasePrompt({
      product,
      productName: product?.displayName ?? 'Checkout',
      provider,
      phase: checkout === 'success' ? 'success' : 'cancelled',
      message: checkout === 'success' ? CHECKOUT_SUCCESS_MESSAGE : CHECKOUT_CANCELLED_MESSAGE,
    });
    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    url.searchParams.delete('provider');
    url.searchParams.delete('productId');
    window.history.replaceState({}, '', url.toString());
  }, [products]);

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    setError(null);
    fetchShopProducts(apiBaseUrl)
      .then((shopProducts) => {
        if (!cancelled) setProducts(shopProducts);
      })
      .catch((shopError) => {
        if (!cancelled) setError(shopError instanceof Error ? shopError.message : 'Failed to load shop');
      })
      .finally(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    setLayoutLoading(true);
    setLayoutError(null);
    void loadShopPageLayoutData()
      .then((layoutData) => {
        if (!cancelled) {
          setLayoutControls(layoutData.controls);
          setShopContent(layoutData.content);
          setLayoutError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLayoutControls(undefined);
          setShopContent(null);
          setLayoutError('Shop layout content failed Effect Schema validation.');
        }
      })
      .finally(() => {
        if (!cancelled) setLayoutLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCloudAccountState(null);
    if (!user?.uid || !auth?.currentUser) {
      return () => { cancelled = true; };
    }
    void auth.currentUser.getIdToken(false)
      .then(token => fetchShopPlayerStats({ apiBaseUrl, token, userId: user.uid }))
      .then(stats => {
        if (!cancelled) {
          setCloudAccountState(playerStatsToShopAccountState(stats));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCloudAccountState(null);
        }
      });
    return () => { cancelled = true; };
  }, [apiBaseUrl, user?.uid]);

  useEffect(() => {
    let cancelled = false;
    void loadDeckResourceCandidates()
      .then(async ({ resources, deckResources }) => {
        if (cancelled) return;
        vaultDeckResourceContextRef.current = { resources, deckResources };
        const fallbackItems = deckResources.map(fallbackVaultDeckPreviewItem).filter((item): item is ShopVaultDeckPreviewItem => item !== null);
        setVaultDecks(fallbackItems);
        for (const resource of deckResources.slice(0, VAULT_INITIAL_DECK_MODEL_LIMIT)) {
          if (cancelled) return;
          if (!resource.guid) continue;
          hydratingVaultDeckGuidsRef.current.add(resource.guid);
          try {
            const item = await loadVaultDeckPreviewItem(resource, resources);
            if (cancelled) return;
            if (!item) continue;
            setVaultDecks(current => replaceVaultDeckPreviewItem(current, item));
            const imageUrls = await resolveDeckPreviewImageUrls([item]);
            if (!cancelled) {
              setVaultDeckImageUrls(current => ({ ...current, ...imageUrls }));
            }
          } catch {
            if (!cancelled) {
              const fallback = fallbackVaultDeckPreviewItem(resource);
              if (fallback) setVaultDecks(current => replaceVaultDeckPreviewItem(current, fallback));
            }
          } finally {
            hydratingVaultDeckGuidsRef.current.delete(resource.guid);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVaultDecks([]);
          setVaultDeckImageUrls({});
          vaultDeckResourceContextRef.current = null;
        }
      });
    return () => { cancelled = true; };
  }, []);

  const acBalance = cloudAccountState?.acBalance ?? null;
  const accountSummary = useMemo<ShopAccountSummary | null>(() => {
    const email = user?.email || auth?.currentUser?.email || undefined;
    const photoUrl = getHeaderAvatarUrl(user?.photoURL || auth?.currentUser?.photoURL) || undefined;
    const hasAccount = Boolean(user || auth?.currentUser || email || photoUrl || cloudAccountState?.displayName);
    if (!hasAccount) return null;
    return {
      displayName: cloudAccountState?.displayName,
      email,
      photoUrl,
      gamesPlayed: cloudAccountState?.gamesPlayed,
      winRate: cloudAccountState?.winRate,
      isGuest: user?.isGuest,
    };
  }, [cloudAccountState, user]);
  const handleBack = useCallback(() => EventBus.instance.publish(new ShowScreenEvent('home')), []);
  const resolveDeckImageUrl = useCallback<ShopDeckImageResolver>((imageHash, imagePath) => {
    if (imageHash && vaultDeckImageUrls[imageHash]) return vaultDeckImageUrls[imageHash];
    if (imagePath && vaultDeckImageUrls[imagePath]) return vaultDeckImageUrls[imagePath];
    return imagePathToBrowserUrl(imagePath);
  }, [vaultDeckImageUrls]);
  const handleVaultDeckInspect = useCallback((deck: ShopVaultDeckPreviewItem) => {
    const guid = deck.assetGuid || deck.key;
    if (!guid || deck.model || hydratingVaultDeckGuidsRef.current.has(guid)) return;
    hydratingVaultDeckGuidsRef.current.add(guid);
    void (async () => {
      try {
        let context = vaultDeckResourceContextRef.current;
        if (!context) {
          context = await loadDeckResourceCandidates();
          vaultDeckResourceContextRef.current = context;
        }
        const resource = findDeckResourceForPreview(deck, context.resources);
        if (!resource) return;
        const item = await loadVaultDeckPreviewItem(resource, context.resources);
        if (!item) return;
        setVaultDecks(current => replaceVaultDeckPreviewItem(current, item));
        const imageUrls = await resolveDeckPreviewImageUrls([item]);
        setVaultDeckImageUrls(current => ({ ...current, ...imageUrls }));
      } catch {
        const context = vaultDeckResourceContextRef.current;
        const resource = context ? findDeckResourceForPreview(deck, context.resources) : null;
        const fallback = resource ? fallbackVaultDeckPreviewItem(resource) : null;
        if (fallback) setVaultDecks(current => replaceVaultDeckPreviewItem(current, fallback));
      } finally {
        hydratingVaultDeckGuidsRef.current.delete(guid);
      }
    })();
  }, []);
  const shopHeaderConfig = useMemo(() => ({
    ...SHOP_MARKETPLACE_HEADER_CONFIG,
    left: {
      ...SHOP_MARKETPLACE_HEADER_CONFIG.left,
      onClick: handleBack,
    },
    right: headerRightConfig,
  }), [handleBack, headerRightConfig]);

  const handleBuy = (product: ShopProduct) => {
    setError(null);
    setPurchasePrompt({ product, phase: 'selecting' });
  };

  const handlePurchaseProviderSelect = async (product: ShopProduct, provider: ShopPaymentProvider) => {
    const paymentCopy = shopContent?.uiCopy.payment;
    if (!paymentCopy) return;
    setError(null);
    setLoadingId(product.productId);
    setPurchasePrompt({ product, provider, busyProvider: provider, phase: 'processing' });
    try {
      const token = auth?.currentUser ? await auth.currentUser.getIdToken(true) : null;
      if (!token) {
        setPurchasePrompt({ product, provider, phase: 'error', message: paymentCopy.signInRequired });
        return;
      }
      const result = await startShopPurchase({
        apiBaseUrl,
        token,
        product,
        provider,
        returnUrl: checkoutUrl(appOrigin, 'success', provider, product),
        cancelUrl: checkoutUrl(appOrigin, 'cancel', provider, product),
      });
      if (result.status === 'redirect' && result.redirectUrl) {
        setPurchasePrompt({
          product,
          provider,
          busyProvider: provider,
          phase: 'redirecting',
          message: result.message ?? `Opening ${provider} checkout.`,
        });
        await wait(350);
        window.location.href = result.redirectUrl;
        return;
      }
      if (provider === 'razorpay' && result.paymentId) {
        const data = result.providerData;
        const keyId = providerDataString(data, 'keyId');
        const orderId = providerDataString(data, 'orderId');
        const amount = providerDataNumber(data, 'amount');
        const currency = providerDataString(data, 'currency');
        if (keyId && orderId && amount > 0 && currency) {
          await loadRazorpayCheckoutScript();
          const Razorpay = window.Razorpay;
          if (!Razorpay) throw new Error('Razorpay checkout failed to load');
          const checkout = new Razorpay({
            key: keyId,
            amount,
            currency,
            name: providerDataString(data, 'name') || 'Ocentra Games',
            description: providerDataString(data, 'description') || product.displayName,
            order_id: orderId,
            handler: (checkoutResponse) => {
              void verifyRazorpayPaymentApi({
                apiBaseUrl,
                token,
                paymentId: result.paymentId!,
                razorpayOrderId: checkoutResponse.razorpay_order_id ?? orderId,
                razorpayPaymentId: checkoutResponse.razorpay_payment_id ?? '',
                razorpaySignature: checkoutResponse.razorpay_signature ?? '',
              })
                .then(settlement => {
                  setPurchasePrompt({ product, provider, phase: 'success', message: settlement.message ?? CHECKOUT_SUCCESS_MESSAGE });
                })
                .catch(errorValue => {
                  setPurchasePrompt({ product, provider, phase: 'error', message: errorValue instanceof Error ? errorValue.message : paymentCopy.checkoutFailed });
                });
            },
            modal: {
              ondismiss: () => setPurchasePrompt({ product, provider, phase: 'cancelled', message: 'Razorpay checkout closed.' }),
            },
          });
          checkout.open();
          setPurchasePrompt({ product, provider, phase: 'processing', message: result.message ?? 'Razorpay checkout opened.' });
          return;
        }
      }
      if (provider === 'solana') {
        const solanaPayUrl = providerDataString(result.providerData, 'solanaPayUrl');
        if (solanaPayUrl) {
          window.open(solanaPayUrl, '_blank', 'noopener,noreferrer');
          setPurchasePrompt({
            product,
            provider,
            phase: 'processing',
            message: 'Solana Pay request opened. Payment will not be granted until chain confirmation is submitted.',
          });
          return;
        }
      }
      setPurchasePrompt({
        product,
        provider,
        phase: result.success ? 'success' : 'error',
        message: result.message ?? (result.success ? paymentCopy.successAccepted : paymentCopy.providerNotConfigured),
      });
    } catch (e) {
      setPurchasePrompt({ product, provider, phase: 'error', message: e instanceof Error ? e.message : paymentCopy.checkoutFailed });
    } finally {
      setLoadingId(null);
    }
  };

  const handleProtectedBuy = (product: ShopProduct) => {
    void runWithAccount(async () => {
      handleBuy(product);
    });
  };

  return (
    <UnifiedPageShell
      className="sp-root"
      workClassName="sp-shell-work"
      workScrollMode="auto"
      background={<DynamicBackground />}
      footer={<GameFooter appVersion={APP_VERSION} />}
      header={
        <UnifiedHeader
          config={shopHeaderConfig}
          showPrimaryNavigation={false}
        />
      }
    >

      {shopContent ? (
        <ShopPageContent
          activeTab={activeTab}
          products={products}
          loadingProducts={loadingProducts}
          loadingId={loadingId}
          error={layoutError ?? error}
          acBalance={acBalance}
          onTabChange={setActiveTab}
          onClearError={() => {
            setError(null);
            setLayoutError(null);
          }}
          onBuy={handleProtectedBuy}
          purchasePrompt={purchasePrompt}
          onPurchaseProviderSelect={handlePurchaseProviderSelect}
          onPurchaseCancel={() => setPurchasePrompt(null)}
          layoutControls={layoutControls}
          shopContent={shopContent}
          vaultDecks={vaultDecks}
          resolveDeckImageUrl={resolveDeckImageUrl}
          onVaultDeckInspect={handleVaultDeckInspect}
          accountSummary={accountSummary}
          dailyRewardStatus={dailyRewardStatus}
          onDailyRewardSpin={handleDailyRewardSpin}
        />
      ) : layoutLoading ? (
        <ScreenLoadingFallback label="Loading shop layout" variant="page" />
      ) : (
        <div className="shop-page-integrity-state" role={layoutLoading ? 'status' : 'alert'}>
          <strong>Shop layout unavailable</strong>
          <span>{layoutError ?? 'Authored shop content is required before rendering.'}</span>
        </div>
      )}
    </UnifiedPageShell>
  );
}
