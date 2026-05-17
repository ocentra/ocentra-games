import { useState, useEffect } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';

import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { auth } from '@/adapters/firebase/config';
import { StripeEndpoint } from '@ocentra/endpoint-domain/constants/stripe';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import type { UserProfile } from '@/adapters/firebase/service';
import { APP_VERSION } from '@/constants/version';
import { useAuthAccess } from '@/hooks/useAuthAccess';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
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

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    fetch(buildApiUrl(ApiEndpoint.Shop.Products, { baseUrl }))
      .then(r => r.json())
      .then((data: { products?: ShopProduct[] }) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch(() => { if (!cancelled) setError('Failed to load shop'); })
      .finally(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, [baseUrl]);

  const acBalance = (user as UserProfile & { ac_balance?: number } | null)?.ac_balance ?? 0;
  const handleBack = () => EventBus.instance.publish(new ShowScreenEvent('home'));

  const handleBuy = async (product: ShopProduct) => {
    setError(null);
    setLoadingId(product.productId);
    try {
      const token = auth?.currentUser ? await auth.currentUser.getIdToken(true) : null;
      if (!token) { setError('Not authenticated'); return; }
      const res = await fetch(buildApiUrl(StripeEndpoint.CreateCheckoutSession, { baseUrl }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Origin: baseUrl },
        body: JSON.stringify({
          productType: product.productType,
          productId: product.productId,
          quantity: 1,
          successUrl: `${window.location.origin}/shop?success=true`,
          cancelUrl:  `${window.location.origin}/shop?canceled=true`,
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
        onTabChange={setActiveTab}
        onClearError={() => setError(null)}
        onBuy={handleProtectedBuy}
      />
    </UnifiedPageShell>
  );
}

