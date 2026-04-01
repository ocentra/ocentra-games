import { getViteLogStorage } from './logStorageFactory'
import { LogOrigin } from '@ocentra/logging-domain/types/logOrigin';
import { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { LogSource } from '@ocentra/logging-domain/types/logSource';
import type { StackFrame } from '@ocentra/logging-domain/types/stackFrame';
import { randomUUID } from 'crypto'

export type StackTrace = string & { readonly __brand: 'StackTrace' }

type RegistrationInfo = {
  className: string
  filePath?: string
  registeredAt: number
}

export interface LoggerConfig {
  consoleEnabled?: boolean
  minLogLevel?: LogLevel
  maxRegistrations?: number
  includeTimestamps?: boolean
}

const DEFAULT_CONFIG: Required<LoggerConfig> = {
  consoleEnabled: false,
  minLogLevel: LogLevel.Debug,
  maxRegistrations: 1000,
  includeTimestamps: false,
}

function getSourceFromFilePath(filePath: string | undefined): LogSource {
  if (!filePath) return 'Vite:Other'

  const normalizedPath = filePath.replace(/\\/g, '/')
  const lowerPath = normalizedPath.toLowerCase()

  const extractFileName = (path: string): string => {
    const fileName = path.split('/').pop() || path
    const withoutExt = fileName.replace(/\.(ts|js|mjs|timestamp-\d+-[a-f0-9]+)$/, '')
    return withoutExt
  }

  const extractMeaningfulName = (path: string): string | null => {
    const parts = path.split('/').filter(p => p && p !== '.' && p !== '..')
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]
      const cleanPart = part.replace(/\.(ts|js|mjs|timestamp-\d+-[a-f0-9]+)$/, '')
      if (cleanPart && 
          !cleanPart.includes('node_modules') && 
          !cleanPart.includes('vite-temp') &&
          cleanPart !== 'vite' &&
          cleanPart !== 'index') {
        return cleanPart
      }
    }
    return null
  }

  if (lowerPath.includes('/middleware/assets') ||
      lowerPath.includes('/middleware/resources') ||
      (lowerPath.includes('/utils/') && lowerPath.includes('asset'))) {
    return 'Vite:Assets'
  }

  if (lowerPath.includes('/middleware/') && lowerPath.includes('delete')) {
    return 'Vite:Delete'
  }

  if (lowerPath.includes('/middleware/') && lowerPath.includes('save')) {
    return 'Vite:Save'
  }

  if (lowerPath.includes('/utils/') && lowerPath.includes('r2')) {
    return 'Vite:R2'
  }

  if (lowerPath.includes('/middleware/sync')) {
    return 'Vite:Sync'
  }

  if (lowerPath.includes('/middleware/mcp')) {
    return 'Vite:MCP'
  }

  if (lowerPath.includes('/middleware/')) {
    const fileName = extractFileName(normalizedPath)
    if (fileName && fileName !== 'middleware' && !fileName.includes('index')) {
      const capitalized = fileName.split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('.')
      return `Vite:${capitalized}` as LogSource
    }
    return 'Vite:Middleware'
  }

  if (lowerPath.includes('/plugins/')) {
    const fileName = extractFileName(normalizedPath)
    if (fileName && fileName !== 'plugins' && !fileName.includes('index')) {
      const capitalized = fileName.split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('.')
      return `Vite:${capitalized}` as LogSource
    }
    return 'Vite:Plugins'
  }

  if (lowerPath.includes('/utils/')) {
    const fileName = extractFileName(normalizedPath)
    if (fileName && fileName !== 'utils' && !fileName.includes('viteLogger') && !fileName.includes('index')) {
      const capitalized = fileName.split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('.')
      return `Vite:${capitalized}` as LogSource
    }
    return 'Vite:Utils'
  }

  const meaningfulName = extractMeaningfulName(normalizedPath)
  if (meaningfulName) {
    const capitalized = meaningfulName.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('.')
    return `Vite:${capitalized}` as LogSource
  }

  const fileName = extractFileName(normalizedPath)
  if (fileName && !fileName.includes('node_modules') && !fileName.includes('vite-temp')) {
    const capitalized = fileName.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('.')
    return `Vite:${capitalized}` as LogSource
  }

  return 'Vite:Other'
}

