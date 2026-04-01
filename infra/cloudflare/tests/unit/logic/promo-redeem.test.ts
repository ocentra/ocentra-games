import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { redeemPromoLogic } from '@/logic/promo-redeem';
import { Logger, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST = false;
const logInfo = (msg: string, stack: StackTrace, data?: unknown) =>
  log.logInfo(msg, stack, data, LOG_TEST);

/**
 * Money-critical: promo redeem. Threat mapping (ocentra-security-rules.mdc):
 * - Rule 0.1.1 (G1): Replay must never produce profit → idempotency per user+code.
 * - Rule 6.1.2 / 6.1.8: Replay of actions, reward duplication → already_redeemed, single award.
 * - Rule 12.1.2: No partial failure profitable → redeem key written before credits; rollback on GP fail.
 * - Rule 14.8: Replay/duplication → idempotent OR rejected; no double execution.
 */

/** KV substitution (§10.1.2): contract-bound, deterministic. Success path with real credit outcomes is integration-only; we never stub success. */
function createInMemoryKV(initial: Record<string, string> = {}): {
  kv: { get: (key: string) => Promise<string | null>; put: (key: string, value: string) => Promise<void>; delete: (key: string) => Promise<void> };
  store: Map<string, string>;
} {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    kv: {
      get: (key: string) => Promise.resolve(store.get(key) ?? null),
      put: (key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      },
      delete: (key: string) => {
        store.delete(key);
        return Promise.resolve();
      },
    },
  };
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('redeemPromoLogic: returns error when code is missing'), async () => {
    const { kv } = createInMemoryKV();
    const result = await redeemPromoLogic(
      { code: '', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: undefined }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Code is required');
  });

  it(testName('redeemPromoLogic: returns error when code is whitespace only'), async () => {
    const { kv } = createInMemoryKV();
    const result = await redeemPromoLogic(
      { code: '   ', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: undefined }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Code is required');
  });

  it(testName('redeemPromoLogic: returns error when PROMO_KV is not configured'), async () => {
    const result = await redeemPromoLogic(
      { code: 'ABC', userId: 'user1' },
      { CREDITS_DO: undefined }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('PROMO_KV not configured');
  });

  it(testName('redeemPromoLogic: returns error when CREDITS_DO is not configured'), async () => {
    const { kv } = createInMemoryKV({ 'promo:ABC': JSON.stringify({ ac: 100, gp: 50 }) });
    const result = await redeemPromoLogic(
      { code: 'ABC', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: undefined }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('CREDITS_DO not configured');
  });

  const noopCreditsDoStub = {
    idFromName: () => ({ toString: () => 'id' }),
    get: () => ({
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify({ success: false, error: 'DO not used in this test' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        ),
    }),
  };

  it(testName('redeemPromoLogic: returns Invalid or expired code when promo key missing'), async () => {
    const { kv } = createInMemoryKV();
    const result = await redeemPromoLogic(
      { code: 'NOSUCH', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: noopCreditsDoStub as never }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
  });

  it(testName('redeemPromoLogic: returns Invalid or expired code when promo value is invalid JSON'), async () => {
    const { kv } = createInMemoryKV({ 'promo:BAD': 'not json' });
    const result = await redeemPromoLogic(
      { code: 'bad', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: noopCreditsDoStub as never }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
  });

  it(testName('redeemPromoLogic: returns Invalid or expired code when ac and gp are both 0'), async () => {
    const { kv } = createInMemoryKV({ 'promo:ZERO': JSON.stringify({ ac: 0, gp: 0 }) });
    const result = await redeemPromoLogic(
      { code: 'zero', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: noopCreditsDoStub as never }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
  });

  it(testName('redeemPromoLogic: returns already_redeemed when redeemed key exists'), async () => {
    const { kv } = createInMemoryKV({
      'promo:ONCE': JSON.stringify({ ac: 10, gp: 5 }),
      'promo:redeemed:ONCE:user1': '1',
    });
    const result = await redeemPromoLogic(
      { code: 'once', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: noopCreditsDoStub as never }
    );
    expect(result.success).toBe(true);
    expect(result.already_redeemed).toBe(true);
    expect(result.ac_added).toBeUndefined();
    expect(result.gp_added).toBeUndefined();
  });

  it(testName('redeemPromoLogic: code normalization finds key stored under uppercase (lowercase input)'), async () => {
    const { kv } = createInMemoryKV({
      'promo:NORM': JSON.stringify({ ac: 20, gp: 10 }),
    });
    const successDoStub = {
      idFromName: () => ({ toString: () => 'id' }),
      get: () => ({
        fetch: (req: Request) => {
          const url = typeof req.url === 'string' ? req.url : (req.url as URL).href;
          const isAward = url.includes('award');
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                new_balance: isAward ? 10 : 20,
                transaction_id: 'tid',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        },
      }),
    };
    const result = await redeemPromoLogic(
      { code: '  norm  ', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: successDoStub as never }
    );
    expect(result.success).toBe(true);
    expect(result.ac_added).toBe(20);
    expect(result.gp_added).toBe(10);
  });

  it(testName('redeemPromoLogic: returns failure when credit subsystem returns failure (no fake success)'), async () => {
    const { kv } = createInMemoryKV({
      'promo:FAIL': JSON.stringify({ ac: 10, gp: 0 }),
    });
    const failureDoStub = {
      idFromName: () => ({ toString: () => 'id' }),
      get: () => ({
        fetch: () =>
          Promise.resolve(
            new Response(
              JSON.stringify({ success: false, error: 'Insufficient funds', already_processed: false }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          ),
      }),
    };
    const result = await redeemPromoLogic(
      { code: 'fail', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: failureDoStub as never }
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient funds');
  });

  it(testName('redeemPromoLogic: preloaded ac=0 gp=0 returns Invalid or expired code'), async () => {
    const { kv } = createInMemoryKV();
    const result = await redeemPromoLogic(
      { code: 'ZERO', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: noopCreditsDoStub as never },
      { ac: 0, gp: 0 }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
  });

  it(testName('redeemPromoLogic: preloaded ac=100 gp=0 awards only AC (no GP path)'), async () => {
    const { kv } = createInMemoryKV();
    let awardCalls = 0;
    let purchaseCalls = 0;
    const doStub = {
      idFromName: () => ({ toString: () => 'id' }),
      get: () => ({
        fetch: (req: Request) => {
          const url = typeof req.url === 'string' ? req.url : (req.url as URL).href;
          if (url.includes('award')) awardCalls += 1;
          if (url.includes('purchase')) purchaseCalls += 1;
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: true, new_balance: 100, transaction_id: 'tid' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        },
      }),
    };
    const result = await redeemPromoLogic(
      { code: 'ACONLY', userId: 'u1' },
      { PROMO_KV: kv as never, CREDITS_DO: doStub as never },
      { ac: 100, gp: 0 }
    );
    expect(result.success).toBe(true);
    expect(result.ac_added).toBe(100);
    expect(result.gp_added).toBeUndefined();
    expect(awardCalls).toBe(0);
    expect(purchaseCalls).toBe(1);
  });

  it(testName('redeemPromoLogic: preloaded ac=0 gp=50 awards only GP (no AC path)'), async () => {
    const { kv } = createInMemoryKV();
    let awardCalls = 0;
    let purchaseCalls = 0;
    const doStub = {
      idFromName: () => ({ toString: () => 'id' }),
      get: () => ({
        fetch: (req: Request) => {
          const url = typeof req.url === 'string' ? req.url : (req.url as URL).href;
          if (url.includes('award')) awardCalls += 1;
          if (url.includes('purchase')) purchaseCalls += 1;
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: true, new_balance: 50, transaction_id: 'tid' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        },
      }),
    };
    const result = await redeemPromoLogic(
      { code: 'GPONLY', userId: 'u1' },
      { PROMO_KV: kv as never, CREDITS_DO: doStub as never },
      { ac: 0, gp: 50 }
    );
    expect(result.success).toBe(true);
    expect(result.gp_added).toBe(50);
    expect(result.ac_added).toBeUndefined();
    expect(awardCalls).toBe(1);
    expect(purchaseCalls).toBe(0);
  });

  it(testName('redeemPromoLogic: KV record with negative ac and gp coerced to 0 returns Invalid or expired code'), async () => {
    const { kv } = createInMemoryKV({
      'promo:NEG': JSON.stringify({ ac: -10, gp: -5 }),
    });
    const result = await redeemPromoLogic(
      { code: 'neg', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: noopCreditsDoStub as never }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
  });

  it(testName('redeemPromoLogic: KV record with NaN-like values coerced to 0 returns Invalid or expired code'), async () => {
    const { kv } = createInMemoryKV({
      'promo:NAN': JSON.stringify({ ac: NaN, gp: undefined }),
    });
    const result = await redeemPromoLogic(
      { code: 'nan', userId: 'user1' },
      { PROMO_KV: kv as never, CREDITS_DO: noopCreditsDoStub as never }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
  });

  it(testName('redeemPromoLogic: second call same user same code returns already_redeemed and no double award (G1, Rule 6.1.2)'), async () => {
    const { kv, store } = createInMemoryKV({
      'promo:TWICE': JSON.stringify({ ac: 30, gp: 15 }),
    });
    const successDoStub = {
      idFromName: () => ({ toString: () => 'id' }),
      get: () => ({
        fetch: (req: Request) => {
          const url = typeof req.url === 'string' ? req.url : (req.url as URL).href;
          const isAward = url.includes('award');
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                new_balance: isAward ? 15 : 30,
                transaction_id: 'tid',
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        },
      }),
    };
    const env = { PROMO_KV: kv as never, CREDITS_DO: successDoStub as never };
    const first = await redeemPromoLogic({ code: 'twice', userId: 'u2' }, env);
    expect(first.success).toBe(true);
    expect(first.already_redeemed).toBeUndefined();
    expect(first.ac_added).toBe(30);
    expect(first.gp_added).toBe(15);
    expect(store.get('promo:redeemed:TWICE:u2')).toBe('1');

    const second = await redeemPromoLogic({ code: 'twice', userId: 'u2' }, env);
    expect(second.success).toBe(true);
    expect(second.already_redeemed).toBe(true);
    expect(second.ac_added).toBeUndefined();
    expect(second.gp_added).toBeUndefined();
  });

  it(testName('redeemPromoLogic: Rule 12.1.2 GP fail rolls back redeemed key so retry can succeed once'), async () => {
    const { kv, store } = createInMemoryKV({
      'promo:GPFAIL': JSON.stringify({ ac: 0, gp: 20 }),
    });
    let gpCallCount = 0;
    const gpFailThenSuccessDoStub = {
      idFromName: () => ({ toString: () => 'id' }),
      get: () => ({
        fetch: (req: Request) => {
          const url = typeof req.url === 'string' ? req.url : (req.url as URL).href;
          if (url.includes('award')) {
            gpCallCount += 1;
            if (gpCallCount === 1) {
              return Promise.resolve(
                new Response(
                  JSON.stringify({ success: false, error: 'GP fail', already_processed: false }),
                  { status: 400, headers: { 'Content-Type': 'application/json' } }
                )
              );
            }
          }
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: true, new_balance: 20, transaction_id: 'tid' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        },
      }),
    };
    const env = { PROMO_KV: kv as never, CREDITS_DO: gpFailThenSuccessDoStub as never };
    const first = await redeemPromoLogic({ code: 'gpfail', userId: 'u3' }, env);
    expect(first.success).toBe(false);
    expect(first.error).toContain('GP fail');
    expect(store.get('promo:redeemed:GPFAIL:u3')).toBeUndefined();

    const second = await redeemPromoLogic({ code: 'gpfail', userId: 'u3' }, env);
    expect(second.success).toBe(true);
    expect(second.gp_added).toBe(20);
    expect(second.already_redeemed).toBeUndefined();
    expect(store.get('promo:redeemed:GPFAIL:u3')).toBe('1');
  });

  it(testName('redeemPromoLogic: Rule 12.1.2 AC fail after GP success does not rollback; retry returns already_redeemed (no double GP)'), async () => {
    const { kv, store } = createInMemoryKV({
      'promo:ACFAIL': JSON.stringify({ ac: 10, gp: 5 }),
    });
    const gpSuccessAcFailDoStub = {
      idFromName: () => ({ toString: () => 'id' }),
      get: () => ({
        fetch: (req: Request) => {
          const url = typeof req.url === 'string' ? req.url : (req.url as URL).href;
          if (url.includes('award')) {
            return Promise.resolve(
              new Response(
                JSON.stringify({ success: true, new_balance: 5, transaction_id: 'tid' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            );
          }
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: false, error: 'AC fail', already_processed: false }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          );
        },
      }),
    };
    const env = { PROMO_KV: kv as never, CREDITS_DO: gpSuccessAcFailDoStub as never };
    const first = await redeemPromoLogic({ code: 'acfail', userId: 'u4' }, env);
    expect(first.success).toBe(false);
    expect(first.error).toContain('AC fail');
    expect(store.get('promo:redeemed:ACFAIL:u4')).toBe('1');

    const second = await redeemPromoLogic({ code: 'acfail', userId: 'u4' }, env);
    expect(second.success).toBe(true);
    expect(second.already_redeemed).toBe(true);
    expect(second.ac_added).toBeUndefined();
    expect(second.gp_added).toBeUndefined();
  });
});
