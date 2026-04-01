import { registerBehaviourUpdate, unregisterBehaviourUpdate } from './BehaviourScheduler.js';
export class ReactBehaviour {
    context;
    status = 'created';
    isEnabled = false;
    stateWatchers = new Set();
    initialized = false;
    isRegisteredForUpdates = false;
    constructor(context) {
        this.context = context;
    }
    get currentStatus() {
        return this.status;
    }
    get enabled() {
        return this.isEnabled;
    }
    __initialize() {
        if (this.initialized || this.status !== 'created') {
            return;
        }
        this.awake();
        this.initialized = true;
        this.status = 'awake';
    }
    enable() {
        if (this.isEnabled || this.status === 'destroyed') {
            return;
        }
        if (!this.initialized) {
            this.__initialize();
        }
        this.isEnabled = true;
        this.onEnable();
    }
    disable() {
        if (!this.isEnabled) {
            return;
        }
        this.isEnabled = false;
        this.onDisable();
    }
    start() {
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
    destroy() {
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
    onStart() { }
    onEnable() { }
    onDisable() { }
    onUpdate(_deltaTime) {
        void _deltaTime;
    }
    onLateUpdate(_deltaTime) {
        void _deltaTime;
    }
    onDestroy() { }
    startUpdateLoop(targetFps = 60) {
        if (this.isRegisteredForUpdates) {
            return;
        }
        registerBehaviourUpdate(this, targetFps);
        this.isRegisteredForUpdates = true;
    }
    stopUpdateLoop() {
        if (!this.isRegisteredForUpdates) {
            return;
        }
        unregisterBehaviourUpdate(this);
        this.isRegisteredForUpdates = false;
    }
    notifyStateChanged() {
        for (const watcher of this.stateWatchers) {
            watcher(this);
        }
    }
    __subscribeState(setState, selector) {
        const watcher = (behaviour) => {
            setState(selector(behaviour));
        };
        this.stateWatchers.add(watcher);
        watcher(this);
        return () => {
            this.stateWatchers.delete(watcher);
        };
    }
    __handleScheduledUpdate(delta) {
        if (!this.isEnabled) {
            return;
        }
        this.onUpdate(delta);
        this.onLateUpdate(delta);
    }
}
