/**
 * Transaction handler with retry logic, progress indicators, and fee estimation.
 * Per critique Phase 5.3: Add retry logic, fee estimation, timeout handling, progress callbacks.
 * Per spec Section 19.6.2, lines 2510-2591.
 */

import { Connection, type TransactionSignature, Transaction, PublicKey } from '@solana/web3.js';
import { ErrorHandler } from './ErrorHandler';

export interface TransactionProgress {
  stage: 'building' | 'signing' | 'sending' | 'confirming' | 'confirmed' | 'failed';
  message: string;
  progress?: number; // 0-100
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

/**
 * Handles Solana transactions with retry logic, progress tracking, and error handling.
 */
export class TransactionHandler {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Sends a transaction with retry logic and progress tracking.
   * Per spec Section 19.6.2: Progress indicators, gas fee estimation, graceful fallback, timeout handling.
   */
  async sendTransaction(
    transaction: Transaction,
    signers: Array<{ publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> }>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    const {
      maxRetries = 3,
      timeoutMs = 30000,
      commitment = 'confirmed',
      skipPreflight = false,
      onProgress,
    } = options;

    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Stage 1: Building transaction
        onProgress?.({
          stage: 'building',
          message: 'Preparing transaction...',
          progress: 10,
        });

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(commitment);
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = signers[0]?.publicKey;

        // Stage 2: Signing
        onProgress?.({
          stage: 'signing',
          message: 'Signing transaction...',
          progress: 30,
        });

        let signedTransaction = transaction;
        for (const signer of signers) {
          signedTransaction = await signer.signTransaction(signedTransaction);
        }

        // Stage 3: Sending
        onProgress?.({
          stage: 'sending',
          message: 'Sending transaction...',
          progress: 50,
        });

        const signature = await this.connection.sendRawTransaction(
          signedTransaction.serialize(),
          {
            skipPreflight,
            maxRetries: 0, // We handle retries ourselves
          }
        );

        // Stage 4: Confirming
        onProgress?.({
          stage: 'confirming',
          message: 'Waiting for confirmation...',
          progress: 70,
        });

        // Confirm with timeout
        const confirmationPromise = this.connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          commitment
        );

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeoutMs);
        });

        try {
          await Promise.race([confirmationPromise, timeoutPromise]);
        } catch (timeoutError) {
          // Check if transaction was actually confirmed
          const status = await this.connection.getSignatureStatus(signature);
          if (status?.value?.confirmationStatus) {
            // Transaction was confirmed, just timeout on our end
            onProgress?.({
              stage: 'confirmed',
              message: 'Transaction confirmed',
              progress: 100,
            });
            return { signature, confirmed: true };
          }
          throw timeoutError;
        }

        // Stage 5: Confirmed
        onProgress?.({
          stage: 'confirmed',
          message: 'Transaction confirmed',
          progress: 100,
        });

        return { signature, confirmed: true };
      } catch (error) {
        lastError = error;
        const errorDetails = ErrorHandler.parseError(error);

        onProgress?.({
          stage: 'failed',
          message: errorDetails.userMessage,
          progress: 0,
        });

        // Check if we should retry
        if (!ErrorHandler.shouldRetry(error, attempt, maxRetries)) {
          return {
            signature: '' as TransactionSignature,
            confirmed: false,
            error: errorDetails.userMessage,
          };
        }

        // Wait before retry (exponential backoff)
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    const errorDetails = ErrorHandler.parseError(lastError);
    return {
      signature: '' as TransactionSignature,
      confirmed: false,
      error: errorDetails.userMessage,
    };
  }

  /**
   * Estimates transaction fee.
   * Per spec Section 19.6.2: Gas fee estimation.
   */
  async estimateFee(transaction: Transaction): Promise<number> {
    try {
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Get fee for message
      const feeResponse = await this.connection.getFeeForMessage(transaction.compileMessage());
      // Extract fee value from RpcResponseAndContext (feeResponse.value is number | null)
      const fee = feeResponse?.value ?? null;
      return fee ?? 5000; // Default estimate if unavailable
    } catch (error) {
      console.error('Failed to estimate fee:', error);
      return 5000; // Default estimate
    }
  }

  /**
   * Polls transaction status until confirmed or timeout.
   * Per spec Section 19.6.2: Transaction status polling.
   */
  async pollTransactionStatus(
    signature: TransactionSignature,
    options: {
      timeoutMs?: number;
      intervalMs?: number;
      onStatus?: (status: string) => void;
    } = {}
  ): Promise<boolean> {
    const { timeoutMs = 30000, intervalMs = 1000, onStatus } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.connection.getSignatureStatus(signature);
        
        if (status?.value) {
          const confirmationStatus = status.value.confirmationStatus;
          onStatus?.(confirmationStatus || 'unknown');

          if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
            return true;
          }

          if (status.value.err) {
            return false; // Transaction failed
          }
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return false; // Timeout
  }
}

