import { useEffect, type ReactElement, type ReactNode } from 'react';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';
import './PlatformAppShell.css';

type PlatformShellDataset = {
  ocentraShell?: string;
  ocentraRuntime?: string;
  ocentraCompact?: string;
  ocentraUx?: string;
  ocentraOrientation?: string;
};

function applyPlatformDataset(
  element: HTMLElement | null,
  values: Record<keyof PlatformShellDataset, string>
): void {
  if (!element) {
    return;
  }

  const dataset = element.dataset as PlatformShellDataset;
  dataset.ocentraShell = values.ocentraShell;
  dataset.ocentraRuntime = values.ocentraRuntime;
  dataset.ocentraCompact = values.ocentraCompact;
  dataset.ocentraUx = values.ocentraUx;
  dataset.ocentraOrientation = values.ocentraOrientation;
}

function clearPlatformDataset(element: HTMLElement | null): void {
  if (!element) {
    return;
  }

  const dataset = element.dataset as PlatformShellDataset;
  delete dataset.ocentraShell;
  delete dataset.ocentraRuntime;
  delete dataset.ocentraCompact;
  delete dataset.ocentraUx;
  delete dataset.ocentraOrientation;
}

export function PlatformAppShell({ children }: { children: ReactNode }): ReactElement {
  const {
    isPortrait,
    prefersCompactLayout,
    prefersSimplifiedUX,
    runtime,
    shell,
  } = usePlatformUI();

  useEffect(() => {
    const values = {
      ocentraShell: shell,
      ocentraRuntime: runtime,
      ocentraCompact: prefersCompactLayout ? 'compact' : 'full',
      ocentraUx: prefersSimplifiedUX ? 'simplified' : 'full',
      ocentraOrientation: isPortrait ? 'portrait' : 'landscape',
    };

    applyPlatformDataset(document.documentElement, values);
    applyPlatformDataset(document.body, values);

    return () => {
      clearPlatformDataset(document.documentElement);
      clearPlatformDataset(document.body);
    };
  }, [isPortrait, prefersCompactLayout, prefersSimplifiedUX, runtime, shell]);

  return (
    <div
      className={[
        'platform-app-shell',
        `platform-app-shell--${shell}`,
        prefersCompactLayout ? 'platform-app-shell--compact' : 'platform-app-shell--full',
        prefersSimplifiedUX ? 'platform-app-shell--simplified' : 'platform-app-shell--rich',
        isPortrait ? 'platform-app-shell--portrait' : 'platform-app-shell--landscape',
      ].join(' ')}
      data-platform-shell={shell}
      data-platform-runtime={runtime}
      data-platform-compact={prefersCompactLayout ? 'compact' : 'full'}
      data-platform-ux={prefersSimplifiedUX ? 'simplified' : 'full'}
      data-platform-orientation={isPortrait ? 'portrait' : 'landscape'}
    >
      {children}
    </div>
  );
}
