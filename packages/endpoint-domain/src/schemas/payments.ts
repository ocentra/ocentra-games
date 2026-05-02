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
  amount: schema.number().positive(),
  currency: schema.string().length(3),
  metadata: schema.object({
    productType: schema.enum(['AC_CREDITS', 'SUBSCRIPTION', 'TOURNAMENT_ENTRY', 'MARKETPLACE']),
    productId: schema.string(),
    acAmount: schema.number().optional(),
    subscriptionTier: schema.string().optional(),
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
});

export type TestInitPaymentRequest = schema.infer<typeof TestInitPaymentRequestSchema>;

export const StripeEventDataObjectSchema = schema
  .object({
    metadata: schema.record(schema.string()).optional(),
    subscription_details: schema
      .object({ metadata: schema.record(schema.string()).optional() })
      .optional(),
    id: schema.string().optional(),
    client_reference_id: schema.string().optional(),
    amount_total: schema.number().optional(),
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
        stripePaymentIntentId: schema.string().optional(),
      })
    )
    .optional(),
});

export type PaymentDOListResponse = schema.infer<typeof PaymentDOListResponseSchema>;

export const PaymentDOGetResponseSchema = schema.object({
  amount: schema.number().optional(),
  stripePaymentIntentId: schema.string().optional(),
  currentState: schema.string().optional(),
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
