import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { SecurityEventSchema } from '@ocentra/endpoint-domain/schemas/security';

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  describe('SecurityEventSchema', () => {
    it(testName('Should validate valid security event'), () => {
      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        severity: 'high',
        category: 'auth',
        actor: {
          type: 'user',
          id: 'user-123',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          geolocation: {
            country: 'US',
            region: 'CA',
            city: 'San Francisco',
          },
        },
        action: {
          type: 'login_attempt',
          target: 'account',
          result: 'blocked',
          details: { reason: 'too_many_attempts' },
        },
        detection: {
          method: 'rule',
          confidence: 0.95,
          ruleId: 'auth-rate-limit',
        },
        response: {
          actionTaken: 'rate_limited',
          automated: true,
        },
      };

      const result = SecurityEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it(testName('Should reject invalid severity'), () => {
      const invalidEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        severity: 'invalid-severity',
        category: 'auth',
        actor: {
          type: 'user',
          id: 'user-123',
        },
        action: {
          type: 'login',
          target: 'account',
          result: 'allowed',
          details: {},
        },
        detection: {
          method: 'rule',
          confidence: 0.5,
        },
        response: {
          actionTaken: 'none',
          automated: true,
        },
      };

      const result = SecurityEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it(testName('Should reject invalid category'), () => {
      const invalidEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        severity: 'low',
        category: 'invalid-category',
        actor: {
          type: 'user',
          id: 'user-123',
        },
        action: {
          type: 'login',
          target: 'account',
          result: 'allowed',
          details: {},
        },
        detection: {
          method: 'rule',
          confidence: 0.5,
        },
        response: {
          actionTaken: 'none',
          automated: true,
        },
      };

      const result = SecurityEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it(testName('Should reject confidence outside 0-1 range'), () => {
      const invalidEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        severity: 'low',
        category: 'auth',
        actor: {
          type: 'user',
          id: 'user-123',
        },
        action: {
          type: 'login',
          target: 'account',
          result: 'allowed',
          details: {},
        },
        detection: {
          method: 'rule',
          confidence: 1.5, // Invalid: > 1
        },
        response: {
          actionTaken: 'none',
          automated: true,
        },
      };

      const result = SecurityEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it(testName('Should accept minimal valid event'), () => {
      const minimalEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        severity: 'info',
        category: 'system',
        actor: {
          type: 'system',
          id: 'system-001',
        },
        action: {
          type: 'health_check',
          target: 'server',
          result: 'allowed',
          details: {},
        },
        detection: {
          method: 'rule',
          confidence: 1.0,
        },
        response: {
          actionTaken: 'none',
          automated: true,
        },
      };

      const result = SecurityEventSchema.safeParse(minimalEvent);
      expect(result.success).toBe(true);
    });

    it(testName('Should accept all valid severity levels'), () => {
      const severities = ['info', 'low', 'medium', 'high', 'critical'];
      
      for (const severity of severities) {
        const event = {
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: Date.now(),
          severity,
          category: 'system',
          actor: {
            type: 'system',
            id: 'system-001',
          },
          action: {
            type: 'test',
            target: 'test',
            result: 'allowed',
            details: {},
          },
          detection: {
            method: 'rule',
            confidence: 1.0,
          },
          response: {
            actionTaken: 'none',
            automated: true,
          },
        };

        const result = SecurityEventSchema.safeParse(event);
        expect(result.success).toBe(true);
      }
    });

    it(testName('Should accept all valid categories'), () => {
      const categories = ['auth', 'access', 'fraud', 'cheat', 'abuse', 'anomaly', 'system'];
      
      for (const category of categories) {
        const event = {
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: Date.now(),
          severity: 'info',
          category,
          actor: {
            type: 'system',
            id: 'system-001',
          },
          action: {
            type: 'test',
            target: 'test',
            result: 'allowed',
            details: {},
          },
          detection: {
            method: 'rule',
            confidence: 1.0,
          },
          response: {
            actionTaken: 'none',
            automated: true,
          },
        };

        const result = SecurityEventSchema.safeParse(event);
        expect(result.success).toBe(true);
      }
    });

    it(testName('Should accept all valid actor types'), () => {
      const actorTypes = ['user', 'ip', 'device', 'system'];
      
      for (const type of actorTypes) {
        const event = {
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: Date.now(),
          severity: 'info',
          category: 'system',
          actor: {
            type,
            id: 'actor-001',
          },
          action: {
            type: 'test',
            target: 'test',
            result: 'allowed',
            details: {},
          },
          detection: {
            method: 'rule',
            confidence: 1.0,
          },
          response: {
            actionTaken: 'none',
            automated: true,
          },
        };

        const result = SecurityEventSchema.safeParse(event);
        expect(result.success).toBe(true);
      }
    });

    it(testName('Should accept all valid action results'), () => {
      const results = ['allowed', 'blocked', 'flagged', 'error'];
      
      for (const result of results) {
        const event = {
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: Date.now(),
          severity: 'info',
          category: 'system',
          actor: {
            type: 'system',
            id: 'system-001',
          },
          action: {
            type: 'test',
            target: 'test',
            result,
            details: {},
          },
          detection: {
            method: 'rule',
            confidence: 1.0,
          },
          response: {
            actionTaken: 'none',
            automated: true,
          },
        };

        const parseResult = SecurityEventSchema.safeParse(event);
        expect(parseResult.success).toBe(true);
      }
    });

    it(testName('Should accept all valid detection methods'), () => {
      const methods = ['rule', 'ml', 'heuristic', 'manual', 'report'];
      
      for (const method of methods) {
        const event = {
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: Date.now(),
          severity: 'info',
          category: 'system',
          actor: {
            type: 'system',
            id: 'system-001',
          },
          action: {
            type: 'test',
            target: 'test',
            result: 'allowed',
            details: {},
          },
          detection: {
            method,
            confidence: 1.0,
          },
          response: {
            actionTaken: 'none',
            automated: true,
          },
        };

        const result = SecurityEventSchema.safeParse(event);
        expect(result.success).toBe(true);
      }
    });

    it(testName('Should accept all valid response actions'), () => {
      const actions = ['none', 'logged', 'rate_limited', 'blocked', 'banned'];
      
      for (const actionTaken of actions) {
        const event = {
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: Date.now(),
          severity: 'info',
          category: 'system',
          actor: {
            type: 'system',
            id: 'system-001',
          },
          action: {
            type: 'test',
            target: 'test',
            result: 'allowed',
            details: {},
          },
          detection: {
            method: 'rule',
            confidence: 1.0,
          },
          response: {
            actionTaken,
            automated: true,
          },
        };

        const result = SecurityEventSchema.safeParse(event);
        expect(result.success).toBe(true);
      }
    });

    it(testName('Should make geolocation optional'), () => {
      const eventWithoutGeo = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        severity: 'info',
        category: 'system',
        actor: {
          type: 'system',
          id: 'system-001',
          // No geolocation
        },
        action: {
          type: 'test',
          target: 'test',
          result: 'allowed',
          details: {},
        },
        detection: {
          method: 'rule',
          confidence: 1.0,
        },
        response: {
          actionTaken: 'none',
          automated: true,
        },
      };

      const result = SecurityEventSchema.safeParse(eventWithoutGeo);
      expect(result.success).toBe(true);
    });

    it(testName('Should make ruleId and modelVersion optional in detection'), () => {
      const eventWithoutIds = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        severity: 'info',
        category: 'system',
        actor: {
          type: 'system',
          id: 'system-001',
        },
        action: {
          type: 'test',
          target: 'test',
          result: 'allowed',
          details: {},
        },
        detection: {
          method: 'heuristic',
          confidence: 0.8,
          // No ruleId or modelVersion
        },
        response: {
          actionTaken: 'none',
          automated: true,
        },
      };

      const result = SecurityEventSchema.safeParse(eventWithoutIds);
      expect(result.success).toBe(true);
    });

    it(testName('Should make reviewedBy and reviewNotes optional in response'), () => {
      const eventWithoutReview = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: Date.now(),
        severity: 'info',
        category: 'system',
        actor: {
          type: 'system',
          id: 'system-001',
        },
        action: {
          type: 'test',
          target: 'test',
          result: 'allowed',
          details: {},
        },
        detection: {
          method: 'rule',
          confidence: 1.0,
        },
        response: {
          actionTaken: 'none',
          automated: true,
          // No reviewedBy or reviewNotes
        },
      };

      const result = SecurityEventSchema.safeParse(eventWithoutReview);
      expect(result.success).toBe(true);
    });
  });
});
