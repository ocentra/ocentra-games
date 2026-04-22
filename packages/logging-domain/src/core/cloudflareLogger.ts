import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { LogSource } from '@ocentra/logging-domain/types/logSource';
import type { StackFrame } from '@ocentra/logging-domain/types/stackFrame';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { PathResolver } from '@ocentra/logging-domain/core/pathResolver';
import type { LoggerConfig } from '@ocentra/logging-domain/types/loggerConfig';
import type { RequestContextProvider } from '@ocentra/logging-domain/core/requestContextProvider';
import type { LogDecisionProvider } from '@ocentra/logging-domain/core/logDecisionProvider';
import type { CloudflareStorageProvider } from '@ocentra/logging-domain/storage/cloudflareStorageProvider';
import { LogLevel as LogLevelConst } from '@ocentra/logging-domain/types/logLevel';
import { LogSourcePrefix } from '@ocentra/logging-domain/types/logSource';
import { BaseLogger } from '@ocentra/logging-domain/core/baseLogger';
import { UNKNOWN_MODULE, DEFAULT_BRIDGE_URL } from '@ocentra/logging-domain/core/constants';
import type { RegistrationInfo } from '@ocentra/logging-domain/types/registrationInfo';
import type { InternalLogEntry } from '@ocentra/logging-domain/types/internalLogEntry';
import type { StructuredLogPayload } from '@ocentra/logging-domain/types/structuredLogPayload';
import { LogConsumer, type BridgeEntry } from '@ocentra/logging-domain/transport/bridgeLogPayload';
import { internalEntryToBridgeLog, sendToBridge } from '@ocentra/logging-domain/transport/bridgeTransport';
import { setStoredCloudflareStorage, getStoredCloudflareStorage } from '@ocentra/logging-domain/core/cloudflareLoggerHelpers';
import { buildStructuredLogPayload } from '@ocentra/logging-domain/core/buildStructuredLogPayload';
import { redact, redactString } from '@ocentra/logging-domain/core/redact';

export class CloudflareLogger extends BaseLogger {
  private static _instance: CloudflareLogger | null = null;
  private static _storedPathResolver: PathResolver | null = null;
  private static _storedRequestContextProvider: RequestContextProvider | null = null;
  private static _storedLogDecisionProvider: LogDecisionProvider | null = null;
  private static _storedConfig: LoggerConfig | undefined = undefined;

  private readonly pendingBridgeSends = new Set<Promise<void>>();

  private constructor(
    storage: null,
    pathResolver: PathResolver,
    private requestContextProvider: RequestContextProvider,
    private logDecisionProvider: LogDecisionProvider,
    private cloudflareStorage: CloudflareStorageProvider,
    config?: LoggerConfig
  ) {
    super(storage, pathResolver, config);
  }

  static get instance(): CloudflareLogger {
    if (!CloudflareLogger._instance) {
      const storage = getStoredCloudflareStorage();
      if (
        !CloudflareLogger._storedPathResolver ||
        !CloudflareLogger._storedRequestContextProvider ||
        !CloudflareLogger._storedLogDecisionProvider ||
        !storage
      ) {
        throw new Error('CloudflareLogger must be initialized with initLogger() before use');
      }
      CloudflareLogger._instance = new CloudflareLogger(
        null,
        CloudflareLogger._storedPathResolver,
        CloudflareLogger._storedRequestContextProvider,
        CloudflareLogger._storedLogDecisionProvider,
        storage,
        CloudflareLogger._storedConfig
      );
    }
    return CloudflareLogger._instance;
  }

  static initLogger(
    pathResolver: PathResolver,
    requestContextProvider: RequestContextProvider,
    logDecisionProvider: LogDecisionProvider,
    cloudflareStorage: CloudflareStorageProvider,
    config?: LoggerConfig
  ): CloudflareLogger {
    CloudflareLogger._storedPathResolver = pathResolver;
    CloudflareLogger._storedRequestContextProvider = requestContextProvider;
    CloudflareLogger._storedLogDecisionProvider = logDecisionProvider;
    setStoredCloudflareStorage(cloudflareStorage);
    CloudflareLogger._storedConfig = config;

    if (!CloudflareLogger._instance) {
      CloudflareLogger._instance = new CloudflareLogger(
        null,
        pathResolver,
        requestContextProvider,
        logDecisionProvider,
        cloudflareStorage,
        config
      );
    } else {
      CloudflareLogger._instance.updateConfig(config || {});
    }
    return CloudflareLogger._instance;
  }

