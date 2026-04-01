import { Connection, type TransactionSignature, Transaction, PublicKey } from '@solana/web3.js';
import { ErrorHandler } from './ErrorHandler';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export interface TransactionProgress {
  stage: 'building' | 'signing' | 'sending' | 'confirming' | 'confirmed' | 'failed';
  message: string;
  progress?: number;
}

export interface TransactionOptions {
  maxRetries?: number;
  timeoutMs?: number;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  skipPreflight?: boolean;
  onProgress?: (progress: TransactionProgress) => void;
}

export interface TransactionResult {
  signature: TransactionSignature;
  confirmed: boolean;
  error?: string;
}

export class TransactionHandler {
  static { log.register(import.meta.url); }

  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async sendTransaction(
    transaction: Transaction,
    signers: Array<{ publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> }>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const { maxRetries = 3, timeoutMs = 30000, commitment = 'confirmed', skipPreflight = false, onProgress } = options;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        onProgress?.({ stage: 'building', message: 'Preparing transaction...', progress: 10 });
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(commitment);
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = signers[0]?.publicKey;
        onProgress?.({ stage: 'signing', message: 'Signing transaction...', progress: 30 });

        let signedTransaction = transaction;
        for (const signer of signers) {
          signedTransaction = await signer.signTransaction(signedTransaction);
        }

        onProgress?.({ stage: 'sending', message: 'Sending transaction...', progress: 50 });
        const signature = await this.connection.sendRawTransaction(signedTransaction.serialize(), { skipPreflight, maxRetries: 0 });
        onProgress?.({ stage: 'confirming', message: 'Waiting for confirmation...', progress: 70 });

        const confirmationPromise = this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, commitment);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeoutMs);
        });

        try {
          await Promise.race([confirmationPromise, timeoutPromise]);
        } catch (timeoutError) {
          const status = await this.connection.getSignatureStatus(signature);
          if (status?.value?.confirmationStatus) {
            onProgress?.({ stage: 'confirmed', message: 'Transaction confirmed', progress: 100 });
            return { signature, confirmed: true };
          }
          throw timeoutError;
        }

        onProgress?.({ stage: 'confirmed', message: 'Transaction confirmed', progress: 100 });
        return { signature, confirmed: true };
      } catch (error) {
        lastError = error;
        const errorDetails = ErrorHandler.parseError(error);
        onProgress?.({ stage: 'failed', message: errorDetails.userMessage, progress: 0 });
        if (!ErrorHandler.shouldRetry(error, attempt, maxRetries)) {
          return { signature: '' as TransactionSignature, confirmed: false, error: errorDetails.userMessage };
        }
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    const errorDetails = ErrorHandler.parseError(lastError);
    return { signature: '' as TransactionSignature, confirmed: false, error: errorDetails.userMessage };
  }

  async estimateFee(transaction: Transaction): Promise<number> {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      const feeResponse = await this.connection.getFeeForMessage(transaction.compileMessage());
      const fee = feeResponse?.value ?? null;
      return fee ?? 5000;
    } catch (error) {
      logError('Failed to estimate fee:', { data: error });
      return 5000;
    }
  }

  async pollTransactionStatus(
    signature: TransactionSignature,
    options: { timeoutMs?: number; intervalMs?: number; onStatus?: (status: string) => void } = {}
  ): Promise<boolean> {
    const { timeoutMs = 30000, intervalMs = 1000, onStatus } = options;
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.connection.getSignatureStatus(signature);
        if (status?.value) {
          const confirmationStatus = status.value.confirmationStatus;
          onStatus?.(confirmationStatus || 'unknown');
          if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') return true;
          if (status.value.err) return false;
        }
      } catch (error) {
        logError('Error polling transaction status:', { data: error });
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
  }
}
