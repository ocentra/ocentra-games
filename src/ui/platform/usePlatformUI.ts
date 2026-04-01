import { useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { PlatformRuntime } from '@ocentra/app-core/platform';
import { PlatformUIReactContext } from '@/ui/platform/PlatformUIReactContext';

export type PlatformUIShell = 'web' | 'desktop' | 'mobile';

export interface PlatformUIContextValue {
  runtime: PlatformRuntime;
  shell: PlatformUIShell;
  isWeb: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  viewportWidth: number;
  viewportHeight: number;
  isPortrait: boolean;
  supportsHover: boolean;
  prefersCompactLayout: boolean;
  prefersSimplifiedUX: boolean;
  debugInspectorEnabled: boolean;
  setDebugInspectorEnabled: Dispatch<SetStateAction<boolean>>;
}

export function usePlatformUI(): PlatformUIContextValue {
  const context = useContext(PlatformUIReactContext);
  if (!context) {
    throw new Error('usePlatformUI must be used within PlatformUIProvider');
  }
  return context;
}

export function useOptionalPlatformUI(): PlatformUIContextValue | null {
  return useContext(PlatformUIReactContext);
}
