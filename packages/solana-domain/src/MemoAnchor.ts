import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { MEMO_PROGRAM_ID } from '@solana/spl-memo';
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

export interface MemoAnchorResult {
  txSignature: string;
  matchId: string;
  matchHash: string;
  hotUrl?: string;
  signers?: string[];
}

export class MemoAnchor {
  static {
    log.register(import.meta.url);
  }

  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

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

    const memo = JSON.stringify(memoObj);

    const encoder = new TextEncoder();
    if (memo.length > 566) {
      const minimalMemo = JSON.stringify({
        match_id: matchId,
        sha256: matchHash,
      });

      if (minimalMemo.length > 566) {
        throw new Error(
          `Memo too large even with minimal fields: ${minimalMemo.length} bytes (max 566)`
        );
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
        data: encoder.encode(minimalMemo) as unknown as Buffer,
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

    const transaction = new Transaction().add({
      programId: MEMO_PROGRAM_ID,
      keys: [
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: true,
        },
      ],
      data: encoder.encode(memo) as unknown as Buffer,
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

      const message = tx.transaction.message;
      let instructions: Array<{ programId: PublicKey; data: Uint8Array }> = [];

      if ('version' in message) {
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
        instructions = (message as { instructions: Array<{ programId: PublicKey; data: Uint8Array }> }).instructions;
      }

      for (const instruction of instructions) {
        if (instruction.programId.equals(MEMO_PROGRAM_ID)) {
          const memoData = instruction.data;
          const decoder = new TextDecoder();
          const memoText = decoder.decode(memoData);

          try {
            const memoObj = JSON.parse(memoText);
            return {
              matchId: memoObj.match_id,
              matchHash: memoObj.sha256,
              hotUrl: memoObj.hot_url || undefined,
              signers: memoObj.signers || undefined,
            };
          } catch {
            return null;
          }
        }
      }

      return null;
    } catch (error) {
      logError('Failed to read memo anchor:', { data: error });
      return null;
    }
  }
}

