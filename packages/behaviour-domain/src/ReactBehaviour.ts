import { registerBehaviourUpdate, unregisterBehaviourUpdate } from './BehaviourScheduler';

export type BehaviourStatus = 'created' | 'awake' | 'started' | 'destroyed';

export abstract class ReactBehaviour<TContext = undefined> {
  protected readonly context: TContext | undefined;
  private status: BehaviourStatus = 'created';
  private isEnabled = false;
  private readonly stateWatchers = new Set<(behaviour: ReactBehaviour<unknown>) => void>();
  private initialized = false;
  private isRegisteredForUpdates = false;

  constructor(context?: TContext) {
    this.context = context;
  }

  get currentStatus(): BehaviourStatus {
    return this.status;
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  __initialize(): void {
    if (this.initialized || this.status !== 'created') {
      return;
    }
    this.awake();
    this.initialized = true;
    this.status = 'awake';
  }

  enable(): void {
    if (this.isEnabled || this.status === 'destroyed') {
      return;
    }
    if (!this.initialized) {
      this.__initialize();
    }
    this.isEnabled = true;
    this.onEnable();
  }

  disable(): void {
    if (!this.isEnabled) {
      return;
    }
    this.isEnabled = false;
    this.onDisable();
  }

  start(): void {
    if (!this.initialized) {
      this.__initialize();
    }
    if (this.status !== 'awake') {
      return;
    }
    this.status = 'started';
    this.enable();
    this.onStart();
  }

  destroy(): void {
    if (this.status === 'destroyed') {
      return;
    }
    if (!this.initialized) {
      this.__initialize();
    }
    this.disable();
    this.onDestroy();
    this.stopUpdateLoop();
    this.initialized = false;
    this.status = 'created';
  }

  protected abstract awake(): void;

  protected onStart(): void {}

  protected onEnable(): void {}

  protected onDisable(): void {}

  protected onUpdate(_deltaTime?: number): void {
    void _deltaTime;
  }

  protected onLateUpdate(_deltaTime?: number): void {
    void _deltaTime;
  }

  protected onDestroy(): void {}

  protected startUpdateLoop(targetFps = 60): void {
    if (this.isRegisteredForUpdates) {
      return;
    }
    registerBehaviourUpdate(this as unknown as ReactBehaviour<unknown>, targetFps);
    this.isRegisteredForUpdates = true;
  }

  protected stopUpdateLoop(): void {
    if (!this.isRegisteredForUpdates) {
      return;
    }
    unregisterBehaviourUpdate(this as unknown as ReactBehaviour<unknown>);
    this.isRegisteredForUpdates = false;
  }

  protected notifyStateChanged(): void {
    for (const watcher of this.stateWatchers) {
      watcher(this as unknown as ReactBehaviour<unknown>);
    }
  }

  __subscribeState<S>(
    setState: (value: S) => void,
    selector: (behaviour: this) => S
  ): () => void {
    const watcher = (behaviour: ReactBehaviour<unknown>) => {
      setState(selector(behaviour as unknown as this));
    };

    this.stateWatchers.add(watcher);
    watcher(this as unknown as ReactBehaviour<unknown>);

    return () => {
      this.stateWatchers.delete(watcher);
    };
  }

  __handleScheduledUpdate(delta: number): void {
    if (!this.isEnabled) {
      return;
    }
    this.onUpdate(delta);
    this.onLateUpdate(delta);
  }
}

