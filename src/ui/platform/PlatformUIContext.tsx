import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import type { PlatformUIContextValue, PlatformUIShell } from '@/ui/platform/usePlatformUI';
import { PlatformUIReactContext } from '@/ui/platform/PlatformUIReactContext';

const DEFAULT_VIEWPORT_WIDTH = 1440;
const DEFAULT_VIEWPORT_HEIGHT = 900;
const MOBILE_WIDTH_THRESHOLD = 768;
const COMPACT_WIDTH_THRESHOLD = 1180;
const INSPECTOR_STORAGE_KEY = 'ocentra:debug-inspector-enabled';

function getViewportWidth(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_VIEWPORT_WIDTH;
  }
  return window.innerWidth;
}

function getViewportHeight(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_VIEWPORT_HEIGHT;
  }
  return window.innerHeight;
}

function getSupportsHover(runtime: PlatformRuntime): boolean {
  if (runtime === PlatformRuntime.Mobile || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(hover: hover)').matches;
}

function getInitialDebugInspectorEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const forcedOn = params.get('debug') === '1' || params.get('inspector') === '1';
  if (forcedOn) {
    return true;
  }

  try {
    return window.localStorage.getItem(INSPECTOR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function PlatformUIProvider({ children }: { children: ReactNode }): ReactElement {
  const runtime = getPlatformRuntime();
  const [viewportWidth, setViewportWidth] = useState<number>(getViewportWidth);
  const [viewportHeight, setViewportHeight] = useState<number>(getViewportHeight);
  const [debugInspectorEnabled, setDebugInspectorEnabled] = useState<boolean>(getInitialDebugInspectorEnabled);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        setDebugInspectorEnabled((enabled) => !enabled);
      }
    };

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(INSPECTOR_STORAGE_KEY, debugInspectorEnabled ? '1' : '0');
    } catch {
      void 0;
    }
  }, [debugInspectorEnabled]);

  const value = useMemo<PlatformUIContextValue>(() => {
    const isDesktop = runtime === PlatformRuntime.Desktop;
    const isMobile = runtime === PlatformRuntime.Mobile;
    const isWeb = runtime === PlatformRuntime.Web;
    const shell: PlatformUIShell = isDesktop ? 'desktop' : isMobile ? 'mobile' : 'web';
    const supportsHover = getSupportsHover(runtime);
    const prefersCompactLayout = isMobile || viewportWidth < COMPACT_WIDTH_THRESHOLD;
    const prefersSimplifiedUX = isMobile || viewportWidth < MOBILE_WIDTH_THRESHOLD;
    const isPortrait = viewportHeight >= viewportWidth;

    return {
      runtime,
      shell,
      isWeb,
      isDesktop,
      isMobile,
      viewportWidth,
      viewportHeight,
      isPortrait,
      supportsHover,
      prefersCompactLayout,
      prefersSimplifiedUX,
      debugInspectorEnabled,
      setDebugInspectorEnabled,
    };
  }, [debugInspectorEnabled, runtime, viewportHeight, viewportWidth]);

  return <PlatformUIReactContext.Provider value={value}>{children}</PlatformUIReactContext.Provider>;
}
