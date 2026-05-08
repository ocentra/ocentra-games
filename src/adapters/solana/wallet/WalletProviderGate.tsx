import React, { Suspense, type ReactNode } from 'react';
import { ScreenLoadingFallback } from '@/ui/components/Loading/ScreenLoadingFallback';

const LazySolanaWalletProvider = React.lazy(() =>
  import('@/adapters/solana/wallet/WalletAdapter').then((m) => ({ default: m.SolanaWalletProvider }))
);

export function WalletProviderGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ScreenLoadingFallback label="Connecting wallet" variant="page" />}>
      <LazySolanaWalletProvider>{children}</LazySolanaWalletProvider>
    </Suspense>
  );
}
