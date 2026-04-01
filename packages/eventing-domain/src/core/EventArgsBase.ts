import { assertImplements } from '@ocentra/boundary-domain/contracts/Interface';
import { IEventArgsContract } from '@/contracts/specs';
import type { EventConstructor, IEventArgs } from '@/interfaces/IEventArgs';
import type { IEventHandler, AssetRegistryHandlerMarker, NetworkRouterHandlerMarker } from '@/interfaces/IEventHandler';
import { createGuid } from '@/utils/guid';

export type TargetHandler = IEventHandler | typeof AssetRegistryHandlerMarker | typeof NetworkRouterHandlerMarker;

export abstract class EventArgsBase implements IEventArgs {
  public readonly timestamp: number = Date.now();
  public readonly uniqueIdentifier: string = createGuid();
  public isRePublishable = false;
  public readonly targetHandler?: TargetHandler;

  private disposed = false;

  protected constructor(targetHandler?: TargetHandler) {
    this.targetHandler = targetHandler;
    assertImplements(this, 'IEventArgs', IEventArgsContract);

    const ctor = this.constructor as EventConstructor<IEventArgs>;
    if (!ctor.eventType || typeof ctor.eventType !== 'string') {
      throw new Error(
        `EventArgs subclass "${this.constructor.name}" must declare static readonly eventType.`
      );
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.onDispose();
  }

  protected onDispose(): void {
    // Intended for subclasses.
  }

  toString(): string {
    return `${this.constructor.name} [timestamp: ${new Date(
      this.timestamp
    ).toISOString()}, uniqueIdentifier: ${this.uniqueIdentifier}, isRePublishable: ${
      this.isRePublishable
    }]`;
  }
}
