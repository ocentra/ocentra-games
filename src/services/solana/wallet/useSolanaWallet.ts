import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Wallet } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import { AnchorClient } from '../AnchorClient';
import { Transaction, VersionedTransaction } from '@solana/web3.js';

export function useSolanaWallet() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const anchorClient = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    // Ensure signTransaction is available (already checked, but TypeScript needs this)
    const signTransaction = wallet.signTransaction;
    if (!signTransaction) {
      return null;
    }

    // Create wallet compatible with Anchor's Wallet interface (payer is optional for browser wallets)
    const anchorWallet: Wallet = {
      publicKey: wallet.publicKey,
      signTransaction: signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions?.bind(wallet) || (async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        // Fallback: sign transactions one by one if signAllTransactions is not available
        const signed: T[] = [];
        for (const tx of txs) {
          const signedTx = await signTransaction(tx);
          signed.push(signedTx as T);
        }
        return signed;
      }),
      // payer is optional - only required for NodeWallet, not browser wallets
    } as Wallet;

    return new AnchorClient(connection, anchorWallet);
  }, [connection, wallet]);

  return {
    ...wallet,
    anchorClient,
    isConnected: wallet.connected && anchorClient !== null,
  };
}

