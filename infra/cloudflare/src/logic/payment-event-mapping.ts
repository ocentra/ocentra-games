import { StripeEventType } from '@ocentra/endpoint-domain/constants/stripe';
import type { PaymentEvent } from '@ocentra/endpoint-domain/schemas/payments';

export function mapStripeEventType(type: string): PaymentEvent['type'] {
  switch (type) {
    case StripeEventType.CheckoutSessionCompleted:
      return 'CHECKOUT_CREATED';
    case StripeEventType.PaymentIntentSucceeded:
      return 'PAYMENT_SUCCEEDED';
    case StripeEventType.PaymentIntentPaymentFailed:
      return 'PAYMENT_FAILED';
    case StripeEventType.ChargeRefunded:
      return 'REFUND_COMPLETED';
    case StripeEventType.ChargeDisputeCreated:
      return 'DISPUTE_CREATED';
    case StripeEventType.ChargeDisputeClosed:
      return 'DISPUTE_RESOLVED';
    case StripeEventType.InvoicePaid:
      return 'INVOICE_PAID';
    case StripeEventType.InvoicePaymentFailed:
      return 'INVOICE_FAILED';
    case StripeEventType.SubscriptionCreated:
      return 'SUBSCRIPTION_CREATED';
    case StripeEventType.SubscriptionUpdated:
      return 'SUBSCRIPTION_UPDATED';
    case StripeEventType.SubscriptionDeleted:
      return 'SUBSCRIPTION_DELETED';
    default:
      return 'CHECKOUT_CREATED';
  }
}

export function stripeEventTypeToState(type: string): string | null {
  switch (type) {
    case StripeEventType.CheckoutSessionCompleted:
      return 'PAYMENT_PENDING';
    case StripeEventType.PaymentIntentSucceeded:
      return 'PAYMENT_SUCCEEDED';
    case StripeEventType.PaymentIntentPaymentFailed:
      return 'PAYMENT_FAILED';
    case StripeEventType.ChargeRefunded:
      return 'REFUND_COMPLETED';
    case StripeEventType.ChargeDisputeCreated:
      return 'DISPUTED';
    case StripeEventType.ChargeDisputeClosed:
      return null;
    case StripeEventType.InvoicePaid:
    case StripeEventType.InvoicePaymentFailed:
    case StripeEventType.SubscriptionCreated:
    case StripeEventType.SubscriptionUpdated:
    case StripeEventType.SubscriptionDeleted:
      return null;
    default:
      return null;
  }
}
