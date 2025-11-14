import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { MEMO_PROGRAM_ID } from '@solana/spl-memo';

export interface AnchorResult {
  txSignature: string;
  matchHash: string;
  hotUrl?: string;
  signers?: string[];
}

export class SolanaAnchorService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async anchorMatchHash(
    matchId: string,
    matchHash: string,
    hotUrl?: string,
    signers?: string[],
    wallet?: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> }
  ): Promise<AnchorResult> {
    if (!wallet) {
      throw new Error('Wallet required for anchoring');
    }

    const memo = this.buildMemo(matchId, matchHash, hotUrl, signers);
    
    if (memo.length > 566) {
      // If too large, omit optional fields (prioritize match_id and sha256)
      const minimalMemo = this.buildMemo(matchId, matchHash);
      if (minimalMemo.length > 566) {
        throw new Error(`Memo too large even with minimal fields: ${minimalMemo.length} bytes (max 566)`);
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
        matchHash,
      };
    }

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
      matchHash,
      hotUrl,
      signers,
    };
  }

  /**
   * Builds memo in JSON format per spec Section 5, lines 197-202.
   * Format: {"match_id":"...","sha256":"<hex>","hot_url":"<r2_url_or_empty>","signers":["pubkey1","pubkey2"]}
   */
  private buildMemo(
    matchId: string,
    matchHash: string,
    hotUrl?: string,
    signers?: string[]
  ): string {
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

    // Minify JSON (no whitespace)
    return JSON.stringify(memoObj);
  }
}

