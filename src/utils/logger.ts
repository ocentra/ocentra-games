// Logging flags - set to true to enable logging for specific modules
export const LOG_FLAGS = {
  UI: true,           // UI component logs
  GAME_ENGINE: true,   // Game engine logs
  AI: false,           // AI related logs
  NETWORK: false,      // Network related logs
  ASSETS: false,       // Asset loading logs
  STORE: true,        // Store/state management logs
}

// Generic logging function
export function log(module: keyof typeof LOG_FLAGS, ...args: unknown[]) {
  if (LOG_FLAGS[module]) {
    console.log(`[${module}]`, ...args)
  }
}

// Specific logging functions for each module
export function logUI(...args: unknown[]) {
  log('UI', ...args)
}

export function logGameEngine(...args: unknown[]) {
  log('GAME_ENGINE', ...args)
}

export function logAI(...args: unknown[]) {
  log('AI', ...args)
}

export function logNetwork(...args: unknown[]) {
  log('NETWORK', ...args)
}

export function logAssets(...args: unknown[]) {
  log('ASSETS', ...args)
}

export function logStore(...args: unknown[]) {
  log('STORE', ...args)
}