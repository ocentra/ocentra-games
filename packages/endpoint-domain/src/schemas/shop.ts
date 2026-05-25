import { schema } from '@ocentra/schema-domain/effect-builder';

export const ShopTabSchema = schema.enum(['Treasury', 'Elite', 'Vault', 'Play Access', 'Events']);
export type ShopTab = schema.infer<typeof ShopTabSchema>;

export const ShopProductTypeSchema = schema.enum(['AC_CREDITS', 'SUBSCRIPTION', 'TOURNAMENT_ENTRY', 'MARKETPLACE']);
export type ShopProductType = schema.infer<typeof ShopProductTypeSchema>;

export const ShopEntitlementKindSchema = schema.enum(['credits', 'pass', 'cosmetic', 'play_access', 'event_ticket']);
export type ShopEntitlementKind = schema.infer<typeof ShopEntitlementKindSchema>;

export const ShopAvailabilitySchema = schema.enum(['live', 'preview', 'coming_soon']);
export type ShopAvailability = schema.infer<typeof ShopAvailabilitySchema>;

export const ShopPaymentProviderSchema = schema.enum(['stripe', 'paypal', 'razorpay', 'solana']);
export type ShopPaymentProvider = schema.infer<typeof ShopPaymentProviderSchema>;

export const ShopBillingModeSchema = schema.enum(['payment', 'subscription']);
export type ShopBillingMode = schema.infer<typeof ShopBillingModeSchema>;

export const ShopPurchaseStatusSchema = schema.enum([
  'redirect',
  'completed',
  'pending',
  'failed',
  'provider_not_configured',
]);
export type ShopPurchaseStatus = schema.infer<typeof ShopPurchaseStatusSchema>;

export const ShopProductSchema = schema.object({
  productId: schema.string().min(1).max(128),
  productType: ShopProductTypeSchema,
  displayName: schema.string().min(1).max(160),
  description: schema.string().max(1000).optional(),
  shopTab: ShopTabSchema.optional(),
  badge: schema.string().max(48).optional(),
  benefits: schema.array(schema.string().min(1).max(220)).optional(),
  entitlementKind: ShopEntitlementKindSchema.optional(),
  availability: ShopAvailabilitySchema.optional(),
  acAmount: schema.number().int().positive().optional(),
  acPrice: schema.number().int().nonnegative().optional(),
  unitPriceCents: schema.number().int().nonnegative().optional(),
  priceLabel: schema.string().max(64).optional(),
  subscriptionTier: schema.string().max(64).optional(),
  currency: schema.string().length(3).default('usd'),
  billingMode: ShopBillingModeSchema.optional(),
  active: schema.boolean().default(true),
  paymentProviders: schema.array(ShopPaymentProviderSchema).optional(),
  competitionProgramId: schema.string().min(1).max(128).optional(),
});
export type ShopProduct = schema.infer<typeof ShopProductSchema>;

export const ShopProductStorageSchema = ShopProductSchema.extend({
  stripePriceId: schema.string().min(1).optional(),
  stripeProductId: schema.string().min(1).optional(),
  providerRefs: schema.record(schema.record(schema.unknown())).optional(),
}).passthrough();
export type ShopProductStorage = schema.infer<typeof ShopProductStorageSchema>;

export const ShopProductsResponseSchema = schema.object({
  products: schema.array(ShopProductSchema),
}).strict();
export type ShopProductsResponse = schema.infer<typeof ShopProductsResponseSchema>;

export const ShopPurchaseRequestSchema = schema.object({
  productId: schema.string().min(1).max(128),
  productType: ShopProductTypeSchema,
  quantity: schema.number().int().positive().default(1),
  provider: ShopPaymentProviderSchema,
  returnUrl: schema.string().url().optional(),
  cancelUrl: schema.string().url().optional(),
  metadata: schema.record(schema.unknown()).optional(),
}).strict();
export type ShopPurchaseRequest = schema.infer<typeof ShopPurchaseRequestSchema>;

export const ShopPurchaseResponseSchema = schema.object({
  success: schema.boolean(),
  status: ShopPurchaseStatusSchema,
  provider: ShopPaymentProviderSchema.optional(),
  productId: schema.string().min(1).max(128).optional(),
  paymentId: schema.string().optional(),
  redirectUrl: schema.string().url().optional(),
  providerData: schema.record(schema.unknown()).optional(),
  code: schema.enum([
    'provider_not_configured',
    'provider_unavailable',
    'product_not_found',
    'product_unavailable',
    'checkout_unavailable',
    'authentication_required',
    'validation_failed',
    'unknown_error',
  ]).optional(),
  message: schema.string().max(500).optional(),
}).strict();
export type ShopPurchaseResponse = schema.infer<typeof ShopPurchaseResponseSchema>;

export const ShopAccountStateSchema = schema.object({
  acBalance: schema.number().int().nonnegative().optional(),
  activePass: schema.string().optional(),
  ownedItemCount: schema.number().int().nonnegative().optional(),
  activeTables: schema.string().optional(),
  tournamentTickets: schema.number().int().nonnegative().optional(),
  seasonPoints: schema.number().int().nonnegative().optional(),
  recentPurchases: schema.array(schema.object({
    label: schema.string(),
    value: schema.string(),
    detail: schema.string().optional(),
  })).optional(),
}).strict();
export type ShopAccountState = schema.infer<typeof ShopAccountStateSchema>;
