import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { FraudDetectionDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { FraudDetectionDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
const MAX_CHECKS_RETAINED = 200;

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface FraudProfile {
  riskScore: number;
  riskLevel: RiskLevel;
  lastCheckAt: number;
  checkCount: number;
  totalAmount24h: number;
  transactionCount24h: number;
}

interface CheckPayload {
  amount?: number;
  paymentMethod?: string;
  currency?: string;
}

export class FraudDetectionDO implements DurableObject {
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

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${FraudDetectionDOSegment.Check}`)) {
        const body = (await request.json().catch(() => ({}))) as CheckPayload;
        const result = await this.check(body);
        return this.json(result);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${FraudDetectionDOSegment.Risk}`)) {
        const profile = await this.getProfile();
        return this.json({ risk: profile.riskLevel, score: profile.riskScore });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('FraudDetectionDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getProfile(): Promise<FraudProfile> {
    const stored = await this.ctx.storage.get<FraudProfile>(FraudDetectionDOStoragePrefix.Profile);
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    if (stored && stored.lastCheckAt < dayAgo) {
      stored.totalAmount24h = 0;
      stored.transactionCount24h = 0;
    }
    return (
      stored ?? {
        riskScore: 0,
        riskLevel: 'low',
        lastCheckAt: 0,
        checkCount: 0,
        totalAmount24h: 0,
        transactionCount24h: 0,
      }
    );
  }

  private async saveProfile(profile: FraudProfile): Promise<void> {
    await this.ctx.storage.put(FraudDetectionDOStoragePrefix.Profile, profile);
  }

  private async check(payload: CheckPayload): Promise<{ risk: RiskLevel; score: number }> {
    const profile = await this.getProfile();
    const amount = typeof payload.amount === 'number' ? Math.max(0, payload.amount) : 0;
    let score = profile.riskScore;
    if (amount > 10000) score += 25;
    else if (amount > 1000) score += 10;
    profile.transactionCount24h += 1;
    profile.totalAmount24h += amount;
    if (profile.transactionCount24h > 20) score += 30;
    if (profile.totalAmount24h > 50000) score += 20;
    score = Math.min(100, Math.max(0, score));
    const risk: RiskLevel =
      score >= 80 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
    const next: FraudProfile = {
      ...profile,
      riskScore: score,
      riskLevel: risk,
      lastCheckAt: Date.now(),
      checkCount: Math.min(profile.checkCount + 1, MAX_CHECKS_RETAINED),
    };
    await this.saveProfile(next);
    return { risk, score };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
