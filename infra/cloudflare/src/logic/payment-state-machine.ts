import { PaymentTrigger } from '@ocentra/endpoint-domain/constants/stripe';

export const PAYMENT_VALID_TRANSITIONS: Record<string, string[]> = {
  INITIATED: ['CHECKOUT_CREATED', 'FAILED', 'PAYMENT_SUCCEEDED'],
  CHECKOUT_CREATED: ['PAYMENT_PENDING', 'PAYMENT_SUCCEEDED', 'FAILED'],
  PAYMENT_PENDING: ['PAYMENT_SUCCEEDED', 'PAYMENT_FAILED'],
  PAYMENT_SUCCEEDED: ['ENTITLEMENT_GRANTED', 'REFUND_PENDING'],
  PAYMENT_FAILED: ['INITIATED'],
  ENTITLEMENT_GRANTED: ['REFUND_PENDING', 'DISPUTED'],
  REFUND_PENDING: ['REFUND_COMPLETED'],
  REFUND_COMPLETED: [],
  DISPUTED: ['DISPUTE_WON', 'DISPUTE_LOST'],
  DISPUTE_WON: [],
  DISPUTE_LOST: [],
};

/**
 * @mutation
 * @mutation-reason State machine lookup: valid next states must match PAYMENT_VALID_TRANSITIONS exactly; unknown state must return empty array
 * @mutation-invariant Return is exactly PAYMENT_VALID_TRANSITIONS[fromState] or [] when fromState not in table
 */
export function getValidNextStates(fromState: string): string[] {
  return PAYMENT_VALID_TRANSITIONS[fromState] ?? [];
}

/**
 * @mutation
 * @mutation-reason Payment transition guard is money-critical; only allowed transitions must return true; INITIATED->PAYMENT_SUCCEEDED only with ReconcileRepair
 * @mutation-invariant true only when toState is in getValidNextStates(fromState)
 * @mutation-invariant false when INITIATED->PAYMENT_SUCCEEDED and trigger is not ReconcileRepair
 * @mutation-invariant false for any transition not in PAYMENT_VALID_TRANSITIONS
 */
export function isTransitionAllowed(
  fromState: string,
  toState: string,
  trigger?: string
): boolean {
  const validNext = getValidNextStates(fromState);
  if (!validNext.includes(toState)) return false;
  if (
    fromState === 'INITIATED' &&
    toState === 'PAYMENT_SUCCEEDED' &&
    trigger !== PaymentTrigger.ReconcileRepair
  ) {
    return false;
  }
  return true;
}
