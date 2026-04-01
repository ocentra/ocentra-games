import type { Env } from '@/constants/env';
import { SecurityEventType as SecurityEventTypeConst, type SecurityEventType } from '@/constants/security-events';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { SecuritySeverity, SecuritySeverityIndex, SecuritySeverityEmoji, SecuritySeverityColor, SecurityAlertField, SecuritySsrfDangerousScheme, SecuritySsrfMetadataEndpoint, SecurityAttackDetection, SecurityErrorMessage } from '@/constants/security-monitoring';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);


const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  details: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  userId?: string;
  walletId?: string;
  ip?: string;
  origin?: string;
}

function generateCorrelationId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

export async function logSecurityEvent(
  event: SecurityEvent,
  env: Env
): Promise<void> {
  const correlationId = event.correlationId || generateCorrelationId();
  const eventWithCorrelation = { ...event, correlationId };

  if (env.ANALYTICS) {
    try {
      await env.ANALYTICS.writeDataPoint({
        blobs: [
          eventWithCorrelation.type,
          eventWithCorrelation.severity,
          JSON.stringify(eventWithCorrelation.details),
          eventWithCorrelation.userId || '',
          eventWithCorrelation.walletId || '',
          eventWithCorrelation.origin || '',
          correlationId
        ],
        doubles: [Date.now()],
        indexes: [String(getSeverityIndex(eventWithCorrelation.severity))]
      });
    } catch (error) {
      logError(SecurityErrorMessage.FailedToLogToAnalytics, getStackTrace(), error);
    }
  }

  if (eventWithCorrelation.severity === SecuritySeverity.Critical || eventWithCorrelation.severity === SecuritySeverity.High) {
    await sendAlert(eventWithCorrelation, env);
  }
}

async function sendAlert(event: SecurityEvent, env: Env): Promise<void> {
  if (!env.ALERT_WEBHOOK_URL) {
    return;
  }

  try {
    const message = formatAlertMessage(event);

    const webhookResponse = await fetch(env.ALERT_WEBHOOK_URL, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson
      },
      body: JSON.stringify(message)
    });
    if (!webhookResponse.bodyUsed) {
      try {
        await webhookResponse.arrayBuffer();
      } catch {
        try {
          await webhookResponse.text();
        } catch {
          void 0;
        }
      }
    }
  } catch (error) {
    logError(SecurityErrorMessage.FailedToSendAlert, getStackTrace(), error);
  }
}

function formatAlertMessage(event: SecurityEvent): Record<string, unknown> {
  const emoji = getSeverityEmoji(event.severity);
  const title = `${emoji} Security Alert: ${event.type.replace(/_/g, ' ').toUpperCase()}`;

  return {
    embeds: [
      {
        title,
        color: getSeverityColor(event.severity),
        fields: [
          {
            name: SecurityAlertField.Severity,
            value: event.severity.toUpperCase(),
            inline: true
          },
          {
            name: SecurityAlertField.Timestamp,
            value: event.timestamp,
            inline: true
          },
          ...(event.userId ? [{
            name: SecurityAlertField.UserId,
            value: event.userId,
            inline: true
          }] : []),
          ...(event.walletId ? [{
            name: SecurityAlertField.WalletId,
            value: event.walletId,
            inline: true
          }] : []),
          ...(event.ip ? [{
            name: SecurityAlertField.IpAddress,
            value: event.ip,
            inline: true
          }] : []),
          ...(event.origin ? [{
            name: SecurityAlertField.Origin,
            value: event.origin,
            inline: true
          }] : []),
          {
            name: SecurityAlertField.CorrelationId,
            value: event.correlationId,
            inline: true
          },
          {
            name: SecurityAlertField.Details,
            value: `\`\`\`json\n${JSON.stringify(event.details, null, 2)}\n\`\`\``,
            inline: false
          }
        ],
        timestamp: event.timestamp
      }
    ]
  };
}

function getSeverityIndex(severity: SecuritySeverity): number {
  switch (severity) {
    case SecuritySeverity.Critical: return SecuritySeverityIndex.Critical;
    case SecuritySeverity.High: return SecuritySeverityIndex.High;
    case SecuritySeverity.Medium: return SecuritySeverityIndex.Medium;
    case SecuritySeverity.Low: return SecuritySeverityIndex.Low;
    default: return SecuritySeverityIndex.Default;
  }
}

