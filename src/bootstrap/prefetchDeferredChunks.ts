function scheduleIdle(cb: () => void, timeoutMs = 3000): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(cb, { timeout: timeoutMs });
  } else {
    setTimeout(cb, 0);
  }
}

export function prefetchDeferredChunks(): void {
  scheduleIdle(() => {
    void Promise.all([
  import('@ocentra/core-ui/Background/ThreeBaseContext'),
  import('@ocentra/core-ui/Background/DynamicBackground'),
      import('@/adapters/solana/wallet/WalletAdapter'),
    ]);
  });
}