  static create(
    pathResolver: PathResolver,
    requestContextProvider: RequestContextProvider,
    logDecisionProvider: LogDecisionProvider,
    cloudflareStorage: CloudflareStorageProvider,
    config?: LoggerConfig
  ): CloudflareLogger {
    return CloudflareLogger.initLogger(pathResolver, requestContextProvider, logDecisionProvider, cloudflareStorage, config);
  }

  static configure(
    pathResolver: PathResolver,
    requestContextProvider: RequestContextProvider,
    logDecisionProvider: LogDecisionProvider,
    cloudflareStorage: CloudflareStorageProvider,
    config: LoggerConfig
  ): CloudflareLogger {
    return CloudflareLogger.initLogger(pathResolver, requestContextProvider, logDecisionProvider, cloudflareStorage, config);
  }

  protected shouldLog(level: LogLevel): boolean {
    const registeredUser = this.getRegisteredUsers()[0];
    const moduleType = registeredUser?.className;
    const ctx = this.requestContextProvider.getCurrentContext();
    const requestDebugModules = ctx?.debugModules;

    return this.logDecisionProvider.shouldLog(moduleType || UNKNOWN_MODULE, level, requestDebugModules);
  }

  log(level: LogLevel, message: string, stackTrace: StackTrace, data?: unknown, batchKey?: string): void {
    const shouldLogResult = this.shouldLog(level);
    if (!shouldLogResult) {
      return;
    }

    if (!stackTrace) {
      console.error('[Logger] stackTrace is required');
      return;
    }

    if (BaseLogger.isInitializing) {
      if (level === LogLevelConst.Error || level === LogLevelConst.Warn) {
        BaseLogger.incrementInitPhaseStat(level);
        if (!BaseLogger.shouldBatchInitLog(level)) {
          this.logImmediately(level, message, stackTrace, data);
          return;
        }
      }

      if (BaseLogger.shouldBatchInitLog(level) && BaseLogger.getInitPhaseBatchContext()) {
        BaseLogger.incrementInitPhaseStat(level);
        this.addToBatch('Logger.initPhase', level, message, stackTrace, data);
        return;
      }
    }

    // Capture context before any deferred work so batch flush can keep test metadata.
    const capturedContext = this.requestContextProvider.getCurrentContext();

    let effectiveBatchKey = batchKey;
    if (effectiveBatchKey === undefined) {
      const { frames, primaryFrame } = this.parseStackTrace(stackTrace);
      let registeredUser: RegistrationInfo | null = null;
      for (const frame of frames) {
        registeredUser = this.findRegisteredUserByFilePath(frame.filePath);
        if (registeredUser) break;
      }
      if (!registeredUser && primaryFrame) {
        registeredUser = this.findRegisteredUserByFilePath(primaryFrame.filePath);
      }
      if (registeredUser?.batchKey && this.batchContexts.has(registeredUser.batchKey)) {
        effectiveBatchKey = registeredUser.batchKey;
      }
    }
    if (effectiveBatchKey && this.batchContexts.has(effectiveBatchKey)) {
      this.addToBatch(effectiveBatchKey, level, message, stackTrace, data, capturedContext);
      return;
    }

    const { frames, primaryFrame, context: parsedContext } = this.parseStackTrace(stackTrace);

    let registeredUser: RegistrationInfo | null = null;
    for (const frame of frames) {
      registeredUser = this.findRegisteredUserByFilePath(frame.filePath);
      if (registeredUser) {
        break;
      }
    }
    if (!registeredUser && primaryFrame) {
      registeredUser = this.findRegisteredUserByFilePath(primaryFrame.filePath);
    }

    const context = registeredUser
      ? `${registeredUser.className}.${parsedContext}`
      : parsedContext;

    const logSource = this.getLogSource(registeredUser, primaryFrame);
    const redactedData = redact(data);
    const formattedMessage = this.formatMessage(message, redactedData);
    const redactedMessage = redactString(formattedMessage);
    const payload = buildStructuredLogPayload(
      level,
      redactedMessage,
      redactedData,
      registeredUser,
      primaryFrame,
      stackTrace,
      logSource,
      context,
      capturedContext
    );
    this.writeToConsole(payload);

    this.storeLogEntry(
      level,
      logSource,
      context,
      redactedMessage,
      redactedData,
      stackTrace,
      frames,
      primaryFrame,
      capturedContext  // Pass captured context to avoid race condition
    ).catch((error) => {
      console.error('[Logger] Failed to store log entry:', error);
    });
  }

