import { useCallback, useMemo, useState, useEffect } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { createShopMarketplaceHeaderLogoConfig } from '@ocentra/core-ui/Header/createOcentraHeaderConfig';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { shopPageMarketplaceLogoImageUrl } from '@ocentra/app-assets/shop-page';

import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { auth } from '@/adapters/firebase/config';
import { StripeEndpoint } from '@ocentra/endpoint-domain/constants/stripe';
import { HttpAuthScheme, HttpContentType, HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import type { UserProfile } from '@/adapters/firebase/service';
import { APP_VERSION } from '@/constants/version';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import { fetchShopProducts } from '@/ui/pages/Shop/shopApi';
import { getShopApiBaseUrl, getShopAppOrigin } from '@/ui/pages/Shop/shopApiBase';
import {
  ShopPageContent,
  type ShopProduct,
  type ShopTab,
  type ShopVaultDeckPreviewItem,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import type { ShopPageSvgControls } from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import { AppDeckPreview } from '@/ui/components/DeckPreview/AppDeckPreview';
import { useDailyRewardSpin } from '@/ui/rewards/dailyRewardSpinState';

interface ShopPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

type ResourceEntryRef = { guid?: string; path?: string; assetType?: string };
type LooseRecord = Record<string, unknown>;

const SHOP_PAGE_LAYOUT_ASSET_PATH = 'Resources/Pages/ShopPageLayout.asset';
const SHOP_DECK_ASSET_TYPE = Deck.assetType as string;
const SHOP_MARKETPLACE_HEADER_CONFIG = createShopMarketplaceHeaderLogoConfig(shopPageMarketplaceLogoImageUrl);

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
    (!assetType || resource.assetType === assetType)
  ))?.guid ?? '';
}

async function loadShopPageLayoutControls(): Promise<Partial<ShopPageSvgControls> | undefined> {
  const resources = await getEntryIndexResourceEntries();
  const guid = findGuidByPath(resources, SHOP_PAGE_LAYOUT_ASSET_PATH, 'PageLayout');
  if (!guid) return undefined;
  const layoutDocument = await loadRawAssetDocumentByGuid(guid, { cache: 'no-store' });
  const controls = asRecord(dataOf(layoutDocument).shopControls);
  return Object.keys(controls).length > 0 ? controls as Partial<ShopPageSvgControls> : undefined;
}

function shopDeckTitleFromPath(path: string | undefined, fallback: string): string {
  const fileName = (path ?? '').replace(/\\/g, '/').split('/').pop() ?? fallback;
  return fileName
    .replace(/\.asset$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}

async function loadShopVaultDeckItems(): Promise<ShopVaultDeckPreviewItem[]> {
  const resources = await getEntryIndexResourceEntries();
  const seen = new Set<string>();
  return resources
    .filter((resource) => resource.assetType === SHOP_DECK_ASSET_TYPE && (resource.guid || resource.path))
    .map((resource, index) => {
      const id = resource.guid ?? resource.path ?? `deck-${index}`;
      return {
        id,
        title: shopDeckTitleFromPath(resource.path, `Deck ${index + 1}`),
        guid: resource.guid,
        path: resource.path,
      };
    })
    .filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    })
    .slice(0, 48);
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
  const [vaultDeckItems, setVaultDeckItems] = useState<ShopVaultDeckPreviewItem[]>([]);

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
    void loadShopPageLayoutControls()
      .then((controls) => {
        if (!cancelled) setLayoutControls(controls);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadShopVaultDeckItems()
      .then((items) => {
        if (!cancelled) setVaultDeckItems(items);
      })
      .catch(() => {
        if (!cancelled) setVaultDeckItems([]);
      });
    return () => { cancelled = true; };
  }, []);

  const acBalance = (user as UserProfile & { ac_balance?: number } | null)?.ac_balance ?? 0;
  const handleBack = useCallback(() => EventBus.instance.publish(new ShowScreenEvent('home')), []);
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
        dailyRewardStatus={dailyRewardStatus}
        onDailyRewardSpin={handleDailyRewardSpin}
        vaultDeckItems={vaultDeckItems}
        renderVaultDeckPreview={(item) => (
          <AppDeckPreview
            asset={item ? {
              title: item.title,
              guid: item.guid,
              path: item.path,
            } : null}
          />
        )}
      />
    </UnifiedPageShell>
  );
}

