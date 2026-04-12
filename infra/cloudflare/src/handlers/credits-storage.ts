import type { Env } from '@/constants/env';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import type { CreditBalance, CreditStorage, CreditTransaction } from '@/logic/credits';
import { buildSafeBucketKey } from '@/utils/path-sanitizer';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_CREDITS_WARNINGS = false;

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

export function createCreditStorage(env: Env): CreditStorage {
  return {
    async getBalance(userId: string): Promise<CreditBalance> {
      const key = buildSafeBucketKey(BucketPath.UserCredits, `${userId}.json`);
      try {
        const object = await env.MATCHES_BUCKET.get(key);
        if (object) {
          const balance = JSON.parse(await object.text()) as CreditBalance;
          return balance;
        }
      } catch (error) {
        logWarn(`Error loading balance for ${userId}`, getStackTrace(), error, LOG_CREDITS_WARNINGS);
      }
      return {
        user_id: userId,
        gp_balance: 0,
        ac_balance: 0,
        last_updated: new Date().toISOString(),
        total_gp_earned: 0,
        total_ac_purchased: 0,
        total_ac_spent: 0,
      };
    },

    async saveBalance(balance: CreditBalance): Promise<void> {
      const key = buildSafeBucketKey(BucketPath.UserCredits, `${balance.user_id}.json`);
      await env.MATCHES_BUCKET.put(key, JSON.stringify(balance, null, 2), {
        httpMetadata: {
          contentType: HttpContentType.ApplicationJson,
        },
      });
    },

    async addTransaction(transaction: CreditTransaction): Promise<void> {
      const key = buildSafeBucketKey(BucketPath.UserTransactions, transaction.user_id, `${transaction.transaction_id}.json`);
      await env.MATCHES_BUCKET.put(key, JSON.stringify(transaction, null, 2), {
        httpMetadata: {
          contentType: HttpContentType.ApplicationJson,
        },
      });
    },

    async getTransactions(userId: string, limit: number): Promise<CreditTransaction[]> {
      const prefix = buildSafeBucketKey(BucketPath.UserTransactions, userId);
      const listResult = await env.MATCHES_BUCKET.list({ prefix, limit });

      const transactions: CreditTransaction[] = [];

      for (const object of listResult.objects) {
        try {
          const obj = await env.MATCHES_BUCKET.get(object.key);
          if (obj) {
            const transaction = JSON.parse(await obj.text()) as CreditTransaction;
            transactions.push(transaction);
          }
        } catch (error) {
          logWarn(`Error loading transaction ${object.key}`, getStackTrace(), error, LOG_CREDITS_WARNINGS);
        }
      }

      transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return transactions.slice(0, limit);
    },
  };
}
