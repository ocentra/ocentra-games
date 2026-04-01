import type { ComponentType } from 'react';
import React from 'react';
import { usePlatformVariant } from '@/ui/platform/platformVariant';
import { ScreenLoadingFallback } from '@/ui/components/Loading/ScreenLoadingFallback';

export type LazyComponentLoader<TProps> = () => Promise<{ default: ComponentType<TProps> }>;

export function createPlatformScreen<TProps extends object = Record<string, never>>(
  WebComponent: ComponentType<TProps>,
  desktopLoader: LazyComponentLoader<TProps>,
  mobileLoader: LazyComponentLoader<TProps>
): ComponentType<TProps> {
  const DesktopVariant = React.lazy(desktopLoader);
  const MobileVariant = React.lazy(mobileLoader);

  function PlatformScreen(props: TProps) {
    const Variant = usePlatformVariant({
      web: WebComponent,
      desktop: DesktopVariant,
      mobile: MobileVariant,
      default: WebComponent,
    });

    return (
      <React.Suspense fallback={<ScreenLoadingFallback />}>
        <Variant {...props} />
      </React.Suspense>
    );
  }

  PlatformScreen.displayName = `PlatformScreen(${WebComponent.displayName ?? WebComponent.name ?? 'Unknown'})`;
  return PlatformScreen;
}
