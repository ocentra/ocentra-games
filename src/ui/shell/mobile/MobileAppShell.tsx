import type { ReactNode } from 'react';
import { PlatformAppShell } from '@/ui/shell/PlatformAppShell';

export function MobileAppShell({ children }: { children: ReactNode }) {
  return <PlatformAppShell>{children}</PlatformAppShell>;
}
