import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ProgressionDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { RateLimitKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { ProgressionDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

function xpToNextLevel(level: number): number {
  return Math.max(100, level * 100);
}

interface LevelUpEvent {
  level: number;
  achievedAt: number;
}

interface AchievementProgress {
  progress: number;
  completedAt?: number;
}

interface ProgressionState {
  xp: number;
  level: number;
  totalXpEarned: number;
  xpToNextLevel: number;
  levelHistory: LevelUpEvent[];
  skillPoints: number;
  skillsUnlocked: string[];
  achievements: Record<string, AchievementProgress>;
  achievementPoints: number;
  cardCollections: string[];
  cosmeticCollections: string[];
}

const MAX_LEVEL_HISTORY = 100;
const DEFAULT_SKILL_COST = 1;

function levelUp(state: ProgressionState, now: number): void {
  while (state.xp >= state.xpToNextLevel && state.xpToNextLevel > 0) {
    state.xp -= state.xpToNextLevel;
    state.level += 1;
    state.skillPoints += 1;
    state.xpToNextLevel = xpToNextLevel(state.level);
    state.levelHistory.push({ level: state.level, achievedAt: now });
    if (state.levelHistory.length > MAX_LEVEL_HISTORY) state.levelHistory.shift();
  }
}

export class ProgressionDO implements DurableObject {
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

      if (request.method === HttpMethod.Get && pathname.endsWith(`/${ProgressionDOSegment.Get}`)) {
        return this.getProgression();
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${ProgressionDOSegment.Xp}`)) {
        return this.addXp(request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${ProgressionDOSegment.Level}`)) {
        return this.getLevel();
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${ProgressionDOSegment.Skills}`)) {
        return this.getSkills();
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${ProgressionDOSegment.Achievements}`)) {
        return this.getAchievements();
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${ProgressionDOSegment.Collections}`)) {
        return this.getCollections();
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${ProgressionDOSegment.UnlockSkill}`)) {
        return this.unlockSkill(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${ProgressionDOSegment.UpdateAchievement}`)) {
        return this.updateAchievement(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('ProgressionDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getProgression(): Promise<Response> {
    const state = await this.loadState();
    return this.json({
      xp: state.xp,
      level: state.level,
      totalXpEarned: state.totalXpEarned,
      xpToNextLevel: state.xpToNextLevel,
      levelHistory: state.levelHistory,
      skillPoints: state.skillPoints,
      skillsUnlocked: state.skillsUnlocked,
      achievements: state.achievements,
      achievementPoints: state.achievementPoints,
      cardCollections: state.cardCollections,
      cosmeticCollections: state.cosmeticCollections,
    });
  }

  private async getLevel(): Promise<Response> {
    const state = await this.loadState();
    return this.json({ level: state.level, xpToNextLevel: state.xpToNextLevel });
  }

  private async getSkills(): Promise<Response> {
    const state = await this.loadState();
    return this.json({ skillPoints: state.skillPoints, skillsUnlocked: state.skillsUnlocked });
  }

  private async getAchievements(): Promise<Response> {
    const state = await this.loadState();
    return this.json({ achievements: state.achievements, achievementPoints: state.achievementPoints });
  }

  private async getCollections(): Promise<Response> {
    const state = await this.loadState();
    return this.json({ cardCollections: state.cardCollections, cosmeticCollections: state.cosmeticCollections });
  }

  private async unlockSkill(request: Request): Promise<Response> {
    let body: { skillId: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const skillId = typeof body.skillId === 'string' ? body.skillId.trim() : '';
    if (!skillId) return this.json({ error: 'skillId is required' }, HttpStatus.BadRequest);
    const state = await this.loadState();
    if (state.skillsUnlocked.includes(skillId)) {
      return this.json({ unlocked: true, skillPoints: state.skillPoints, alreadyUnlocked: true });
    }
    if (state.skillPoints < DEFAULT_SKILL_COST) {
      return this.json({ error: 'Insufficient skill points' }, HttpStatus.BadRequest);
    }
    state.skillPoints -= DEFAULT_SKILL_COST;
    state.skillsUnlocked.push(skillId);
    await this.ctx.storage.put(ProgressionDOStoragePrefix.State, state);
    return this.json({ unlocked: true, skillPoints: state.skillPoints, skillsUnlocked: state.skillsUnlocked });
  }

  private async updateAchievement(request: Request): Promise<Response> {
    let body: { achievementId: string; progress: number };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const achievementId = typeof body.achievementId === 'string' ? body.achievementId.trim() : '';
    if (!achievementId) return this.json({ error: 'achievementId is required' }, HttpStatus.BadRequest);
    const progress = typeof body.progress === 'number' && body.progress >= 0 ? Math.floor(body.progress) : 0;
    const state = await this.loadState();
    const existing = state.achievements[achievementId];
    const target = 100;
    const newProgress = Math.min(target, progress);
    const wasComplete = existing?.progress >= target;
    const completedAt = newProgress >= target ? (existing?.completedAt ?? Date.now()) : existing?.completedAt;
    const pointsGained = wasComplete ? 0 : (newProgress >= target ? 10 : 0);
    if (newProgress >= target && !wasComplete) state.achievementPoints += pointsGained;
    state.achievements[achievementId] = { progress: newProgress, completedAt };
    await this.ctx.storage.put(ProgressionDOStoragePrefix.State, state);
    return this.json({
      achievementId,
      progress: newProgress,
      achievementPoints: state.achievementPoints,
      completed: newProgress >= target,
    });
  }

  private async addXp(request: Request): Promise<Response> {
    let body: { amount: number; idempotencyKey?: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const amount = typeof body.amount === 'number' && body.amount > 0 ? Math.floor(body.amount) : 0;
    if (amount <= 0) return this.json({ error: 'amount must be a positive number' }, HttpStatus.BadRequest);
    const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey.length > 0 ? body.idempotencyKey : null;
    if (idempotencyKey) {
      const already = await this.ctx.storage.get<boolean>(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`);
      if (already) {
        const state = await this.loadState();
        return this.json({
          added: 0,
          total: state.xp,
          level: state.level,
          totalXpEarned: state.totalXpEarned,
          xpToNextLevel: state.xpToNextLevel,
          already_processed: true,
        });
      }
    }
    const now = Date.now();
    const state = await this.loadState();
    state.xp += amount;
    state.totalXpEarned += amount;
    levelUp(state, now);
    if (idempotencyKey) {
      await this.ctx.storage.put(`${RateLimitKeyPrefix.Idempotency}${idempotencyKey}`, true);
    }
    await this.ctx.storage.put(ProgressionDOStoragePrefix.State, state);
    return this.json({
      added: amount,
      total: state.xp,
      level: state.level,
      totalXpEarned: state.totalXpEarned,
      xpToNextLevel: state.xpToNextLevel,
    });
  }

  private async loadState(): Promise<ProgressionState> {
    const stored = await this.ctx.storage.get<ProgressionState>(ProgressionDOStoragePrefix.State);
    if (stored && typeof stored.level === 'number' && typeof stored.xp === 'number') {
      const level = Math.max(1, stored.level);
      return {
        xp: stored.xp,
        level,
        totalXpEarned: typeof stored.totalXpEarned === 'number' ? stored.totalXpEarned : stored.xp,
        xpToNextLevel: xpToNextLevel(level),
        levelHistory: Array.isArray(stored.levelHistory) ? stored.levelHistory : [],
        skillPoints: typeof stored.skillPoints === 'number' ? Math.max(0, stored.skillPoints) : 0,
        skillsUnlocked: Array.isArray(stored.skillsUnlocked) ? stored.skillsUnlocked : [],
        achievements: stored.achievements && typeof stored.achievements === 'object' ? stored.achievements : {},
        achievementPoints: typeof stored.achievementPoints === 'number' ? Math.max(0, stored.achievementPoints) : 0,
        cardCollections: Array.isArray(stored.cardCollections) ? stored.cardCollections : [],
        cosmeticCollections: Array.isArray(stored.cosmeticCollections) ? stored.cosmeticCollections : [],
      };
    }
    return {
      xp: 0,
      level: 1,
      totalXpEarned: 0,
      xpToNextLevel: xpToNextLevel(1),
      levelHistory: [],
      skillPoints: 0,
      skillsUnlocked: [],
      achievements: {},
      achievementPoints: 0,
      cardCollections: [],
      cosmeticCollections: [],
    };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