function getSeverityEmoji(severity: SecuritySeverity): string {
  switch (severity) {
    case SecuritySeverity.Critical: return SecuritySeverityEmoji.Critical;
    case SecuritySeverity.High: return SecuritySeverityEmoji.High;
    case SecuritySeverity.Medium: return SecuritySeverityEmoji.Medium;
    case SecuritySeverity.Low: return SecuritySeverityEmoji.Low;
    default: return SecuritySeverityEmoji.Default;
  }
}

function getSeverityColor(severity: SecuritySeverity): number {
  switch (severity) {
    case SecuritySeverity.Critical: return SecuritySeverityColor.Critical;
    case SecuritySeverity.High: return SecuritySeverityColor.High;
    case SecuritySeverity.Medium: return SecuritySeverityColor.Medium;
    case SecuritySeverity.Low: return SecuritySeverityColor.Low;
    default: return SecuritySeverityColor.Default;
  }
}

export async function alertJWKSFailure(error: string, env: Env): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.JwksFetchFailure,
    severity: SecuritySeverity.Critical,
    details: {
      error,
      message: 'Firebase JWKS fetch failed - JWT verification may be broken'
    },
    timestamp: new Date().toISOString()
  }, env);
}

export async function alertRateLimitAbuse(
  walletId: string,
  currentCount: number,
  limit: number,
  ip: string,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.RateLimitAbuse,
    severity: SecuritySeverity.High,
    details: {
      currentCount,
      limit,
      percentage: Math.round((currentCount / limit) * 100)
    },
    timestamp: new Date().toISOString(),
    walletId,
    ip
  }, env);
}

export async function alertCORSViolation(
  requestOrigin: string,
  allowedOrigin: string,
  ip: string,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.CorsViolation,
    severity: SecuritySeverity.High,
    details: {
      requestOrigin,
      allowedOrigin,
      message: 'Unauthorized cross-origin request attempt'
    },
    timestamp: new Date().toISOString(),
    origin: requestOrigin,
    ip
  }, env);
}

export async function alertInvalidSignature(
  userId: string,
  kid: string,
  ip: string,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.InvalidTokenSignature,
    severity: SecuritySeverity.Critical,
    details: {
      kid,
      message: 'Token signature verification failed - possible forgery attempt'
    },
    timestamp: new Date().toISOString(),
    userId,
    ip
  }, env);
}

export async function alertExpiredToken(
  userId: string,
  expiredAt: string,
  ip: string,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.ExpiredTokenAttempt,
    severity: SecuritySeverity.Medium,
    details: {
      expiredAt,
      message: 'Expired token used - possible replay attack'
    },
    timestamp: new Date().toISOString(),
    userId,
    ip
  }, env);
}

export async function alertPrivilegeEscalation(
  userId: string,
  attemptedAction: string,
  ip: string,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.PrivilegeEscalationAttempt,
    severity: SecuritySeverity.Critical,
    details: {
      attemptedAction,
      message: 'User attempted unauthorized admin action'
    },
    timestamp: new Date().toISOString(),
    userId,
    ip
  }, env);
}

export async function alertAssetScraping(
  walletId: string,
  requestCount: number,
  timeWindow: string,
  ip: string,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.AssetScrapingDetected,
    severity: SecuritySeverity.High,
    details: {
      requestCount,
      timeWindow,
      message: 'Suspicious asset enumeration detected'
    },
    timestamp: new Date().toISOString(),
    walletId,
    ip
  }, env);
}

export async function alertPathTraversalAttempt(
  attemptedInput: string,
  ip: string | null,
  userAgent: string | null,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.PathTraversalAttempt,
    severity: SecuritySeverity.High,
    details: {
      attempted_input: attemptedInput,
      user_agent: userAgent
    },
    timestamp: new Date().toISOString(),
    ip: ip || undefined
  }, env);
}

export async function alertSSRFAttempt(
  attemptedUrl: string,
  ip: string | null,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.SsrfAttempt,
    severity: SecuritySeverity.Critical,
    details: {
      attempted_url: attemptedUrl
    },
    timestamp: new Date().toISOString(),
    ip: ip || undefined
  }, env);
}

export async function alertOversizedRequest(
  size: number,
  maxAllowed: number,
  endpoint: string,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.OversizedRequest,
    severity: SecuritySeverity.Medium,
    details: {
      size,
      max_allowed: maxAllowed,
      endpoint
    },
    timestamp: new Date().toISOString()
  }, env);
}

export async function alertInvalidHashFormat(
  attemptedHash: string,
  ip: string | null,
  env: Env
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventTypeConst.InvalidHashFormat,
    severity: SecuritySeverity.Medium,
    details: {
      attempted_hash: attemptedHash
    },
    timestamp: new Date().toISOString(),
    ip: ip || undefined
  }, env);
}

