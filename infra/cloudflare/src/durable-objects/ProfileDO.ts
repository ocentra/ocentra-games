import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ProfileDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { ProfileDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';

interface BadgeStored {
  badgeId: string;
  name: string;
  description: string;
  iconUrl?: string;
  rarity?: string;
  earnedAt: number;
  source: string;
}

interface UserProfile {
  displayName: string;
  avatarKey: string;
  bio?: string;
  updatedAt?: number;
  badges?: BadgeStored[];
  showcaseBadges?: string[];
  level?: number;
  totalGamesPlayed?: number;
  totalWins?: number;
  winRate?: number;
  visibility?: 'public' | 'friends' | 'private';
  joinedAt?: number;
  customTitle?: string | null;
  profileTheme?: string;
}

export class ProfileDO implements DurableObject {
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

      if (request.method === HttpMethod.Get && pathname.endsWith(`/${ProfileDOSegment.Get}`)) {
        const profile = await this.getProfile();
        const publicView = {
          displayName: profile.displayName,
          avatarUrl: profile.avatarKey ? this.avatarUrlFromKey(profile.avatarKey) : '',
          bio: profile.bio,
        };
        return this.json(publicView);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${ProfileDOSegment.Update}`)) {
        const body = (await request.json().catch(() => ({}))) as Partial<Pick<UserProfile, 'displayName' | 'bio'>>;
        const updated = await this.updateProfile(body);
        return this.json({
          updated: true,
          displayName: updated.displayName,
          avatarUrl: updated.avatarKey ? this.avatarUrlFromKey(updated.avatarKey) : '',
          bio: updated.bio,
        });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${ProfileDOSegment.Avatar}`)) {
        const body = (await request.json().catch(() => ({}))) as { key?: string };
        const key = typeof body?.key === 'string' ? body.key : '';
        const profile = await this.setAvatarKey(key);
        return this.json({
          url: profile.avatarKey ? this.avatarUrlFromKey(profile.avatarKey) : '',
        });
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${ProfileDOSegment.GetSocialCard}`)) {
        return this.getSocialCard(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${ProfileDOSegment.AddBadge}`)) {
        return this.addBadge(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${ProfileDOSegment.UpdateStats}`)) {
        return this.updateStats(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('ProfileDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private avatarUrlFromKey(avatarKey: string): string {
    if (!avatarKey) return '';
    return `/assets/${BucketPath.Avatars}${avatarKey}`;
  }

  private async getProfile(): Promise<UserProfile> {
    const stored = await this.ctx.storage.get<UserProfile>(ProfileDOStoragePrefix.Profile);
    const base = stored ?? { displayName: '', avatarKey: '' };
    return {
      ...base,
      badges: base.badges ?? [],
      showcaseBadges: base.showcaseBadges ?? [],
      level: base.level ?? 1,
      totalGamesPlayed: base.totalGamesPlayed ?? 0,
      totalWins: base.totalWins ?? 0,
      winRate: base.winRate ?? 0,
      visibility: base.visibility ?? 'public',
      joinedAt: base.joinedAt ?? Date.now(),
      profileTheme: base.profileTheme ?? 'default',
    };
  }

  private async updateProfile(
    patch: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'visibility' | 'showcaseBadges' | 'customTitle' | 'profileTheme'>>
  ): Promise<UserProfile> {
    const current = await this.getProfile();
    const next: UserProfile = {
      ...current,
      displayName: patch.displayName !== undefined ? String(patch.displayName).slice(0, 128) : current.displayName,
      bio: patch.bio !== undefined ? String(patch.bio).slice(0, 512) : current.bio,
      visibility: patch.visibility ?? current.visibility,
      showcaseBadges: patch.showcaseBadges !== undefined ? patch.showcaseBadges.slice(0, 5) : current.showcaseBadges,
      customTitle: patch.customTitle !== undefined ? patch.customTitle : current.customTitle,
      profileTheme: patch.profileTheme ?? current.profileTheme,
      updatedAt: Date.now(),
    };
    await this.ctx.storage.put(ProfileDOStoragePrefix.Profile, next);
    return next;
  }

  private async setAvatarKey(key: string): Promise<UserProfile> {
    const current = await this.getProfile();
    const safeKey = key ? String(key).replace(/\.\./g, '').slice(0, 256) : '';
    const next: UserProfile = {
      ...current,
      avatarKey: safeKey,
      updatedAt: Date.now(),
    };
    await this.ctx.storage.put(ProfileDOStoragePrefix.Profile, next);
    return next;
  }

  private async getSocialCard(request: Request): Promise<Response> {
    const profile = await this.getProfile();
    const url = new URL(request.url, 'http://dummy');
    const viewerId = url.searchParams.get('viewerId') ?? '';
    if (profile.visibility === 'private' && viewerId !== (this.ctx.id as { name?: string }).name) {
      return this.json({ restricted: true });
    }
    const showcase = (profile.showcaseBadges ?? []).slice(0, 5);
    const badgeObjects = (profile.badges ?? []).filter((b) => showcase.includes(b.badgeId));
    const card = {
      userId: String((this.ctx.id as { name?: string }).name ?? ''),
      displayName: profile.displayName,
      avatarUrl: profile.avatarKey ? this.avatarUrlFromKey(profile.avatarKey) : null,
      level: profile.level ?? 1,
      customTitle: profile.customTitle ?? null,
      showcaseBadges: badgeObjects,
      status: 'offline' as const,
      currentActivity: null as string | null,
      winRate: profile.winRate ?? 0,
      totalGamesPlayed: profile.totalGamesPlayed ?? 0,
      mutualFriends: 0,
    };
    return this.json(card);
  }

  private async addBadge(request: Request): Promise<Response> {
    let body: BadgeStored = {} as BadgeStored;
    try {
      body = (await request.json()) as BadgeStored;
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    if (!body.badgeId || !body.name || !body.source) {
      return this.json({ error: 'badgeId, name, source required' }, HttpStatus.BadRequest);
    }
    const profile = await this.getProfile();
    const badges = profile.badges ?? [];
    if (badges.some((b) => b.badgeId === body.badgeId)) {
      return this.json({ alreadyHas: true });
    }
    const badge: BadgeStored = {
      badgeId: String(body.badgeId).slice(0, 64),
      name: String(body.name).slice(0, 128),
      description: String(body.description ?? '').slice(0, 256),
      iconUrl: body.iconUrl ? String(body.iconUrl).slice(0, 512) : undefined,
      rarity: body.rarity ? String(body.rarity).slice(0, 32) : undefined,
      earnedAt: typeof body.earnedAt === 'number' ? body.earnedAt : Date.now(),
      source: String(body.source).slice(0, 64),
    };
    const next: UserProfile = {
      ...profile,
      badges: [...badges, badge],
      updatedAt: Date.now(),
    };
    await this.ctx.storage.put(ProfileDOStoragePrefix.Profile, next);
    return this.json({ added: true });
  }

  private async updateStats(request: Request): Promise<Response> {
    let body: { level?: number; gamesPlayed?: number; wins?: number } = {};
    try {
      body = (await request.json().catch(() => ({}))) as typeof body;
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const profile = await this.getProfile();
    let { level, totalGamesPlayed, totalWins, winRate } = profile;
    const gamesPlayed = totalGamesPlayed ?? 0;
    if (body.level !== undefined) level = Math.max(1, body.level);
    if (body.gamesPlayed !== undefined) totalGamesPlayed = Math.max(0, body.gamesPlayed);
    if (body.wins !== undefined) {
      totalWins = Math.max(0, body.wins);
      winRate = (totalGamesPlayed ?? 0) > 0 ? totalWins / (totalGamesPlayed ?? 1) : 0;
    }
    const next: UserProfile = {
      ...profile,
      level: level ?? 1,
      totalGamesPlayed: totalGamesPlayed ?? gamesPlayed,
      totalWins: totalWins ?? 0,
      winRate,
      updatedAt: Date.now(),
    };
    await this.ctx.storage.put(ProfileDOStoragePrefix.Profile, next);
    return this.json({ updated: true });
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
