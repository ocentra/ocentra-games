import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { ScriptableObject } from '@/types/app-stubs';

export type TypeToCheck = string | typeof ScriptableObject;

export class IsTypeOfEvent extends EventArgsBase {
  static readonly eventType = 'Assets/IsTypeOf';

  readonly assetType: string;
  readonly typeToCheck: TypeToCheck;
  readonly deferred: OperationDeferred<boolean>;

  constructor(
    assetType: string,
    typeToCheck: TypeToCheck,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super();
    this.assetType = assetType;
    this.typeToCheck = typeToCheck;
    this.deferred = deferred;
  }
}

