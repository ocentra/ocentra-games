import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export interface UploadedFile {
  filename: string;
  path: string;
}

export class UploadFilesEvent extends EventArgsBase {
  static readonly eventType = 'Assets/UploadFiles';

  readonly files: File[];
  readonly targetId: string;
  readonly deferred: OperationDeferred<{ uploaded: number; files: UploadedFile[] }>;

  constructor(
    files: File[],
    targetId: string,
    deferred: OperationDeferred<{ uploaded: number; files: UploadedFile[] }> = new OperationDeferred<{ uploaded: number; files: UploadedFile[] }>()
  ) {
    super();
    this.files = files;
    this.targetId = targetId;
    this.deferred = deferred;
  }
}

