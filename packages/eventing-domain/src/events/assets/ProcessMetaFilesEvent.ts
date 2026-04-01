import { EventArgsBase } from '@/core/EventArgsBase';

export class ProcessMetaFilesEvent extends EventArgsBase {
  static readonly eventType = 'Assets/ProcessMetaFiles';

  readonly guids: readonly string[];
  readonly priority: boolean;

  constructor(guids: string[], priority: boolean = false) {
    super();
    this.guids = guids;
    this.priority = priority;
  }
}

