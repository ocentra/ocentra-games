export type BehaviourStatus = 'created' | 'awake' | 'started' | 'destroyed';
export declare abstract class ReactBehaviour<TContext = undefined> {
    protected readonly context: TContext | undefined;
    private status;
    private isEnabled;
    private readonly stateWatchers;
    private initialized;
    private isRegisteredForUpdates;
    constructor(context?: TContext);
    get currentStatus(): BehaviourStatus;
    get enabled(): boolean;
    __initialize(): void;
    enable(): void;
    disable(): void;
    start(): void;
    destroy(): void;
    protected abstract awake(): void;
    protected onStart(): void;
    protected onEnable(): void;
    protected onDisable(): void;
    protected onUpdate(_deltaTime?: number): void;
    protected onLateUpdate(_deltaTime?: number): void;
    protected onDestroy(): void;
    protected startUpdateLoop(targetFps?: number): void;
    protected stopUpdateLoop(): void;
    protected notifyStateChanged(): void;
    __subscribeState<S>(setState: (value: S) => void, selector: (behaviour: this) => S): () => void;
    __handleScheduledUpdate(delta: number): void;
}
