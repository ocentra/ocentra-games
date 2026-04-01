import type { ReactNode } from 'react';
import React from 'react';
import { WebAppShell } from '@/ui/shell/web/WebAppShell';
import { usePlatformVariant } from '@/ui/platform/platformVariant';
import { ShellLoadingFallback } from '@/ui/components/Loading/ShellLoadingFallback';

const DesktopAppShell = React.lazy(() =>
  import('@/ui/shell/desktop/DesktopAppShell').then((m) => ({ default: m.DesktopAppShell }))
);
const MobileAppShell = React.lazy(() =>
  import('@/ui/shell/mobile/MobileAppShell').then((m) => ({ default: m.MobileAppShell }))
);

type ShellComponent = React.ComponentType<{ children: ReactNode }>;

const shellVariants: {
  web: ShellComponent;
  desktop: ShellComponent;
  mobile: ShellComponent;
  default: ShellComponent;
} = {
  web: WebAppShell,
  desktop: DesktopAppShell as ShellComponent,
  mobile: MobileAppShell as ShellComponent,
  default: WebAppShell,
};

export function MainPlatformShell({ children }: { children: ReactNode }) {
  const Shell = usePlatformVariant(shellVariants);

  return (
    <React.Suspense fallback={<ShellLoadingFallback />}>
      <Shell>{children}</Shell>
    </React.Suspense>
  );
}
