import { useCallback, useMemo, useState, useEffect } from 'react';
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
import { StripeEndpoint } from '@ocentra/endpoint-domain/constants/stripe';
import { HttpAuthScheme, HttpContentType, HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import type { UserProfile } from '@/adapters/firebase/service';
import { APP_VERSION } from '@/constants/version';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { getHeaderAvatarUrl } from '@/ui/header/getHeaderAvatarUrl';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import { fetchShopProducts } from '@/ui/pages/Shop/shopApi';
import { getShopApiBaseUrl, getShopAppOrigin } from '@/ui/pages/Shop/shopApiBase';
import {
  ShopPageContent,
  type ShopAccountSummary,
  type ShopDeckImageResolver,
  type ShopProduct,
  type ShopTab,
  type ShopVaultDeckPreviewItem,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import type { ShopPageContentData } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent';
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

type ResourceEntryRef = { guid?: string; path?: string; assetType?: string; displayName?: string; name?: string };
type LooseRecord = Record<string, unknown>;
type DeckImageUrlMap = Record<string, string>;

const SHOP_PAGE_LAYOUT_ASSET_PATH = 'Resources/Pages/ShopPageLayout.asset';
const SHOP_MARKETPLACE_HEADER_CONFIG = createShopMarketplaceHeaderLogoConfig(shopPageMarketplaceLogoImageUrl);
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

function findGuidByPath(resources: ResourceEntryRef[], path: string, assetType = ''): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return '';
  return resources.find((resource) => (
    resource.guid &&
    normalizePath(resource.path ?? '') === normalizedPath &&
    (!assetType || !resource.assetType || resource.assetType === assetType)
  ))?.guid ?? '';
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
  const documents = await Promise.all(refs.map(ref => loadDeckReference(ref, resources)));
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

function isBaselineDeckResource(resource: ResourceEntryRef): boolean {
  return normalizePath(resource.path ?? '').endsWith('/standard_52.asset');
}

function fallbackVaultDeckPreviewItem(resource: ResourceEntryRef): ShopVaultDeckPreviewItem | null {
  if (!resource.guid) return null;
  const baselineDeck = isBaselineDeckResource(resource);
  return {
    key: resource.guid,
    title: displayNameForDeckResource(resource),
    subtitle: 'Deck data N/A',
    badge: 'Missing Data',
    price: baselineDeck ? 'Free' : 'Price N/A',
    assetGuid: resource.guid,
    assetPath: resource.path,
    model: null,
    sampleCards: [],
  };
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
  const isBaselineDeck = isBaselineDeckResource(resource);
  return {
    key: resource.guid,
    title,
    subtitle: `${model.totalPieces} pieces`,
    badge: isBaselineDeck ? 'Free' : 'Digital',
    price: isBaselineDeck ? 'Free' : 'Price N/A',
    assetGuid: resource.guid,
    assetPath: resource.path,
    model,
    sampleCards: collectDeckSampleCards(model),
  };
}

async function loadVaultDeckPreviewItems(deckResources: ResourceEntryRef[], resources: ResourceEntryRef[]): Promise<ShopVaultDeckPreviewItem[]> {
  const items = await Promise.all(deckResources.map(async (resource) => {
    try {
      return await loadVaultDeckPreviewItem(resource, resources);
    } catch {
      return fallbackVaultDeckPreviewItem(resource);
    }
  }));
  return items.filter((item): item is ShopVaultDeckPreviewItem => item !== null);
}

async function loadShopPageLayoutData(): Promise<{
  controls?: Partial<ShopPageSvgControls>;
  content?: Partial<ShopPageContentData>;
}> {
  const resources = await getEntryIndexResourceEntries();
  const guid = findGuidByPath(resources, SHOP_PAGE_LAYOUT_ASSET_PATH, 'PageLayout');
  if (!guid) return {};
  const layoutDocument = await loadRawAssetDocumentByGuid(guid, { cache: 'no-store' });
  const data = dataOf(layoutDocument);
  const controls = asRecord(data.shopControls);
  const content = asRecord(data.shopContent);
  return {
    controls: Object.keys(controls).length > 0 ? controls as Partial<ShopPageSvgControls> : undefined,
    content: Object.keys(content).length > 0 ? content as Partial<ShopPageContentData> : undefined,
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
  const [shopContent, setShopContent] = useState<Partial<ShopPageContentData> | undefined>(undefined);
  const [vaultDecks, setVaultDecks] = useState<ShopVaultDeckPreviewItem[]>([]);
  const [vaultDeckImageUrls, setVaultDeckImageUrls] = useState<DeckImageUrlMap>({});

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
    void loadShopPageLayoutData()
      .then((layoutData) => {
        if (!cancelled) {
          setLayoutControls(layoutData.controls);
          setShopContent(layoutData.content);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadDeckResourceCandidates()
      .then(async ({ resources, deckResources }) => {
        if (cancelled) return;
        setVaultDecks(deckResources.map(fallbackVaultDeckPreviewItem).filter((item): item is ShopVaultDeckPreviewItem => item !== null));
        const items = await loadVaultDeckPreviewItems(deckResources, resources);
        if (cancelled) return;
        setVaultDecks(items);
        try {
          const imageUrls = await resolveDeckPreviewImageUrls(items);
          if (!cancelled) setVaultDeckImageUrls(imageUrls);
        } catch {
          if (!cancelled) setVaultDeckImageUrls({});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVaultDecks([]);
          setVaultDeckImageUrls({});
        }
      });
    return () => { cancelled = true; };
  }, []);

  const acBalance = (user as UserProfile & { ac_balance?: number } | null)?.ac_balance ?? 0;
  const accountSummary = useMemo<ShopAccountSummary>(() => ({
    displayName: user?.displayName || auth?.currentUser?.displayName || 'ocentra',
    email: user?.email || auth?.currentUser?.email || '',
    photoUrl: getHeaderAvatarUrl(user?.photoURL || auth?.currentUser?.photoURL) || '',
    eloRating: user?.eloRating,
    gamesPlayed: user?.gamesPlayed,
    winRate: user?.winRate,
    isGuest: user?.isGuest,
  }), [user]);
  const handleBack = useCallback(() => EventBus.instance.publish(new ShowScreenEvent('home')), []);
  const resolveDeckImageUrl = useCallback<ShopDeckImageResolver>((imageHash, imagePath) => {
    if (imageHash && vaultDeckImageUrls[imageHash]) return vaultDeckImageUrls[imageHash];
    if (imagePath && vaultDeckImageUrls[imagePath]) return vaultDeckImageUrls[imagePath];
    return imagePathToBrowserUrl(imagePath);
  }, [vaultDeckImageUrls]);
  const shopHeaderConfig = useMemo(() => ({
    ...SHOP_MARKETPLACE_HEADER_CONFIG,
    left: {
      ...SHOP_MARKETPLACE_HEADER_CONFIG.left,
      onClick: handleBack,
    },
    right: headerRightConfig,
  }), [handleBack, headerRightConfig]);

  const handleBuy = async (product: ShopProduct) => {
    setError(null);
    setLoadingId(product.productId);
    try {
      const token = auth?.currentUser ? await auth.currentUser.getIdToken(true) : null;
      if (!token) { setError('Not authenticated'); return; }
      const res = await fetch(buildApiUrl(StripeEndpoint.CreateCheckoutSession, { baseUrl: apiBaseUrl }), {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${token}`,
        },
        body: JSON.stringify({
          productType: product.productType,
          productId: product.productId,
          quantity: 1,
          successUrl: `${appOrigin}/shop?success=true`,
          cancelUrl:  `${appOrigin}/shop?canceled=true`,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? `Request failed: ${res.status}`);
        return;
      }
      const d = await res.json() as { url?: string };
      if (d.url) { window.location.href = d.url; return; }
      setError('No checkout URL returned');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoadingId(null);
    }
  };

  const handleProtectedBuy = (product: ShopProduct) => {
    void runWithAccount(async () => {
      await handleBuy(product);
    });
  };

  return (
    <UnifiedPageShell
      className="sp-root"
      workClassName="sp-shell-work"
      background={<DynamicBackground />}
      footer={<GameFooter appVersion={APP_VERSION} />}
      header={
        <UnifiedHeader
          config={shopHeaderConfig}
          showPrimaryNavigation={false}
        />
      }
    >

      <ShopPageContent
        activeTab={activeTab}
        products={products}
        loadingProducts={loadingProducts}
        loadingId={loadingId}
        error={error}
        acBalance={acBalance}
        onTabChange={setActiveTab}
        onClearError={() => setError(null)}
        onBuy={handleProtectedBuy}
        layoutControls={layoutControls}
        shopContent={shopContent}
        vaultDecks={vaultDecks}
        resolveDeckImageUrl={resolveDeckImageUrl}
        accountSummary={accountSummary}
        dailyRewardStatus={dailyRewardStatus}
        onDailyRewardSpin={handleDailyRewardSpin}
      />
    </UnifiedPageShell>
  );
}

