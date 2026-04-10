import { z } from 'zod';
import { UUIDSchema } from '@/schemas/common';

export const PaymentEventTypeSchema = z.enum([
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

export type PaymentEventType = z.infer<typeof PaymentEventTypeSchema>;

export const PaymentEventSchema = z.object({
  eventId: UUIDSchema,
  stripeEventId: z.string().optional(),
  type: PaymentEventTypeSchema,
  paymentId: z.string(),
  userId: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  metadata: z.object({
    productType: z.enum(['AC_CREDITS', 'SUBSCRIPTION', 'TOURNAMENT_ENTRY', 'MARKETPLACE']),
    productId: z.string(),
    acAmount: z.number().optional(),
    subscriptionTier: z.string().optional(),
  }),
  createdAt: z.number(),
  processedAt: z.number(),
  idempotencyKey: z.string(),
  previousState: z.string().optional(),
  currentState: z.string(),
});

export type PaymentEvent = z.infer<typeof PaymentEventSchema>;

export const PaymentStateSchema = z.enum([
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

export type PaymentState = z.infer<typeof PaymentStateSchema>;

export const CreateCheckoutRequestSchema = z.object({
  productType: z.enum(['AC_CREDITS', 'SUBSCRIPTION', 'TOURNAMENT_ENTRY', 'MARKETPLACE']),
  productId: z.string(),
  quantity: z.number().int().positive(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  acAmount: z.number().positive().optional(),
  subscriptionTier: z.enum(['pro', 'proplus']).optional(),
  durationMonths: z.number().int().positive().optional(),
  metadata: z.record(z.string()).optional(),
});

export type CreateCheckoutRequest = z.infer<typeof CreateCheckoutRequestSchema>;

export const TestInitPaymentRequestSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
});

export type TestInitPaymentRequest = z.infer<typeof TestInitPaymentRequestSchema>;

export const StripeEventDataObjectSchema = z
  .object({
    metadata: z.record(z.string()).optional(),
    subscription_details: z
      .object({ metadata: z.record(z.string()).optional() })
      .optional(),
    id: z.string().optional(),
    client_reference_id: z.string().optional(),
    amount_total: z.number().optional(),
  })
  .passthrough();

export const StripeDisputeObjectSchema = z
  .object({ charge: z.string().optional() })
  .passthrough();

export const StripePaymentIntentExpandedSchema = z
  .object({
    id: z.string().optional(),
    metadata: z.record(z.string()).optional(),
  })
  .passthrough()
  .nullable();

export const StripePaymentIntentLikeSchema = z
  .union([
    z.string(),
    z.object({
      id: z.string().optional(),
      metadata: z.record(z.string()).optional(),
    }).passthrough(),
  ])
  .nullable();

export type StripeEventDataObject = z.infer<typeof StripeEventDataObjectSchema>;

export const PaymentDOIsProcessedResponseSchema = z.object({
  processed: z.boolean().optional(),
});

export type PaymentDOIsProcessedResponse = z.infer<typeof PaymentDOIsProcessedResponseSchema>;

export const PaymentDOListResponseSchema = z.object({
  payments: z
    .array(
      z.object({
        paymentId: z.string().optional(),
        stripePaymentIntentId: z.string().optional(),
      })
    )
    .optional(),
});

export type PaymentDOListResponse = z.infer<typeof PaymentDOListResponseSchema>;

export const PaymentDOGetResponseSchema = z.object({
  amount: z.number().optional(),
  stripePaymentIntentId: z.string().optional(),
  currentState: z.string().optional(),
});

export type PaymentDOGetResponse = z.infer<typeof PaymentDOGetResponseSchema>;

export const ReconcileRequestSchema = z
  .object({ repair: z.boolean().optional() })
  .strict();

export type ReconcileRequest = z.infer<typeof ReconcileRequestSchema>;

export const StripeExpandableIdSchema = z
  .union([z.string(), z.object({ id: z.string() }).passthrough()])
  .transform((x) => (typeof x === 'string' ? x : x.id));

export const PaymentDOTransitionResponseSchema = z.object({
  payments: z.array(z.unknown()).optional(),
}).passthrough();

export type PaymentDOTransitionResponse = z.infer<typeof PaymentDOTransitionResponseSchema>;
