/**
 * Test helper for managing kill-switch state dynamically
 * 
 * This allows tests to toggle kill-switch on/off without needing
 * separate vitest configs. The state is stored in globalThis (shared
 * with worker context) and injected as a header in all requests.
 * 
 * Usage:
 * ```typescript
 * import { enableKillSwitch, disableKillSwitch, getKillSwitchState } from '@tests/helpers/kill-switch-helper';
 * 
 * beforeEach(async () => {
 *   await enableKillSwitch();
 * });
 * 
 * afterEach(async () => {
 *   await disableKillSwitch();
 * });
 * ```
 */
declare global {
  var __TEST_KILL_SWITCH_ENABLED: boolean | undefined;
}

export function enableKillSwitch(): void {
  (globalThis as { __TEST_KILL_SWITCH_ENABLED?: boolean }).__TEST_KILL_SWITCH_ENABLED = true;
}

export function disableKillSwitch(): void {
  (globalThis as { __TEST_KILL_SWITCH_ENABLED?: boolean }).__TEST_KILL_SWITCH_ENABLED = false;
}

export function getKillSwitchState(): boolean {
  return (globalThis as { __TEST_KILL_SWITCH_ENABLED?: boolean }).__TEST_KILL_SWITCH_ENABLED ?? false;
}
