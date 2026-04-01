export const APP_VERSION: string =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION != null
    ? String(import.meta.env.VITE_APP_VERSION)
    : '0.1.0';
