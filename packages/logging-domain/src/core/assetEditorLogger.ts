import type { LogLevel } from '@/types/logLevel';
import type { LogSource } from '@/types/logSource';
import type { StackFrame } from '@/types/stackFrame';
import type { StackTrace } from '@/core/stackTrace';
import type { ILogStorage } from '@/storage/storageInterface';
import type { PathResolver } from '@/core/pathResolver';
import type { RequestContextProvider } from '@/core/requestContextProvider';
import type { LoggerConfig } from '@/types/loggerConfig';
import type { RegistrationInfo } from '@/types/registrationInfo';
import type { StructuredLogPayload } from '@/types/structuredLogPayload';
import type { InternalLogEntry } from '@/types/internalLogEntry';
import { LogLevel as LogLevelConst } from '@/types/logLevel';
import { LogSourcePrefix } from '@/types/logSource';
import { BaseLogger } from '@/core/baseLogger';
import { buildStructuredLogPayload } from '@/core/buildStructuredLogPayload';
import { redact, redactString } from '@/core/redact';
import { LogConsumer, type BridgeEntry } from '@/transport/bridgeLogPayload';
import { internalEntryToBridgeLog, sendToBridge } from '@/transport/bridgeTransport';
import { DEFAULT_BRIDGE_URL } from '@/core/constants';

export class AssetEditorLogger extends BaseLogger {
  private static _instance: AssetEditorLogger | null = null;
  private static _storedStorage: ILogStorage | null = null;
  private static _storedPathResolver: PathResolver | null = null;
  private static _storedRequestContextProvider: RequestContextProvider | null = null;
  private static _storedConfig: LoggerConfig | undefined = undefined;

  private constructor(
    storage: ILogStorage | null,
    pathResolver: PathResolver,
    config?: LoggerConfig,
    requestContextProvider?: RequestContextProvider | null
  ) {
    super(storage, pathResolver, config);
    this._requestContextProvider = requestContextProvider ?? null;
  }

  private _requestContextProvider: RequestContextProvider | null = null;

  static get instance(): AssetEditorLogger {
    if (!AssetEditorLogger._instance) {
      const pathResolver = AssetEditorLogger._storedPathResolver ?? {
        getFilePathFromUrl: (url: string) => url,
        getSourceFromFilePath: (_filePath?: string) => 'app',
      };
      AssetEditorLogger._instance = new AssetEditorLogger(
        AssetEditorLogger._storedStorage ?? null,
        pathResolver,
        AssetEditorLogger._storedConfig,
        AssetEditorLogger._storedRequestContextProvider
      );
    }
    return AssetEditorLogger._instance;
  }

  static initLogger(
    storage: ILogStorage | null,
    pathResolver: PathResolver,
    config?: LoggerConfig,
    requestContextProvider?: RequestContextProvider | null
  ): AssetEditorLogger {
    AssetEditorLogger._storedStorage = storage;
    AssetEditorLogger._storedPathResolver = pathResolver;
    AssetEditorLogger._storedRequestContextProvider = requestContextProvider ?? null;
    AssetEditorLogger._storedConfig = config;

    if (!AssetEditorLogger._instance) {
      AssetEditorLogger._instance = new AssetEditorLogger(
        storage,
        pathResolver,
        config,
        AssetEditorLogger._storedRequestContextProvider
      );
    } else {
      AssetEditorLogger._instance.updateConfig(config || {});
      AssetEditorLogger._instance._requestContextProvider = AssetEditorLogger._storedRequestContextProvider;
      if (storage !== AssetEditorLogger._instance.storage) {
        AssetEditorLogger._instance.storage = storage;
      }
    }
    return AssetEditorLogger._instance;
  }

  static create(storage: ILogStorage | null, pathResolver: PathResolver, config?: LoggerConfig): AssetEditorLogger {
    return AssetEditorLogger.initLogger(storage, pathResolver, config);
  }

  static configure(storage: ILogStorage | null, pathResolver: PathResolver, config: LoggerConfig): AssetEditorLogger {
    return AssetEditorLogger.initLogger(storage, pathResolver, config);
  }

