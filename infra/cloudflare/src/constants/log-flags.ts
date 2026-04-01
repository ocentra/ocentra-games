/**
 * Log Module Registry
 *
 * Re-exports from auto-generated log-modules.generated.ts
 * The generated file is created by scripts/generate-log-modules.ts
 *
 * Default Behavior:
 *   - Dev/Test: All modules enabled automatically (see everything)
 *   - Production: Only Errors/Warnings (safe by default)
 *   - Production debugging: Use X-Debug-Modules header per-request
 *
 * @example
 * // Dev/Test: Just run - all logs visible automatically
 * npm test
 *
 * // Production debugging: Enable specific modules per-request
 * fetch(url, { headers: { 'X-Debug-Modules': 'Badges,Credits' } })
 */

export { LogModule, type LogModuleType } from './log-modules.generated';