  logInfo(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true, batchKey?: string): void {
    if (!enabled && !BaseLogger.isInitializing) {
      return;
    }

    if (BaseLogger.isInitializing && BaseLogger.shouldBatchInitLog(LogLevelConst.Info) && BaseLogger.getInitPhaseBatchContext()) {
      BaseLogger.incrementInitPhaseStat(LogLevelConst.Info);
      this.addToBatch('Logger.initPhase', LogLevelConst.Info, message, stackTrace, data);
      return;
    }

    if (batchKey && this.batchContexts.has(batchKey)) {
      const capturedContext = this.requestContextProvider.getCurrentContext();
      this.addToBatch(batchKey, LogLevelConst.Info, message, stackTrace, data, capturedContext);
      if (!enabled) {
        const context = this.batchContexts.get(batchKey);
        if (context && context.entries.length >= context.config.batchSize) {
          this.flushBatchContext(batchKey, true);
        }
        return;
      }
      return;
    } else if (!enabled) {
      return;
    }
    this.log(LogLevelConst.Info, message, stackTrace, data, batchKey);
  }

  logWarn(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true, batchKey?: string): void {
    if (!enabled && !BaseLogger.isInitializing) {
      return;
    }

    if (BaseLogger.isInitializing) {
      BaseLogger.incrementInitPhaseStat(LogLevelConst.Warn);
      if (!BaseLogger.shouldBatchInitLog(LogLevelConst.Warn)) {
        this.logImmediately(LogLevelConst.Warn, message, stackTrace, data);
        return;
      }
      if (BaseLogger.getInitPhaseBatchContext()) {
        this.addToBatch('Logger.initPhase', LogLevelConst.Warn, message, stackTrace, data);
        return;
      }
    }

    if (batchKey && this.batchContexts.has(batchKey)) {
      const capturedContext = this.requestContextProvider.getCurrentContext();
      this.addToBatch(batchKey, LogLevelConst.Warn, message, stackTrace, data, capturedContext);
      if (!enabled) return;
    } else if (!enabled) {
      return;
    }
    this.log(LogLevelConst.Warn, message, stackTrace, data, batchKey);
  }

  logError(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true, batchKey?: string): void {
    if (!enabled && !BaseLogger.isInitializing) {
      return;
    }

    if (BaseLogger.isInitializing) {
      BaseLogger.incrementInitPhaseStat(LogLevelConst.Error);
      if (!BaseLogger.shouldBatchInitLog(LogLevelConst.Error)) {
        this.logImmediately(LogLevelConst.Error, message, stackTrace, data);
        return;
      }
      if (BaseLogger.getInitPhaseBatchContext()) {
        this.addToBatch('Logger.initPhase', LogLevelConst.Error, message, stackTrace, data);
        return;
      }
    }

    if (batchKey && this.batchContexts.has(batchKey)) {
      const capturedContext = this.requestContextProvider.getCurrentContext();
      this.addToBatch(batchKey, LogLevelConst.Error, message, stackTrace, data, capturedContext);
      if (!enabled) return;
    } else if (!enabled) {
      return;
    }
    this.log(LogLevelConst.Error, message, stackTrace, data, batchKey);
  }

  logDebug(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true, batchKey?: string): void {
    if (!enabled && !BaseLogger.isInitializing) {
      return;
    }

    if (BaseLogger.isInitializing && BaseLogger.shouldBatchInitLog(LogLevelConst.Debug) && BaseLogger.getInitPhaseBatchContext()) {
      BaseLogger.incrementInitPhaseStat(LogLevelConst.Debug);
      this.addToBatch('Logger.initPhase', LogLevelConst.Debug, message, stackTrace, data);
      return;
    }

    if (batchKey && this.batchContexts.has(batchKey)) {
      const capturedContext = this.requestContextProvider.getCurrentContext();
      this.addToBatch(batchKey, LogLevelConst.Debug, message, stackTrace, data, capturedContext);
      if (!enabled) return;
    } else if (!enabled) {
      return;
    }
    this.log(LogLevelConst.Debug, message, stackTrace, data, batchKey);
  }

