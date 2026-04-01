import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import type { IEventBus } from '@ocentra/eventing-domain/interfaces/IEventBus';
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';

export interface EventBehaviourContext {
  eventBus: IEventBus;
}

export abstract class EventBehaviour extends ReactBehaviour<EventBehaviourContext> {
  protected readonly eventRegistrar: EventRegistrar;

  protected get eventBus(): IEventBus {
    return this.context?.eventBus ?? EventBus.instance;
  }

  constructor(context: EventBehaviourContext) {
    super(context);
    this.eventRegistrar = new EventRegistrar(this.eventBus);
  }

  protected override onDestroy(): void {
    this.eventRegistrar.dispose();
    super.onDestroy();
  }
}

