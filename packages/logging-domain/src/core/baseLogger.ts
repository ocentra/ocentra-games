import type { LogLevel } from '@/types/logLevel';
import type { LogSource } from '@/types/logSource';
import type { StackFrame } from '@/types/stackFrame';
import type { StackTrace } from '@/core/stackTrace';
import type { BatchConfig } from '@/types/batchConfig';
import type { BatchContext } from '@/types/batchContext';
import type { InitPhaseConfig } from '@/types/initPhaseConfig';
import type { InitPhaseOptions } from '@/types/initPhaseConfig';
import type { LoggerConfig } from '@/types/loggerConfig';
import type { RegistrationInfo } from '@/types/registrationInfo';
import type { StructuredLogPayload } from '@/types/structuredLogPayload';
import type { ILogStorage } from '@/storage/storageInterface';
import type { PathResolver } from '@/core/pathResolver';
import type { RequestContext } from '@/core/requestContextProvider';
import type { BridgeEntry } from '@/transport/bridgeLogPayload';
import { sendToBridge } from '@/transport/bridgeTransport';
import { LogLevel as LogLevelConst } from '@/types/logLevel';
import { CACHE_SIZE_LIMIT, DEFAULT_BATCH_CONFIG, DEFAULT_INIT_PHASE_CONFIG, DEFAULT_CONFIG, DEFAULT_BRIDGE_URL, UNKNOWN_FILE } from '@/core/constants';
import { parseStackTrace } from '@/core/stackParser';
import { formatMessage } from '@/core/messageFormatter';
import { findRegisteredUserByFilePath, registerUser, unregisterUser, extractNameFromUrl } from '@/core/registrationManager';
import { createBatchContext, addToBatch, flushBatchContext } from '@/core/batchManager';
import { getStackTrace } from '@/core/stackTrace';

export abstract class BaseLogger {
  protected config: Required<LoggerConfig>;
  protected registeredUsers: Map<string, RegistrationInfo> = new Map();
  protected frameCache: Map<string, StackFrame> = new Map();
  protected batchContexts: Map<string, BatchContext> = new Map();
  protected readonly logQueue: Array<{ entries: BridgeEntry[]; endpoint: string }> = [];
  protected static readonly CACHE_SIZE_LIMIT = CACHE_SIZE_LIMIT;

  protected static _isInitializing: boolean = false;
  protected static _initPhaseStartTime: number = 0;
  protected static _initPhaseConfig: Required<InitPhaseConfig> = { ...DEFAULT_INIT_PHASE_CONFIG };
  protected static _initPhaseBatchContext: BatchContext | null = null;
  protected static _initPhaseStats: { info: number; warn: number; error: number; debug: number } = {
    info: 0,
    warn: 0,
    error: 0,
    debug: 0,
  };

