import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export interface TreeFolderContent {
    name: string;
    hash?: string;
    isFolder: boolean;
}

export class GetTreeFolderContentEvent extends EventArgsBase {
    static readonly eventType = 'Assets/GetTreeFolderContent';

    readonly folderId: string;
    readonly deferred: OperationDeferred<TreeFolderContent[]>;

    constructor(
        folderId: string,
        deferred: OperationDeferred<TreeFolderContent[]> = new OperationDeferred<TreeFolderContent[]>()
    ) {
        super();
        this.folderId = folderId;
        this.deferred = deferred;
    }
}
