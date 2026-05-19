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
  startShopPurchase,
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

const SHOP_PAGE_LAYOUT_ASSET_PATH = 'Resources/Pages/ShopPageLayout.asset';
const SHOP_MARKETPLACE_HEADER_CONFIG = createShopMarketplaceHeaderLogoConfig(shopPageMarketplaceLogoImageUrl);
const VAULT_INITIAL_DECK_MODEL_LIMIT = 5;
const VAULT_DECK_REFERENCE_LOAD_CONCURRENCY = 8;
const VAULT_PREFERRED_DECK_PATHS = [
  'Resources/GameMode/CardGames/Decks/Standard_52.asset',
  'Resources/GameMode/CardGames/Decks/Standard_40.asset',
  'Resources/GameMode/CardGames/Decks/Standard_32.asset',
  'Resources/GameMode/CardGames/Decks/Hanafuda_48.asset',
  'Resources/GameMode/CardGames/Decks/Tarot_78_(French_Tarock).asset',
] as const;

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
  const [purchasePrompt, setPurchasePrompt] = useState<{
    product: ShopProduct;
    message?: string | null;
    busyProvider?: ShopPaymentProvider | null;
  } | null>(null);

  const appOrigin = getShopAppOrigin();
  const apiBaseUrl = getShopApiBaseUrl();

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
  const accountSummary = useMemo<ShopAccountSummary>(() => ({
    displayName: cloudAccountState?.displayName,
    email: user?.email || auth?.currentUser?.email || undefined,
    photoUrl: getHeaderAvatarUrl(user?.photoURL || auth?.currentUser?.photoURL) || undefined,
    gamesPlayed: cloudAccountState?.gamesPlayed,
    winRate: cloudAccountState?.winRate,
    isGuest: user?.isGuest,
  }), [cloudAccountState, user]);
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
    setPurchasePrompt({ product });
  };

  const handlePurchaseProviderSelect = async (product: ShopProduct, provider: ShopPaymentProvider) => {
    const paymentCopy = shopContent?.uiCopy.payment;
    if (!paymentCopy) return;
    setError(null);
    setLoadingId(product.productId);
    setPurchasePrompt({ product, busyProvider: provider });
    try {
      const token = auth?.currentUser ? await auth.currentUser.getIdToken(true) : null;
      if (!token) {
        setPurchasePrompt({ product, message: paymentCopy.signInRequired });
        return;
      }
      const result = await startShopPurchase({
        apiBaseUrl,
        token,
        product,
        provider,
        returnUrl: `${appOrigin}/shop?checkout=success`,
        cancelUrl: `${appOrigin}/shop?checkout=cancel`,
      });
      if (result.status === 'redirect' && result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setPurchasePrompt({
        product,
        message: result.message ?? (result.success ? paymentCopy.successAccepted : paymentCopy.providerNotConfigured),
      });
    } catch (e) {
      setPurchasePrompt({ product, message: e instanceof Error ? e.message : paymentCopy.checkoutFailed });
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
      ) : (
        <div className="shop-page-integrity-state" role={layoutLoading ? 'status' : 'alert'}>
          <strong>{layoutLoading ? 'Loading shop layout' : 'Shop layout unavailable'}</strong>
          <span>{layoutLoading ? 'Waiting for authored Effect Schema content.' : layoutError ?? 'Authored shop content is required before rendering.'}</span>
        </div>
      )}
    </UnifiedPageShell>
  );
}

