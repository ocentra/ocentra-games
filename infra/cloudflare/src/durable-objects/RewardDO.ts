import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { RewardDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { RateLimitKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { RewardDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const MS_PER_DAY = 86400_000;
const DAILY_CYCLE_DAYS = 7;

interface DailyState {
  currentDay: number;
  lastClaimedAt: number;
  canClaimAt: number;
  history: boolean[];
  loginStreak: number;
  lastLoginDate: string;
  freezeUsesRemaining: number;
}

interface DailyRewardItem {
  xp: number;
  gp?: number;
}

function nextMidnightUtc(now: number): number {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function getDailyClaimReward(state: DailyState): { xp: number; gp: number } {
  const claimedDay = state.currentDay === 1 ? DAILY_CYCLE_DAYS : state.currentDay - 1;
  const reward = DAILY_REWARDS[claimedDay - 1] ?? DAILY_REWARDS[0];
  return { xp: reward.xp, gp: reward.gp ?? 0 };
}

const DAILY_REWARDS: DailyRewardItem[] = [
  { xp: 50 },
  { xp: 75, gp: 5 },
  { xp: 100 },
  { xp: 150, gp: 10 },
  { xp: 200 },
  { xp: 300 },
  { xp: 500, gp: 25 },
];

const BATTLE_PASS_SEASON_ID = 'season-1';
const MAX_BATTLE_PASS_TIER = 50;

function xpForBattlePassTier(tier: number): number {
  return tier <= 0 ? 0 : 100 * (tier * (tier + 1)) / 2;
}

function tierFromBattlePassXp(xp: number): number {
  let t = 0;
  while (t < MAX_BATTLE_PASS_TIER && xp >= xpForBattlePassTier(t + 1)) t += 1;
  return t;
}

interface BattlePassState {
  seasonId: string;
  xp: number;
  isPremium: boolean;
  claimedRewards: number[];
  premiumClaimedRewards: number[];
}

interface MissionDef {
  missionId: string;
  description: string;
  target: number;
  xp: number;
  gp: number;
  type: 'daily' | 'weekly';
}

interface MissionProgressStored {
  progress: number;
  claimed: boolean;
}

const MISSION_DEFINITIONS: MissionDef[] = [
  { missionId: 'play_3_games', description: 'Play 3 games', target: 3, xp: 100, gp: 0, type: 'daily' },
  { missionId: 'win_1_game', description: 'Win 1 game', target: 1, xp: 50, gp: 25, type: 'daily' },
  { missionId: 'play_5_games', description: 'Play 5 games', target: 5, xp: 200, gp: 50, type: 'weekly' },
];

export class RewardDO implements DurableObject {
  private readonly log = Logger.instance;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env
  ) {
    this.log.register(import.meta.url);
  }

  private logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logInfo(message, stackTrace, data, enabled);
  };

  private logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logWarn(message, stackTrace, data, enabled);
  };

  private logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
    this.log.logError(message, stackTrace, data);
  };

  private logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logDebug(message, stackTrace, data, enabled);
  };

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Get && pathname.endsWith(`/${RewardDOSegment.Daily}`)) {
        return this.getDaily();
      }
      if (request.method === HttpMethod.Post && pathname.includes(RewardDOSegment.DailyClaim)) {
        return this.claimDaily(request);
      }
      if (request.method === HttpMethod.Get && pathname.includes(RewardDOSegment.MissionsList)) {
        return this.getMissions();
      }
      if (request.method === HttpMethod.Post && pathname.includes(RewardDOSegment.MissionProgress)) {
        return this.updateMissionProgress(request);
      }
      if (request.method === HttpMethod.Post && pathname.includes(RewardDOSegment.MissionClaim)) {
        return this.claimMission(request);
      }
      if (request.method === HttpMethod.Post && pathname.includes(RewardDOSegment.StreakFreeze)) {
        return this.useStreakFreeze(request);
      }
      if (request.method === HttpMethod.Get && pathname.includes(RewardDOSegment.BattlePass) && !pathname.includes(RewardDOSegment.BattlePassClaim) && !pathname.includes(RewardDOSegment.BattlePassXp)) {
        return this.getBattlePass();
      }
      if (request.method === HttpMethod.Post && pathname.includes(RewardDOSegment.BattlePassClaim)) {
        return this.claimBattlePassTier(request);
      }
      if (request.method === HttpMethod.Post && pathname.includes(RewardDOSegment.BattlePassXp)) {
        return this.addBattlePassXp(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('RewardDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getDaily(): Promise<Response> {
    const state = await this.loadDailyState();
    const now = Date.now();
    const available = now >= state.canClaimAt;
    const nextAt = state.canClaimAt;
    const rewardForNext = DAILY_REWARDS[state.currentDay - 1] ?? DAILY_REWARDS[0];
    return this.json({
      available,
      nextAt,
      currentDay: state.currentDay,
      history: state.history,
      loginStreak: state.loginStreak,
      lastClaimedAt: state.lastClaimedAt || null,
      rewardForNext: { xp: rewardForNext.xp, gp: rewardForNext.gp ?? 0 },
      freezeUsesRemaining: state.freezeUsesRemaining,
      canFreeze: state.freezeUsesRemaining > 0,
    });
  }

  private async claimDaily(request: Request): Promise<Response> {
    let body: { idempotencyKey?: string; userId?: string } = {};
    try {
      const raw = await request.text();
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return this.json({ error: 'Invalid request payload' }, HttpStatus.BadRequest);
        }
        const keys = Object.keys(parsed as Record<string, unknown>);
        if (keys.some((key) => key !== 'idempotencyKey' && key !== 'userId')) {
          return this.json({ error: 'Invalid request payload' }, HttpStatus.BadRequest);
        }
        body = parsed as { idempotencyKey?: string; userId?: string };
      }
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const now = Date.now();
    const today = dateKey(now);
    const state = await this.loadDailyState();
    const idempotencyKey = body.idempotencyKey ?? `daily-${today}`;
    const idemExists = await this.ctx.storage.get<boolean>(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`);
    if (idemExists) {
      const reward = getDailyClaimReward(state);
      return this.json({
        claimed: true,
        alreadyClaimed: true,
        reward: { type: 'xp', amount: reward.xp, gp: reward.gp },
        currentDay: state.currentDay,
        loginStreak: state.loginStreak,
      });
    }
    if (now < state.canClaimAt && this.env.TEST_MODE !== 'true') {
      return this.json({ error: 'Not yet available', nextAt: state.canClaimAt }, HttpStatus.TooManyRequests);
    }
    const dayIndex = state.currentDay - 1;
    const rewardItem = DAILY_REWARDS[dayIndex] ?? DAILY_REWARDS[0];
    const xpReward = rewardItem.xp;
    const gpReward = rewardItem.gp ?? 0;
    state.lastClaimedAt = now;
    state.canClaimAt = nextMidnightUtc(now);
    state.history[dayIndex] = true;
    const todayStr = dateKey(now);
    if (state.lastLoginDate) {
      const prev = new Date(state.lastLoginDate).getTime();
      const diffDays = Math.floor((now - prev) / MS_PER_DAY);
      if (diffDays === 1) state.loginStreak += 1;
      else if (diffDays > 1) {
        if (state.freezeUsesRemaining > 0) {
          state.freezeUsesRemaining -= 1;
        } else {
          state.loginStreak = 1;
        }
      }
    } else {
      state.loginStreak = 1;
    }
    state.lastLoginDate = todayStr;
    if (state.currentDay >= DAILY_CYCLE_DAYS) {
      state.currentDay = 1;
      state.history = new Array(DAILY_CYCLE_DAYS).fill(false);
    } else {
      state.currentDay += 1;
    }
    await this.ctx.storage.put(RewardDOStoragePrefix.Daily, state);
    await this.ctx.storage.put(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`, true);
    return this.json({
      claimed: true,
      alreadyClaimed: false,
      reward: { type: 'xp', amount: xpReward, gp: gpReward },
      nextAt: state.canClaimAt,
      currentDay: state.currentDay,
      loginStreak: state.loginStreak,
    });
  }

  private async useStreakFreeze(_request: Request): Promise<Response> {
    const state = await this.loadDailyState();
    if (state.freezeUsesRemaining <= 0) {
      return this.json({ error: 'No freeze uses remaining', freezeUsesRemaining: 0 }, HttpStatus.BadRequest);
    }
    state.freezeUsesRemaining -= 1;
    await this.ctx.storage.put(RewardDOStoragePrefix.Daily, state);
    return this.json({
      used: true,
      freezeUsesRemaining: state.freezeUsesRemaining,
      canFreeze: state.freezeUsesRemaining > 0,
    });
  }

  private async getMissions(): Promise<Response> {
    const list: { missionId: string; description: string; target: number; progress: number; claimed: boolean; xp: number; gp: number; type: string }[] = [];
    for (const def of MISSION_DEFINITIONS) {
      const stored = await this.ctx.storage.get<MissionProgressStored>(`${RewardDOStoragePrefix.Mission}${def.missionId}`);
      const progress = stored?.progress ?? 0;
      const claimed = stored?.claimed ?? false;
      list.push({
        missionId: def.missionId,
        description: def.description,
        target: def.target,
        progress,
        claimed,
        xp: def.xp,
        gp: def.gp,
        type: def.type,
      });
    }
    return this.json({ missions: list });
  }

  private async updateMissionProgress(request: Request): Promise<Response> {
    let body: { missionId?: string; progress?: number; increment?: number } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as { missionId?: string; progress?: number; increment?: number };
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const missionId = body.missionId ?? '';
    const def = MISSION_DEFINITIONS.find((d) => d.missionId === missionId);
    if (!def) return this.json({ error: 'Unknown mission' }, HttpStatus.BadRequest);
    const key = `${RewardDOStoragePrefix.Mission}${missionId}`;
    const stored = await this.ctx.storage.get<MissionProgressStored>(key);
    let progress = stored?.progress ?? 0;
    const claimed = stored?.claimed ?? false;
    if (claimed) return this.json({ error: 'Mission already claimed', progress });
    if (typeof body.increment === 'number' && body.increment > 0) {
      progress = Math.min(def.target, progress + body.increment);
    } else if (typeof body.progress === 'number' && body.progress >= 0) {
      progress = Math.min(def.target, Math.max(0, body.progress));
    } else {
      return this.json({ error: 'Provide progress or increment' }, HttpStatus.BadRequest);
    }
    await this.ctx.storage.put(key, { progress, claimed });
    return this.json({ missionId, progress, target: def.target, complete: progress >= def.target });
  }

  private async claimMission(request: Request): Promise<Response> {
    let body: { missionId?: string; idempotencyKey?: string; userId?: string } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as { missionId?: string; idempotencyKey?: string; userId?: string };
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const missionId = body.missionId ?? '';
    const def = MISSION_DEFINITIONS.find((d) => d.missionId === missionId);
    if (!def) return this.json({ error: 'Unknown mission' }, HttpStatus.BadRequest);
    const key = `${RewardDOStoragePrefix.Mission}${missionId}`;
    const stored = await this.ctx.storage.get<MissionProgressStored>(key);
    const progress = stored?.progress ?? 0;
    const claimed = stored?.claimed ?? false;
    const idempotencyKey = body.idempotencyKey ?? `mission-${missionId}`;
    const idemExists = await this.ctx.storage.get<boolean>(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`);
    if (idemExists || claimed) {
      return this.json({ claimed: true, alreadyClaimed: true, missionId, reward: { xp: def.xp, gp: def.gp }, progress, target: def.target });
    }
    if (progress < def.target) {
      return this.json({ error: 'Mission not complete', progress, target: def.target }, HttpStatus.BadRequest);
    }

    await this.ctx.storage.put(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`, true);
    await this.ctx.storage.put(key, { progress, claimed: true });
    return this.json({
      claimed: true,
      missionId,
      reward: { xp: def.xp, gp: def.gp },
    });
  }

  private async loadBattlePassState(): Promise<BattlePassState> {
    const stored = await this.ctx.storage.get<BattlePassState>(RewardDOStoragePrefix.BattlePass);
    if (stored && typeof stored.xp === 'number' && Array.isArray(stored.claimedRewards) && Array.isArray(stored.premiumClaimedRewards)) {
      return {
        seasonId: typeof stored.seasonId === 'string' ? stored.seasonId : BATTLE_PASS_SEASON_ID,
        xp: Math.max(0, stored.xp),
        isPremium: Boolean(stored.isPremium),
        claimedRewards: stored.claimedRewards.filter((t): t is number => typeof t === 'number' && t >= 0 && t <= MAX_BATTLE_PASS_TIER),
        premiumClaimedRewards: stored.premiumClaimedRewards.filter((t): t is number => typeof t === 'number' && t >= 0 && t <= MAX_BATTLE_PASS_TIER),
      };
    }
    return {
      seasonId: BATTLE_PASS_SEASON_ID,
      xp: 0,
      isPremium: false,
      claimedRewards: [],
      premiumClaimedRewards: [],
    };
  }

  private async getBattlePass(): Promise<Response> {
    const state = await this.loadBattlePassState();
    const tier = tierFromBattlePassXp(state.xp);
    const xpToNext = tier >= MAX_BATTLE_PASS_TIER ? 0 : Math.max(0, xpForBattlePassTier(tier + 1) - state.xp);
    return this.json({
      seasonId: state.seasonId,
      tier,
      xp: state.xp,
      xpToNextTier: xpToNext,
      isPremium: state.isPremium,
      claimedRewards: state.claimedRewards,
      premiumClaimedRewards: state.premiumClaimedRewards,
      maxTier: MAX_BATTLE_PASS_TIER,
    });
  }

  private async addBattlePassXp(request: Request): Promise<Response> {
    let body: { amount?: number; idempotencyKey?: string } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as { amount?: number; idempotencyKey?: string };
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const amount = typeof body.amount === 'number' && body.amount > 0 ? Math.floor(body.amount) : 0;
    if (amount <= 0) return this.json({ error: 'amount must be a positive number' }, HttpStatus.BadRequest);
    const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey.length > 0 ? body.idempotencyKey : null;
    if (idempotencyKey) {
      const already = await this.ctx.storage.get<boolean>(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`);
      if (already) {
        const state = await this.loadBattlePassState();
        return this.json({ added: 0, xp: state.xp, tier: tierFromBattlePassXp(state.xp) });
      }
    }
    const state = await this.loadBattlePassState();
    state.xp += amount;
    await this.ctx.storage.put(RewardDOStoragePrefix.BattlePass, state);
    if (idempotencyKey) await this.ctx.storage.put(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`, true);
    return this.json({ added: amount, xp: state.xp, tier: tierFromBattlePassXp(state.xp) });
  }

  private tierRewardGp(tier: number): number {
    return 10 + tier * 5;
  }

  private tierRewardXp(tier: number): number {
    return 25 * (tier + 1);
  }

  private async claimBattlePassTier(request: Request): Promise<Response> {
    let body: { tier?: number; idempotencyKey?: string; userId?: string } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as { tier?: number; idempotencyKey?: string; userId?: string };
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const tier = typeof body.tier === 'number' ? Math.floor(body.tier) : -1;
    if (tier < 0 || tier > MAX_BATTLE_PASS_TIER) {
      return this.json({ error: 'tier must be between 0 and ' + MAX_BATTLE_PASS_TIER }, HttpStatus.BadRequest);
    }
    const state = await this.loadBattlePassState();
    const currentTier = tierFromBattlePassXp(state.xp);
    if (tier > currentTier) {
      return this.json({ error: 'Tier not yet unlocked', currentTier, requestedTier: tier }, HttpStatus.BadRequest);
    }
    const idempotencyKey = body.idempotencyKey ?? `bp-${state.seasonId}-${tier}`;
    const idemExists = await this.ctx.storage.get<boolean>(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`);
    if (idemExists || state.claimedRewards.includes(tier)) {
      const gp = this.tierRewardGp(tier);
      const xp = this.tierRewardXp(tier);
      return this.json({ claimed: true, alreadyClaimed: true, tier, reward: { gp, xp } });
    }

    const gp = this.tierRewardGp(tier);
    const xp = this.tierRewardXp(tier);
    state.claimedRewards = [...state.claimedRewards, tier].sort((a, b) => a - b);
    await this.ctx.storage.put(RewardDOStoragePrefix.BattlePass, state);
    await this.ctx.storage.put(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`, true);
    return this.json({
      claimed: true,
      tier,
      reward: { gp, xp },
    });
  }

  private async loadDailyState(): Promise<DailyState> {
    const stored = await this.ctx.storage.get<DailyState>(RewardDOStoragePrefix.Daily);
    if (stored && Array.isArray(stored.history) && stored.history.length === DAILY_CYCLE_DAYS) {
      return {
        currentDay: Math.min(DAILY_CYCLE_DAYS, Math.max(1, stored.currentDay)),
        lastClaimedAt: stored.lastClaimedAt ?? 0,
        canClaimAt: stored.canClaimAt ?? 0,
        history: stored.history,
        loginStreak: typeof stored.loginStreak === 'number' ? stored.loginStreak : 0,
        lastLoginDate: typeof stored.lastLoginDate === 'string' ? stored.lastLoginDate : '',
        freezeUsesRemaining: typeof stored.freezeUsesRemaining === 'number' ? Math.max(0, stored.freezeUsesRemaining) : 3,
      };
    }
    return {
      currentDay: 1,
      lastClaimedAt: 0,
      canClaimAt: 0,
      history: new Array(DAILY_CYCLE_DAYS).fill(false),
      loginStreak: 0,
      lastLoginDate: '',
      freezeUsesRemaining: 3,
    };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