  log(level: LogLevel, message: string, stackTrace: StackTrace, data?: unknown, batchKey?: string): void {
    if (!this.shouldLog(level)) return;

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
    const batchCtx = effectiveBatchKey ? this.batchContexts.get(effectiveBatchKey) : undefined;
    if (effectiveBatchKey && batchCtx && batchCtx.config.enabled) {
      this.addToBatch(effectiveBatchKey, level, message, stackTrace, data);
      return;
    }

    const capturedContext = this._requestContextProvider?.getCurrentContext() ?? null;

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
      capturedContext
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
      this.addToBatch(batchKey, LogLevelConst.Info, message, stackTrace, data);
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
      this.addToBatch(batchKey, LogLevelConst.Warn, message, stackTrace, data);
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
      this.addToBatch(batchKey, LogLevelConst.Error, message, stackTrace, data);
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
      this.addToBatch(batchKey, LogLevelConst.Debug, message, stackTrace, data);
      if (!enabled) return;
    } else if (!enabled) {
      return;
    }
    this.log(LogLevelConst.Debug, message, stackTrace, data, batchKey);
  }

  logLog(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true, batchKey?: string): void {
    if (batchKey && this.batchContexts.has(batchKey)) {
      this.addToBatch(batchKey, LogLevelConst.Log, message, stackTrace, data);
      if (!enabled) return;
    } else if (!enabled) {
      return;
    }
    this.log(LogLevelConst.Log, message, stackTrace, data, batchKey);
  }

  logImmediately(
    level: LogLevel,
    message: string,
    stackTrace: StackTrace,
    data?: unknown,
    _requestContext?: ReturnType<RequestContextProvider['getCurrentContext']>
  ): void {
    const { frames, primaryFrame, context: parsedContext } = this.parseStackTrace(stackTrace);

    let registeredUser = null;
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
      null
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
      primaryFrame
    ).catch((error) => {
      console.error('[Logger] Failed to store log entry:', error);
    });
  }

  async flush(): Promise<void> {
    if (this.storage && typeof this.storage.flush === 'function') {
      await this.storage.flush();
    }
  }

  async flushLogQueue(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const byEndpoint = new Map<string, BridgeEntry[]>();
    for (const item of this.logQueue) {
      const existing = byEndpoint.get(item.endpoint) || [];
      existing.push(...item.entries);
      byEndpoint.set(item.endpoint, existing);
    }
    this.logQueue.length = 0;

    const sends: Promise<void>[] = [];
    for (const [_endpoint, entries] of byEndpoint) {
      const endpoint = _endpoint || this.config.bridgeEndpoint || DEFAULT_BRIDGE_URL;
      if (endpoint) {
        sends.push(sendToBridge(entries, endpoint).catch(() => {}));
      }
    }
    await Promise.all(sends);
  }

  protected getExcludePath(): string | undefined {
    return '/lib/logger/';
  }

  protected getLogSource(registeredUser: RegistrationInfo | null, primaryFrame: StackFrame | null): LogSource {
    if (registeredUser) {
      return `${LogSourcePrefix.AssetEditor}${registeredUser.className}`;
    }
    const fromPath = this.pathResolver.getSourceFromFilePath(primaryFrame?.filePath);
    return fromPath ? `${LogSourcePrefix.AssetEditor}${fromPath}` : `${LogSourcePrefix.AssetEditor}app`;
  }

  protected writeToConsole(payload: StructuredLogPayload): void {
    if (!this.config.consoleEnabled) {
      return;
    }
    super.writeToConsole(payload);
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
    const ctx = requestContext ?? this._requestContextProvider?.getCurrentContext() ?? null;
    const isErrorOrWarn = level === LogLevelConst.Error || level === LogLevelConst.Warn;

    if (ctx?.runId && ctx?.testName) {
      const entry: InternalLogEntry = {
        level,
        source,
        context,
        message,
        data,
        timestamp: Date.now(),
        correlationId: ctx.correlationId,
        testName: ctx.testName,
        elapsed: ctx ? Date.now() - ctx.startTime : undefined,
        stack: isErrorOrWarn ? stack : undefined,
        stackFrames: isErrorOrWarn && stackFrames && stackFrames.length > 0 ? stackFrames : undefined,
        file: primaryFrame?.file,
        filePath: primaryFrame?.filePath,
        line: primaryFrame?.line,
        column: primaryFrame?.column,
      };
      const consumer =
        this.config.bridgeConsumer === LogConsumer.Main || this.config.bridgeConsumer === LogConsumer.Solana
          ? this.config.bridgeConsumer
          : LogConsumer.Main;
      const bridgeLog = internalEntryToBridgeLog(entry, {
        consumer,
        suitePath: ctx.suitePath,
        suiteType: ctx.suiteType,
        origin: ctx.origin != null ? String(ctx.origin) : null,
        environment: ctx.environment ?? null,
      });
      const endpoint = ctx.testLogServerUrl ?? this.config.bridgeEndpoint ?? DEFAULT_BRIDGE_URL ?? '';
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
      return;
    }

    if (!this.storage) return;

    try {
      const result = this.storage.storeLog({
        level,
        context,
        message,
        source,
        timestamp: Date.now(),
        args: data !== undefined ? [data] : undefined,
        stack: isErrorOrWarn ? stack : undefined,
        stackFrames: isErrorOrWarn && stackFrames && stackFrames.length > 0 ? stackFrames : undefined,
        file: primaryFrame?.file,
        filePath: primaryFrame?.filePath,
        line: primaryFrame?.line,
        column: primaryFrame?.column,
      });

      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      console.error('[Logger] Failed to store log entry:', error);
    }
  }

  static reset(): void {
    BaseLogger.reset(AssetEditorLogger._instance || undefined);
    AssetEditorLogger._instance = null;
    AssetEditorLogger._storedStorage = null;
    AssetEditorLogger._storedPathResolver = null;
    AssetEditorLogger._storedRequestContextProvider = null;
    AssetEditorLogger._storedConfig = undefined;
  }
}
