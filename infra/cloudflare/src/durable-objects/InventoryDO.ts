import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { InventoryDO as InventoryDOPaths, InventoryDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { InventoryDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';

interface InventoryItem {
  itemId: string;
  type: string;
  count: number;
  slot?: string;
  metadata?: Record<string, unknown>;
}

interface StoredItems {
  [itemId: string]: InventoryItem;
}

interface EquippedMap {
  [slot: string]: string;
}

export class InventoryDO implements DurableObject {
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

      if (request.method === HttpMethod.Get && pathname.includes(InventoryDOSegment.List)) {
        const { items, equipped } = await this.getState();
        return this.json({
          items: Object.values(items),
          equipped: { ...equipped },
        });
      }
      if (request.method === HttpMethod.Post && pathname.includes(InventoryDOSegment.Equip)) {
        const body = (await request.json().catch(() => ({}))) as { itemId?: string; slot?: string };
        const result = await this.equip(body.itemId ?? '', body.slot ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ equipped: true, slot: result.slot, itemId: result.itemId });
      }
      if (request.method === HttpMethod.Post && pathname.includes(InventoryDOSegment.Gift)) {
        const body = (await request.json().catch(() => ({}))) as { itemId?: string; targetUserId?: string };
        const result = await this.gift(body.itemId ?? '', body.targetUserId ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ sent: true });
      }
      if (request.method === HttpMethod.Post && pathname.includes(InventoryDOSegment.Trade)) {
        const body = (await request.json().catch(() => ({}))) as {
          myItemId?: string;
          theirItemId?: string;
          targetUserId?: string;
        };
        const result = await this.trade(
          body.myItemId ?? '',
          body.theirItemId ?? '',
          body.targetUserId ?? ''
        );
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ traded: true });
      }
      if (request.method === HttpMethod.Post && pathname.includes(InventoryDOSegment.AddItem)) {
        const body = (await request.json().catch(() => ({}))) as InventoryItem;
        const result = await this.addItem(body);
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ added: true, itemId: result.itemId });
      }
      if (request.method === HttpMethod.Post && pathname.includes(InventoryDOSegment.RemoveItem)) {
        const body = (await request.json().catch(() => ({}))) as { itemId?: string };
        const result = await this.removeItem(body.itemId ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ item: result.item });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('InventoryDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getState(): Promise<{ items: StoredItems; equipped: EquippedMap }> {
    const [items, equipped] = await Promise.all([
      this.ctx.storage.get<StoredItems>(InventoryDOStoragePrefix.Items),
      this.ctx.storage.get<EquippedMap>(InventoryDOStoragePrefix.Equipped),
    ]);
    return { items: items ?? {}, equipped: equipped ?? {} };
  }

  private async equip(
    itemId: string,
    slot: string
  ): Promise<{ error?: string; status?: number; slot?: string; itemId?: string }> {
    if (!itemId || !slot) {
      return { error: 'Missing itemId or slot', status: HttpStatus.BadRequest };
    }
    const { items, equipped } = await this.getState();
    const item = items[itemId];
    if (!item) return { error: 'Item not found', status: HttpStatus.NotFound };
    const nextEquipped = { ...equipped };
    for (const s of Object.keys(nextEquipped)) {
      if (nextEquipped[s] === itemId) delete nextEquipped[s];
    }
    nextEquipped[slot] = itemId;
    await this.ctx.storage.put(InventoryDOStoragePrefix.Equipped, nextEquipped);
    return { slot, itemId };
  }

  private async gift(itemId: string, targetUserId: string): Promise<{ error?: string; status?: number }> {
    if (!itemId || !targetUserId) {
      return { error: 'Missing itemId or targetUserId', status: HttpStatus.BadRequest };
    }
    const { items } = await this.getState();
    const item = items[itemId];
    if (!item) return { error: 'Item not found', status: HttpStatus.NotFound };
    const removed = await this.removeItem(itemId);
    if (removed.error) return { error: removed.error, status: removed.status };
    const ns = this.env.INVENTORY_DO;
    if (!ns) return { error: 'INVENTORY_DO not configured', status: HttpStatus.ServiceUnavailable };
    const targetId = ns.idFromName(targetUserId);
    const stub = ns.get(targetId);
    const addUrl = `http://dummy${InventoryDOPaths.AddItem}`;
    const addRes = await stub.fetch(addUrl, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify(removed.item),
    });
    if (!addRes.ok) {
      await addRes.text().catch(() => undefined);
      if (removed.item) await this.addItem(removed.item);
      return { error: 'Failed to add item to target', status: HttpStatus.BadGateway };
    }
    await addRes.text().catch(() => undefined);
    return {};
  }

  private async trade(
    myItemId: string,
    theirItemId: string,
    targetUserId: string
  ): Promise<{ error?: string; status?: number }> {
    if (!myItemId || !theirItemId || !targetUserId) {
      return { error: 'Missing myItemId, theirItemId or targetUserId', status: HttpStatus.BadRequest };
    }
    const ns = this.env.INVENTORY_DO;
    if (!ns) return { error: 'INVENTORY_DO not configured', status: HttpStatus.ServiceUnavailable };
    const targetId = ns.idFromName(targetUserId);
    const stub = ns.get(targetId);
    const removeUrl = `http://dummy${InventoryDOPaths.RemoveItem}`;
    const removeRes = await stub.fetch(removeUrl, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ itemId: theirItemId }),
    });
    if (!removeRes.ok) {
      const err = (await removeRes.json().catch(() => ({}))) as { error?: string };
      return { error: err.error ?? 'Target could not give item', status: removeRes.status };
    }
    const theirItem = (await removeRes.json()) as { item?: InventoryItem };
    if (!theirItem?.item) return { error: 'Target item not returned', status: HttpStatus.BadGateway };
    const { items } = await this.getState();
    const myItem = items[myItemId];
    if (!myItem) {
      const r = await stub.fetch(`http://dummy${InventoryDOPaths.AddItem}`, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify(theirItem.item),
      });
      await r.text().catch(() => undefined);
      return { error: 'My item not found', status: HttpStatus.NotFound };
    }
    const removed = await this.removeItem(myItemId);
    if (removed.error) {
      const r = await stub.fetch(`http://dummy${InventoryDOPaths.AddItem}`, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify(theirItem.item),
      });
      await r.text().catch(() => undefined);
      return { error: removed.error, status: removed.status };
    }
    await this.addItem(theirItem.item);
    const addRes = await stub.fetch(`http://dummy${InventoryDOPaths.AddItem}`, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify(removed.item),
    });
    if (!addRes.ok) {
      await addRes.text().catch(() => undefined);
      if (removed.item) await this.addItem(removed.item);
      await this.removeItem(theirItem.item.itemId);
      return { error: 'Failed to give my item to target', status: HttpStatus.BadGateway };
    }
    await addRes.text().catch(() => undefined);
    return {};
  }

  private async addItem(item: InventoryItem): Promise<{ error?: string; status?: number; itemId?: string }> {
    if (!item?.itemId || !item?.type) {
      return { error: 'Invalid item: need itemId and type', status: HttpStatus.BadRequest };
    }
    const { items } = await this.getState();
    const existing = items[item.itemId];
    const count = (existing?.count ?? 0) + (item.count > 0 ? item.count : 1);
    const next: StoredItems = { ...items, [item.itemId]: { ...item, count } };
    await this.ctx.storage.put(InventoryDOStoragePrefix.Items, next);
    return { itemId: item.itemId };
  }

  private async removeItem(itemId: string): Promise<{ error?: string; status?: number; item?: InventoryItem }> {
    if (!itemId) return { error: 'Missing itemId', status: HttpStatus.BadRequest };
    const { items, equipped } = await this.getState();
    const item = items[itemId];
    if (!item) return { error: 'Item not found', status: HttpStatus.NotFound };
    const nextItems = { ...items };
    const count = (item.count ?? 1) - 1;
    if (count <= 0) {
      delete nextItems[itemId];
    } else {
      nextItems[itemId] = { ...item, count };
    }
    const nextEquipped = { ...equipped };
    for (const slot of Object.keys(nextEquipped)) {
      if (nextEquipped[slot] === itemId) delete nextEquipped[slot];
    }
    await this.ctx.storage.put(InventoryDOStoragePrefix.Items, nextItems);
    await this.ctx.storage.put(InventoryDOStoragePrefix.Equipped, nextEquipped);
    return { item: { ...item, count: 1 } };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