export function getStackTrace(): StackTrace {
  return (new Error().stack || '') as StackTrace
}

export class ViteLogger {
  private static _instance: ViteLogger | null = null

  private config: Required<LoggerConfig>
  private registeredUsers: Map<string, RegistrationInfo> = new Map()
  private frameCache: Map<string, StackFrame> = new Map()
  private static readonly CACHE_SIZE_LIMIT = 500

  private constructor(config?: LoggerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  static get instance(): ViteLogger {
    if (!ViteLogger._instance) {
      ViteLogger._instance = new ViteLogger()
    }
    return ViteLogger._instance
  }

  static configure(config: LoggerConfig): ViteLogger {
    if (ViteLogger._instance) {
      ViteLogger._instance.updateConfig(config)
    } else {
      ViteLogger._instance = new ViteLogger(config)
    }
    return ViteLogger._instance
  }

  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): Readonly<Required<LoggerConfig>> {
    return { ...this.config }
  }

  register(context: object | string, filePathOrUrl?: string): void {
    if (this.registeredUsers.size >= this.config.maxRegistrations) {
      process.stderr.write('[ViteLogger] Maximum registrations reached. Skipping registration.\n');
      return;
    }

    let className: string
    if (typeof context === 'string') {
      className = context
    } else {
      className = context.constructor.name
    }

    let resolvedFilePath = filePathOrUrl
    if (resolvedFilePath && (resolvedFilePath.startsWith('file://') || resolvedFilePath.includes('://'))) {
      const url = new URL(resolvedFilePath)
      resolvedFilePath = url.pathname
    }

    const key = `${className}_${resolvedFilePath || 'unknown'}`

    if (!this.registeredUsers.has(key)) {
      this.registeredUsers.set(key, {
        className,
        filePath: resolvedFilePath,
        registeredAt: Date.now(),
      })
    }
  }

  unregister(context: object | string, filePathOrUrl?: string): void {
    let className: string
    if (typeof context === 'string') {
      className = context
    } else {
      className = context.constructor.name
    }

    let resolvedFilePath = filePathOrUrl
    if (resolvedFilePath && (resolvedFilePath.startsWith('file://') || resolvedFilePath.includes('://'))) {
      const url = new URL(resolvedFilePath)
      resolvedFilePath = url.pathname
    }

    const key = `${className}_${resolvedFilePath || 'unknown'}`
    this.registeredUsers.delete(key)
  }

  clearRegistrations(): void {
    this.registeredUsers.clear()
  }

  getRegisteredUsers(): RegistrationInfo[] {
    return Array.from(this.registeredUsers.values())
  }

  getRegisteredUserCount(): number {
    return this.registeredUsers.size
  }

  private findRegisteredUserByFilePath(filePath: string | undefined): RegistrationInfo | null {
    if (!filePath) return null

    const normalizedPath = filePath.replace(/\\/g, '/')
    
    for (const registration of this.registeredUsers.values()) {
      if (!registration.filePath) continue
      
      const normalizedRegistered = registration.filePath.replace(/\\/g, '/')
      
      if (normalizedPath === normalizedRegistered) {
        return registration
      }
      
      if (normalizedPath.endsWith(normalizedRegistered) || normalizedRegistered.endsWith(normalizedPath)) {
        return registration
      }
      
      const registeredFileName = normalizedRegistered.split('/').pop()
      const pathFileName = normalizedPath.split('/').pop()
      if (registeredFileName && pathFileName && registeredFileName === pathFileName) {
        return registration
      }
    }
    
    return null
  }