  protected constructor(
    protected storage: ILogStorage | null,
    protected pathResolver: PathResolver,
    config?: LoggerConfig
  ) {
    const mergedInitPhaseConfig = config?.initPhaseConfig
      ? { ...DEFAULT_INIT_PHASE_CONFIG, ...config.initPhaseConfig }
      : DEFAULT_INIT_PHASE_CONFIG;

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      batchConfig: { ...DEFAULT_BATCH_CONFIG, ...(config?.batchConfig || {}) },
      initPhaseConfig: mergedInitPhaseConfig,
    };
    BaseLogger._initPhaseConfig = mergedInitPhaseConfig;
  }

  updateConfig(config: Partial<LoggerConfig>): void {
    let mergedInitPhaseConfig: Required<InitPhaseConfig>;
    if (config.initPhaseConfig) {
      const partial = config.initPhaseConfig;
      mergedInitPhaseConfig = {
        enabled: (partial.enabled ?? this.config.initPhaseConfig.enabled) as boolean,
        logInitializationInfo: (partial.logInitializationInfo ?? this.config.initPhaseConfig.logInitializationInfo) as boolean,
        logInitializationWarn: (partial.logInitializationWarn ?? this.config.initPhaseConfig.logInitializationWarn) as boolean,
        logInitializationError: (partial.logInitializationError ?? this.config.initPhaseConfig.logInitializationError) as boolean,
        logInitializationDebug: (partial.logInitializationDebug ?? this.config.initPhaseConfig.logInitializationDebug) as boolean,
        batchSize: (partial.batchSize ?? this.config.initPhaseConfig.batchSize) as number,
        flushInterval: (partial.flushInterval ?? this.config.initPhaseConfig.flushInterval) as number,
      };
    } else {
      mergedInitPhaseConfig = this.config.initPhaseConfig as Required<InitPhaseConfig>;
    }

    const updatedConfig: Partial<LoggerConfig> = { ...config };
    delete updatedConfig.initPhaseConfig;

    this.config = {
      ...this.config,
      ...updatedConfig,
      batchConfig: config.batchConfig ? { ...this.config.batchConfig, ...config.batchConfig } : this.config.batchConfig,
      initPhaseConfig: mergedInitPhaseConfig,
    };
    if (config.initPhaseConfig) {
      BaseLogger._initPhaseConfig = mergedInitPhaseConfig;
    }
  }

  getConfig(): Readonly<Required<LoggerConfig>> {
    return { ...this.config };
  }

  registerBatchContext(key: string, config?: Partial<BatchConfig>): void {
    const defaultConfig = this.config.batchConfig;
    const batchConfig: BatchConfig = {
      enabled: (config?.enabled !== undefined ? config.enabled : defaultConfig.enabled) as boolean,
      batchSize: (config?.batchSize !== undefined ? config.batchSize : defaultConfig.batchSize) as number,
      flushInterval: (config?.flushInterval !== undefined ? config.flushInterval : defaultConfig.flushInterval) as number,
    };
    this.batchContexts.set(key, createBatchContext(key, batchConfig));
  }

  unregisterBatchContext(key: string): void {
    const context = this.batchContexts.get(key);
    if (context && context.flushTimeout) {
      clearTimeout(context.flushTimeout);
    }
    this.batchContexts.delete(key);
  }

  public flushBatchContext(key: string, forceEnabled?: boolean): void {
    const context = this.batchContexts.get(key);
    if (!context) return;

    flushBatchContext(
      context,
      forceEnabled,
      (level, message, stackTrace, data, requestContext) => {
        this.logImmediately(level, message, stackTrace, data, requestContext);
      }
    );
  }

  protected addToBatch(
    key: string,
    level: LogLevel,
    message: string,
    stackTrace: StackTrace,
    data?: unknown,
    requestContext?: RequestContext | null
  ): void {
    const context = this.batchContexts.get(key);
    if (!context) return;

    addToBatch(context, level, message, stackTrace, data, requestContext);
  }

  register(urlOrName: string | undefined, urlOrOptions?: string | { batch?: boolean }): void {
    const urlCandidate = typeof urlOrOptions === 'string' ? urlOrOptions : urlOrName;
    const url = typeof urlCandidate === 'string' && urlCandidate.length > 0 ? urlCandidate : 'unknown';
    const options = typeof urlOrOptions === 'object' ? urlOrOptions : undefined;
    const batch = options?.batch !== false;
    const derivedKey = batch ? extractNameFromUrl(url) : undefined;
    registerUser(
      {},
      url,
      this.pathResolver,
      this.registeredUsers,
      this.config.maxRegistrations,
      derivedKey
    );
    if (derivedKey) {
      this.registerBatchContext(derivedKey, this.config.batchConfig);
    }
  }

  unregister(context: object | string, filePathOrUrl?: string): void {
    unregisterUser(context, filePathOrUrl, this.pathResolver, this.registeredUsers);
  }

  clearRegistrations(): void {
    this.registeredUsers.clear();
  }

  getRegisteredUsers(): RegistrationInfo[] {
    return Array.from(this.registeredUsers.values());
  }

  getRegisteredUserCount(): number {
    return this.registeredUsers.size;
  }

  protected findRegisteredUserByFilePath(filePath: string | undefined): RegistrationInfo | null {
    return findRegisteredUserByFilePath(filePath, this.registeredUsers);
  }

  protected parseStackTrace(stack: string | undefined): {
    frames: StackFrame[];
    primaryFrame: StackFrame | null;
    context: string;
  } {
    return parseStackTrace(stack, this.frameCache, BaseLogger.CACHE_SIZE_LIMIT, this.getExcludePath());
  }

  protected formatMessage(message: string, data?: unknown): string {
    return formatMessage(message, data);
  }

  protected shouldLog(level: LogLevel): boolean {
    const levels = [LogLevelConst.Debug, LogLevelConst.Log, LogLevelConst.Info, LogLevelConst.Warn, LogLevelConst.Error];
    const currentLevelIndex = levels.indexOf(this.config.minLogLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  clearFrameCache(): void {
    this.frameCache.clear();
  }

  flushAllBatches(): void {
    for (const key of this.batchContexts.keys()) {
      this.flushBatchContext(key);
    }
  }

  getStats(): {
    registeredUsersCount: number;
    frameCacheSize: number;
    config: Readonly<Required<LoggerConfig>>;
  } {
    return {
      registeredUsersCount: this.registeredUsers.size,
      frameCacheSize: this.frameCache.size,
      config: this.getConfig(),
    };
  }

  static get isInitializing(): boolean {
    return BaseLogger._isInitializing;
  }

  static startInitializationPhase(options?: InitPhaseOptions, loggerInstance?: BaseLogger): void {
    void options;
    if (BaseLogger._isInitializing) {
      return;
    }

    if (!BaseLogger._initPhaseConfig.enabled) {
      return;
    }

    BaseLogger._isInitializing = true;
    BaseLogger._initPhaseStartTime = Date.now();
    BaseLogger._initPhaseStats = { info: 0, warn: 0, error: 0, debug: 0 };

    if (loggerInstance) {
      const batchKey = 'Logger.initPhase';
      loggerInstance.registerBatchContext(batchKey, {
        enabled: false,
        batchSize: BaseLogger._initPhaseConfig.batchSize,
        flushInterval: BaseLogger._initPhaseConfig.flushInterval,
      });

      BaseLogger._initPhaseBatchContext = loggerInstance.batchContexts.get(batchKey) || null;
    }
  }

  static endInitializationPhase(loggerInstance?: BaseLogger): void {
    if (!BaseLogger._isInitializing) {
      return;
    }

    const batchKey = 'Logger.initPhase';
    const duration = Date.now() - BaseLogger._initPhaseStartTime;
    const totalBatched = BaseLogger._initPhaseStats.info + BaseLogger._initPhaseStats.debug;

    BaseLogger._isInitializing = false;

    if (loggerInstance && BaseLogger._initPhaseBatchContext) {
      if (BaseLogger._initPhaseConfig.enabled && BaseLogger._initPhaseConfig.logInitializationInfo) {
        loggerInstance.flushBatchContext(batchKey, true);

        if (totalBatched > 0) {
          const summary = {
            duration: `${duration}ms`,
            info: BaseLogger._initPhaseStats.info,
            debug: BaseLogger._initPhaseStats.debug,
            warn: BaseLogger._initPhaseStats.warn,
            error: BaseLogger._initPhaseStats.error,
            total: totalBatched,
          };

          const stackTrace = getStackTrace();
          loggerInstance.log(
            LogLevelConst.Info,
            '[Logger] Initialization phase complete',
            stackTrace,
            summary
          );
        }
      } else {
        const context = loggerInstance.batchContexts.get(batchKey);
        if (context) {
          context.entries = [];
        }
      }
    }

    BaseLogger._initPhaseStartTime = 0;
    BaseLogger._initPhaseBatchContext = null;
    BaseLogger._initPhaseStats = { info: 0, warn: 0, error: 0, debug: 0 };
  }

  protected static shouldBatchInitLog(level: LogLevel): boolean {
    if (!BaseLogger._initPhaseConfig.enabled) {
      return false;
    }

    switch (level) {
      case LogLevelConst.Info:
        return BaseLogger._initPhaseConfig.logInitializationInfo ?? true;
      case LogLevelConst.Warn:
        return BaseLogger._initPhaseConfig.logInitializationWarn ?? false;
      case LogLevelConst.Error:
        return BaseLogger._initPhaseConfig.logInitializationError ?? false;
      case LogLevelConst.Debug:
        return BaseLogger._initPhaseConfig.logInitializationDebug ?? true;
      default:
        return false;
    }
  }

  protected static getInitPhaseStats(): { info: number; warn: number; error: number; debug: number } {
    return BaseLogger._initPhaseStats;
  }

  protected static getInitPhaseBatchContext(): BatchContext | null {
    return BaseLogger._initPhaseBatchContext;
  }

  protected static incrementInitPhaseStat(level: LogLevel): void {
    if (level === LogLevelConst.Info) {
      BaseLogger._initPhaseStats.info++;
    } else if (level === LogLevelConst.Warn) {
      BaseLogger._initPhaseStats.warn++;
    } else if (level === LogLevelConst.Error) {
      BaseLogger._initPhaseStats.error++;
    } else if (level === LogLevelConst.Debug) {
      BaseLogger._initPhaseStats.debug++;
    }
  }

  static reset(loggerInstance?: BaseLogger): void {
    if (loggerInstance) {
      loggerInstance.clearRegistrations();
      loggerInstance.clearFrameCache();
      loggerInstance.flushAllBatches();
      loggerInstance.batchContexts.clear();
      loggerInstance.logQueue.length = 0;
    }
    BaseLogger._isInitializing = false;
    BaseLogger._initPhaseStartTime = 0;
    BaseLogger._initPhaseBatchContext = null;
    BaseLogger._initPhaseStats = { info: 0, warn: 0, error: 0, debug: 0 };
  }

  abstract log(level: LogLevel, message: string, stackTrace: StackTrace, data?: unknown, batchKey?: string): void;
  abstract logInfo(message: string, stackTrace: StackTrace, data?: unknown, enabled?: boolean, batchKey?: string): void;
  abstract logWarn(message: string, stackTrace: StackTrace, data?: unknown, enabled?: boolean, batchKey?: string): void;
  abstract logError(message: string, stackTrace: StackTrace, data?: unknown, enabled?: boolean, batchKey?: string): void;
  abstract logDebug(message: string, stackTrace: StackTrace, data?: unknown, enabled?: boolean, batchKey?: string): void;
  abstract logLog(message: string, stackTrace: StackTrace, data?: unknown, enabled?: boolean, batchKey?: string): void;
  abstract logImmediately(
    level: LogLevel,
    message: string,
    stackTrace: StackTrace,
    data?: unknown,
    requestContext?: RequestContext | null
  ): void;
  abstract flush(): Promise<void>;
  abstract flushLogQueue(): Promise<void>;
  protected abstract getExcludePath(): string | undefined;
  protected abstract getLogSource(registeredUser: RegistrationInfo | null, primaryFrame: StackFrame | null): LogSource;

  protected writeToConsole(payload: StructuredLogPayload): void {
    const level = payload.level as LogLevel;
    const consoleMethod =
      level === LogLevelConst.Error
        ? console.error
        : level === LogLevelConst.Warn
          ? console.warn
          : level === LogLevelConst.Info
            ? console.info
            : level === LogLevelConst.Debug
              ? console.debug
              : console.log;

    const timestamp =
      this.config.includeTimestamps && payload.timestamp
        ? `[${new Date(payload.timestamp).toISOString()}] `
        : '';

    const correlationPart = payload.correlationId ? ` [${payload.correlationId}]` : '';
    const testPart = payload.testName ? ` [${payload.testName}]` : '';
    const elapsedPart = payload.elapsed != null ? ` +${payload.elapsed}ms` : '';

    const fileName = payload.file || UNKNOWN_FILE;
    const prefix = payload.moduleSource
      ? `${timestamp}${correlationPart}${testPart}[${payload.moduleSource}@${fileName}:${payload.line ?? '?'}]${elapsedPart}`
      : `${timestamp}${correlationPart}${testPart}[${fileName}:${payload.line ?? '?'}]${elapsedPart}`;

    if (payload.data !== undefined) {
      consoleMethod(prefix, payload.message, payload.data);
    } else {
      consoleMethod(prefix, payload.message);
    }
  }

  protected async emitToBridge(entries: BridgeEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const endpoint = this.config.bridgeEndpoint ?? DEFAULT_BRIDGE_URL;
    if (!endpoint) return;
    await sendToBridge(entries, endpoint).catch(() => {});
  }

  protected abstract storeLogEntry(
    level: LogLevel,
    source: LogSource,
    context: string,
    message: string,
    data: unknown | undefined,
    stack?: string,
    stackFrames?: StackFrame[],
    primaryFrame?: StackFrame | null,
    requestContext?: unknown  // Generic to avoid circular deps, captures context at call site
  ): Promise<void>;
}
