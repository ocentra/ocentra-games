import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { MarketplaceDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Currency } from '@ocentra/endpoint-domain/constants/credits';
import { MarketplaceDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
const MAX_LISTINGS = 2000;
const MAX_HISTORY = 500;

interface Listing {
  listingId: string;
  sellerId: string;
  itemId: string;
  itemType: string;
  price: number;
  currency: string;
  createdAt: number;
}

interface HistoryEntry {
  entryId: string;
  type: 'sale' | 'purchase';
  listingId: string;
  sellerId: string;
  buyerId: string;
  itemId: string;
  price: number;
  currency: string;
  at: number;
}

export class MarketplaceDO implements DurableObject {
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

      if (request.method === HttpMethod.Get && pathname.endsWith(`/${MarketplaceDOSegment.List}`)) {
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
        const result = await this.list(limit);
        return this.json({ listings: result.listings });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MarketplaceDOSegment.Buy}`)) {
        const body = (await request.json().catch(() => ({}))) as { listingId?: string; buyerId?: string };
        const result = await this.buy(body.listingId ?? '', body.buyerId ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ purchased: true, listingId: result.listingId });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MarketplaceDOSegment.Sell}`)) {
        const body = (await request.json().catch(() => ({}))) as {
          sellerId?: string;
          itemId?: string;
          itemType?: string;
          price?: number;
          currency?: string;
        };
        const result = await this.sell(body);
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ listed: true, listingId: result.listingId });
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${MarketplaceDOSegment.History}`)) {
        const userId = url.searchParams.get('userId') ?? '';
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
        const result = await this.history(userId, limit);
        return this.json({ history: result.history });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('MarketplaceDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getListings(): Promise<Listing[]> {
    const stored = await this.ctx.storage.get<Listing[]>(MarketplaceDOStoragePrefix.Listings);
    return stored ?? [];
  }

  private async getHistory(): Promise<HistoryEntry[]> {
    const stored = await this.ctx.storage.get<HistoryEntry[]>(MarketplaceDOStoragePrefix.History);
    return stored ?? [];
  }

  private async list(limit: number): Promise<{ listings: Listing[] }> {
    const listings = await this.getListings();
    const slice = listings.slice(-limit).reverse();
    return { listings: slice };
  }

  private async sell(body: {
    sellerId?: string;
    itemId?: string;
    itemType?: string;
    price?: number;
    currency?: string;
  }): Promise<{ error?: string; status?: number; listingId?: string }> {
    const sellerId = body.sellerId ?? '';
    const itemId = body.itemId ?? '';
    const itemType = body.itemType ?? 'item';
    const price = typeof body.price === 'number' ? Math.max(0, body.price) : 0;
    const currency = (body.currency ?? Currency.GP).slice(0, 16);
    if (!sellerId || !itemId) return { error: 'Missing sellerId or itemId', status: HttpStatus.BadRequest };
    const listings = await this.getListings();
    const listing: Listing = {
      listingId: crypto.randomUUID(),
      sellerId: sellerId.slice(0, 128),
      itemId: itemId.slice(0, 128),
      itemType: itemType.slice(0, 64),
      price,
      currency,
      createdAt: Date.now(),
    };
    listings.push(listing);
    if (listings.length > MAX_LISTINGS) listings.splice(0, listings.length - MAX_LISTINGS);
    await this.ctx.storage.put(MarketplaceDOStoragePrefix.Listings, listings);
    return { listingId: listing.listingId };
  }

  private async buy(
    listingId: string,
    buyerId: string
  ): Promise<{ error?: string; status?: number; listingId?: string }> {
    if (!listingId || !buyerId) return { error: 'Missing listingId or buyerId', status: HttpStatus.BadRequest };
    const listings = await this.getListings();
    const idx = listings.findIndex((l) => l.listingId === listingId);
    if (idx === -1) return { error: 'Listing not found', status: HttpStatus.NotFound };
    const listing = listings[idx];
    if (listing.sellerId === buyerId) return { error: 'Cannot buy own listing', status: HttpStatus.BadRequest };
    listings.splice(idx, 1);
    await this.ctx.storage.put(MarketplaceDOStoragePrefix.Listings, listings);
    const history = await this.getHistory();
    const entry: HistoryEntry = {
      entryId: crypto.randomUUID(),
      type: 'purchase',
      listingId: listing.listingId,
      sellerId: listing.sellerId,
      buyerId: buyerId.slice(0, 128),
      itemId: listing.itemId,
      price: listing.price,
      currency: listing.currency,
      at: Date.now(),
    };
    history.push(entry);
    const sellerEntry: HistoryEntry = {
      ...entry,
      entryId: crypto.randomUUID(),
      type: 'sale',
    };
    history.push(sellerEntry);
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    await this.ctx.storage.put(MarketplaceDOStoragePrefix.History, history);
    return { listingId: listing.listingId };
  }

  private async history(userId: string, limit: number): Promise<{ history: HistoryEntry[] }> {
    const history = await this.getHistory();
    const filtered = userId
      ? history.filter((e) => e.buyerId === userId || e.sellerId === userId)
      : history;
    const slice = filtered.slice(-limit).reverse();
    return { history: slice };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
