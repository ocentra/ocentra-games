import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { PenaltyDOSegment, PenaltyDO as PenaltyDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { PenaltyDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
const MAX_PENALTIES_RETAINED = 500;

type PenaltyType = 'warning' | 'mute' | 'suspension' | 'ban';
type PenaltyStatus = 'active' | 'expired' | 'appealed' | 'overturned';

interface PenaltyRecord {
  penaltyId: string;
  userId: string;
  type: PenaltyType;
  reason: string;
  startTime: number;
  endTime?: number;
  status: PenaltyStatus;
  issuedBy: string;
  issuedAt: number;
  appeal?: { appealId: string; reason: string; submittedAt: number; status: 'pending' | 'approved' | 'denied' };
}

interface IssuePayload {
  userId: string;
  type: PenaltyType;
  reason: string;
  durationMinutes?: number;
  issuedBy: string;
}

interface AppealPayload {
  penaltyId: string;
  reason: string;
}

interface ReviewAppealPayload {
  appealId: string;
  action: 'approve' | 'deny';
  moderatorId: string;
}

export class PenaltyDO implements DurableObject {
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

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PenaltyDOSegment.Issue}`)) {
        const body = (await request.json().catch(() => ({}))) as IssuePayload;
        const result = await this.issue(body);
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ issued: true, penaltyId: result.penaltyId });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PenaltyDOSegment.Appeal}`)) {
        const body = (await request.json().catch(() => ({}))) as AppealPayload;
        const result = await this.recordAppeal(body);
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ received: true, appealId: result.appealId });
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PenaltyDOSegment.Status}`)) {
        const penalties = await this.getActivePenalties();
        return this.json({ penalties });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(PenaltyDOPaths.ReviewAppeal)) {
        const body = (await request.json().catch(() => ({}))) as ReviewAppealPayload;
        const result = await this.reviewAppeal(body);
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ reviewed: true, appealId: result.appealId, action: body.action });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('PenaltyDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getPenalties(): Promise<PenaltyRecord[]> {
    const stored = await this.ctx.storage.get<PenaltyRecord[]>(PenaltyDOStoragePrefix.Penalties);
    return stored ?? [];
  }

  private async savePenalties(penalties: PenaltyRecord[]): Promise<void> {
    if (penalties.length > MAX_PENALTIES_RETAINED) {
      penalties.sort((a, b) => a.issuedAt - b.issuedAt);
      await this.ctx.storage.put(PenaltyDOStoragePrefix.Penalties, penalties.slice(-MAX_PENALTIES_RETAINED));
    } else {
      await this.ctx.storage.put(PenaltyDOStoragePrefix.Penalties, penalties);
    }
  }

  private async issue(payload: IssuePayload): Promise<{ error?: string; status?: number; penaltyId?: string }> {
    if (!payload.userId || !payload.type || !payload.reason || !payload.issuedBy) {
      return { error: 'Missing userId, type, reason or issuedBy', status: HttpStatus.BadRequest };
    }
    const validTypes: PenaltyType[] = ['warning', 'mute', 'suspension', 'ban'];
    if (!validTypes.includes(payload.type)) {
      return { error: 'Invalid penalty type', status: HttpStatus.BadRequest };
    }
    const now = Date.now();
    const durationMs =
      typeof payload.durationMinutes === 'number' && payload.durationMinutes > 0
        ? payload.durationMinutes * 60 * 1000
        : payload.type === 'ban' ? 0 : 24 * 60 * 60 * 1000;
    const penalty: PenaltyRecord = {
      penaltyId: crypto.randomUUID(),
      userId: String(payload.userId).slice(0, 128),
      type: payload.type,
      reason: String(payload.reason).slice(0, 1024),
      startTime: now,
      endTime: durationMs > 0 ? now + durationMs : undefined,
      status: 'active',
      issuedBy: String(payload.issuedBy).slice(0, 128),
      issuedAt: now,
    };
    const penalties = await this.getPenalties();
    penalties.push(penalty);
    await this.savePenalties(penalties);
    return { penaltyId: penalty.penaltyId };
  }

  private async recordAppeal(payload: AppealPayload): Promise<{ error?: string; status?: number; appealId?: string }> {
    if (!payload.penaltyId || !payload.reason) {
      return { error: 'Missing penaltyId or reason', status: HttpStatus.BadRequest };
    }
    const penalties = await this.getPenalties();
    const idx = penalties.findIndex((p) => p.penaltyId === payload.penaltyId);
    if (idx === -1) return { error: 'Penalty not found', status: HttpStatus.NotFound };
    const penalty = penalties[idx];
    if (penalty.status !== 'active' && penalty.status !== 'appealed') {
      return { error: 'Penalty not appealable', status: HttpStatus.BadRequest };
    }
    const appealId = crypto.randomUUID();
    penalty.appeal = {
      appealId,
      reason: String(payload.reason).slice(0, 1024),
      submittedAt: Date.now(),
      status: 'pending',
    };
    penalty.status = 'appealed';
    penalties[idx] = penalty;
    await this.savePenalties(penalties);
    return { appealId };
  }

  private async getActivePenalties(): Promise<PenaltyRecord[]> {
    const penalties = await this.getPenalties();
    const now = Date.now();
    return penalties.filter((p) => {
      if (p.status !== 'active' && p.status !== 'appealed' && p.status !== 'overturned') return false;
      if (p.endTime != null && p.endTime < now) return false;
      return true;
    });
  }

  private async reviewAppeal(
    payload: ReviewAppealPayload
  ): Promise<{ error?: string; status?: number; appealId?: string }> {
    if (!payload.appealId || !payload.action || !payload.moderatorId) {
      return { error: 'Missing appealId, action or moderatorId', status: HttpStatus.BadRequest };
    }
    if (payload.action !== 'approve' && payload.action !== 'deny') {
      return { error: 'Invalid action', status: HttpStatus.BadRequest };
    }
    const penalties = await this.getPenalties();
    const penalty = penalties.find((p) => p.appeal?.appealId === payload.appealId);
    if (!penalty || !penalty.appeal) {
      return { error: 'Appeal not found', status: HttpStatus.NotFound };
    }
    if (penalty.appeal.status !== 'pending') {
      return { error: 'Appeal already reviewed', status: HttpStatus.Conflict };
    }
    penalty.appeal.status = payload.action === 'approve' ? 'approved' : 'denied';
    penalty.status = payload.action === 'approve' ? 'overturned' : penalty.status;
    await this.savePenalties(penalties);
    return { appealId: payload.appealId };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
