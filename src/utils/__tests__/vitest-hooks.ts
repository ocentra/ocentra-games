
import { beforeEach, afterEach } from 'vitest';
import type { TestContext } from 'vitest';
import { reportGenerator, type TestReportData } from './test-report-generator';


type VitestTask = TestContext['task'];


const testStartTimes = new Map<string, number>();

const testLogs = new Map<string, string[]>();

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

function attachConsoleCapture(key: string) {
  testLogs.set(key, []);
  const sink = testLogs.get(key)!;
  const toLine = (args: unknown[]): string => args.map((a) => {
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch { return String(a); }
  }).join(' ');
  
  console.log = (...args: unknown[]) => {
    sink.push(toLine(args));
    originalConsole.log.apply(console, args);
  };
  console.info = (...args: unknown[]) => {
    sink.push(toLine(args));
    originalConsole.info.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    sink.push(toLine(args));
    originalConsole.warn.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    sink.push(toLine(args));
    originalConsole.error.apply(console, args);
  };
  console.debug = (...args: unknown[]) => {
    sink.push(toLine(args));
    originalConsole.debug.apply(console, args);
  };
}

function detachConsoleCapture() {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
}

function getSuiteName(test: VitestTask | undefined): string {
  if (!test) return 'Unknown Suite';
  
  const filePath = test.file?.name || '';
  const suiteName = test.suite?.name || '';
  
  if (suiteName) {
    return `${filePath} > ${suiteName}`;
  }
  return filePath || 'Unknown Suite';
}

const taskKeyMap = new WeakMap<VitestTask, string>();

beforeEach((ctx: TestContext) => {
    const task = ctx.task;
    if (task) {
      const testName = task.name || task.id || 'unknown';
      const fileName = task.file?.name || 'unknown';
      const testKey = `${fileName}|${testName}`;

      taskKeyMap.set(task, testKey);
      testStartTimes.set(testKey, Date.now());
      attachConsoleCapture(testKey);
    } else {
      const fallbackKey = `test-${Date.now()}-${Math.random()}`;
      (ctx as TestContext & { __testKey?: string }).__testKey = fallbackKey;
      testStartTimes.set(fallbackKey, Date.now());
      attachConsoleCapture(fallbackKey);
    }
  });

  afterEach((ctx: TestContext) => {
    const task = ctx.task;
    if (!task) {
      const fallbackKey = (ctx as TestContext & { __testKey?: string }).__testKey;
      if (fallbackKey) {
        testStartTimes.delete(fallbackKey);
        testLogs.delete(fallbackKey);
      }
      detachConsoleCapture();
      return;
    }

    const testName = task.name || task.id || 'unknown';
    const fileName = task.file?.name || 'unknown';
    const testKey = taskKeyMap.get(task) || `${fileName}|${testName}`;

    const startTime = testStartTimes.get(testKey) || Date.now();
    const duration = Date.now() - startTime;
    testStartTimes.delete(testKey);
    const logs = testLogs.get(testKey) || [];
    testLogs.delete(testKey);
    detachConsoleCapture();

    let status: 'passed' | 'failed' | 'skipped' = 'skipped';
    if (task.result?.state === 'pass') {
      status = 'passed';
    } else if (task.result?.state === 'fail') {
      status = 'failed';
    } else if (task.mode === 'skip') {
      status = 'skipped';
    }

    const result: TestReportData = {
      suite: getSuiteName(task),
      test: testName,
      file: fileName,
      status,
      duration,
      logs,
      error: task.result?.errors && task.result.errors.length > 0 ? {
        message: task.result.errors[0]?.message || String(task.result.errors[0]),
        stack: task.result.errors[0]?.stack,
      } : undefined,
    };

    reportGenerator.addResult(result);
});
