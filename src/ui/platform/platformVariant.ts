import type { PlatformUIShell } from '@/ui/platform/usePlatformUI';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';

export type PlatformVariantMap<T> = {
  web?: T;
  desktop?: T;
  mobile?: T;
  default: T;
};

export function selectPlatformVariant<T>(
  shell: PlatformUIShell,
  variants: PlatformVariantMap<T>
): T {
  return variants[shell] ?? variants.default;
}

export function usePlatformVariant<T>(variants: PlatformVariantMap<T>): T {
  const { shell } = usePlatformUI();
  return selectPlatformVariant(shell, variants);
}
