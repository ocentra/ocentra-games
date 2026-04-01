import type { ReactNode } from 'react';
import { PlatformAppShell } from '@/ui/shell/PlatformAppShell';

export function DesktopAppShell({ children }: { children: ReactNode }) {
  return <PlatformAppShell>{children}</PlatformAppShell>;
}
