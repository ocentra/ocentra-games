import { schema } from '@ocentra/schema-domain/effect-builder';
import { UUIDSchema } from '@/schemas/common';

export const PaymentEventTypeSchema = schema.enum([
  'CHECKOUT_INITIATED',
  'CHECKOUT_CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'ENTITLEMENT_GRANTED',
  'REFUND_INITIATED',
  'REFUND_COMPLETED',
  'DISPUTE_CREATED',
  'DISPUTE_RESOLVED',
  'INVOICE_PAID',
  'INVOICE_FAILED',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_DELETED',
]);

export type PaymentEventType = schema.infer<typeof PaymentEventTypeSchema>;

export const PaymentEventSchema = schema.object({
  eventId: UUIDSchema,
  stripeEventId: schema.string().optional(),
  type: PaymentEventTypeSchema,
  paymentId: schema.string(),
  userId: schema.string(),
  amount: schema.number().nonnegative(),
  currency: schema.string().length(3),
  metadata: schema.object({
    productType: schema.enum(['AC_CREDITS', 'SUBSCRIPTION', 'TOURNAMENT_ENTRY', 'MARKETPLACE']),
    productId: schema.string(),
    entitlementKind: schema.enum(['credits', 'pass', 'cosmetic', 'play_access', 'event_ticket']).optional(),
    provider: schema.enum(['stripe', 'paypal', 'razorpay', 'solana']).optional(),
    quantity: schema.number().int().positive().optional(),
    acAmount: schema.number().optional(),
    subscriptionTier: schema.string().optional(),
    stripeCustomerId: schema.string().optional(),
    stripeSubscriptionId: schema.string().optional(),
  }),
  createdAt: schema.number(),
  processedAt: schema.number(),
  idempotencyKey: schema.string(),
  previousState: schema.string().optional(),
  currentState: schema.string(),
});

export type PaymentEvent = schema.infer<typeof PaymentEventSchema>;

export const PaymentStateSchema = schema.enum([
  'INITIATED',
  'CHECKOUT_CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'ENTITLEMENT_GRANTED',
  'REFUND_PENDING',
  'REFUND_COMPLETED',
  'DISPUTED',
  'DISPUTE_WON',
  'DISPUTE_LOST',
  'FAILED',
]);

export type PaymentState = schema.infer<typeof PaymentStateSchema>;

export const CreateCheckoutRequestSchema = schema.object({
  productType: schema.enum(['AC_CREDITS', 'SUBSCRIPTION', 'TOURNAMENT_ENTRY', 'MARKETPLACE']),
  productId: schema.string(),
  quantity: schema.number().int().positive(),
  successUrl: schema.string().url(),
  cancelUrl: schema.string().url(),
  acAmount: schema.number().positive().optional(),
  subscriptionTier: schema.enum(['pro', 'proplus']).optional(),
  durationMonths: schema.number().int().positive().optional(),
  metadata: schema.record(schema.string()).optional(),
});

export type CreateCheckoutRequest = schema.infer<typeof CreateCheckoutRequestSchema>;

export const TestInitPaymentRequestSchema = schema.object({
  paymentId: schema.string().uuid(),
  amount: schema.number().positive(),
  productType: schema.enum(['AC_CREDITS', 'SUBSCRIPTION', 'TOURNAMENT_ENTRY', 'MARKETPLACE']).optional(),
  productId: schema.string().optional(),
  entitlementKind: schema.enum(['credits', 'pass', 'cosmetic', 'play_access', 'event_ticket']).optional(),
  subscriptionTier: schema.string().optional(),
  quantity: schema.number().int().positive().optional(),
});

export type TestInitPaymentRequest = schema.infer<typeof TestInitPaymentRequestSchema>;

export const StripeEventDataObjectSchema = schema
  .object({
    metadata: schema.record(schema.string()).optional(),
    subscription_details: schema
      .object({ metadata: schema.record(schema.string()).optional() })
      .optional(),
    id: schema.string().optional(),
    customer: schema.union([schema.string(), schema.object({ id: schema.string() }).passthrough()]).optional(),
    subscription: schema.union([schema.string(), schema.object({ id: schema.string() }).passthrough()]).optional(),
    mode: schema.string().optional(),
    payment_status: schema.string().optional(),
    client_reference_id: schema.string().optional(),
    amount_total: schema.number().optional(),
    amount: schema.number().optional(),
  })
  .passthrough();

export const StripeDisputeObjectSchema = schema
  .object({ charge: schema.string().optional() })
  .passthrough();

export const StripePaymentIntentExpandedSchema = schema
  .object({
    id: schema.string().optional(),
    metadata: schema.record(schema.string()).optional(),
  })
  .passthrough()
  .nullable();

export const StripePaymentIntentLikeSchema = schema
  .union([
    schema.string(),
    schema.object({
      id: schema.string().optional(),
      metadata: schema.record(schema.string()).optional(),
    }).passthrough(),
  ])
  .nullable();

export type StripeEventDataObject = schema.infer<typeof StripeEventDataObjectSchema>;

export const PaymentDOIsProcessedResponseSchema = schema.object({
  processed: schema.boolean().optional(),
});

