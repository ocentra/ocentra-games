/// <reference lib="DOM" />
import type { ReactBehaviour } from './ReactBehaviour';

interface ScheduledEntry {
  behaviour: ReactBehaviour<unknown>;
  targetInterval: number;
  lastTick: number;
}

type SchedulerHandle = {
  cancel(): void;
};

const scheduledBehaviours = new Map<ReactBehaviour<unknown>, ScheduledEntry>();
let rafHandle: number | null = null;
let intervalHandle: SchedulerHandle | null = null;

const hasAnimationFrame =
  typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';

const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const runAnimationFrame = (callback: (time: number) => void): SchedulerHandle => {
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

const ensureScheduler = (): void => {
  if (scheduledBehaviours.size === 0) {
    stopScheduler();
    return;
  }

  if (rafHandle !== null || intervalHandle !== null) {
    return;
  }

  const tick = (time: number) => {
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
    } else {
      intervalHandle = runAnimationFrame(tick);
    }
  };

  if (hasAnimationFrame) {
    rafHandle = window.requestAnimationFrame(tick);
  } else {
    intervalHandle = runAnimationFrame(tick);
  }
};

const stopScheduler = (): void => {
  if (rafHandle !== null && hasAnimationFrame) {
    window.cancelAnimationFrame(rafHandle);
  }
  rafHandle = null;

  if (intervalHandle) {
    intervalHandle.cancel();
  }
  intervalHandle = null;
};

export const registerBehaviourUpdate = (
  behaviour: ReactBehaviour<unknown>,
  targetFps: number
): void => {
  const targetInterval = Math.max(1, Math.round(1000 / targetFps));
  scheduledBehaviours.set(behaviour, {
    behaviour,
    targetInterval,
    lastTick: now(),
  });

  ensureScheduler();
};

export const unregisterBehaviourUpdate = (behaviour: ReactBehaviour<unknown>): void => {
  scheduledBehaviours.delete(behaviour);
  if (scheduledBehaviours.size === 0) {
    stopScheduler();
  }
};

