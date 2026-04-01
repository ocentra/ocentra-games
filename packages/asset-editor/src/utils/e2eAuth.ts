export function isE2EBypassAuthEnabled(): boolean {
  return import.meta.env.VITE_E2E_BYPASS_AUTH === 'true';
}

