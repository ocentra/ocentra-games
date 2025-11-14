import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { MetricsCollector } from '@services/monitoring/MetricsCollector';

/**
 * Coordinator Wallet Pool with rotation per spec Section 2.1.
 * Implements hot wallet rotation after N transactions to reduce centralization risk.
 */
export class CoordinatorWalletPool {
  private hotWallets: Keypair[];
  private currentIndex: number = 0;
  private rotationThreshold: number = 1000; // Rotate after 1000 transactions
  private transactionCount: number = 0;
  private metricsCollector?: MetricsCollector;

  constructor(
    hotWalletPrivateKeys: string[],
    rotationThreshold: number = 1000,
    metricsCollector?: MetricsCollector
  ) {
    if (hotWalletPrivateKeys.length === 0) {
      throw new Error('At least one hot wallet required');
    }

    this.hotWallets = hotWalletPrivateKeys.map(key => {
      try {
        // Support both hex and base64 encoded keys
        const keyBytes = key.startsWith('0x')
          ? Buffer.from(key.slice(2), 'hex')
          : Buffer.from(key, 'base64');
        return Keypair.fromSecretKey(keyBytes);
      } catch (error) {
        throw new Error(`Invalid wallet private key format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    this.rotationThreshold = rotationThreshold;
    this.metricsCollector = metricsCollector;
  }

  /**
   * Gets the current active wallet.
   */
  getCurrentWallet(): Keypair {
    return this.hotWallets[this.currentIndex];
  }

  /**
   * Gets the current wallet's public key.
   */
  getCurrentPublicKey(): PublicKey {
    return this.hotWallets[this.currentIndex].publicKey;
  }

  /**
   * Records a transaction and rotates wallet if threshold reached.
   * Per spec Section 2.1: Rotate every N transactions.
   */
  async recordTransaction(): Promise<void> {
    this.transactionCount++;
    
    // Record metrics
    if (this.metricsCollector) {
      this.metricsCollector.recordTransactionSubmission();
    }

    // Check if rotation threshold reached
    if (this.transactionCount >= this.rotationThreshold) {
      await this.rotateWallet();
    }
  }

  /**
   * Rotates to the next wallet in the pool.
   * Per spec Section 2.1: Rotation reduces centralization risk.
   */
  async rotateWallet(): Promise<void> {
    const previousIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.hotWallets.length;
    this.transactionCount = 0;

    console.log(`Wallet rotated: ${previousIndex} -> ${this.currentIndex} (pubkey: ${this.hotWallets[this.currentIndex].publicKey.toBase58()})`);
    
    // In production, log to monitoring service
    if (this.metricsCollector) {
      // Could add custom metric for wallet rotations
      console.log(`Wallet rotation recorded at transaction count: ${this.rotationThreshold}`);
    }
  }

  /**
   * Gets transaction count for current wallet.
   */
  getTransactionCount(): number {
    return this.transactionCount;
  }

  /**
   * Gets current wallet index.
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Gets total number of wallets in pool.
   */
  getPoolSize(): number {
    return this.hotWallets.length;
  }

  /**
   * Gets wallet at specific index (for testing/recovery).
   */
  getWalletAt(index: number): Keypair {
    if (index < 0 || index >= this.hotWallets.length) {
      throw new Error(`Wallet index ${index} out of range (0-${this.hotWallets.length - 1})`);
    }
    return this.hotWallets[index];
  }

  /**
   * Creates a wallet adapter interface compatible with Solana web3.js.
   */
  getWalletAdapter() {
    const keypair = this.getCurrentWallet();
    return {
      publicKey: this.getCurrentPublicKey(),
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        // Transaction.sign() accepts rest parameters: sign(...signers)
        // VersionedTransaction.sign() accepts an array: sign([signers])
        if (tx instanceof Transaction) {
          tx.sign(keypair);
        } else {
          // VersionedTransaction
          tx.sign([keypair]);
        }
        return tx;
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        for (const tx of txs) {
          if (tx instanceof Transaction) {
            tx.sign(keypair);
          } else {
            // VersionedTransaction
            tx.sign([keypair]);
          }
        }
        return txs;
      },
    };
  }
}

