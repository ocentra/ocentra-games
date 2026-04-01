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
  isRefundable: boolean;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
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
    let body: { paymentId: string; userId?: string; amount: number; currency: string; productType: string; productId: string };
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
    };
    const { paymentId, toState, trigger, stripePaymentIntentId, stripeCheckoutSessionId } = body;
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
}
