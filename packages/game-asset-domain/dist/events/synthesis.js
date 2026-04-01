import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
export class SynthesizeGameInfoEvent extends EventArgsBase {
    static eventType = 'SynthesizeGameInfoEvent';
    gameInfoGuid;
    pageIndices;
    deferred;
    constructor(gameInfoGuid, pageIndices, deferred) {
        super();
        this.gameInfoGuid = gameInfoGuid;
        this.pageIndices = pageIndices;
        this.deferred = deferred;
    }
}
export class RequestAssetContentEvent extends EventArgsBase {
    static eventType = 'RequestAssetContentEvent';
    assetGuid;
    context;
    deferred;
    constructor(assetGuid, context, deferred) {
        super();
        this.assetGuid = assetGuid;
        this.context = context;
        this.deferred = deferred;
    }
}
