import type { SecretAdapter } from '@ocentra/credentials-domain/SecretAdapter';
import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import { KeychainSecretAdapter } from '@/adapters/credentials/keychainSecretAdapter';
import { SecureStoreSecretAdapter } from '@/adapters/credentials/secureStoreSecretAdapter';

export function createPlatformSecretAdapter(): SecretAdapter | null {
  const runtime = getPlatformRuntime();
  if (runtime === PlatformRuntime.Desktop) return new KeychainSecretAdapter();
  if (runtime === PlatformRuntime.Mobile) return new SecureStoreSecretAdapter();
  return null;
}
