import { useEffect, type ReactElement } from 'react';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';

export function PlatformInspectorRoute(): ReactElement {
  const { debugInspectorEnabled, setDebugInspectorEnabled } = usePlatformUI();

  useEffect(() => {
    if (!debugInspectorEnabled) {
      setDebugInspectorEnabled(true);
    }
  }, [debugInspectorEnabled, setDebugInspectorEnabled]);

  return <div className="platform-debug-overlay__standalone" aria-hidden />;
}
