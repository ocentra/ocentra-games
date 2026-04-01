import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class OpenInEditorEvent extends EventArgsBase {
  static readonly eventType = 'Dev/OpenInEditor';

  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly deferred: OperationDeferred<{ success: boolean; absolutePath?: string; error?: string }>;

  constructor(
    filePath: string,
    line: number,
    column: number,
    deferred: OperationDeferred<{ success: boolean; absolutePath?: string; error?: string }> = new OperationDeferred<{ success: boolean; absolutePath?: string; error?: string }>()
  ) {
    super();
    this.filePath = filePath;
    this.line = line;
    this.column = column;
    this.deferred = deferred;
  }
}