  private parseStackFrame(line: string): StackFrame | null {
    if (!line || !line.trim()) return null

    const trimmed = line.trim()

    const cached = this.frameCache.get(trimmed)
    if (cached) {
      return cached
    }

    let frame: StackFrame | null = null

    const extractOriginalFile = (transformedPath: string): { originalPath: string; originalFile: string } => {
      const viteTransformedMatch = transformedPath.match(/^(.+?)\.timestamp-\d+-[a-f0-9]+\.mjs$/)
      if (viteTransformedMatch) {
        const originalPath = viteTransformedMatch[1]
        const originalFile = originalPath.split(/[/\\]/).pop() || originalPath
        return { originalPath, originalFile }
      }
      const fileName = transformedPath.split(/[/\\]/).pop() || transformedPath
      return { originalPath: transformedPath, originalFile: fileName }
    }

    const withFunction = trimmed.match(
      /at\s+(?:async\s+)?([\w.]+)\s+\(([^)]+):(\d+):(\d+)\)/
    )
    if (withFunction) {
      const [, funcName, filePath, lineNum, colNum] = withFunction
      const { originalPath, originalFile } = extractOriginalFile(filePath)

      frame = {
        function: funcName,
        file: originalFile,
        filePath: originalPath,
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        raw: trimmed,
      }
    } else {
      const withoutFunction = trimmed.match(/at\s+([^:]+):(\d+):(\d+)/)
      if (withoutFunction) {
        const [, filePath, lineNum, colNum] = withoutFunction
        const { originalPath, originalFile } = extractOriginalFile(filePath)

        frame = {
          file: originalFile,
          filePath: originalPath,
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          raw: trimmed,
        }
      } else {
        const evalMatch = trimmed.match(/at eval \(([^)]+):(\d+):(\d+)\)/)
        if (evalMatch) {
          const [, filePath, lineNum, colNum] = evalMatch
          const { originalPath, originalFile } = extractOriginalFile(filePath)

          frame = {
            file: originalFile,
            filePath: originalPath,
            line: parseInt(lineNum, 10),
            column: parseInt(colNum, 10),
            raw: trimmed,
          }
        }
      }
    }

    if (frame) {
      if (this.frameCache.size >= ViteLogger.CACHE_SIZE_LIMIT) {
        const firstKey = this.frameCache.keys().next().value
        if (firstKey !== undefined) {
          this.frameCache.delete(firstKey)
        }
      }
      this.frameCache.set(trimmed, frame)
    }

    return frame
  }

  clearFrameCache(): void {
    this.frameCache.clear()
  }

  private parseStackTrace(stack: string | undefined): {
    frames: StackFrame[]
    primaryFrame: StackFrame | null
    context: string
  } {
    const frames: StackFrame[] = []
    let primaryFrame: StackFrame | null = null

    if (!stack) {
      return { frames: [], primaryFrame: null, context: 'Unknown' }
    }

    const lines = stack.split('\n')
    
    for (let i = 1; i < lines.length; i++) {
      const frame = this.parseStackFrame(lines[i])
      if (frame) {
        frames.push(frame)
      }
    }

    const appFrames = frames.filter((frame) => {
      const filePath = frame.filePath || ''
      const normalized = filePath.replace(/\\/g, '/')
      return !normalized.includes('/utils/viteLogger') && 
             !normalized.includes('/node_modules/.vite-temp/')
    })

    if (appFrames.length > 0) {
      primaryFrame = appFrames[0]
    } else if (frames.length > 0) {
      primaryFrame = frames[0]
    } else {
      primaryFrame = null
    }

    const context = primaryFrame?.function || 'Unknown'

    return { frames, primaryFrame, context }
  }

  private formatMessage(message: string, data?: unknown): string {
    if (data !== undefined) {
      if (typeof data === 'object' && data !== null) {
        try {
          return `${message} ${JSON.stringify(data, null, 2)}`
        } catch {
          return `${message} ${String(data)}`
        }
      }
      return `${message} ${String(data)}`
    }
    return message
  }

  private storeLogEntry(
    level: LogLevel,
    source: LogSource,
    context: string,
    message: string,
    data: unknown | undefined,
    stack?: string,
    stackFrames?: StackFrame[],
    primaryFrame?: StackFrame | null
  ): void {
    try {
      const storage = getViteLogStorage()
      storage.storeLog({
        id: randomUUID(),
        level,
        source,
        origin: LogOrigin.Vite,
        message,
        context,
        timestamp: Date.now(),
        args: data !== undefined ? [data] : undefined,
        stack,
        stackFrames: stackFrames && stackFrames.length > 0 ? stackFrames : undefined,
        file: primaryFrame?.file,
        filePath: primaryFrame?.filePath,
        line: primaryFrame?.line,
        column: primaryFrame?.column,
      })
    } catch {
      // Ignore storage errors
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.Debug, LogLevel.Log, LogLevel.Info, LogLevel.Warn, LogLevel.Error]
    const currentLevelIndex = levels.indexOf(this.config.minLogLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  log(level: LogLevel, message: string, stackTrace: StackTrace, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return
    }

    if (!stackTrace) {
      process.stderr.write('[ViteLogger] stackTrace is required\n');
      return;
    }

    const { frames, primaryFrame, context: parsedContext } = this.parseStackTrace(stackTrace)

    let registeredUser: RegistrationInfo | null = null
    for (const frame of frames) {
      registeredUser = this.findRegisteredUserByFilePath(frame.filePath)
      if (registeredUser) {
        break
      }
    }
    if (!registeredUser && primaryFrame) {
      registeredUser = this.findRegisteredUserByFilePath(primaryFrame.filePath)
    }

    const context = registeredUser
      ? `${registeredUser.className}.${parsedContext}`
      : parsedContext

    const logSource: LogSource = registeredUser
      ? `Vite:${registeredUser.className}`
      : getSourceFromFilePath(primaryFrame?.filePath)
    const formattedMessage = this.formatMessage(message, data)
    const fileName = primaryFrame?.file || 'Unknown'

    if (this.config.consoleEnabled) {
      const timestamp = this.config.includeTimestamps
        ? `[${new Date().toISOString()}] `
        : '';
      const prefix = registeredUser
        ? `${timestamp}[${registeredUser.className}@${fileName}:${primaryFrame?.line || '?'}]`
        : `${timestamp}[${fileName}:${primaryFrame?.line || '?'}]`;
      const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
      const line = `${prefix} ${message}${dataStr}\n`;
      const out = level === LogLevel.Error || level === LogLevel.Warn
        ? process.stderr
        : process.stdout;
      out.write(line);
    }

    this.storeLogEntry(
      level,
      logSource,
      context,
      formattedMessage,
      data,
      stackTrace,
      frames,
      primaryFrame
    )
  }

  logInfo(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true): void {
    if (!enabled) return
    this.log(LogLevel.Info, message, stackTrace, data)
  }

  logWarn(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true): void {
    if (!enabled) return
    this.log(LogLevel.Warn, message, stackTrace, data)
  }

  logError(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true): void {
    if (!enabled) return
    this.log(LogLevel.Error, message, stackTrace, data)
  }

  logDebug(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true): void {
    if (!enabled) return
    this.log(LogLevel.Debug, message, stackTrace, data)
  }

  logLog(message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true): void {
    if (!enabled) return
    this.log(LogLevel.Log, message, stackTrace, data)
  }

  async flush(): Promise<void> {
    // No-op for Vite logger, but kept for API compatibility
  }

  getStats(): {
    registeredUsersCount: number
    frameCacheSize: number
    config: Readonly<Required<LoggerConfig>>
  } {
    return {
      registeredUsersCount: this.registeredUsers.size,
      frameCacheSize: this.frameCache.size,
      config: this.getConfig(),
    }
  }

  static reset(): void {
    if (ViteLogger._instance) {
      ViteLogger._instance.clearRegistrations()
      ViteLogger._instance.clearFrameCache()
      ViteLogger._instance = null
    }
  }
}
