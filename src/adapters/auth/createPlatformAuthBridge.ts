import type { AuthBridge } from '@ocentra/auth-domain/AuthBridge';
import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import { WebAuthBridge } from '@/adapters/auth/webAuthBridge';
import { DesktopAuthBridge } from '@/adapters/auth/desktopAuthBridge';
import { NativeAuthBridge } from '@/adapters/auth/nativeAuthBridge';

export function createPlatformAuthBridge(): AuthBridge {
  const runtime = getPlatformRuntime();
  if (runtime === PlatformRuntime.Desktop) return new DesktopAuthBridge();
  if (runtime === PlatformRuntime.Mobile) return new NativeAuthBridge();
  return new WebAuthBridge();
}
