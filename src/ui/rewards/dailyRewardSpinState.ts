import { useCallback, useEffect, useState } from 'react';
import { Currency } from '@ocentra/endpoint-domain/constants/credits';
import {
  claimDailyReward,
  getCreditsBalance,
  getDailyReward,
  type CreditBalanceResponse,
  type DailyRewardClaimResponse,
  type DailyRewardStateResponse,
} from '@ocentra/api-domain/playerHub';
import type { LobbyRewardStatus } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
log.register(import.meta.url);

function logError(message: string, data?: unknown): void {
  log.logError(message, getStackTrace(), data);
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function acAmount(value: unknown): number {
  const reward = asRecord(value);
  if (!reward) return 0;
  const currency = typeof reward.currency === 'string' ? reward.currency.toUpperCase() : '';
  const type = typeof reward.type === 'string' ? reward.type.toLowerCase() : '';
  const directAc = numberValue(reward.ac);
  if (directAc > 0) return directAc;
  if (currency === Currency.AC || type === 'ac') return numberValue(reward.amount);
  return 0;
}

function acLabel(amount: number): string | undefined {
  return amount > 0 ? `${amount.toLocaleString()} AC` : undefined;
}

function balanceLabel(balance?: CreditBalanceResponse | null): string | undefined {
  if (!balance) return undefined;
  return `${numberValue(balance.ac_balance).toLocaleString()} AC`;
}

function lastRewardFromDaily(daily?: DailyRewardStateResponse | null): unknown {
  return asRecord(daily)?.lastReward;
}

export function dailyRewardIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isDailyRewardSpinCollected(status?: LobbyRewardStatus | null): boolean {
  const readyLabel = status?.readyLabel?.toLowerCase() ?? '';
  return Boolean(status?.claimed || status?.alreadyClaimed || readyLabel.includes('claimed') || readyLabel.includes('collected'));
}

export function toDailyRewardSpinStatus(
  daily: DailyRewardStateResponse | null,
  balance: CreditBalanceResponse | null,
  claiming = false,
  claim?: DailyRewardClaimResponse | null,
): LobbyRewardStatus {
  const claimAmount = acAmount(claim?.reward);
  const nextAmount = acAmount(daily?.rewardForNext);
  const lastAmount = acAmount(lastRewardFromDaily(daily));
  const collectedAmount = claimAmount || lastAmount;
  const spinAmount = claimAmount || nextAmount || lastAmount;
  const claimed = Boolean(claim?.claimed || claim?.alreadyClaimed || (daily && daily.available === false && daily.lastClaimedAt));
  const available = Boolean(daily?.available) && !claiming && !claimed;
  const claimedLabel = acLabel(collectedAmount);

  return {
    available,
    claiming,
    claimed,
    alreadyClaimed: Boolean(claim?.alreadyClaimed),
    currentDay: claim?.currentDay ?? daily?.currentDay,
    loginStreak: claim?.loginStreak ?? daily?.loginStreak,
    nextAt: claim?.nextAt ?? daily?.nextAt,
    rewardLabel: claimedLabel ?? 'DAILY REWARD',
    readyLabel: claiming ? 'CLAIMING...' : claimed ? 'CLAIMED TODAY' : available ? 'SPIN TO CLAIM' : 'COME BACK TOMORROW',
    balanceLabel: balanceLabel(claim?.balance ?? balance),
    spinRewardLabel: acLabel(spinAmount),
    spinRewardAmount: spinAmount > 0 ? spinAmount : undefined,
  };
}

export function signInDailyRewardSpinStatus(): LobbyRewardStatus {
  return {
    available: false,
    rewardLabel: 'DAILY REWARD',
    readyLabel: 'SIGN IN TO SPIN',
  };
}

export async function loadDailyRewardSpinStatus(userId?: string | null): Promise<LobbyRewardStatus> {
  if (!userId) return signInDailyRewardSpinStatus();
  const [daily, balance] = await Promise.all([
    getDailyReward(),
    getCreditsBalance(userId).catch(() => null),
  ]);
  return toDailyRewardSpinStatus(daily, balance);
}

export async function claimDailyRewardSpinStatus(
  userId: string,
  idempotencyKey = dailyRewardIdempotencyKey(),
): Promise<LobbyRewardStatus> {
  const claim = await claimDailyReward(idempotencyKey);
  const balance = claim.balance ?? await getCreditsBalance(userId).catch(() => null);
  return toDailyRewardSpinStatus(null, balance, false, claim);
}

export function useDailyRewardSpin(userId?: string | null): {
  status: LobbyRewardStatus | null;
  refresh: () => Promise<void>;
  claim: () => Promise<void>;
} {
  const [status, setStatus] = useState<LobbyRewardStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await loadDailyRewardSpinStatus(userId));
    } catch (error) {
      logError('Failed to load daily reward', error);
      setStatus({
        available: false,
        rewardLabel: 'DAILY REWARD',
        readyLabel: 'REWARD UNAVAILABLE',
      });
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextStatus = await loadDailyRewardSpinStatus(userId);
        if (!cancelled) setStatus(nextStatus);
      } catch (error) {
        logError('Failed to load daily reward', error);
        if (!cancelled) {
          setStatus({
            available: false,
            rewardLabel: 'DAILY REWARD',
            readyLabel: 'REWARD UNAVAILABLE',
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const claim = useCallback(async () => {
    if (!userId || isDailyRewardSpinCollected(status)) return;
    setStatus(previous => ({
      ...(previous ?? {
        available: false,
        rewardLabel: 'DAILY REWARD',
        readyLabel: 'SPIN TO CLAIM',
      }),
      claiming: true,
      readyLabel: 'CLAIMING...',
    }));
    try {
      setStatus(await claimDailyRewardSpinStatus(userId));
    } catch (error) {
      logError('Failed to claim daily reward', error);
      setStatus(previous => ({
        ...(previous ?? {
          available: false,
          rewardLabel: 'DAILY REWARD',
        }),
        claiming: false,
        readyLabel: 'TRY AGAIN',
      }));
    }
  }, [status, userId]);

  return { status, refresh, claim };
}