export type PaymentDOIsProcessedResponse = schema.infer<typeof PaymentDOIsProcessedResponseSchema>;

export const PaymentDOListResponseSchema = schema.object({
  payments: schema
    .array(
      schema.object({
        paymentId: schema.string().optional(),
        userId: schema.string().optional(),
        currency: schema.string().optional(),
        productType: schema.string().optional(),
        productId: schema.string().optional(),
        entitlementKind: schema.string().optional(),
        subscriptionTier: schema.string().optional(),
        provider: schema.string().optional(),
        stripePaymentIntentId: schema.string().optional(),
        stripeCheckoutSessionId: schema.string().optional(),
        stripeCustomerId: schema.string().optional(),
        stripeSubscriptionId: schema.string().optional(),
        currentState: schema.string().optional(),
      })
    )
    .optional(),
});

export type PaymentDOListResponse = schema.infer<typeof PaymentDOListResponseSchema>;

export const PaymentDOGetResponseSchema = schema.object({
  amount: schema.number().optional(),
  currency: schema.string().optional(),
  userId: schema.string().optional(),
  productType: schema.string().optional(),
  productId: schema.string().optional(),
  entitlementKind: schema.string().optional(),
  subscriptionTier: schema.string().optional(),
  provider: schema.string().optional(),
  quantity: schema.number().optional(),
  acAmount: schema.number().optional(),
  stripePaymentIntentId: schema.string().optional(),
  stripeCheckoutSessionId: schema.string().optional(),
  stripeCustomerId: schema.string().optional(),
  stripeSubscriptionId: schema.string().optional(),
  providerPaymentId: schema.string().optional(),
  providerOrderId: schema.string().optional(),
  providerReference: schema.string().optional(),
  currentState: schema.string().optional(),
  fulfilledAt: schema.number().optional(),
});

export type PaymentDOGetResponse = schema.infer<typeof PaymentDOGetResponseSchema>;

export const ReconcileRequestSchema = schema
  .object({ repair: schema.boolean().optional() })
  .strict();

export type ReconcileRequest = schema.infer<typeof ReconcileRequestSchema>;

export const StripeExpandableIdSchema = schema
  .union([schema.string(), schema.object({ id: schema.string() }).passthrough()])
  .transform((x) => (typeof x === 'string' ? x : x.id));

export const PaymentDOTransitionResponseSchema = schema.object({
  payments: schema.array(schema.unknown()).optional(),
}).passthrough();

export type PaymentDOTransitionResponse = schema.infer<typeof PaymentDOTransitionResponseSchema>;

export const PaymentCustomerPortalRequestSchema = schema
  .object({
    returnUrl: schema.string().url(),
  })
  .strict();

export type PaymentCustomerPortalRequest = schema.infer<typeof PaymentCustomerPortalRequestSchema>;

export const PaymentCustomerPortalResponseSchema = schema
  .object({
    url: schema.string().url(),
  })
  .strict();

export type PaymentCustomerPortalResponse = schema.infer<typeof PaymentCustomerPortalResponseSchema>;

export const PaymentPurchaseHistoryResponseSchema = schema
  .object({
    purchases: schema.array(schema.object({
      paymentId: schema.string(),
      provider: schema.string(),
      productId: schema.string(),
      productType: schema.string(),
      entitlementKind: schema.string().optional(),
      amount: schema.number(),
      currency: schema.string(),
      quantity: schema.number(),
      status: schema.string(),
      createdAt: schema.number(),
      fulfilledAt: schema.number().optional(),
    })),
  })
  .strict();

export type PaymentPurchaseHistoryResponse = schema.infer<typeof PaymentPurchaseHistoryResponseSchema>;

export const PayPalCaptureRequestSchema = schema
  .object({
    paymentId: schema.string().uuid(),
    orderId: schema.string().min(1).max(128),
  })
  .strict();

export type PayPalCaptureRequest = schema.infer<typeof PayPalCaptureRequestSchema>;

export const RazorpayVerifyRequestSchema = schema
  .object({
    paymentId: schema.string().uuid(),
    razorpayOrderId: schema.string().min(1).max(128),
    razorpayPaymentId: schema.string().min(1).max(128),
    razorpaySignature: schema.string().min(1).max(256),
  })
  .strict();

export type RazorpayVerifyRequest = schema.infer<typeof RazorpayVerifyRequestSchema>;

export const SolanaConfirmRequestSchema = schema
  .object({
    paymentId: schema.string().uuid(),
    signature: schema.string().min(1).max(256),
  })
  .strict();

export type SolanaConfirmRequest = schema.infer<typeof SolanaConfirmRequestSchema>;

export const PaymentProviderSettlementResponseSchema = schema
  .object({
    success: schema.boolean(),
    provider: schema.enum(['stripe', 'paypal', 'razorpay', 'solana']),
    paymentId: schema.string().uuid(),
    status: schema.enum(['completed', 'pending', 'failed']),
    message: schema.string().max(500).optional(),
  })
  .strict();

export type PaymentProviderSettlementResponse = schema.infer<typeof PaymentProviderSettlementResponseSchema>;
