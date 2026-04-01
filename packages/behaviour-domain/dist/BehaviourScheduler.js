const scheduledBehaviours = new Map();
let rafHandle = null;
let intervalHandle = null;
const hasAnimationFrame = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';
const now = () => typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
const runAnimationFrame = (callback) => {
    if (hasAnimationFrame) {
        const handle = window.requestAnimationFrame(callback);
        return {
            cancel() {
                window.cancelAnimationFrame(handle);
            },
        };
    }
    const intervalId = setTimeout(() => callback(now()), 16);
    return {
        cancel() {
            clearTimeout(intervalId);
        },
    };
};
const ensureScheduler = () => {
    if (scheduledBehaviours.size === 0) {
        stopScheduler();
        return;
    }
    if (rafHandle !== null || intervalHandle !== null) {
        return;
    }
    const tick = (time) => {
        for (const entry of scheduledBehaviours.values()) {
            const delta = time - entry.lastTick;
            if (delta >= entry.targetInterval) {
                entry.behaviour.__handleScheduledUpdate(delta);
                entry.lastTick = time;
            }
        }
        if (scheduledBehaviours.size === 0) {
            stopScheduler();
            return;
        }
        if (hasAnimationFrame) {
            rafHandle = window.requestAnimationFrame(tick);
        }
        else {
            intervalHandle = runAnimationFrame(tick);
        }
    };
    if (hasAnimationFrame) {
        rafHandle = window.requestAnimationFrame(tick);
    }
    else {
        intervalHandle = runAnimationFrame(tick);
    }
};
const stopScheduler = () => {
    if (rafHandle !== null && hasAnimationFrame) {
        window.cancelAnimationFrame(rafHandle);
    }
    rafHandle = null;
    if (intervalHandle) {
        intervalHandle.cancel();
    }
    intervalHandle = null;
};
export const registerBehaviourUpdate = (behaviour, targetFps) => {
    const targetInterval = Math.max(1, Math.round(1000 / targetFps));
    scheduledBehaviours.set(behaviour, {
        behaviour,
        targetInterval,
        lastTick: now(),
    });
    ensureScheduler();
};
export const unregisterBehaviourUpdate = (behaviour) => {
    scheduledBehaviours.delete(behaviour);
    if (scheduledBehaviours.size === 0) {
        stopScheduler();
    }
};