  logLog(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true, batchKey?: string): void {
    if (batchKey && this.batchContexts.has(batchKey)) {
      const capturedContext = this.requestContextProvider.getCurrentContext();
      this.addToBatch(batchKey, LogLevelConst.Info, message, stackTrace, data, capturedContext);
      if (!enabled) return;
    } else if (!enabled) {
      return;
    }
    this.log(LogLevelConst.Info, message, stackTrace, data, batchKey);
  }

  logImmediately(
    level: LogLevel,
    message: string,
    stackTrace: StackTrace,
    data?: unknown,
    requestContext?: ReturnType<RequestContextProvider['getCurrentContext']>
  ): void {
    const capturedContext = requestContext ?? this.requestContextProvider.getCurrentContext();

    const { frames, primaryFrame, context: parsedContext } = this.parseStackTrace(stackTrace);

    let registeredUser: RegistrationInfo | null = null;
    for (const frame of frames) {
      registeredUser = this.findRegisteredUserByFilePath(frame.filePath);
      if (registeredUser) {
        break;
      }
    }
    if (!registeredUser && primaryFrame) {
      registeredUser = this.findRegisteredUserByFilePath(primaryFrame.filePath);
    }

    const context = registeredUser
      ? `${registeredUser.className}.${parsedContext}`
      : parsedContext;

    const logSource = this.getLogSource(registeredUser, primaryFrame);
    const redactedData = redact(data);
    const formattedMessage = this.formatMessage(message, redactedData);
    const redactedMessage = redactString(formattedMessage);
    const payload = buildStructuredLogPayload(
      level,
      redactedMessage,
      redactedData,
      registeredUser,
      primaryFrame,
      stackTrace,
      logSource,
      context,
      capturedContext
    );
    this.writeToConsole(payload);

    this.storeLogEntry(
      level,
      logSource,
      context,
      redactedMessage,
      redactedData,
      stackTrace,
      frames,
      primaryFrame,
      capturedContext  // Pass captured context to avoid race condition
    ).catch((error) => {
      console.error('[Logger] Failed to store log entry:', error);
    });
  }

  async flush(): Promise<void> {
    await this.cloudflareStorage.flushR2DebugLogs(true);
  }

  async flushLogQueue(): Promise<void> {
    if (this.logQueue.length === 0) return;

    // Group queued logs by endpoint
    const byEndpoint = new Map<string, BridgeEntry[]>();
    for (const item of this.logQueue) {
      const existing = byEndpoint.get(item.endpoint) || [];
      existing.push(...item.entries);
      byEndpoint.set(item.endpoint, existing);
    }

    // Clear queue before sending
    this.logQueue.length = 0;

    // Send all batches
    const sends: Promise<void>[] = [];
    for (const [endpoint, entries] of byEndpoint) {
      sends.push(this.emitToBridge(entries, endpoint));
    }

    await Promise.all(sends);
  }

  protected getExcludePath(): string | undefined {
    return '/logging/logger';
  }

  protected getLogSource(registeredUser: RegistrationInfo | null, _primaryFrame: StackFrame | null): LogSource {
    if (registeredUser) {
      return `${LogSourcePrefix.Cloudflare}${registeredUser.className}`;
    }
    return `${LogSourcePrefix.Cloudflare}Unknown`;
  }

  protected writeToConsole(payload: StructuredLogPayload): void {
    const moduleType = payload.moduleSource;
    const ctx = this.requestContextProvider.getCurrentContext();
    const requestDebugModules = ctx?.debugModules;
    const level = payload.level as LogLevel;

    if (!moduleType || !this.logDecisionProvider.shouldLogToConsole(moduleType, level, requestDebugModules)) {
      return;
    }

    super.writeToConsole(payload);
  }

