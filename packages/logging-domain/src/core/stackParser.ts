import type { StackFrame } from '@ocentra/logging-domain/types/stackFrame';
import { UNKNOWN_CONTEXT } from '@ocentra/logging-domain/core/constants';

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

  const withFunction = trimmed.match(
    /^at\s+(?:async\s+)?([\w.]+)\s+\((.+):(\d+):(\d+)\)$/
  );
  if (withFunction) {
    const [, funcName, filePath, lineNum, colNum] = withFunction;
    const fileName = filePath.split(/[/\\]/).pop() || filePath;

    frame = {
      function: funcName,
      file: fileName,
      filePath: filePath,
      line: parseInt(lineNum, 10),
      column: parseInt(colNum, 10),
      raw: trimmed,
    };
  } else {
    const withoutFunction = trimmed.match(/^at\s+(.+):(\d+):(\d+)$/);
    if (withoutFunction) {
      const [, filePath, lineNum, colNum] = withoutFunction;
      const fileName = filePath.split(/[/\\]/).pop() || filePath;

      frame = {
        file: fileName,
        filePath: filePath,
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        raw: trimmed,
      };
    } else {
      const evalMatch = trimmed.match(/^at eval \((.+):(\d+):(\d+)\)$/);
      if (evalMatch) {
        const [, filePath, lineNum, colNum] = evalMatch;
        const fileName = filePath.split(/[/\\]/).pop() || filePath;

        frame = {
          file: fileName,
          filePath: filePath,
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          raw: trimmed,
        };
      } else {
        const firefoxWithFunction = trimmed.match(
          /^([\w.$]+)@(.+):(\d+):(\d+)$/
        );
        if (firefoxWithFunction) {
          const [, funcName, filePath, lineNum, colNum] = firefoxWithFunction;
          const fileName = filePath.split(/[/\\]/).pop() || filePath;

          frame = {
            function: funcName,
            file: fileName,
            filePath: filePath,
            line: parseInt(lineNum, 10),
            column: parseInt(colNum, 10),
            raw: trimmed,
          };
        } else {
          const firefoxNoFunction = trimmed.match(/^(.+):(\d+):(\d+)$/);
          if (firefoxNoFunction) {
            const [, filePath, lineNum, colNum] = firefoxNoFunction;
            const fileName = filePath.split(/[/\\]/).pop() || filePath;

            frame = {
              file: fileName,
              filePath: filePath,
              line: parseInt(lineNum, 10),
              column: parseInt(colNum, 10),
              raw: trimmed,
            };
          }
        }
      }
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
