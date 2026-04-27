import { useState, useEffect, useMemo } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';

import { DynamicBackground } from '@/ui/components/Background/DynamicBackground';
import { auth } from '@/adapters/firebase/config';
import { StripeEndpoint } from '@ocentra/endpoint-domain/constants/stripe';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import type { UserProfile } from '@/adapters/firebase/service';
import { APP_VERSION } from '@/constants/version';
import { getHeaderAvatarUrl } from '@/ui/header/getHeaderAvatarUrl';
import './ShopPage.css';

type ProductType = 'AC_CREDITS' | 'SUBSCRIPTION' | 'TOURNAMENT_ENTRY' | 'MARKETPLACE';
type ShopTab = 'Treasury' | 'Elite' | 'Vault' | 'Tickets';

interface ShopProduct {
  productId: string;
  productType: ProductType;
  displayName: string;
  acAmount?: number;
  unitPriceCents?: number;
  currency: string;
  active: boolean;
}

// ─── Display metadata (icons, copy — presentation layer only) ─────────────────
const AC_META: Record<string, {
  icon: string;
  tagline: string;
  badge?: string;
  badgeVariant?: 'gold' | 'blue' | 'green';
  savingsLabel?: string;
  perAcRate: string;
}> = {
  'ac-100':  { icon: '🪙', tagline: 'Dip your toes in. One coaching session.',           perAcRate: '$0.010/AC' },
  'ac-500':  { icon: '💰', tagline: 'Regular competitive play. Always top up fast.',     perAcRate: '$0.010/AC',  badge: 'Popular', badgeVariant: 'blue' },
  'ac-1200': { icon: '💎', tagline: 'Stock up. Never run out mid-match.',               perAcRate: '$0.008/AC',  badge: 'Best Value', badgeVariant: 'gold', savingsLabel: 'Save 20%' },
  'ac-3500': { icon: '🏅', tagline: 'Serious players go deep. Full season supply.',     perAcRate: '$0.007/AC',  savingsLabel: 'Save 30%' },
};

const SUB_FEATURES = [
  { key: 'tokens',   label: 'AI tokens / month',     free: '10k',  pro: '100k',       champion: '500k',          founder: '500k forever' },
  { key: 'ads',      label: 'Ad-free experience',    free: '✗',    pro: '✓',          champion: '✓',             founder: '✓' },
  { key: 'analysis', label: 'Post-match AI summary', free: '✗',    pro: '✓',          champion: '✓',             founder: '✓' },
  { key: 'thoughts', label: 'AI thought process',    free: '✗',    pro: '✓',          champion: '✓',             founder: '✓' },
  { key: 'coaching', label: 'Deep coaching mode',    free: '✗',    pro: '✗',          champion: '✓',             founder: '✓' },
  { key: 'board',    label: 'Leaderboard',           free: '✗',    pro: '✓',          champion: '✓',             founder: '✓' },
  { key: 'badges',   label: 'Profile badges',        free: '✗',    pro: '✓',          champion: '✓ Animated',    founder: '✓ Founder' },
  { key: 'early',    label: 'Early access / beta',   free: '✗',    pro: '✗',          champion: '✓',             founder: '✓' },
  { key: 'byok',     label: 'Bring your own API key',free: '✓',    pro: '✓',          champion: '✓',             founder: '✓' },
];