  protected override async emitToBridge(entries: BridgeEntry[], endpoint?: string): Promise<void> {
    if (entries.length === 0) return;
    const finalEndpoint = endpoint ?? this.config.bridgeEndpoint ?? DEFAULT_BRIDGE_URL;
    if (!finalEndpoint) return;
    const sendPromise = sendToBridge(entries, finalEndpoint);
    this.pendingBridgeSends.add(sendPromise);
    sendPromise.finally(() => {
      this.pendingBridgeSends.delete(sendPromise);
    });
    try {
      await sendPromise;
    } catch (err) {
      // Swallow bridge failures to prevent worker crashes
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[CloudflareLogger] Bridge send failed (non-fatal):', err instanceof Error ? err.message : String(err));
      }
    }
  }

  getPendingBridgeSendPromise(): Promise<void> {
    const copy = new Set(this.pendingBridgeSends);
    if (copy.size === 0) return Promise.resolve();
    return Promise.all(Array.from(copy)).then(() => undefined);
  }

  protected async storeLogEntry(
    level: LogLevel,
    source: LogSource,
    context: string,
    message: string,
    data: unknown | undefined,
    stack?: string,
    stackFrames?: StackFrame[],
    primaryFrame?: StackFrame | null,
    requestContext?: ReturnType<RequestContextProvider['getCurrentContext']>
  ): Promise<void> {
    try {
      // Use passed-in context to avoid race condition with global state
      const ctx = requestContext;
      
      const isErrorOrWarn = level === LogLevelConst.Error || level === LogLevelConst.Warn;

      const entry: InternalLogEntry = {
        level,
        source,
        context,
        message,
        data,
        timestamp: Date.now(),
        correlationId: ctx?.correlationId,
        testName: ctx?.testName,
        elapsed: ctx ? Date.now() - ctx.startTime : undefined,
        stack: isErrorOrWarn ? stack : undefined,
        stackFrames: isErrorOrWarn && stackFrames && stackFrames.length > 0 ? stackFrames : undefined,
        file: primaryFrame?.file,
        filePath: primaryFrame?.filePath,
        line: primaryFrame?.line,
        column: primaryFrame?.column,
      };

      if (ctx?.runId && ctx?.testName) {
        const consumer =
          this.config.bridgeConsumer === LogConsumer.Main || this.config.bridgeConsumer === LogConsumer.Solana
            ? this.config.bridgeConsumer
            : LogConsumer.Cloudflare;
        const bridgeLog = internalEntryToBridgeLog(entry, {
          consumer,
          suitePath: ctx.suitePath,
          suiteType: ctx.suiteType,
          origin: ctx.origin != null ? String(ctx.origin) : null,
          environment: ctx.environment ?? null,
        });
        const endpoint = ctx.testLogServerUrl ?? this.config.bridgeEndpoint ?? DEFAULT_BRIDGE_URL;
        // Queue log in memory instead of immediate send
        this.logQueue.push({
          entries: [
            {
              testName: ctx.testName,
              runId: ctx.runId,
              log: bridgeLog,
              consumer,
              runType: ctx.runType,
            },
          ],
          endpoint,
        });
      }

      const registeredUser = this.getRegisteredUsers()[0];
      const moduleType = registeredUser?.className;
      const requestDebugModules = ctx?.debugModules;

      if (!moduleType || this.logDecisionProvider.shouldStoreLog(moduleType, level, requestDebugModules)) {
        this.cloudflareStorage.writeToAnalyticsEngine(entry);
      }

      const isDevTest = this.logDecisionProvider.isDevOrTestEnvironment();
      if (isDevTest) {
        await this.cloudflareStorage.writeToSQLite(entry, entry.testName);
      }

      const isWorkerTestContext = Boolean(ctx?.runId && ctx?.testName);
      const isPoolTestGlobal = (globalThis as { __TEST_POOL_CONTEXT?: boolean }).__TEST_POOL_CONTEXT === true;
      const isEnvTestMode =
        typeof process !== 'undefined' &&
        process.env != null &&
        (process.env.TEST_MODE === 'true' || process.env.VITEST === 'true');
      const shouldSkipR2DebugBuffer = isWorkerTestContext || isPoolTestGlobal || isEnvTestMode;
      if (this.logDecisionProvider.isDevOrTestEnvironment() && level === LogLevelConst.Debug && !shouldSkipR2DebugBuffer) {
        if (!moduleType || this.logDecisionProvider.shouldStoreLog(moduleType, level, requestDebugModules)) {
          this.cloudflareStorage.writeToR2DebugBuffer(entry);
        }
      }
    } catch (error) {
      console.error('[Logger] Failed to store log entry:', error);
    }
  }

  static reset(): void {
    const instance = CloudflareLogger._instance;
    if (instance) {
      instance.pendingBridgeSends.clear();
    }
    BaseLogger.reset(instance || undefined);
    CloudflareLogger._instance = null;
    CloudflareLogger._storedPathResolver = null;
    CloudflareLogger._storedRequestContextProvider = null;
    CloudflareLogger._storedLogDecisionProvider = null;
    setStoredCloudflareStorage(null);
    CloudflareLogger._storedConfig = undefined;
  }
}
