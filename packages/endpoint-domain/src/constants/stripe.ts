import type { ApiPath } from '@/types/brands';
import { ApiPathPrefix } from '@/constants/versions';

const stripeBase = `${ApiPathPrefix}/stripe`;

export const StripeEndpoint = {
  Base: stripeBase as ApiPath,
  CreateCheckoutSession: `${stripeBase}/create-checkout-session` as ApiPath,
  Webhook: `${stripeBase}/webhook` as ApiPath,
  TestInitPayment: `${stripeBase}/test-init-payment` as ApiPath,
} as const;

export const StripeEventType = {
  CheckoutSessionCompleted: 'checkout.session.completed',
  PaymentIntentSucceeded: 'payment_intent.succeeded',
  PaymentIntentPaymentFailed: 'payment_intent.payment_failed',
  ChargeRefunded: 'charge.refunded',
  ChargeDisputeCreated: 'charge.dispute.created',
  ChargeDisputeClosed: 'charge.dispute.closed',
  InvoicePaid: 'invoice.paid',
  InvoicePaymentFailed: 'invoice.payment_failed',
  SubscriptionCreated: 'customer.subscription.created',
  SubscriptionUpdated: 'customer.subscription.updated',
  SubscriptionDeleted: 'customer.subscription.deleted',
} as const;

export type StripeEventType = (typeof StripeEventType)[keyof typeof StripeEventType];

export const PaymentTrigger = {
  RefundRequest: 'refund_request',
  StripePrefix: 'stripe:',
  ReconcileRepair: 'reconcile_repair',
  FulfillmentGranted: 'fulfillment_granted',
  PayPalCaptureCompleted: 'paypal_capture_completed',
  RazorpaySignatureVerified: 'razorpay_signature_verified',
  SolanaPaymentConfirmed: 'solana_payment_confirmed',
} as const;

export type PaymentTriggerType = (typeof PaymentTrigger)[keyof typeof PaymentTrigger];
