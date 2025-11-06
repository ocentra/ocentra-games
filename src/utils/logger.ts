/**
 * Centralized Logging System
 * 
 * Provides logging functions that write to both console (if enabled) and IndexedDB.
 * Similar to the Rust MCP pattern for persistent log storage.
 */

import { type LogLevel, type LogSource } from './logStorage';

// Logging flags - set to true to enable console logging for specific modules
export const LOG_FLAGS = {
  UI: false,           // UI component logs
  GAME_ENGINE: false,   // Game engine logs
  AI: false,           // AI related logs
  NETWORK: false,      // Network related logs
  ASSETS: false,       // Asset loading logs
  STORE: false,        // Store/state management logs
}

// Global flag to enable/disable all console logging (including errors)
const LOG_ENABLED = false

// Map module names to LogSource
const MODULE_TO_SOURCE: Record<keyof typeof LOG_FLAGS, LogSource> = {
  UI: 'UI',
  GAME_ENGINE: 'GameEngine',
  AI: 'System',
  NETWORK: 'Network',
  ASSETS: 'Assets',
  STORE: 'Store',
};

/**
 * Get context from stack trace (file/component name)
 */
function getContextFromStack(): string {
  try {
    const stack = new Error().stack;
    if (!stack) return 'Unknown';
    
    const lines = stack.split('\n');
    // Skip the first few lines (Error, getContextFromStack, log function)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // Try to extract file/component name
      // Match patterns like: at ComponentName (file.tsx:123:45)
      const match = line.match(/at\s+(\w+)\s+\([^)]+\)/);
      if (match && match[1]) {
        return match[1];
      }
      
      // Match patterns like: at file.tsx:123:45
      const fileMatch = line.match(/at\s+([^/]+\.(tsx?|jsx?)):/);
      if (fileMatch && fileMatch[1]) {
        return fileMatch[1].replace(/\.(tsx?|jsx?)$/, '');
      }
    }
  } catch {
    // Ignore errors in context extraction
  }
  
  return 'Unknown';
}

/**
 * Format log arguments into a message string
 */
function formatMessage(args: unknown[]): string {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

/**
 * Store log entry in IndexedDB only
 */
async function storeLogEntry(
  level: LogLevel,
  module: keyof typeof LOG_FLAGS,
  context: string,
  message: string,
  args: unknown[],
  stack?: string,
  tags?: string[] // Optional tags for filtering
): Promise<void> {
  try {
    const source = MODULE_TO_SOURCE[module] || 'Other';
    const { getLogStorage } = await import('./logStorage');
    const storage = getLogStorage();
    
    await storage.storeLog({
      level,
      context,
      message,
      source,
      timestamp: Date.now(),
      args: args.length > 0 ? args : undefined,
      stack,
      tags: tags && tags.length > 0 ? tags : undefined,
    });
  } catch (error) {
    // Silently fail - don't break the app if log storage fails
    if (LOG_ENABLED) console.warn('[Logger] Failed to store log:', error);
  }
}

/**
 * Generic logging function
 */
export function log(module: keyof typeof LOG_FLAGS, level: LogLevel, ...args: unknown[]): void {
  const context = getContextFromStack();
  const message = formatMessage(args);
  
  // Write to console if enabled
  if (LOG_FLAGS[module]) {
    const consoleMethod = level === 'error' ? console.error :
                         level === 'warn' ? console.warn :
                         level === 'info' ? console.info :
                         level === 'debug' ? console.debug :
                         console.log;
    
    consoleMethod(`[${module}]`, ...args);
  }
  
  // Always store in IndexedDB (async, non-blocking)
  const stack = level === 'error' ? new Error().stack : undefined;
  
  // Auto-generate tags based on level and module
  const tags: string[] = []
  if (level === 'error') tags.push('error', 'critical')
  if (level === 'warn') tags.push('warning')
  if (module === 'UI') tags.push('ui')
  if (module === 'GAME_ENGINE') tags.push('game')
  if (module === 'AI') tags.push('ai')
  if (module === 'NETWORK') tags.push('network')
  if (module === 'ASSETS') tags.push('assets')
  if (module === 'STORE') tags.push('store')
  
  storeLogEntry(level, module, context, message, args, stack, tags).catch(() => {
    // Ignore errors
  });
}

/**
 * Specific logging functions for each module
 */
export function logUI(...args: unknown[]) {
  log('UI', 'log', ...args);
}

export function logGameEngine(...args: unknown[]) {
  log('GAME_ENGINE', 'log', ...args);
}

export function logAI(...args: unknown[]) {
  log('AI', 'log', ...args);
}

export function logNetwork(...args: unknown[]) {
  log('NETWORK', 'log', ...args);
}

export function logAssets(...args: unknown[]) {
  log('ASSETS', 'log', ...args);
}

export function logStore(...args: unknown[]) {
  log('STORE', 'log', ...args);
}

/**
 * Error logging functions
 */
export function logError(module: keyof typeof LOG_FLAGS, ...args: unknown[]) {
  log(module, 'error', ...args);
}

export function logWarn(module: keyof typeof LOG_FLAGS, ...args: unknown[]) {
  log(module, 'warn', ...args);
}

export function logInfo(module: keyof typeof LOG_FLAGS, ...args: unknown[]) {
  log(module, 'info', ...args);
}

export function logDebug(module: keyof typeof LOG_FLAGS, ...args: unknown[]) {
  log(module, 'debug', ...args);
}

/**
 * Auth-specific logging helper
 * 
 * This function is designed for auth logging that uses flags.
 * It logs to console if the flag is enabled, and always stores to IndexedDB.
 * 
 * @param flag - Whether to log to console
 * @param level - Log level
 * @param context - Context/module name (e.g., "FirebaseService", "AuthProvider")
 * @param args - Log arguments
 */
export async function logAuth(
  flag: boolean,
  level: LogLevel,
  context: string,
  ...args: unknown[]
): Promise<void> {
  const message = formatMessage(args);
  
  // Write to console if flag is enabled
  if (flag) {
    const consoleMethod = level === 'error' ? console.error :
                         level === 'warn' ? console.warn :
                         level === 'info' ? console.info :
                         level === 'debug' ? console.debug :
                         console.log;
    
    consoleMethod(`[${context}]`, ...args);
  }
  
  // Always store in IndexedDB (async, non-blocking)
  const stack = level === 'error' ? new Error().stack : undefined;
  
  // Auto-generate tags for auth logs
  const tags: string[] = ['auth']
  if (level === 'error') tags.push('error', 'critical')
  if (level === 'warn') tags.push('warning')
  
  // Store with Auth source - store in IndexedDB
  const { getLogStorage } = await import('./logStorage');
  const storage = getLogStorage();
  
  storage.storeLog({
    level,
    context,
    message,
    source: 'Auth',
    timestamp: Date.now(),
    args: args.length > 0 ? args : undefined,
    stack,
    tags: tags.length > 0 ? tags : undefined,
  }).catch(() => {
    // Ignore errors
  });
}