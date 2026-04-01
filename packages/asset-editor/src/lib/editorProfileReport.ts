const EDITOR_PROFILE_PATH = '/_dev/profile-editor';
const EDITOR_PROFILE_FILENAME = 'performance-profile-editor.json';

type BootGlobal = typeof globalThis & {
  __OCENTRA_BOOT_TRACE?: Array<Record<string, unknown>>;
};

function shouldCaptureProfile(): boolean {
  if (typeof window === 'undefined') return false;
  const env = (import.meta as { env?: Record<string, string> }).env;
  const urlProfile = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('profile') : null;
  return env?.VITE_PROFILE === '1' || urlProfile === '1';
}

const IGNORED_SCRIPT_URL_PATTERNS = [
  '/node_modules/',
  '/@vite/',
  '/@fs/',
  '.vite/deps',
];

function isAppScript(url: string | undefined): boolean {
  if (!url) return false;
  return !IGNORED_SCRIPT_URL_PATTERNS.some((p) => url.includes(p));
}

function buildReport(timeToMainMs: number): Record<string, unknown> {
  const bootGlobal = globalThis as BootGlobal;
  const resources = (performance.getEntriesByType?.('resource') ?? []) as PerformanceResourceTiming[];
  const allScripts = resources
    .filter(
      (r) =>
        (r.initiatorType === 'script' ||
          (r.name?.endsWith('.js') ?? false) ||
          (r.name?.endsWith('.ts') ?? false) ||
          (r.name?.endsWith('.tsx') ?? false)) &&
        isAppScript(r.name)
    )
    .map((r) => ({
      name: r.name?.split('/').pop() ?? r.name,
      url: r.name,
      durationMs: Math.round(r.duration),
      transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize,
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
  const scripts = allScripts.slice(0, 50);
  return {
    app: 'asset-editor',
    capturedAt: new Date().toISOString(),
    timeToMainMs,
    bootTrace: bootGlobal.__OCENTRA_BOOT_TRACE ?? [],
    scriptsByDuration: scripts,
    summary: {
      totalScripts: allScripts.length,
      topSlowest: scripts.slice(0, 5),
    },
  };
}

function downloadReport(report: Record<string, unknown>): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = EDITOR_PROFILE_FILENAME;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function runEditorProfileCaptureIfEnabled(profileTimeToMainMs: number): void {
  if (!shouldCaptureProfile()) return;
  setTimeout(() => {
    const report = buildReport(profileTimeToMainMs);
    const url = `${window.location.origin}${EDITOR_PROFILE_PATH}`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    })
      .then((r) => {
        if (!r.ok) downloadReport(report);
      })
      .catch(() => downloadReport(report));
  }, 1000);
}
