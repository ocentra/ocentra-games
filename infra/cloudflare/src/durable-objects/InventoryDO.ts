import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { InventoryDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
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

interface InventoryOperationRecord {
  kind: 'add' | 'remove' | 'equip';
  itemId?: string;
  item?: InventoryItem;
  slot?: string;
}

type InventoryOperationJournal = Record<string, InventoryOperationRecord>;

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
      if (request.method === HttpMethod.Post && pathname.includes(InventoryDOSegment.AddItem)) {
        const body = (await request.json().catch(() => ({}))) as InventoryItem & { operationId?: string };
        const result = await this.addItem(body);
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ added: true, itemId: result.itemId });
      }
      if (request.method === HttpMethod.Post && pathname.includes(InventoryDOSegment.RemoveItem)) {
        const body = (await request.json().catch(() => ({}))) as { itemId?: string; operationId?: string };
        const result = await this.removeItem(body.itemId ?? '', body.operationId);
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

  private async loadOperationJournal(): Promise<InventoryOperationJournal> {
    return (await this.ctx.storage.get<InventoryOperationJournal>(InventoryDOStoragePrefix.Operations)) ?? {};
  }

  private async recordOperation(operationId: string, record: InventoryOperationRecord): Promise<void> {
    const journal = await this.loadOperationJournal();
    journal[operationId] = record;
    await this.ctx.storage.put(InventoryDOStoragePrefix.Operations, journal);
  }

  private async equip(
    itemId: string,
    slot: string,
    operationId?: string
  ): Promise<{ error?: string; status?: number; slot?: string; itemId?: string }> {
    if (!itemId || !slot) {
      return { error: 'Missing itemId or slot', status: HttpStatus.BadRequest };
    }
    const opKey = operationId ?? `equip:${itemId}:${slot}`;
    const journal = await this.loadOperationJournal();
    const existing = journal[opKey];
    if (existing?.kind === 'equip') {
      return { slot: existing.slot ?? slot, itemId: existing.itemId ?? itemId };
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
    await this.recordOperation(opKey, { kind: 'equip', itemId, slot });
    return { slot, itemId };
  }

  private async addItem(item: InventoryItem & { operationId?: string }): Promise<{ error?: string; status?: number; itemId?: string }> {
    if (!item?.itemId || !item?.type) {
      return { error: 'Invalid item: need itemId and type', status: HttpStatus.BadRequest };
    }
    const opKey = item.operationId ?? `add:${item.itemId}`;
    const journal = await this.loadOperationJournal();
    const existing = journal[opKey];
    if (existing?.kind === 'add') {
      return { itemId: existing.itemId ?? item.itemId };
    }
    const { items } = await this.getState();
    const currentItem = items[item.itemId];
    const count = (currentItem?.count ?? 0) + (item.count > 0 ? item.count : 1);
    const next: StoredItems = { ...items, [item.itemId]: { ...item, count } };
    await this.ctx.storage.put(InventoryDOStoragePrefix.Items, next);
    await this.recordOperation(opKey, { kind: 'add', itemId: item.itemId });
    return { itemId: item.itemId };
  }

  private async removeItem(itemId: string, operationId?: string): Promise<{ error?: string; status?: number; item?: InventoryItem }> {
    if (!itemId) return { error: 'Missing itemId', status: HttpStatus.BadRequest };
    const opKey = operationId ?? `remove:${itemId}`;
    const journal = await this.loadOperationJournal();
    const existing = journal[opKey];
    if (existing?.kind === 'remove') {
      return { item: existing.item ?? { itemId, type: 'unknown', count: 1 } };
    }
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
    await this.recordOperation(opKey, { kind: 'remove', item: { ...item, count: 1 }, itemId });
    return { item: { ...item, count: 1 } };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
