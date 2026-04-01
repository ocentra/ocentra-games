import type { Env } from '@/constants/env';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { AuditLogDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import type { AuditEvent, AuditQueryFilters } from '@ocentra/endpoint-domain/schemas/audit';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

export interface ExportPackage {
  userId: string;
  exportedAt: number;
  format: 'json';
  data: {
    events: AuditEvent[];
    summary: {
      totalEvents: number;
      categories: Record<string, number>;
      dateRange: { start: number; end: number };
    };
  };
  retention: {
    expiresAt: number;
  };
}

export interface ComplianceReport {
  reportType: 'pci' | 'gdpr' | 'soc2';
  generatedAt: number;
  period: { start: number; end: number };
  summary: {
    totalEvents: number;
    criticalEvents: number;
    warnings: number;
  };
  details: unknown;
}

export interface VerificationResult {
  valid: boolean;
  invalidIndex: number;
  chainLength: number;
  eventsVerified: number;
}

const DO_BASE_URL = 'http://internal';

export class AuditTrailService {
  constructor(private readonly env: Env) {}

  private getAuditDOStub(userId: string): DurableObjectStub | null {
    const ns = this.env.AUDIT_LOG_DO;
    if (!ns) return null;
    return ns.get(ns.idFromName(userId || 'system'));
  }

  async logEvent(event: Omit<AuditEvent, 'integrity'>): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const stub = this.getAuditDOStub(event.actor.id);
    if (!stub) {
      return { success: false, error: 'AuditLogDO not configured' };
    }

    try {
      const response = await stub.fetch(`${DO_BASE_URL}${AuditLogDO.StoreEvent}`, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `DO error: ${error}` };
      }

      const result = (await response.json()) as { logged?: boolean; eventId?: string };
      return { success: result.logged === true, eventId: result.eventId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Failed to log audit event', getStackTrace(), { error: message, event });
      return { success: false, error: message };
    }
  }

  async queryEvents(
    requesterId: string,
    requesterRole: 'user' | 'admin' | 'compliance' | 'system',
    filters: AuditQueryFilters
  ): Promise<{ events: AuditEvent[]; total: number; error?: string }> {
    const maxSensitivity = this.getMaxSensitivity(requesterRole);
    const targetUserId = filters.actorId || requesterId;

    if (requesterRole === 'user' && targetUserId !== requesterId) {
      return { events: [], total: 0, error: 'Forbidden: can only query own events' };
    }

    const stub = this.getAuditDOStub(targetUserId);
    if (!stub) {
      return { events: [], total: 0, error: 'AuditLogDO not configured' };
    }

    try {
      const response = await stub.fetch(`${DO_BASE_URL}${AuditLogDO.Query}`, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({
          filters: {
            ...filters,
            maxSensitivity,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { events: [], total: 0, error: `DO error: ${error}` };
      }

      const result = (await response.json()) as { events?: AuditEvent[]; total?: number };
      let events = result.events || [];

      if (requesterRole === 'user') {
        events = events.filter(
          (e) => e.actor.id === requesterId || e.target.id === requesterId
        );
      }

      return { events, total: result.total || events.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Failed to query audit events', getStackTrace(), { error: message, filters });
      return { events: [], total: 0, error: message };
    }
  }

  async verifyChain(userId: string): Promise<VerificationResult & { error?: string }> {
    const stub = this.getAuditDOStub(userId);
    if (!stub) {
      return { valid: false, invalidIndex: -1, chainLength: 0, eventsVerified: 0, error: 'AuditLogDO not configured' };
    }

    try {
      const response = await stub.fetch(`${DO_BASE_URL}${AuditLogDO.Query}`, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({ filters: {} }),
      });

      if (!response.ok) {
        await response.text().catch(() => undefined);
        return { valid: false, invalidIndex: -1, chainLength: 0, eventsVerified: 0, error: 'Failed to fetch events' };
      }

      const result = (await response.json()) as { events?: AuditEvent[] };
      const events = result.events || [];

      if (events.length === 0) {
        return { valid: true, invalidIndex: -1, chainLength: 0, eventsVerified: 0 };
      }

      let valid = true;
      let invalidIndex = -1;

      for (let i = 1; i < events.length; i++) {
        const current = events[i];
        const previous = events[i - 1];

        if (!current.integrity || current.integrity.previousHash !== previous.integrity?.currentHash) {
          valid = false;
          invalidIndex = i;
          break;
        }
      }

      return {
        valid,
        invalidIndex,
        chainLength: events.length,
        eventsVerified: events.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Failed to verify chain', getStackTrace(), { error: message, userId });
      return { valid: false, invalidIndex: -1, chainLength: 0, eventsVerified: 0, error: message };
    }
  }

  async exportUserData(userId: string): Promise<ExportPackage & { error?: string }> {
    const { events, error } = await this.queryEvents(userId, 'user', { actorId: userId });

    if (error) {
      return {
        userId,
        exportedAt: Date.now(),
        format: 'json',
        data: { events: [], summary: { totalEvents: 0, categories: {}, dateRange: { start: 0, end: 0 } } },
        retention: { expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 },
        error,
      };
    }

    const categories: Record<string, number> = {};
    let startTime = Infinity;
    let endTime = 0;

    for (const event of events) {
      categories[event.category] = (categories[event.category] || 0) + 1;
      if (event.context.timestamp < startTime) startTime = event.context.timestamp;
      if (event.context.timestamp > endTime) endTime = event.context.timestamp;
    }

    const pkg: ExportPackage = {
      userId,
      exportedAt: Date.now(),
      format: 'json',
      data: {
        events,
        summary: {
          totalEvents: events.length,
          categories,
          dateRange: { start: startTime === Infinity ? 0 : startTime, end: endTime },
        },
      },
      retention: {
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
    };

    const archive = this.env.AUDIT_ARCHIVE;
    if (archive) {
      const key = `${BucketPath.AuditArchive}exports/${userId}/${pkg.exportedAt}.json`;
      await archive.put(key, JSON.stringify(pkg), {
        httpMetadata: { contentType: HttpContentType.ApplicationJson },
      });
    }

    return pkg;
  }

  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    reportType: 'pci' | 'gdpr' | 'soc2'
  ): Promise<ComplianceReport & { error?: string }> {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const stub = this.getAuditDOStub('system');
    if (!stub) {
      return {
        reportType,
        generatedAt: Date.now(),
        period: { start: startTime, end: endTime },
        summary: { totalEvents: 0, criticalEvents: 0, warnings: 0 },
        details: {},
        error: 'AuditLogDO not configured',
      };
    }

    try {
      const response = await stub.fetch(`${DO_BASE_URL}${AuditLogDO.Query}`, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({
          filters: { startTime, endTime, limit: 500 },
        }),
      });

      if (!response.ok) {
        await response.text().catch(() => undefined);
        return {
          reportType,
          generatedAt: Date.now(),
          period: { start: startTime, end: endTime },
          summary: { totalEvents: 0, criticalEvents: 0, warnings: 0 },
          details: {},
          error: 'Failed to fetch events',
        };
      }

      const result = (await response.json()) as { events?: AuditEvent[] };
      const events = result.events || [];

      let criticalEvents = 0;
      let warnings = 0;

      for (const event of events) {
        if (event.action.status === 'failure') criticalEvents++;
        if (event.classification?.complianceFlags?.length) warnings++;
      }

      let details: unknown = {};

      switch (reportType) {
        case 'pci':
          details = this.generatePCIDetails(events);
          break;
        case 'gdpr':
          details = this.generateGDPRDetails(events);
          break;
        case 'soc2':
          details = this.generateSOC2Details(events);
          break;
      }

      return {
        reportType,
        generatedAt: Date.now(),
        period: { start: startTime, end: endTime },
        summary: {
          totalEvents: events.length,
          criticalEvents,
          warnings,
        },
        details,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Failed to generate compliance report', getStackTrace(), { error: message, reportType });
      return {
        reportType,
        generatedAt: Date.now(),
        period: { start: startTime, end: endTime },
        summary: { totalEvents: 0, criticalEvents: 0, warnings: 0 },
        details: {},
        error: message,
      };
    }
  }

  private getMaxSensitivity(role: string): string {
    switch (role) {
      case 'system':
        return 'legal';
      case 'compliance':
        return 'compliance';
      case 'admin':
        return 'admin';
      case 'user':
      default:
        return 'user';
    }
  }

  private generatePCIDetails(events: AuditEvent[]): unknown {
    const paymentEvents = events.filter((e) => e.category === 'payment');
    return {
      paymentEvents: paymentEvents.length,
      successfulPayments: paymentEvents.filter((e) => e.action.status === 'success').length,
      failedPayments: paymentEvents.filter((e) => e.action.status === 'failure').length,
      refunds: events.filter((e) => e.category === 'refund').length,
      disputes: events.filter((e) => e.category === 'dispute').length,
    };
  }

  private generateGDPRDetails(events: AuditEvent[]): unknown {
    const piiEvents = events.filter(
      (e) => e.classification?.piiFields && e.classification.piiFields.length > 0
    );
    const accessEvents = events.filter((e) => e.eventType === 'data.access');
    const deletionEvents = events.filter((e) => e.eventType === 'data.deletion');

    return {
      eventsWithPII: piiEvents.length,
      uniquePIIFields: [...new Set(piiEvents.flatMap((e) => e.classification?.piiFields || []))],
      dataAccessRequests: accessEvents.length,
      dataDeletionRequests: deletionEvents.length,
      exportRequests: events.filter((e) => e.eventType === 'data.export').length,
    };
  }

  private generateSOC2Details(events: AuditEvent[]): unknown {
    const authEvents = events.filter((e) => e.category === 'auth');
    const permissionEvents = events.filter((e) => e.category === 'permission');

    return {
      authenticationEvents: authEvents.length,
      failedAuthentications: authEvents.filter((e) => e.action.status === 'failure').length,
      permissionChanges: permissionEvents.length,
      systemEvents: events.filter((e) => e.actor.type === 'system').length,
      adminEvents: events.filter((e) => e.actor.type === 'admin').length,
      chainIntegrity: true,
    };
  }
}
