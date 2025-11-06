import { logAuth } from '../utils/logger';

const prefix = '[MainApp]';

// MainApp logging flags
const LOG_UI = true;          // UI state changes
const LOG_RENDER = true;      // Component renders
const LOG_ERROR = true;       // Error logging

export function useMainAppLogger() {
  return {
    logRender: (data: unknown) => {
      if (LOG_RENDER) {
        logAuth(LOG_RENDER, 'log', prefix, '[render] Component render:', data);
      }
    },
    
    logUI: (message: string, data?: unknown) => {
      if (LOG_UI) {
        logAuth(LOG_UI, 'log', prefix, message, data);
      }
    },
    
    logError: (message: string, error?: unknown) => {
      if (LOG_ERROR) {
        logAuth(LOG_ERROR, 'error', prefix, message, error);
      }
    },
  };
}

