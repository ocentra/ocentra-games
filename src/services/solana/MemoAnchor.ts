/**
 * Memo program anchoring for Phase A (MVP).
 * Per critique Phase 4.2: Implement Memo program anchoring per spec Section 6.1, lines 893-896.
 * 
 * This provides a simple anchoring mechanism using Solana's Memo program for early development.
 * For production (Phase B), use the custom Anchor program via SolanaAnchorService.
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { MEMO_PROGRAM_ID } from '@solana/spl-memo';

export interface MemoAnchorResult {
  txSignature: string;
  matchId: string;
  matchHash: string;
  hotUrl?: string;
  signers?: string[];
}

/**
 * MemoAnchor - Anchors match records using Solana's Memo program.
 * 
 * Per spec Section 5, lines 197-202: Anchor content format:
 * {"match_id":"...","sha256":"<hex>","hot_url":"<r2_url_or_empty>","signers":["pubkey1","pubkey2"]}
 */
export class MemoAnchor {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Anchors a match record hash using the Memo program.
   * Per spec Section 6.1: Use Memo program for Phase A (MVP).
   * 
   * @param matchId - Match UUID
   * @param matchHash - SHA-256 hash of canonical match record (hex string)
   * @param hotUrl - Optional R2 URL where full record is stored
   * @param signers - Optional array of signer public keys
   * @param wallet - Wallet to sign and send transaction
   * @returns Transaction signature and anchor details
   */
  async anchorMatchRecord(
    matchId: string,
    matchHash: string,
    hotUrl?: string,
    signers?: string[],
    wallet?: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> }
  ): Promise<MemoAnchorResult> {
    if (!wallet) {
      throw new Error('Wallet required for anchoring');
    }

    // Build memo content per spec Section 5, lines 197-202
    const memoObj: Record<string, unknown> = {
      match_id: matchId,
      sha256: matchHash,
    };

    if (hotUrl) {
      memoObj.hot_url = hotUrl;
    } else {
      memoObj.hot_url = '';
    }

    if (signers && signers.length > 0) {
      memoObj.signers = signers;
    }

    // Minify JSON (no whitespace) per canonical rules
    const memo = JSON.stringify(memoObj);

    // Per spec Section 5, line 202: Keep memo size small (<566 bytes)
    if (memo.length > 566) {
      // If too large, omit optional fields (prioritize match_id and sha256)
      const minimalMemo = JSON.stringify({
        match_id: matchId,
        sha256: matchHash,
      });
      
      if (minimalMemo.length > 566) {
        throw new Error(
          `Memo too large even with minimal fields: ${minimalMemo.length} bytes (max 566)`
        );
      }

      // Use minimal memo
      const transaction = new Transaction().add({
        programId: MEMO_PROGRAM_ID,
        keys: [
          {
            pubkey: wallet.publicKey,
            isSigner: true,
            isWritable: true,
          },
        ],
        data: Buffer.from(minimalMemo, 'utf-8'),
      });

      const signed = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      return {
        txSignature: signature,
        matchId,
        matchHash,
      };
    }

    // Full memo fits - use it
    const transaction = new Transaction().add({
      programId: MEMO_PROGRAM_ID,
      keys: [
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: true,
        },
      ],
      data: Buffer.from(memo, 'utf-8'),
    });

    const signed = await wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    });

    await this.connection.confirmTransaction(signature, 'confirmed');

    return {
      txSignature: signature,
      matchId,
      matchHash,
      hotUrl,
      signers,
    };
  }

  /**
   * Reads a memo anchor from a transaction signature.
   * Useful for verification and lookup.
   */
  async readMemoAnchor(txSignature: string): Promise<{
    matchId: string;
    matchHash: string;
    hotUrl?: string;
    signers?: string[];
  } | null> {
    try {
      const tx = await this.connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return null;
      }

      // Find memo instruction
      // Handle both regular and versioned transactions
      const message = tx.transaction.message;
      let instructions: Array<{ programId: PublicKey; data: Uint8Array }> = [];
      
      // Check if it's a versioned transaction
      if ('version' in message) {
        // Versioned transaction: use compiledInstructions
        instructions = message.compiledInstructions.map(ix => {
          const programIdIndex = ix.programIdIndex;
          const programId = message.staticAccountKeys[programIdIndex] || 
                           (message.addressTableLookups?.[0]?.writableIndexes?.includes(programIdIndex) 
                             ? message.addressTableLookups[0].accountKey 
                             : PublicKey.default);
          return {
            programId: programId instanceof PublicKey ? programId : new PublicKey(programId),
            data: ix.data,
          };
        });
      } else {
        // Regular transaction: use instructions
        instructions = (message as { instructions: Array<{ programId: PublicKey; data: Uint8Array }> }).instructions;
      }
      
      for (const instruction of instructions) {
        if (instruction.programId.equals(MEMO_PROGRAM_ID)) {
          // Decode memo data
          const memoData = instruction.data;
          const memoText = Buffer.from(memoData).toString('utf-8');
          
          try {
            const memoObj = JSON.parse(memoText);
            return {
              matchId: memoObj.match_id,
              matchHash: memoObj.sha256,
              hotUrl: memoObj.hot_url || undefined,
              signers: memoObj.signers || undefined,
            };
          } catch {
            // Memo might not be JSON - return null
            return null;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to read memo anchor:', error);
      return null;
    }
  }
}

