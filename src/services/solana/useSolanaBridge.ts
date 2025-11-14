import { useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SolanaEventBridge } from './SolanaEventBridge';
import { Wallet } from '@coral-xyz/anchor';
import { Transaction, VersionedTransaction } from '@solana/web3.js';

let bridgeInstance: SolanaEventBridge | null = null;

export function useSolanaBridge() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const bridgeRef = useRef<SolanaEventBridge | null>(null);

  useEffect(() => {
    if (!wallet.publicKey || !wallet.signTransaction || bridgeRef.current) {
      return;
    }

    // Ensure signTransaction is available (already checked, but TypeScript needs this)
    const signTransaction = wallet.signTransaction;
    if (!signTransaction) {
      return;
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

    const bridge = new SolanaEventBridge();
    bridge.initialize(connection, anchorWallet);
    bridgeRef.current = bridge;
    bridgeInstance = bridge;

    return () => {
      bridgeRef.current = null;
      bridgeInstance = null;
    };
  }, [connection, wallet]);

  return bridgeRef.current;
}

export function getSolanaBridge(): SolanaEventBridge | null {
  return bridgeInstance;
}

