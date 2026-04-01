import React, { Suspense, type ReactNode } from 'react';

const LazySolanaWalletProvider = React.lazy(() =>
  import('@/adapters/solana/wallet/WalletAdapter').then((m) => ({ default: m.SolanaWalletProvider }))
);

export function WalletProviderGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="wallet-loading">Connecting wallet…</div>}>
      <LazySolanaWalletProvider>{children}</LazySolanaWalletProvider>
    </Suspense>
  );
}
