import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { PaymentDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { PaymentEventSchema } from '@ocentra/endpoint-domain/schemas/payments';
import type { PaymentEvent } from '@ocentra/endpoint-domain/schemas/payments';
import { PaymentDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isTransitionAllowed } from '@/logic/payment-state-machine';

interface PaymentStateMachine {
  paymentId: string;
  currentState: string;
  stateHistory: Array<{ state: string; enteredAt: number; triggeredBy: string }>;
  userId: string;
  amount: number;
  currency: string;
  provider?: string;
  productType?: string;
  productId?: string;
  quantity?: number;
  entitlementKind?: string;
  acAmount?: number;
  subscriptionTier?: string;
  isRefundable: boolean;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerReference?: string;
  fulfilledAt?: number;
}

interface PurchaseHistoryEntry {
  paymentId: string;
  provider: string;
  productId: string;
  productType: string;
  entitlementKind?: string;
  amount: number;
  currency: string;
  quantity: number;
  status: string;
  createdAt: number;
  fulfilledAt?: number;
}

export class PaymentDO implements DurableObject {
  private initialized = false;
  private readonly log = Logger.instance;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env
  ) {
    this.log.register(import.meta.url);
  }

  private logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logInfo(message, stackTrace, data, enabled);
  };

  private logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logWarn(message, stackTrace, data, enabled);
  };

  private logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
    this.log.logError(message, stackTrace, data);
  };

  private logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logDebug(message, stackTrace, data, enabled);
  };

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PaymentDOSegment.StoreEvent}`)) {
        return this.storeEvent(request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PaymentDOSegment.IsProcessed}`)) {
        return this.isProcessed(url.searchParams.get(QueryParam.StripeEventId));
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PaymentDOSegment.QueryEvents}`)) {
        return this.queryEvents(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PaymentDOSegment.InitPayment}`)) {
        return this.initPayment(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PaymentDOSegment.Transition}`)) {
        return this.transition(request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PaymentDOSegment.GetPayment}`)) {
        return this.getPayment(url.searchParams.get(QueryParam.PaymentId));
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PaymentDOSegment.ListPayments}`)) {
        return this.listPayments();
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PaymentDOSegment.StripeCustomer}`)) {
        return this.getStripeCustomer();
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PaymentDOSegment.StripeCustomer}`)) {
        return this.setStripeCustomer(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PaymentDOSegment.StorePurchase}`)) {
        return this.storePurchase(request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PaymentDOSegment.ListPurchases}`)) {
        return this.listPurchases();
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('PaymentDO fetch error', getStackTrace(), { error, url: request.url });
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: HttpStatus.InternalServerError,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
  }

  private async storeEvent(request: Request): Promise<Response> {
    const body = await request.json();
    const event = PaymentEventSchema.parse(body) as PaymentEvent;
    await this.ctx.storage.put(`${PaymentDOStoragePrefix.Event}${event.eventId}`, event);
    if (event.stripeEventId) {
      await this.ctx.storage.put(`${PaymentDOStoragePrefix.StripeEvent}${event.stripeEventId}`, event.eventId);
    }
    const paymentEvents: string[] = (await this.ctx.storage.get(`${PaymentDOStoragePrefix.PaymentEvents}${event.paymentId}`)) ?? [];
    paymentEvents.push(event.eventId);
    await this.ctx.storage.put(`${PaymentDOStoragePrefix.PaymentEvents}${event.paymentId}`, paymentEvents);
    return new Response(JSON.stringify({ stored: true }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async isProcessed(stripeEventId: string | null): Promise<Response> {
    if (!stripeEventId) {
      return new Response(JSON.stringify({ processed: false }), {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const eventId = await this.ctx.storage.get<string>(`${PaymentDOStoragePrefix.StripeEvent}${stripeEventId}`);
    return new Response(JSON.stringify({ processed: !!eventId }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async queryEvents(request: Request): Promise<Response> {
    const body = await request.json() as { paymentId?: string };
    const paymentId = body.paymentId ?? '';
    const eventIds: string[] = (await this.ctx.storage.get(`${PaymentDOStoragePrefix.PaymentEvents}${paymentId}`)) ?? [];
    const events: PaymentEvent[] = [];
    for (const id of eventIds) {
      const event = await this.ctx.storage.get<PaymentEvent>(`${PaymentDOStoragePrefix.Event}${id}`);
      if (event) events.push(event);
    }
    return new Response(JSON.stringify({ events }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async initPayment(request: Request): Promise<Response> {
    let body: {
      paymentId: string;
      userId?: string;
      amount: number;
      currency: string;
      provider?: string;
      productType?: string;
      productId?: string;
      quantity?: number;
      entitlementKind?: string;
      acAmount?: number;
      subscriptionTier?: string;
      stripeCustomerId?: string;
      providerPaymentId?: string;
      providerOrderId?: string;
      providerReference?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const { paymentId, amount, currency } = body;
    const machine: PaymentStateMachine = {
      paymentId,
      currentState: 'INITIATED',
      stateHistory: [{ state: 'INITIATED', enteredAt: Date.now(), triggeredBy: 'checkout_request' }],
      userId: body.userId ?? '',
      amount,
      currency,
      provider: body.provider,
      productType: body.productType,
      productId: body.productId,
      quantity: body.quantity,
      entitlementKind: body.entitlementKind,
      acAmount: body.acAmount,
      subscriptionTier: body.subscriptionTier,
      stripeCustomerId: body.stripeCustomerId,
      providerPaymentId: body.providerPaymentId,
      providerOrderId: body.providerOrderId,
      providerReference: body.providerReference,
      isRefundable: true,
    };
    await this.ctx.storage.put(`${PaymentDOStoragePrefix.Machine}${paymentId}`, machine);
    return new Response(JSON.stringify({ paymentId, state: 'INITIATED' }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async transition(request: Request): Promise<Response> {
    const body = await request.json() as {
      paymentId: string;
      toState: string;
      trigger: string;
      stripePaymentIntentId?: string;
      stripeCheckoutSessionId?: string;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      providerPaymentId?: string;
      providerOrderId?: string;
      providerReference?: string;
    };
    const {
      paymentId,
      toState,
      trigger,
      stripePaymentIntentId,
      stripeCheckoutSessionId,
      stripeCustomerId,
      stripeSubscriptionId,
      providerPaymentId,
      providerOrderId,
      providerReference,
    } = body;
    const machine = await this.ctx.storage.get<PaymentStateMachine>(`${PaymentDOStoragePrefix.Machine}${paymentId}`);
    if (!machine) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: HttpStatus.NotFound,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const fromState = machine.currentState;
    const allowed = isTransitionAllowed(fromState, toState, trigger);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: `Invalid transition: ${fromState} -> ${toState}` }),
        {
          status: HttpStatus.Conflict,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }
    machine.stateHistory.push({ state: toState, enteredAt: Date.now(), triggeredBy: trigger });
    machine.currentState = toState;
    if (stripePaymentIntentId) machine.stripePaymentIntentId = stripePaymentIntentId;
    if (stripeCheckoutSessionId) machine.stripeCheckoutSessionId = stripeCheckoutSessionId;
    if (stripeCustomerId) machine.stripeCustomerId = stripeCustomerId;
    if (stripeSubscriptionId) machine.stripeSubscriptionId = stripeSubscriptionId;
    if (providerPaymentId) machine.providerPaymentId = providerPaymentId;
    if (providerOrderId) machine.providerOrderId = providerOrderId;
    if (providerReference) machine.providerReference = providerReference;
    if (toState === 'ENTITLEMENT_GRANTED') machine.fulfilledAt = Date.now();
    await this.ctx.storage.put(`${PaymentDOStoragePrefix.Machine}${paymentId}`, machine);
    return new Response(JSON.stringify({ paymentId, previousState: fromState, currentState: toState }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async getPayment(paymentId: string | null): Promise<Response> {
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Missing paymentId' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const machine = await this.ctx.storage.get<PaymentStateMachine>(`${PaymentDOStoragePrefix.Machine}${paymentId}`);
    if (!machine) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: HttpStatus.NotFound,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    return new Response(JSON.stringify(machine), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async listPayments(): Promise<Response> {
    const list = await this.ctx.storage.list<PaymentStateMachine>({ prefix: PaymentDOStoragePrefix.Machine });
    const payments = Array.from(list.values());
    return new Response(JSON.stringify({ payments }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async getStripeCustomer(): Promise<Response> {
    const stripeCustomerId = await this.ctx.storage.get<string>(PaymentDOStoragePrefix.StripeCustomer);
    return new Response(JSON.stringify({ stripeCustomerId: stripeCustomerId ?? null }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async setStripeCustomer(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({})) as { stripeCustomerId?: string };
    const stripeCustomerId = body.stripeCustomerId ?? '';
    if (!stripeCustomerId) {
      return new Response(JSON.stringify({ error: 'Missing stripeCustomerId' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    await this.ctx.storage.put(PaymentDOStoragePrefix.StripeCustomer, stripeCustomerId);
    return new Response(JSON.stringify({ stripeCustomerId }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async storePurchase(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({})) as PurchaseHistoryEntry;
    if (!body.paymentId || !body.productId || !body.productType) {
      return new Response(JSON.stringify({ error: 'Invalid purchase history entry' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const purchases = (await this.ctx.storage.get<PurchaseHistoryEntry[]>(PaymentDOStoragePrefix.PurchaseHistory)) ?? [];
    const existingIndex = purchases.findIndex((item) => item.paymentId === body.paymentId);
    const nextEntry: PurchaseHistoryEntry = {
      ...body,
      quantity: body.quantity > 0 ? body.quantity : 1,
      createdAt: body.createdAt || Date.now(),
    };
    if (existingIndex >= 0) {
      purchases[existingIndex] = { ...purchases[existingIndex], ...nextEntry };
    } else {
      purchases.push(nextEntry);
    }
    if (purchases.length > 100) purchases.splice(0, purchases.length - 100);
    await this.ctx.storage.put(PaymentDOStoragePrefix.PurchaseHistory, purchases);
    return new Response(JSON.stringify({ stored: true, paymentId: nextEntry.paymentId }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async listPurchases(): Promise<Response> {
    const purchases = (await this.ctx.storage.get<PurchaseHistoryEntry[]>(PaymentDOStoragePrefix.PurchaseHistory)) ?? [];
    return new Response(JSON.stringify({ purchases: purchases.slice().reverse() }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
