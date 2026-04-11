import { BaseFlow } from '@/flows/core/BaseFlow';
import type { FlowContext } from '@/flows/core/FlowContext';
import type { FlowResult } from '@/flows/core/FlowResult';
import { fetchFromDO } from '@/utils/durable-object-request';
import { InventoryDO as InventoryDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';

type InventoryItem = {
  itemId: string;
  type: string;
  count?: number;
  slot?: string;
  metadata?: Record<string, unknown>;
};

type InventoryMutationResponse = {
  itemId?: string;
  item?: InventoryItem;
  error?: string;
};

export type InventoryTransferFlowInput =
  | {
      kind: 'gift';
      itemId: string;
      targetUserId: string;
      idempotencyKey?: string;
    }
  | {
      kind: 'trade';
      myItemId: string;
      theirItemId: string;
      targetUserId: string;
      idempotencyKey?: string;
    };

function deriveInventoryOperationId(context: FlowContext, input: InventoryTransferFlowInput): string {
  if (input.idempotencyKey) return input.idempotencyKey;
  if (context.operationId) return context.operationId;
  const userId = context.authUserId ?? 'inventory';
  switch (input.kind) {
    case 'gift':
      return `gift-${userId}-${input.targetUserId}-${input.itemId}`;
    case 'trade':
      return `trade-${userId}-${input.targetUserId}-${input.myItemId}-${input.theirItemId}`;
  }
}

async function parseInventoryResponse(response: Response): Promise<InventoryMutationResponse> {
  return (await response.json().catch(() => ({}))) as InventoryMutationResponse;
}

export class InventoryTransferFlow extends BaseFlow<InventoryTransferFlowInput, unknown> {
  async execute(context: FlowContext, input: InventoryTransferFlowInput): Promise<FlowResult<unknown>> {
    const authUserId = context.authUserId;
    if (!authUserId) {
      return {
        status: HttpStatus.Unauthorized,
        body: { error: 'Authentication required' },
      };
    }

    const ns = context.env.INVENTORY_DO;
    if (!ns) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Inventory service unavailable' },
      };
    }

    const operationId = deriveInventoryOperationId(context, input);
    switch (input.kind) {
      case 'gift':
        return await this.handleGift(ns, authUserId, input.targetUserId, input.itemId, operationId);
      case 'trade':
        return await this.handleTrade(ns, authUserId, input.targetUserId, input.myItemId, input.theirItemId, operationId);
    }
  }

  private async handleGift(
    ns: DurableObjectNamespace,
    sourceUserId: string,
    targetUserId: string,
    itemId: string,
    operationId: string
  ): Promise<FlowResult<unknown>> {
    const sourceStub = ns.get(ns.idFromName(sourceUserId));
    const targetStub = ns.get(ns.idFromName(targetUserId));

    const removed = await fetchFromDO(sourceStub, InventoryDOPaths.RemoveItem, {
      method: HttpMethod.Post,
      body: JSON.stringify({ itemId, operationId: `${operationId}:source-remove` }),
    });
    if (!removed.ok) {
      const body = await parseInventoryResponse(removed);
      return { status: removed.status, body };
    }
    const removedBody = await parseInventoryResponse(removed);
    if (!removedBody.item) {
      return {
        status: HttpStatus.BadGateway,
        body: { error: 'Removed item not returned' },
      };
    }

    const added = await fetchFromDO(targetStub, InventoryDOPaths.AddItem, {
      method: HttpMethod.Post,
      body: JSON.stringify({ ...removedBody.item, operationId: `${operationId}:target-add` }),
    });
    if (!added.ok) {
      await added.text().catch(() => undefined);
      const rollback = await fetchFromDO(sourceStub, InventoryDOPaths.AddItem, {
        method: HttpMethod.Post,
        body: JSON.stringify({ ...removedBody.item, operationId: `${operationId}:source-rollback-add` }),
      });
      await rollback.text().catch(() => undefined);
      return {
        status: HttpStatus.BadGateway,
        body: { error: 'Failed to add item to target' },
      };
    }
    await added.text().catch(() => undefined);
    return {
      status: HttpStatus.Ok,
      body: { sent: true },
    };
  }

  private async handleTrade(
    ns: DurableObjectNamespace,
    sourceUserId: string,
    targetUserId: string,
    myItemId: string,
    theirItemId: string,
    operationId: string
  ): Promise<FlowResult<unknown>> {
    const sourceStub = ns.get(ns.idFromName(sourceUserId));
    const targetStub = ns.get(ns.idFromName(targetUserId));

    const theirRemoved = await fetchFromDO(targetStub, InventoryDOPaths.RemoveItem, {
      method: HttpMethod.Post,
      body: JSON.stringify({ itemId: theirItemId, operationId: `${operationId}:target-remove` }),
    });
    if (!theirRemoved.ok) {
      const body = await parseInventoryResponse(theirRemoved);
      return { status: theirRemoved.status, body };
    }
    const theirBody = await parseInventoryResponse(theirRemoved);
    if (!theirBody.item) {
      return {
        status: HttpStatus.BadGateway,
        body: { error: 'Target item not returned' },
      };
    }

    const myRemoved = await fetchFromDO(sourceStub, InventoryDOPaths.RemoveItem, {
      method: HttpMethod.Post,
      body: JSON.stringify({ itemId: myItemId, operationId: `${operationId}:source-remove` }),
    });
    if (!myRemoved.ok) {
      await myRemoved.text().catch(() => undefined);
      const rollbackTarget = await fetchFromDO(targetStub, InventoryDOPaths.AddItem, {
        method: HttpMethod.Post,
        body: JSON.stringify({ ...theirBody.item, operationId: `${operationId}:target-rollback-add` }),
      });
      await rollbackTarget.text().catch(() => undefined);
      return {
        status: myRemoved.status,
        body: { error: 'My item not found' },
      };
    }
    const myBody = await parseInventoryResponse(myRemoved);
    if (!myBody.item) {
      return {
        status: HttpStatus.BadGateway,
        body: { error: 'Source item not returned' },
      };
    }

    const sourceAdded = await fetchFromDO(sourceStub, InventoryDOPaths.AddItem, {
      method: HttpMethod.Post,
      body: JSON.stringify({ ...theirBody.item, operationId: `${operationId}:source-add` }),
    });
    if (!sourceAdded.ok) {
      await sourceAdded.text().catch(() => undefined);
      const rollbackSource = await fetchFromDO(sourceStub, InventoryDOPaths.AddItem, {
        method: HttpMethod.Post,
        body: JSON.stringify({ ...myBody.item, operationId: `${operationId}:source-rollback-add` }),
      });
      await rollbackSource.text().catch(() => undefined);
      const rollbackTarget = await fetchFromDO(targetStub, InventoryDOPaths.AddItem, {
        method: HttpMethod.Post,
        body: JSON.stringify({ ...theirBody.item, operationId: `${operationId}:target-rollback-add` }),
      });
      await rollbackTarget.text().catch(() => undefined);
      return {
        status: HttpStatus.BadGateway,
        body: { error: 'Failed to add target item to source' },
      };
    }
    await sourceAdded.text().catch(() => undefined);

    const targetAdded = await fetchFromDO(targetStub, InventoryDOPaths.AddItem, {
      method: HttpMethod.Post,
      body: JSON.stringify({ ...myBody.item, operationId: `${operationId}:target-add` }),
    });
    if (!targetAdded.ok) {
      await targetAdded.text().catch(() => undefined);
      const rollbackSource = await fetchFromDO(sourceStub, InventoryDOPaths.AddItem, {
        method: HttpMethod.Post,
        body: JSON.stringify({ ...myBody.item, operationId: `${operationId}:source-rollback-add-2` }),
      });
      await rollbackSource.text().catch(() => undefined);
      const rollbackTarget = await fetchFromDO(targetStub, InventoryDOPaths.AddItem, {
        method: HttpMethod.Post,
        body: JSON.stringify({ ...theirBody.item, operationId: `${operationId}:target-rollback-add-2` }),
      });
      await rollbackTarget.text().catch(() => undefined);
      return {
        status: HttpStatus.BadGateway,
        body: { error: 'Failed to give my item to target' },
      };
    }
    await targetAdded.text().catch(() => undefined);

    return {
      status: HttpStatus.Ok,
      body: { traded: true },
    };
  }
}
