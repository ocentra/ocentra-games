import { BaseFlow } from '@/flows/core/BaseFlow';
import type { FlowContext } from '@/flows/core/FlowContext';
import type { FlowResult } from '@/flows/core/FlowResult';
import { fetchFromDO } from '@/utils/durable-object-request';
import { RewardDO as RewardDOPaths, CreditsDO as CreditsDOPaths, ProgressionDO as ProgressionDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { CreditLedgerSource } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';

export type RewardClaimFlowInput =
  | {
      kind: 'daily-claim';
      idempotencyKey?: string;
      userId?: string;
    }
  | {
      kind: 'mission-claim';
      missionId: string;
      idempotencyKey?: string;
      userId?: string;
    }
  | {
      kind: 'mission-progress';
      missionId: string;
      progress?: number;
      increment?: number;
      idempotencyKey?: string;
      userId?: string;
    }
  | {
      kind: 'battle-pass-claim';
      tier: number;
      idempotencyKey?: string;
      userId?: string;
    }
  | {
      kind: 'battle-pass-xp';
      amount: number;
      idempotencyKey?: string;
      userId?: string;
    }
  | {
      kind: 'streak-freeze';
      idempotencyKey?: string;
      userId?: string;
    };

type RewardClaimFlowRequest = RewardClaimFlowInput | {
  idempotencyKey?: string;
  userId?: string;
};

type RewardClaimOperationInput = {
  kind: RewardClaimFlowInput['kind'];
  idempotencyKey?: string;
  userId?: string;
  missionId?: string;
  tier?: number;
  amount?: number;
};

type RewardResponse = {
  claimed?: boolean;
  alreadyClaimed?: boolean;
  reward?: {
    amount?: number;
    gp?: number;
    xp?: number;
    type?: string;
  };
  missionId?: string;
  tier?: number;
  currentDay?: number;
  currentTier?: number;
  nextAt?: number;
  loginStreak?: number;
};

function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function toPositiveNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function extractRewardTotals(body: RewardResponse): { gp: number; xp: number } {
  const reward = body.reward;
  if (!reward) return { gp: 0, xp: 0 };
  const gp = toPositiveNumber(reward.gp);
  const xp = toPositiveNumber(reward.xp) || toPositiveNumber(reward.amount);
  return { gp, xp };
}

function getRewardOperationId(context: FlowContext, input: RewardClaimOperationInput): string {
  if (input.idempotencyKey) return input.idempotencyKey;
  if (context.operationId) return context.operationId;
  const userId = context.authUserId ?? input.userId ?? 'reward';
  const dayKey = dateKey(Date.now());
  switch (input.kind) {
    case 'mission-claim':
      return `mission-${input.missionId}-${userId}`;
    case 'mission-progress':
      return `mission-progress-${input.missionId}-${userId}`;
    case 'battle-pass-claim':
      return `bp-${userId}-${input.tier}`;
    case 'battle-pass-xp':
      return `bp-xp-${userId}-${input.amount}`;
    case 'streak-freeze':
      return `streak-freeze-${userId}`;
    case 'daily-claim':
    default:
      return `daily-${dayKey}-${userId}`;
  }
}

export class RewardClaimFlow extends BaseFlow<RewardClaimFlowRequest, unknown> {
  async execute(context: FlowContext, input: RewardClaimFlowRequest): Promise<FlowResult<unknown>> {
    const authUserId = context.authUserId;
    if (!authUserId) {
      return {
        status: HttpStatus.Unauthorized,
        body: { error: 'Authentication required' },
      };
    }

    const normalizedInput: RewardClaimFlowInput = ('kind' in input && input.kind
      ? input
      : { ...input, kind: 'daily-claim' }) as RewardClaimFlowInput;
    const rewardOperationId = getRewardOperationId(context, normalizedInput as RewardClaimOperationInput);
    const userId = normalizedInput.userId ?? authUserId;

    switch (normalizedInput.kind) {
      case 'mission-progress':
        return await this.forwardRewardMutation(context, RewardDOPaths.MissionProgress, {
          missionId: normalizedInput.missionId,
          progress: normalizedInput.progress,
          increment: normalizedInput.increment,
          userId,
        });
      case 'battle-pass-xp':
        return await this.forwardRewardMutation(context, RewardDOPaths.BattlePassXp, {
          amount: normalizedInput.amount,
          idempotencyKey: rewardOperationId,
        });
      case 'streak-freeze':
        return await this.forwardRewardMutation(context, RewardDOPaths.StreakFreeze, {});
      case 'mission-claim':
        return await this.claimReward(context, {
          path: RewardDOPaths.MissionClaim,
          rewardOperationId,
          payload: {
            missionId: normalizedInput.missionId,
            idempotencyKey: rewardOperationId,
            userId,
          },
          rewardOperationLabel: `mission:${normalizedInput.missionId}`,
        });
      case 'battle-pass-claim':
        return await this.claimReward(context, {
          path: RewardDOPaths.BattlePassClaim,
          rewardOperationId,
          payload: {
            tier: normalizedInput.tier,
            idempotencyKey: rewardOperationId,
            userId,
          },
          rewardOperationLabel: `battle-pass:${normalizedInput.tier}`,
        });
      case 'daily-claim':
      default:
        return await this.claimReward(context, {
          path: RewardDOPaths.DailyClaim,
          rewardOperationId,
          payload: {
            idempotencyKey: rewardOperationId,
            userId,
          },
          rewardOperationLabel: `daily:${dateKey(Date.now())}`,
        });
    }
  }

  private async claimReward(
    context: FlowContext,
    input: {
      path: string;
      payload: Record<string, unknown>;
      rewardOperationId: string;
      rewardOperationLabel: string;
    }
  ): Promise<FlowResult<unknown>> {
    const rewardResult = await this.forwardRewardMutation(context, input.path, input.payload);
    if (rewardResult.status !== HttpStatus.Ok) {
      return rewardResult;
    }

    const body = rewardResult.body as RewardResponse;
    const reward = extractRewardTotals(body);
    if (reward.gp > 0) {
      if (!context.env.CREDITS_DO) {
        return {
          status: HttpStatus.ServiceUnavailable,
          body: { error: 'Credit service unavailable' },
        };
      }
      const creditsResult = await this.awardCredits(context, input.rewardOperationId, reward.gp, input.rewardOperationLabel);
      if (creditsResult) return creditsResult;
    }
    if (reward.xp > 0) {
      if (!context.env.PROGRESSION_DO) {
        return {
          status: HttpStatus.ServiceUnavailable,
          body: { error: 'Progression service unavailable' },
        };
      }
      const progressionResult = await this.awardXp(context, input.rewardOperationId, reward.xp);
      if (progressionResult) return progressionResult;
    }

    const balance = await this.readCreditBalance(context);
    if (!balance) return rewardResult;
    const rewardBody = rewardResult.body && typeof rewardResult.body === 'object' && !Array.isArray(rewardResult.body)
      ? rewardResult.body as Record<string, unknown>
      : {};
    return {
      status: rewardResult.status,
      body: {
        ...rewardBody,
        balance,
      },
    };
  }

  private async forwardRewardMutation(
    context: FlowContext,
    path: string,
    payload: Record<string, unknown>
  ): Promise<FlowResult<unknown>> {
    const ns = context.env.REWARD_DO;
    if (!ns) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Reward service unavailable' },
      };
    }

    const authUserId = context.authUserId;
    if (!authUserId) {
      return {
        status: HttpStatus.Unauthorized,
        body: { error: 'Authentication required' },
      };
    }

    const stub = ns.get(ns.idFromName(authUserId));
    const res = await fetchFromDO(stub, path, {
      method: HttpMethod.Post,
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return {
      status: res.status,
      body,
    };
  }

  private async awardCredits(
    context: FlowContext,
    rewardOperationId: string,
    amount: number,
    description: string
  ): Promise<FlowResult<unknown> | null> {
    const ns = context.env.CREDITS_DO;
    if (!ns) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Credit service unavailable' },
      };
    }

    const userId = context.authUserId;
    if (!userId) {
      return {
        status: HttpStatus.Unauthorized,
        body: { error: 'Authentication required' },
      };
    }

    const stub = ns.get(ns.idFromName(userId));
    const res = await fetchFromDO(stub, CreditsDOPaths.Award, {
      method: HttpMethod.Post,
      body: JSON.stringify({
        awardId: `${rewardOperationId}-gp`,
        amount,
        description,
        source: CreditLedgerSource.Other,
      }),
    });
    if (!res.ok) {
      await res.text().catch(() => undefined);
      return {
        status: HttpStatus.BadGateway,
        body: { error: 'Failed to grant GP reward' },
      };
    }
    await res.text().catch(() => undefined);
    return null;
  }

  private async readCreditBalance(context: FlowContext): Promise<Record<string, unknown> | null> {
    const ns = context.env.CREDITS_DO;
    const userId = context.authUserId;
    if (!ns || !userId) return null;

    const stub = ns.get(ns.idFromName(userId));
    const res = await fetchFromDO(stub, CreditsDOPaths.Balance, {
      method: HttpMethod.Get,
    });
    if (!res.ok) {
      await res.text().catch(() => undefined);
      return null;
    }
    return await res.json().catch(() => null) as Record<string, unknown> | null;
  }

  private async awardXp(
    context: FlowContext,
    rewardOperationId: string,
    amount: number
  ): Promise<FlowResult<unknown> | null> {
    const ns = context.env.PROGRESSION_DO;
    if (!ns) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Progression service unavailable' },
      };
    }

    const userId = context.authUserId;
    if (!userId) {
      return {
        status: HttpStatus.Unauthorized,
        body: { error: 'Authentication required' },
      };
    }

    const stub = ns.get(ns.idFromName(userId));
    const res = await fetchFromDO(stub, ProgressionDOPaths.Xp, {
      method: HttpMethod.Post,
      body: JSON.stringify({ amount, idempotencyKey: `${rewardOperationId}-xp` }),
    });
    if (!res.ok) {
      await res.text().catch(() => undefined);
      return {
        status: HttpStatus.BadGateway,
        body: { error: 'Failed to grant XP reward' },
      };
    }
    await res.text().catch(() => undefined);
    return null;
  }
}
