import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { AntiCheatDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { AntiCheatDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
const MAX_REPORTS_RETAINED = 500;

type RiskLevel = 'low' | 'medium' | 'high';
type StatusLevel = 'clear' | 'flagged' | 'suspended';

interface StoredProfile {
  status: StatusLevel;
  trustScore: number;
  lastAnalyzedAt: number;
  analysisCount: number;
  flagCount: number;
}

interface AnalysisPayload {
  matchId?: string;
  events?: unknown[];
  moveTimingMs?: number;
}

interface ReportPayload {
  reporterId: string;
  targetId: string;
  reason: string;
  matchId?: string;
}

export class AntiCheatDO implements DurableObject {
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

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${AntiCheatDOSegment.Analyze}`)) {
        const body = (await request.json().catch(() => ({}))) as AnalysisPayload;
        const result = await this.analyze(body);
        return this.json(result);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${AntiCheatDOSegment.Report}`)) {
        const body = (await request.json().catch(() => ({}))) as ReportPayload;
        const result = await this.recordReport(body);
        return this.json(result);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${AntiCheatDOSegment.Status}`)) {
        const profile = await this.getProfile();
        return this.json({ status: profile.status, trustScore: profile.trustScore });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('AntiCheatDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getProfile(): Promise<StoredProfile> {
    const stored = await this.ctx.storage.get<StoredProfile>(AntiCheatDOStoragePrefix.Profile);
    return (
      stored ?? {
        status: 'clear',
        trustScore: 100,
        lastAnalyzedAt: 0,
        analysisCount: 0,
        flagCount: 0,
      }
    );
  }

  private async saveProfile(profile: StoredProfile): Promise<void> {
    await this.ctx.storage.put(AntiCheatDOStoragePrefix.Profile, profile);
  }

  private async analyze(payload: AnalysisPayload): Promise<{ risk: RiskLevel; score: number; trustScore: number }> {
    const profile = await this.getProfile();
    const eventCount = Array.isArray(payload.events) ? payload.events.length : 0;
    const timing = typeof payload.moveTimingMs === 'number' ? payload.moveTimingMs : 0;
    let score = 0;
    if (eventCount > 100) score += 30;
    else if (eventCount > 50) score += 15;
    if (timing > 0 && timing < 10) score += 40;
    else if (timing > 0 && timing < 50) score += 20;
    score = Math.min(100, score);
    const risk: RiskLevel = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    const newTrustScore = Math.max(0, profile.trustScore - (risk === 'high' ? 15 : risk === 'medium' ? 5 : 0));
    const flagCount = profile.flagCount + (risk === 'high' ? 1 : 0);
    const status: StatusLevel =
      flagCount >= 3 || newTrustScore <= 20 ? 'suspended' : risk === 'high' ? 'flagged' : profile.status;
    const next: StoredProfile = {
      ...profile,
      status,
      trustScore: newTrustScore,
      lastAnalyzedAt: Date.now(),
      analysisCount: profile.analysisCount + 1,
      flagCount,
    };
    await this.saveProfile(next);
    return { risk, score, trustScore: next.trustScore };
  }

  private async recordReport(payload: ReportPayload): Promise<{ received: boolean }> {
    const reports = (await this.ctx.storage.get<ReportPayload[]>(AntiCheatDOStoragePrefix.Reports)) ?? [];
    reports.push({
      reporterId: String(payload.reporterId ?? '').slice(0, 128),
      targetId: String(payload.targetId ?? '').slice(0, 128),
      reason: String(payload.reason ?? '').slice(0, 512),
      matchId: payload.matchId,
    });
    if (reports.length > MAX_REPORTS_RETAINED) reports.splice(0, reports.length - MAX_REPORTS_RETAINED);
    await this.ctx.storage.put(AntiCheatDOStoragePrefix.Reports, reports);
    const profile = await this.getProfile();
    if (reports.length >= 5 && profile.status === 'clear') {
      profile.status = 'flagged';
      await this.saveProfile(profile);
    }
    return { received: true };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
