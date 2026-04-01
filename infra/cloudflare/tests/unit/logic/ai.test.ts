import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  processAIEventLogic,
  saveAIDecisionLogic,
  getAIDecisionsLogic,
  type AIStorage,
  type AIFetch,
  type AIDecisionStorage,
} from '@/logic/ai';
import { AIModelProvider, AIModelId, AIActionType } from '@/constants/ai';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { asMatchId } from '@ocentra/endpoint-domain/constants/match';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const TestConstants = {
  MatchId: asMatchId('550e8400-e29b-41d4-a716-446655440001'),
  PlayerId1: 'player1',
  PlayerId2: 'player2',
  EventType: 'turn',
  AIServiceUrl: 'https://api.example.com/ai',
  ApiKey: 'test-key',
  TestModelId: 'test-model',
  TestProvider: 'test-provider',
  TestHash: 'hash123',
  DecisionKey: 'decisions/match1/decision1.json',
  SecondDecisionPath: 'decisions/match1/decision2.json',
  DecisionPrefix: 'decisions/match1',
  NetworkError: 'Network error',
  InternalServerError: 'Internal Server Error',
  TestText: 'Hello',
  TestIntent: 'greeting',
  TestTimestamp: '2024-01-01T00:00:00Z',
  StorageError: 'Storage error',
  InvalidJson: 'invalid json',
  TestReasoning: 'Test',
  TestContext: 'test',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should process AI event successfully and calculate responseTimeMs'), async () => {
    logInfo('[TEST] Testing processAIEventLogic', getStackTrace(), { matchId: TestConstants.MatchId }, LOG_TEST_OPERATIONS);
    const mockResponse = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId1,
        data: {},
        timestamp: new Date().toISOString(),
      },
      chainOfThought: [{ step: 1, reasoning: TestConstants.TestReasoning }],
      modelMetadata: {
        modelId: TestConstants.TestModelId,
        modelHash: TestConstants.TestHash,
        provider: TestConstants.TestProvider,
      },
    };
    if (!mockResponse.action || !mockResponse.modelMetadata) {
      logError('[TEST] Invalid mock response structure', getStackTrace(), { mockResponse });
    }

    const mockFetch: AIFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as unknown as Response),
    };

    const result = await processAIEventLogic(
      {
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
        },
        aiServiceUrl: TestConstants.AIServiceUrl,
        aiApiKey: TestConstants.ApiKey,
        defaultAction: {
          type: AIActionType.Decline,
          playerId: TestConstants.PlayerId1,
          data: {},
          timestamp: new Date().toISOString(),
        },
        defaultChainOfThought: [],
        defaultModelMetadata: {
          modelId: AIModelId.Default,
          modelHash: '',
          provider: AIModelProvider.Local,
        },
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.aiResponse).not.toBeUndefined();
    if (!result.success || !result.aiResponse) {
      logError('[TEST] AI event processing failed', getStackTrace(), { success: result.success, hasResponse: !!result.aiResponse });
    }
    if (result.aiResponse) {
      expect(result.aiResponse.action.type).toBe('play');
      expect(result.aiResponse.action.playerId).toBe(TestConstants.PlayerId1);
      expect(result.aiResponse.responseTimeMs).toBeTypeOf('number');
      expect(result.aiResponse.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.aiResponse.responseTimeMs).toBeLessThan(1000);
      if (result.aiResponse.action.type !== 'play' || result.aiResponse.action.playerId !== TestConstants.PlayerId1) {
        logError('[TEST] AI action mismatch', getStackTrace(), { type: result.aiResponse.action.type, playerId: result.aiResponse.action.playerId });
      }
    }
  });

  it(testName('should copy communicationOutput from eventRequest to response'), async () => {
    const communicationOutput = {
      text: TestConstants.TestText,
      intent: TestConstants.TestIntent,
      targetPlayers: [TestConstants.PlayerId2],
    };

    const mockResponse = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId1,
        data: {},
        timestamp: new Date().toISOString(),
      },
      chainOfThought: [],
      modelMetadata: {
        modelId: 'test',
        modelHash: '',
        provider: 'test',
      },
    };

    const mockFetch: AIFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as unknown as Response),
    };

    const result = await processAIEventLogic(
      {
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
          communicationOutput,
        },
        aiServiceUrl: TestConstants.AIServiceUrl,
        defaultAction: {
          type: AIActionType.Decline,
          playerId: TestConstants.PlayerId1,
          data: {},
          timestamp: new Date().toISOString(),
        },
        defaultChainOfThought: [],
        defaultModelMetadata: {
          modelId: AIModelId.Default,
          modelHash: '',
          provider: AIModelProvider.Local,
        },
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.aiResponse?.communicationOutput).toEqual(communicationOutput);
  });

  it(testName('should copy inputConsumption from eventRequest to response'), async () => {
    const inputConsumption = {
      transcripts: [
        { playerId: TestConstants.PlayerId1, text: TestConstants.TestText, timestamp: TestConstants.TestTimestamp },
      ],
      processedContext: { context: TestConstants.TestContext },
    };

    const mockResponse = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId1,
        data: {},
        timestamp: new Date().toISOString(),
      },
      chainOfThought: [],
      modelMetadata: {
        modelId: 'test',
        modelHash: '',
        provider: 'test',
      },
    };

    const mockFetch: AIFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as unknown as Response),
    };

    const result = await processAIEventLogic(
      {
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
          inputConsumption,
        },
        aiServiceUrl: TestConstants.AIServiceUrl,
        defaultAction: {
          type: AIActionType.Decline,
          playerId: TestConstants.PlayerId1,
          data: {},
          timestamp: new Date().toISOString(),
        },
        defaultChainOfThought: [],
        defaultModelMetadata: {
          modelId: AIModelId.Default,
          modelHash: '',
          provider: AIModelProvider.Local,
        },
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.aiResponse?.inputConsumption).toEqual(inputConsumption);
  });

  it(testName('should copy sequenceNumber from eventRequest to response'), async () => {
    const mockResponse = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId1,
        data: {},
        timestamp: new Date().toISOString(),
      },
      chainOfThought: [],
      modelMetadata: {
        modelId: 'test',
        modelHash: '',
        provider: 'test',
      },
    };

    const mockFetch: AIFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as unknown as Response),
    };

    const result = await processAIEventLogic(
      {
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
          sequenceNumber: 42,
        },
        aiServiceUrl: TestConstants.AIServiceUrl,
        defaultAction: {
          type: AIActionType.Decline,
          playerId: TestConstants.PlayerId1,
          data: {},
          timestamp: new Date().toISOString(),
        },
        defaultChainOfThought: [],
        defaultModelMetadata: {
          modelId: AIModelId.Default,
          modelHash: '',
          provider: AIModelProvider.Local,
        },
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.aiResponse?.sequenceNumber).toBe(42);
  });

  it(testName('should copy eventSequence from eventRequest to response'), async () => {
    const mockResponse = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId1,
        data: {},
        timestamp: new Date().toISOString(),
      },
      chainOfThought: [],
      modelMetadata: {
        modelId: 'test',
        modelHash: '',
        provider: 'test',
      },
    };

    const mockFetch: AIFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as unknown as Response),
    };

    const result = await processAIEventLogic(
      {
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
          eventSequence: 99,
        },
        aiServiceUrl: TestConstants.AIServiceUrl,
        defaultAction: {
          type: AIActionType.Decline,
          playerId: TestConstants.PlayerId1,
          data: {},
          timestamp: new Date().toISOString(),
        },
        defaultChainOfThought: [],
        defaultModelMetadata: {
          modelId: AIModelId.Default,
          modelHash: '',
          provider: AIModelProvider.Local,
        },
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.aiResponse?.eventSequence).toBe(99);
  });

  it(testName('should return error for non-200 HTTP status'), async () => {
    const mockFetch: AIFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: HttpStatus.InternalServerError,
        statusText: TestConstants.InternalServerError,
      } as unknown as Response),
    };

    const result = await processAIEventLogic(
      {
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
        },
        aiServiceUrl: TestConstants.AIServiceUrl,
        defaultAction: {
          type: AIActionType.Decline,
          playerId: TestConstants.PlayerId1,
          data: {},
          timestamp: new Date().toISOString(),
        },
        defaultChainOfThought: [],
        defaultModelMetadata: {
          modelId: AIModelId.Default,
          modelHash: '',
          provider: AIModelProvider.Local,
        },
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`AI service error: ${HttpStatus.InternalServerError} ${TestConstants.InternalServerError}`);
  });

  it(testName('should handle fetch errors'), async () => {
    const mockFetch: AIFetch = {
      fetch: vi.fn().mockRejectedValue(new Error(TestConstants.NetworkError)),
    };

    const result = await processAIEventLogic(
      {
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
        },
        aiServiceUrl: TestConstants.AIServiceUrl,
        defaultAction: {
          type: AIActionType.Decline,
          playerId: TestConstants.PlayerId1,
          data: {},
          timestamp: new Date().toISOString(),
        },
        defaultChainOfThought: [],
        defaultModelMetadata: {
          modelId: AIModelId.Default,
          modelHash: '',
          provider: AIModelProvider.Local,
        },
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(`Error: ${TestConstants.NetworkError}`);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should save AI decision successfully'), async () => {
    const mockStorage: AIStorage = {
      put: vi.fn().mockResolvedValue(undefined),
    };

    const result = await saveAIDecisionLogic(
      {
        matchId: TestConstants.MatchId,
        playerId: TestConstants.PlayerId1,
        decisionKey: TestConstants.DecisionKey,
        aiResponse: {
          action: {
            type: 'play',
            playerId: TestConstants.PlayerId1,
            data: {},
            timestamp: new Date().toISOString(),
          },
          chainOfThought: [],
          modelMetadata: {
            modelId: 'test',
            modelHash: 'hash',
            provider: 'test',
          },
          responseTimeMs: 100,
        },
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
        },
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(mockStorage.put).toHaveBeenCalled();
  });

  it(testName('should return error when no AI response'), async () => {
    const mockStorage: AIStorage = {
      put: vi.fn(),
    };

    const result = await saveAIDecisionLogic(
      {
        matchId: TestConstants.MatchId,
        playerId: TestConstants.PlayerId1,
        decisionKey: TestConstants.DecisionKey,
        aiResponse: undefined,
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
        },
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('No AI response to save');
  });

  it(testName('should handle storage errors'), async () => {
    const mockStorage: AIStorage = {
      put: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
    };

    const result = await saveAIDecisionLogic(
      {
        matchId: TestConstants.MatchId,
        playerId: TestConstants.PlayerId1,
        decisionKey: TestConstants.DecisionKey,
        aiResponse: {
          action: {
            type: 'play',
            playerId: TestConstants.PlayerId1,
            data: {},
            timestamp: new Date().toISOString(),
          },
          chainOfThought: [],
          modelMetadata: {
            modelId: 'test',
            modelHash: 'hash',
            provider: 'test',
          },
          responseTimeMs: 100,
        },
        eventRequest: {
          matchId: TestConstants.MatchId,
          playerId: TestConstants.PlayerId1,
          eventType: TestConstants.EventType,
          eventData: {},
          currentState: {},
        },
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.StorageError);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should get AI decisions successfully'), async () => {
    const decision1 = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId1,
        data: {},
        timestamp: TestConstants.TestTimestamp,
      },
      sequenceNumber: 1,
    };
    const decision2 = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId2,
        data: {},
        timestamp: TestConstants.TestTimestamp,
      },
      sequenceNumber: 2,
    };

    const mockStorage: AIDecisionStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: TestConstants.DecisionKey }, { key: TestConstants.SecondDecisionPath }],
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(decision1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(decision2)),
        }),
    };

    const result = await getAIDecisionsLogic(
      {
        matchId: TestConstants.MatchId,
        prefix: TestConstants.DecisionPrefix,
        playerIdFilter: null,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.decisions).toHaveLength(2);
    expect(result.decisions?.[0]).not.toBeUndefined();
    const firstDecision = result.decisions?.[0] as {
      action: { type: string; playerId: string; data: unknown; timestamp: string };
      sequenceNumber: number;
      playerId?: string;
    } | undefined;
    expect(firstDecision?.action.type).toBe(decision1.action.type);
    expect(firstDecision?.action.playerId).toBe(TestConstants.PlayerId1);
    expect(firstDecision?.action.data).toEqual(decision1.action.data);
    expect(firstDecision?.action.timestamp).toBe(decision1.action.timestamp);
    expect(firstDecision?.sequenceNumber).toBe(decision1.sequenceNumber);
    expect(firstDecision?.playerId || firstDecision?.action.playerId).toBe(TestConstants.PlayerId1);
  });

  it(testName('should filter by playerId when provided'), async () => {
    const decision1 = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId1,
        data: {},
        timestamp: TestConstants.TestTimestamp,
      },
      sequenceNumber: 1,
    };
    const decision2 = {
      action: {
        type: 'play',
        playerId: TestConstants.PlayerId2,
        data: {},
        timestamp: TestConstants.TestTimestamp,
      },
      sequenceNumber: 2,
    };

    const mockStorage: AIDecisionStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: TestConstants.DecisionKey }, { key: TestConstants.SecondDecisionPath }],
      }),
      get: vi.fn()
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(decision1)),
        })
        .mockResolvedValueOnce({
          text: vi.fn().mockResolvedValue(JSON.stringify(decision2)),
        }),
    };

    const result = await getAIDecisionsLogic(
      {
        matchId: TestConstants.MatchId,
        prefix: TestConstants.DecisionPrefix,
        playerIdFilter: TestConstants.PlayerId1,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.decisions).toHaveLength(1);
    expect((result.decisions?.[0] as { playerId?: string })?.playerId).toBe(TestConstants.PlayerId1);
  });

  it(testName('should return error when no decisions found'), async () => {
    const mockStorage: AIDecisionStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [],
      }),
      get: vi.fn(),
    };

    const result = await getAIDecisionsLogic(
      {
        matchId: TestConstants.MatchId,
        prefix: TestConstants.DecisionPrefix,
        playerIdFilter: null,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('No decisions found');
  });

  it(testName('should handle JSON parse errors gracefully'), async () => {
    const mockStorage: AIDecisionStorage = {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: TestConstants.DecisionKey }],
      }),
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(TestConstants.InvalidJson),
      }),
    };

    const result = await getAIDecisionsLogic(
      {
        matchId: TestConstants.MatchId,
        prefix: TestConstants.DecisionPrefix,
        playerIdFilter: null,
      },
      mockStorage
    );

    expect(result.success).toBe(true);
    expect(result.decisions).toHaveLength(0);
  });

  it(testName('should return error when storage.list throws'), async () => {
    const mockStorage: AIDecisionStorage = {
      list: vi.fn().mockRejectedValue(new Error(TestConstants.StorageError)),
      get: vi.fn(),
    };

    const result = await getAIDecisionsLogic(
      {
        matchId: TestConstants.MatchId,
        prefix: TestConstants.DecisionPrefix,
        playerIdFilter: null,
      },
      mockStorage
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(TestConstants.StorageError);
  });
});
