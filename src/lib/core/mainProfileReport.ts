import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';

type BootGlobal = typeof globalThis & {
  __OCENTRA_BOOT_TRACE?: Array<Record<string, unknown>>;
};

export function createProfileReporter(
  bootGlobal: BootGlobal,
  profileTimeToMainMs: number
): (enrich?: { initDurationMs: number; totalDurationMs: number }) => void {
  const urlProfile =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('profile') : null;
  const envProfile = (import.meta as { env?: Record<string, string> }).env?.VITE_PROFILE === '1';
  const shouldCaptureProfile = urlProfile === '1' || envProfile;

  return function sendProfileReport(enrich?: { initDurationMs: number; totalDurationMs: number }) {
    if (typeof window === 'undefined' || !shouldCaptureProfile) return;
    const resources = (performance.getEntriesByType?.('resource') ?? []) as PerformanceResourceTiming[];
    const scripts = resources
      .filter((r) => r.initiatorType === 'script' || (r.name?.endsWith('.js') ?? false))
      .map((r) => ({
        name: r.name?.split('/').pop() ?? r.name,
        url: r.name,
        durationMs: Math.round(r.duration),
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
      }))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 50);
    const report = {
      capturedAt: new Date().toISOString(),
      timeToMainMs: profileTimeToMainMs,
      bootTrace: bootGlobal.__OCENTRA_BOOT_TRACE ?? [],
      scriptsByDuration: scripts,
      summary: { totalScripts: scripts.length, topSlowest: scripts.slice(0, 5) },
      ...(enrich ? { initDurationMs: enrich.initDurationMs, totalDurationMs: enrich.totalDurationMs } : {}),
    };
    const url = `${window.location.origin}${LocalApiEndpoint.Profile}`;
    const fallbackDownload = () => {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'performance-profile.json';
      a.click();
      URL.revokeObjectURL(a.href);
    };
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    })
      .then((r) => {
        if (!r.ok) fallbackDownload();
      })
      .catch(fallbackDownload);
  };
}