const VAULT_META: Record<string, { icon: string; description: string; acCost: number; gradient: string }> = {
  'vault-card-back-neon':  { icon: '🃏', description: 'Electric neon card backs. Stand out at every table.',  acCost: 200, gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  'vault-card-back-royal': { icon: '🎨', description: 'Regal velvet card backs. Classic prestige.',           acCost: 150, gradient: 'linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)' },
  'vault-table-classic':   { icon: '🪵', description: 'Classic felt table. The way cards were meant to be.',  acCost: 100, gradient: 'linear-gradient(135deg, #134e5e, #71b280)' },
};

const TABS: { id: ShopTab; icon: string; label: string }[] = [
  { id: 'Treasury', icon: '💎', label: 'Treasury' },
  { id: 'Elite',    icon: '🏆', label: 'Elite' },
  { id: 'Vault',    icon: '📦', label: 'Vault' },
  { id: 'Tickets',  icon: '🎟️', label: 'Tickets' },
];

interface ShopPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function ShopPage({ user, onLogout, onLogoutClick: _onLogoutClick }: ShopPageProps) {

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

  const acProducts    = useMemo(() => products.filter(p => p.productType === 'AC_CREDITS'), [products]);
  const subProducts   = useMemo(() => products.filter(p => p.productType === 'SUBSCRIPTION'), [products]);
  const vaultProducts = useMemo(() => products.filter(p => p.productType === 'MARKETPLACE'), [products]);

  const acBalance = (user as UserProfile & { ac_balance?: number } | null)?.ac_balance ?? 0;
  const handleBack = () => EventBus.instance.publish(new ShowScreenEvent('home'));

  const handleBuy = async (product: ShopProduct) => {
    if (!user?.uid) { setError('Sign in to purchase'); return; }
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

  const sub = (id: string) => subProducts.find(p => p.productId === id);
  const fmt = (cents?: number) => `$${((cents ?? 0) / 100).toFixed(2)}`;

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
          right: {
            isProfile: Boolean(user),
              user: user ? {
                name: user.displayName || 'Player',
                email: user.email,
                avatarUrl: getHeaderAvatarUrl(user.photoURL),
                isLoggedIn: true,
                isGuest: user.isGuest,
              } : undefined,
            onLogout: onLogout
          },
          left: {
            onClick: handleBack
          }
        }}
        />
      }

      toolbar={
        <div className="sp-tabs">
          <div className="sp-tabs-inner">
          <div className="sp-tab-group">
            {TABS.map(t => (
              <button key={t.id} className={`sp-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div className="sp-wallet-pill">
            <span className="sp-wallet-icon">🪙</span>
            <span className="sp-wallet-bal">{acBalance.toLocaleString()}</span>
            <span className="sp-wallet-label">AC</span>
          </div>
        </div>
      </div>
      }
    >

      {/* ── Content ── */}
      <div className="sp-content">
        {error && <div className="sp-error">{error} <button onClick={() => setError(null)}>✕</button></div>}

        {/* ════ TREASURY ════ */}
        {activeTab === 'Treasury' && (
          <div className="sp-treasury">
            <div className="sp-hero sp-hero-row">
              <div>
                <div className="sp-hero-eyebrow">⚡ Arena Credits</div>
                <h1 className="sp-hero-title">Power your AI game</h1>
                <p className="sp-hero-sub">
                  Buy AC once, use it for post-match breakdowns, coaching, and AI matches.
                  No subscription needed — pay for what you play.
                </p>
              </div>
              <div className="sp-byok-note">
                <span>🔑</span> Using your own API key or a local model? Zero AC cost.
              </div>
            </div>

            {loadingProducts ? (
              <div className="sp-ac-grid">
                {[1,2,3,4].map(i => <div key={i} className="sp-ac-card sp-skeleton" style={{ minHeight: 300 }} />)}
              </div>
            ) : (
              <div className="sp-ac-grid">
                {acProducts.map(p => {
                  const meta = AC_META[p.productId];
                  const isBest = p.productId === 'ac-1200';
                  return (
                    <div key={p.productId} className={`sp-ac-card ${isBest ? 'sp-ac-featured' : ''}`}>
                      {meta?.badge && (
                        <div className={`sp-badge sp-badge-${meta.badgeVariant ?? 'blue'}`}>{meta.badge}</div>
                      )}
                      <div className="sp-ac-icon-wrap">
                        <span className="sp-ac-icon">{meta?.icon ?? '🪙'}</span>
                        <div className="sp-ac-icon-glow" />
                      </div>
                      <div className="sp-ac-amount">
                        {p.acAmount?.toLocaleString()}<span className="sp-ac-unit">AC</span>
                      </div>
                      <div className="sp-ac-tagline">{meta?.tagline}</div>
                      <div className="sp-ac-rate">{meta?.perAcRate} per credit</div>
                      {meta?.savingsLabel && <div className="sp-ac-savings">{meta.savingsLabel}</div>}
                      <div className="sp-ac-price">{fmt(p.unitPriceCents)}</div>
                      <button className="sp-buy-btn" disabled={loadingId !== null}
                        onClick={() => handleBuy(p)}>
                        {loadingId === p.productId ? <span className="sp-spinner" /> : 'RELOAD AC'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* What AC buys */}
            <div className="sp-ac-uses">
              <div className="sp-ac-uses-header">
                <span>💡</span>
                <h3 className="sp-ac-uses-title">What does 1 AC buy you?</h3>
              </div>
              <div className="sp-ac-uses-grid">
                {[
                  { icon: '⚡', action: 'AI move hint',              cost: '15 AC' },
                  { icon: '📊', action: 'Post-match summary',        cost: '60 AC' },
                  { icon: '🎓', action: 'Deep coaching session',     cost: '150 AC' },
                  { icon: '🤖', action: 'AI vs AI full match',       cost: '700 AC' },
                ].map(u => (
                  <div key={u.action} className="sp-use-item">
                    <span className="sp-use-icon">{u.icon}</span>
                    <span className="sp-use-action">{u.action}</span>
                    <span className="sp-use-cost">{u.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ ELITE ════ */}
        {activeTab === 'Elite' && (
          <div className="sp-elite">
            <div className="sp-hero">
              <div className="sp-hero-eyebrow">🏆 Membership</div>
              <h1 className="sp-hero-title sp-hero-title-purple">Unlock your competitive edge</h1>
              <p className="sp-hero-sub">
                Stop playing blind. Elite members get full AI coaching, post-match breakdowns,
                and priority access to everything we build next.
              </p>
            </div>

            {loadingProducts ? (
              <div className="sp-tier-grid">
                {[1,2,3,4].map(i => <div key={i} className="sp-tier-card sp-skeleton" style={{ minHeight: 440 }} />)}
              </div>
            ) : (
              <>
                <div className="sp-tier-grid">
                  {/* Free */}
                  <div className="sp-tier-card sp-tier-free">
                    <div className="sp-tier-header">
                      <span className="sp-tier-icon">🎮</span>
                      <h2 className="sp-tier-name">Free</h2>
                      <div className="sp-tier-price-wrap">
                        <span className="sp-tier-price sp-tier-price-free">$0</span>
                        <span className="sp-tier-period">/mo</span>
                      </div>
                      <p className="sp-tier-desc">Ad-supported. BYOK / local AI. Great way to start.</p>
                    </div>
                    <ul className="sp-tier-features">
                      <li className="feat-yes">Play all 500+ card games</li>
                      <li className="feat-yes">BYOK / local AI (zero AC cost)</li>
                      <li className="feat-yes">10k AI tokens/mo included</li>
                      <li className="feat-no">Ads shown during play</li>
                      <li className="feat-no">No post-match analysis</li>
                      <li className="feat-no">No leaderboard ranking</li>
                    </ul>
                    <button className="sp-tier-btn sp-tier-btn-ghost" disabled>Current Plan</button>
                  </div>

                  {/* Arena Pass */}
                  {sub('sub-arena-pass') ? (
                    <div className="sp-tier-card sp-tier-pro">
                      <div className="sp-badge sp-badge-blue sp-tier-badge">Most Popular</div>
                      <div className="sp-tier-header">
                        <span className="sp-tier-icon">🏆</span>
                        <h2 className="sp-tier-name">Arena Pass</h2>
                        <div className="sp-tier-price-wrap">
                          <span className="sp-tier-price">{fmt(sub('sub-arena-pass')!.unitPriceCents)}</span>
                          <span className="sp-tier-period">/mo</span>
                        </div>
                        <p className="sp-tier-desc">No ads. Full AI coaching after every match.</p>
                      </div>
                      <ul className="sp-tier-features">
                        <li className="feat-yes">Everything in Free</li>
                        <li className="feat-yes"><strong>No ads — ever</strong></li>
                        <li className="feat-yes"><strong>100k AI tokens/mo</strong></li>
                        <li className="feat-yes">Post-match AI breakdown</li>
                        <li className="feat-yes">AI thought-process viewer</li>
                        <li className="feat-yes">Leaderboard access</li>
                        <li className="feat-yes">Profile badges</li>
                        <li className="feat-no">Deep coaching mode</li>
                        <li className="feat-no">Early access features</li>
                      </ul>
                      <button className="sp-tier-btn sp-tier-btn-pro" disabled={loadingId !== null}
                        onClick={() => handleBuy(sub('sub-arena-pass')!)}>
                        {loadingId === 'sub-arena-pass' ? <span className="sp-spinner" /> : 'Subscribe — $9.99/mo'}
                      </button>
                    </div>
                  ) : null}

                  {/* Champion's Pass */}
                  {sub('sub-champions-pass') ? (
                    <div className="sp-tier-card sp-tier-champion">
                      <div className="sp-tier-header">
                        <span className="sp-tier-icon">🎖️</span>
                        <h2 className="sp-tier-name">Champion's Pass</h2>
                        <div className="sp-tier-price-wrap">
                          <span className="sp-tier-price">{fmt(sub('sub-champions-pass')!.unitPriceCents)}</span>
                          <span className="sp-tier-period">/mo</span>
                        </div>
                        <p className="sp-tier-desc">Deep coaching, early access, max prestige.</p>
                      </div>
                      <ul className="sp-tier-features">
                        <li className="feat-yes">Everything in Arena Pass</li>
                        <li className="feat-yes"><strong>500k AI tokens/mo</strong></li>
                        <li className="feat-yes"><strong>Deep coaching mode</strong></li>
                        <li className="feat-yes">Animated badges + frames</li>
                        <li className="feat-yes">Early access / beta</li>
                        <li className="feat-yes">Tournament priority (when live)</li>
                      </ul>
                      <button className="sp-tier-btn sp-tier-btn-champion" disabled={loadingId !== null}
                        onClick={() => handleBuy(sub('sub-champions-pass')!)}>
                        {loadingId === 'sub-champions-pass' ? <span className="sp-spinner" /> : 'Subscribe — $19.99/mo'}
                      </button>
                    </div>
                  ) : null}

                  {/* Founder */}
                  {sub('sub-founder') ? (
                    <div className="sp-tier-card sp-tier-founder">
                      <div className="sp-badge sp-badge-gold sp-tier-badge">Limited · 500 Slots</div>
                      <div className="sp-tier-header">
                        <span className="sp-tier-icon">🌟</span>
                        <h2 className="sp-tier-name">Founder</h2>
                        <div className="sp-tier-price-wrap">
                          <span className="sp-tier-price">${((sub('sub-founder')!.unitPriceCents ?? 0) / 100).toFixed(0)}</span>
                          <span className="sp-tier-period"> one-time</span>
                        </div>
                        <p className="sp-tier-desc">Lifetime Champion's access. Rare — closes at 500 members.</p>
                      </div>
                      <ul className="sp-tier-features">
                        <li className="feat-yes">Champion's Pass <strong>for life</strong></li>
                        <li className="feat-yes">500k AI tokens/mo, forever</li>
                        <li className="feat-yes">Permanent <strong>Founder</strong> badge</li>
                        <li className="feat-yes">Roadmap input + Discord role</li>
                        <li className="feat-yes">Pays back vs Champion's in ~8 months</li>
                        <li className="feat-yes">Never available again after 500 slots</li>
                      </ul>
                      <button className="sp-tier-btn sp-tier-btn-founder" disabled={loadingId !== null}
                        onClick={() => handleBuy(sub('sub-founder')!)}>
                        {loadingId === 'sub-founder' ? <span className="sp-spinner" /> : 'Claim Founder Slot — $149'}
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Comparison table */}
                <div className="sp-compare-wrap">
                  <div className="sp-compare-title">Full feature comparison</div>
                  <div className="sp-compare-table">
                    <div className="sp-compare-header">
                      <div className="sp-compare-feature-col">Feature</div>
                      <div className="sp-compare-col">Free</div>
                      <div className="sp-compare-col sp-col-pro">Arena Pass</div>
                      <div className="sp-compare-col sp-col-champion">Champion's</div>
                      <div className="sp-compare-col sp-col-founder">Founder</div>
                    </div>
                    {SUB_FEATURES.map(row => (
                      <div key={row.key} className="sp-compare-row">
                        <div className="sp-compare-feature-col">{row.label}</div>
                        <div className={`sp-compare-col ${row.free === '✗' ? 'cell-no' : 'cell-yes'}`}>{row.free}</div>
                        <div className={`sp-compare-col sp-col-pro ${row.pro.startsWith('✗') ? 'cell-no' : 'cell-yes'}`}>{row.pro}</div>
                        <div className={`sp-compare-col sp-col-champion ${row.champion.startsWith('✗') ? 'cell-no' : 'cell-yes'}`}>{row.champion}</div>
                        <div className={`sp-compare-col sp-col-founder ${row.founder.startsWith('✗') ? 'cell-no' : 'cell-yes'}`}>{row.founder}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ VAULT ════ */}
        {activeTab === 'Vault' && (
          <div className="sp-vault">
            <div className="sp-hero sp-hero-row">
              <div>
                <div className="sp-hero-eyebrow">🎨 Cosmetics</div>
                <h1 className="sp-hero-title sp-hero-title-gold">The Vault</h1>
                <p className="sp-hero-sub">
                  Unlock cosmetics permanently with Arena Credits. No real money needed —
                  earn AC by playing or top up above.
                </p>
              </div>
              <div className="sp-byok-note">
                <span>🪙</span> Balance: <strong>{acBalance.toLocaleString()} AC</strong>
              </div>
            </div>

            {loadingProducts ? (
              <div className="sp-vault-grid">
                {[1,2,3].map(i => <div key={i} className="sp-vault-card sp-skeleton" style={{ height: 280 }} />)}
              </div>
            ) : (
              <div className="sp-vault-grid">
                {vaultProducts.map(p => {
                  const meta = VAULT_META[p.productId];
                  const canAfford = acBalance >= (meta?.acCost ?? 0);
                  return (
                    <div key={p.productId} className="sp-vault-card">
                      <div className="sp-vault-preview" style={{ background: meta?.gradient ?? 'var(--sp-panel)' }}>
                        <span className="sp-vault-preview-icon">{meta?.icon ?? '🎮'}</span>
                      </div>
                      <div className="sp-vault-body">
                        <h3 className="sp-vault-name">{p.displayName}</h3>
                        <p className="sp-vault-desc">{meta?.description}</p>
                        <div className="sp-vault-footer">
                          <div className="sp-vault-cost">
                            <span className="sp-vault-cost-icon">🪙</span>
                            <span className="sp-vault-cost-val">{meta?.acCost} AC</span>
                          </div>
                          <button
                            className={`sp-vault-btn ${!canAfford ? 'sp-vault-btn-locked' : ''}`}
                            disabled={!canAfford || loadingId !== null}
                            title={!canAfford ? `Need ${(meta?.acCost ?? 0) - acBalance} more AC` : undefined}
                            onClick={() => canAfford && handleBuy(p)}>
                            {!canAfford ? `🔒 Need ${(meta?.acCost ?? 0) - acBalance} more` : 'UNLOCK'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="sp-vault-note">
              Cosmetics unlock permanently to your account. Earn AC through daily play or purchase in Treasury.
            </div>
          </div>
        )}

        {/* ════ TICKETS ════ */}
        {activeTab === 'Tickets' && (
          <div className="sp-tickets">
            <div className="sp-coming-soon">
              <div className="sp-cs-glow" />
              <span className="sp-cs-icon">⚖️</span>
              <h2 className="sp-cs-title">Pro Tour</h2>
              <p className="sp-cs-sub">
                Skill-based tournaments with real AC prize pools. Entry fee in AC —
                winner takes the pool minus rake.
              </p>
              <div className="sp-cs-features">
                {[
                  { icon: '🎯', text: 'Entry fee in AC — winner takes the pool minus 10% rake' },
                  { icon: '🏆', text: 'Ranked brackets across all 500+ card game variants' },
                  { icon: '💰', text: 'Top finishers earn back 5–10× their entry fee' },
                  { icon: '📋', text: 'Skill-game model — legal in most jurisdictions' },
                ].map(f => (
                  <div key={f.text} className="sp-cs-feature">
                    <span>{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
              <div className="sp-cs-status">
                <span className="sp-cs-dot" />
                Getting licensed — expanding region by region
              </div>
              <button className="sp-cs-notify" disabled>Notify Me When Live</button>
              <p className="sp-cs-legal">
                Real-money entry requires regulatory approval.
                Currently available in select skill-game jurisdictions only.
              </p>
            </div>
          </div>
        )}
      </div>
    </UnifiedPageShell>
  );
}

