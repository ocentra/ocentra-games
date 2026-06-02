import type { StackFrame } from '@ocentra/logging-domain/types/stackFrame';
import { UNKNOWN_CONTEXT } from '@ocentra/logging-domain/core/constants';

interface ParsedLocation {
  filePath: string;
  lineNum: string;
  colNum: string;
}

function isDigits(value: string): boolean {
  if (!value) return false;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

function parseLocation(value: string): ParsedLocation | null {
  const colSeparator = value.lastIndexOf(':');
  if (colSeparator <= 0) return null;

  const lineSeparator = value.lastIndexOf(':', colSeparator - 1);
  if (lineSeparator <= 0) return null;

  const filePath = value.slice(0, lineSeparator);
  const lineNum = value.slice(lineSeparator + 1, colSeparator);
  const colNum = value.slice(colSeparator + 1);

  if (!filePath || !isDigits(lineNum) || !isDigits(colNum)) return null;

  return { filePath, lineNum, colNum };
}

function getFileName(filePath: string): string {
  const slashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  if (slashIndex < 0) return filePath;
  return filePath.slice(slashIndex + 1) || filePath;
}

function buildFrame(raw: string, location: ParsedLocation, funcName?: string): StackFrame {
  const frame: StackFrame = {
    file: getFileName(location.filePath),
    filePath: location.filePath,
    line: parseInt(location.lineNum, 10),
    column: parseInt(location.colNum, 10),
    raw,
  };

  if (funcName) {
    frame.function = funcName;
  }

  return frame;
}

export function parseStackFrame(
  line: string,
  frameCache: Map<string, StackFrame>,
  cacheSizeLimit: number
): StackFrame | null {
  if (!line || !line.trim()) return null;

  const trimmed = line.trim();
  const cached = frameCache.get(trimmed);
  if (cached) {
    return cached;
  }

  let frame: StackFrame | null = null;

  if (trimmed.startsWith('at ')) {
    let chromeFrame = trimmed.slice(3);
    if (chromeFrame.startsWith('async ')) {
      chromeFrame = chromeFrame.slice(6);
    }

    if (chromeFrame.startsWith('eval (') && chromeFrame.endsWith(')')) {
      const location = parseLocation(chromeFrame.slice(6, -1));
      if (location) frame = buildFrame(trimmed, location);
    }

    const callSeparator = chromeFrame.lastIndexOf(' (');
    if (!frame && callSeparator > 0 && chromeFrame.endsWith(')')) {
      const funcName = chromeFrame.slice(0, callSeparator);
      const location = parseLocation(chromeFrame.slice(callSeparator + 2, -1));
      if (location) frame = buildFrame(trimmed, location, funcName);
    }

    if (!frame) {
      const location = parseLocation(chromeFrame);
      if (location) frame = buildFrame(trimmed, location);
    }
  } else {
    const atSeparator = trimmed.lastIndexOf('@');
    if (atSeparator > 0) {
      const funcName = trimmed.slice(0, atSeparator);
      const location = parseLocation(trimmed.slice(atSeparator + 1));
      if (location) frame = buildFrame(trimmed, location, funcName);
    }

    if (!frame) {
      const location = parseLocation(trimmed);
      if (location) frame = buildFrame(trimmed, location);
    }
  }

  if (frame) {
    if (frameCache.size >= cacheSizeLimit) {
      const firstKey = frameCache.keys().next().value;
      if (firstKey !== undefined) {
        frameCache.delete(firstKey);
      }
    }
    frameCache.set(trimmed, frame);
  }

  return frame;
}

export interface ParseStackTraceResult {
  frames: StackFrame[];
  primaryFrame: StackFrame | null;
  context: string;
}

export function parseStackTrace(
  stack: string | undefined,
  frameCache: Map<string, StackFrame>,
  cacheSizeLimit: number,
  excludePath?: string
): ParseStackTraceResult {
  const frames: StackFrame[] = [];
  let primaryFrame: StackFrame | null = null;

  if (!stack) {
    return { frames: [], primaryFrame: null, context: UNKNOWN_CONTEXT };
  }

  const lines = stack.split('\n');

  for (let i = 1; i < lines.length; i++) {
    const frame = parseStackFrame(lines[i], frameCache, cacheSizeLimit);
    if (frame) {
      frames.push(frame);
    }
  }

  const appFrames = excludePath
    ? frames.filter((frame) => {
        const filePath = frame.filePath || '';
        const normalized = filePath.replace(/\\/g, '/');
        return !normalized.includes(excludePath);
      })
    : frames;

  if (appFrames.length > 0) {
    primaryFrame = appFrames[0];
  } else if (frames.length > 0) {
    primaryFrame = frames[0];
  } else {
    primaryFrame = null;
  }

  const context = primaryFrame?.function || UNKNOWN_CONTEXT;

  return { frames, primaryFrame, context };
}
