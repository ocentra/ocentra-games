import { useState, useEffect } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';

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
  ShopPageToolbar,
  type ShopProduct,
  type ShopTab,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';

interface ShopPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function ShopPage({ user, onLogout, onLogoutClick: _onLogoutClick }: ShopPageProps) {
  const { runWithAccount } = useAuthAccess();
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout });

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShopTab>('Treasury');

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

  const acBalance = (user as UserProfile & { ac_balance?: number } | null)?.ac_balance ?? 0;
  const handleBack = () => EventBus.instance.publish(new ShowScreenEvent('home'));

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
      background={<DynamicBackground />}
      footer={<GameFooter appVersion={APP_VERSION} />}
      header={
        <UnifiedHeader
        dynamicData={{
          gameName: "Arena Marketplace",
          tagline: "Gear up. Outthink. Outplay."
        }}
        config={{
          right: headerRightConfig,
          left: {
            onClick: handleBack
          }
        }}
        />
      }

      toolbar={
        <ShopPageToolbar
          activeTab={activeTab}
          acBalance={acBalance}
          onTabChange={setActiveTab}
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
        onClearError={() => setError(null)}
        onBuy={handleProtectedBuy}
      />
    </UnifiedPageShell>
  );
}