function isPrivateIP(hostname: string): boolean {
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Pattern);

  if (!match) return false;

  const octets = match.slice(1, 5).map(Number);

  if (octets.some(o => o < 0 || o > 255)) return false;

  if (octets[0] === 10) return true;

  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;

  if (octets[0] === 192 && octets[1] === 168) return true;

  if (octets[0] === 127) return true;

  if (octets[0] === 169 && octets[1] === 254) return true;

  return false;
}

export function isSSRFAttempt(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  const dangerousSchemes = Object.values(SecuritySsrfDangerousScheme) as string[];
  
  for (const scheme of dangerousSchemes) {
    if (trimmed.toLowerCase().startsWith(scheme)) {
      return true;
    }
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('127.') ||
        hostname === '[::1]' ||
        hostname === '[0:0:0:0:0:0:0:1]') {
      return true;
    }

    if (isPrivateIP(hostname)) {
      return true;
    }

    const metadataHosts: string[] = [
      SecuritySsrfMetadataEndpoint.GoogleInternal,
      SecuritySsrfMetadataEndpoint.Aws169254,
      SecuritySsrfMetadataEndpoint.Azure,
      SecuritySsrfMetadataEndpoint.Aws,
      SecuritySsrfMetadataEndpoint.GoogleCloud,
      SecuritySsrfMetadataEndpoint.Microsoft,
      SecuritySsrfMetadataEndpoint.Consul
    ];
    if (metadataHosts.includes(hostname)) {
      return true;
    }

    return false;

  } catch {
    const ipPattern = /\b(?:localhost|127\.(?:\d{1,3}\.){2}\d{1,3}|(?:192\.168|10\.|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3})\b/i;

    if (ipPattern.test(trimmed)) {
      return true;
    }

    const metadataEndpoints = [
      SecuritySsrfMetadataEndpoint.GoogleInternal,
      SecuritySsrfMetadataEndpoint.Azure
    ];
    if (metadataEndpoints.some(endpoint => {
      return trimmed.startsWith(endpoint) ||
             trimmed.startsWith('http://' + endpoint) ||
             trimmed.startsWith('https://' + endpoint);
    })) {
      return true;
    }

    if (trimmed.startsWith('169.254.169.254') || trimmed.startsWith('169.254.169.253')) {
      return true;
    }

    return false;
  }
}

export async function detectAttackPattern(
  ip: string,
  eventType: SecurityEventType,
  env: Env
): Promise<boolean> {
  if (!env.SECURITY_KV) return false;

  const attackKey = `${SecurityAttackDetection.KvKeyPrefix}${ip}`;
  const windowMs = SecurityAttackDetection.WindowMs;
  const threshold = SecurityAttackDetection.Threshold;

  try {
    const existing = await env.SECURITY_KV.get(attackKey, 'json') as {
      events: SecurityEventType[];
      count: number;
      firstSeen: number;
    } | null;

    const now = Date.now();
    const events = existing?.events || [];
    const firstSeen = existing?.firstSeen || now;

    if (now - firstSeen > windowMs) {
      const ttl = Math.max(SecurityAttackDetection.MinTtlSeconds, Math.floor(windowMs / 1000));
      await env.SECURITY_KV.put(attackKey, JSON.stringify({
        events: [eventType],
        count: 1,
        firstSeen: now
      }), { expirationTtl: ttl });
      return false;
    }

    const updatedEvents = [...events, eventType];
    const updatedCount = updatedEvents.length;

    const remainingTtl = Math.max(SecurityAttackDetection.MinTtlSeconds, Math.floor((windowMs - (now - firstSeen)) / 1000));
    await env.SECURITY_KV.put(attackKey, JSON.stringify({
      events: updatedEvents,
      count: updatedCount,
      firstSeen
    }), { expirationTtl: remainingTtl });

    if (updatedCount >= threshold) {
      await logSecurityEvent({
        type: SecurityEventTypeConst.AttackPatternDetected,
        severity: SecuritySeverity.Critical,
        details: {
          event_count: updatedCount,
          events: updatedEvents,
          time_window_ms: windowMs
        },
        timestamp: new Date().toISOString(),
        ip
      }, env);
      return true;
    }

    return false;
  } catch (error) {
    logError(SecurityErrorMessage.FailedToDetectAttackPattern, getStackTrace(), error);
    return false;
  }
}
