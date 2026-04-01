type RuntimeAssetOperationName =
  | 'entryIndex'
  | 'homePageGames'
  | 'gameCatalog'
  | 'selectedGamePage'
  | 'gameEngine'
  | 'prefetchCoreSlices'
  | 'prefetchAssets'
  | 'assetByGuid'
  | 'assetByHash'
  | 'assetByChecksum'
  | 'batchFetchAssets'
  | 'fetchAsset';

type RuntimeAssetOperationStats = {
  count: number;
  failures: number;
  totalMs: number;
  averageMs: number;
  lastMs: number;
};

type RuntimeAssetTelemetrySnapshot = {
  runtime: 'web' | 'desktop' | 'mobile';
  operations: Partial<Record<RuntimeAssetOperationName, RuntimeAssetOperationStats>>;
};

const telemetryByRuntime = new Map<
  'web' | 'desktop' | 'mobile',
  Map<RuntimeAssetOperationName, RuntimeAssetOperationStats>
>();

function getRuntimeStatsMap(runtime: 'web' | 'desktop' | 'mobile') {
  let stats = telemetryByRuntime.get(runtime);
  if (!stats) {
    stats = new Map();
    telemetryByRuntime.set(runtime, stats);
  }
  return stats;
}

function recordOperation(
  runtime: 'web' | 'desktop' | 'mobile',
  operation: RuntimeAssetOperationName,
  durationMs: number,
  failed: boolean
): void {
  const stats = getRuntimeStatsMap(runtime);
  const current = stats.get(operation) ?? {
    count: 0,
    failures: 0,
    totalMs: 0,
    averageMs: 0,
    lastMs: 0,
  };

  current.count += 1;
  current.failures += failed ? 1 : 0;
  current.totalMs += durationMs;
  current.lastMs = durationMs;
  current.averageMs = Number((current.totalMs / current.count).toFixed(2));
  stats.set(operation, current);
}

export async function measureRuntimeAssetOperation<T>(
  runtime: 'web' | 'desktop' | 'mobile',
  operation: RuntimeAssetOperationName,
  execute: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await execute();
    recordOperation(runtime, operation, Number((performance.now() - start).toFixed(2)), false);
    return result;
  } catch (error) {
    recordOperation(runtime, operation, Number((performance.now() - start).toFixed(2)), true);
    throw error;
  }
}

export function getRuntimeAssetTelemetrySnapshot(): RuntimeAssetTelemetrySnapshot[] {
  return [...telemetryByRuntime.entries()].map(([runtime, stats]) => ({
    runtime,
    operations: Object.fromEntries(stats.entries()),
  }));
}

export function resetRuntimeAssetTelemetry(): void {
  telemetryByRuntime.clear();
}
