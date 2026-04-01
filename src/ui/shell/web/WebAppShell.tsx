import type { ReactNode } from 'react';
import { PlatformAppShell } from '@/ui/shell/PlatformAppShell';

export function WebAppShell({ children }: { children: ReactNode }) {
  return <PlatformAppShell>{children}</PlatformAppShell>;
}
