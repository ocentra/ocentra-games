import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { NetworkRouterHandlerMarker } from '@/interfaces/IEventHandler';

export class BatchGetResourcesEvent extends EventArgsBase {
    static readonly eventType = 'Assets/BatchGetResources';

    readonly guids: string[];
    readonly deferred: OperationDeferred<Map<string, ArrayBuffer>>;

    constructor(
        guids: string[],
        deferred: OperationDeferred<Map<string, ArrayBuffer>> = new OperationDeferred<Map<string, ArrayBuffer>>(),
        targetHandler?: typeof NetworkRouterHandlerMarker
    ) {
        super(targetHandler);
        this.guids = guids;
        this.deferred = deferred;
    }
}
