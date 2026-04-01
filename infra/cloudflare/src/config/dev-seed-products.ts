import type { Product } from './products';

export const DEV_SEED_PRODUCTS: Product[] = [
  { productType: 'AC_CREDITS', productId: 'ac-100', stripePriceId: 'price_placeholder_ac_100', displayName: '100 Arena Credits', acAmount: 100, unitPriceCents: 99, currency: 'usd', active: true },
  { productType: 'AC_CREDITS', productId: 'ac-500', stripePriceId: 'price_placeholder_ac_500', displayName: '500 Arena Credits', acAmount: 500, unitPriceCents: 499, currency: 'usd', active: true },
  { productType: 'AC_CREDITS', productId: 'ac-1200', stripePriceId: 'price_placeholder_ac_1200', displayName: '1200 Arena Credits', acAmount: 1200, unitPriceCents: 999, currency: 'usd', active: true },
  { productType: 'AC_CREDITS', productId: 'ac-3500', stripePriceId: 'price_placeholder_ac_3500', displayName: '3500 Arena Credits', acAmount: 3500, unitPriceCents: 2499, currency: 'usd', active: true },
  { productType: 'SUBSCRIPTION', productId: 'sub-arena-pass', stripePriceId: 'price_placeholder_sub_arena', displayName: 'Arena Pass', subscriptionTier: 'pro', unitPriceCents: 999, currency: 'usd', active: true },
  { productType: 'SUBSCRIPTION', productId: 'sub-champions-pass', stripePriceId: 'price_placeholder_sub_champion', displayName: "Champion's Pass", subscriptionTier: 'champion', unitPriceCents: 1999, currency: 'usd', active: true },
  { productType: 'SUBSCRIPTION', productId: 'sub-founder', stripePriceId: 'price_placeholder_sub_founder', displayName: 'Founder — Lifetime', subscriptionTier: 'founder', unitPriceCents: 14900, currency: 'usd', active: true },
  { productType: 'TOURNAMENT_ENTRY', productId: 'ticket-pro-tour', stripePriceId: 'price_placeholder_ticket', displayName: 'Pro Tour Entry', unitPriceCents: 499, currency: 'usd', active: false },
  { productType: 'MARKETPLACE', productId: 'vault-card-back-neon', stripePriceId: 'price_placeholder_vault_neon', displayName: 'Neon Cyber Deck', unitPriceCents: 0, currency: 'usd', active: true },
  { productType: 'MARKETPLACE', productId: 'vault-card-back-royal', stripePriceId: 'price_placeholder_vault_royal', displayName: 'Royal Velvet Backs', unitPriceCents: 0, currency: 'usd', active: true },
  { productType: 'MARKETPLACE', productId: 'vault-table-classic', stripePriceId: 'price_placeholder_vault_table', displayName: 'Classic Table', unitPriceCents: 0, currency: 'usd', active: true },
];
