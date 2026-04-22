import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TauriTransport } from './tauriTransport';
import { AnalyticsTransport } from './analyticsTransport';
import { type BridgeEntry } from './bridgeLogPayload';
import { LogLevel } from '../types/logLevel';
import { deleteAppNdjsonFiles, listAppNdjsonFiles } from '../app-log/appNdjsonWriter';

describe('Log Transports and Retention', () => {
  const tempDir = path.join(os.tmpdir(), `ocentra-log-test-${Date.now()}`);
  const scope = 'test-scope';

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('TauriTransport', () => {
    it('should invoke the tauri command with entries', async () => {
      const invoke = vi.fn().mockResolvedValue({ ok: true });
      const transport = new TauriTransport(invoke, 'plugin:log|test_cmd');
      const entries = [{ log: { level: 'info', message: 'test' } } as unknown as BridgeEntry];

      await transport.emit(entries);

      expect(invoke).toHaveBeenCalledWith('plugin:log|test_cmd', { entries });
    });

    it('should handle invoke errors gracefully', async () => {
      const invoke = vi.fn().mockRejectedValue(new Error('Fail'));
      const transport = new TauriTransport(invoke);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      await transport.emit([{ log: { message: 'test' } } as unknown as BridgeEntry]);

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('AnalyticsTransport', () => {
    it('should only send logs above minLevel', async () => {
      const transport = new AnalyticsTransport({ minLevel: LogLevel.Warn });
      const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      const entries = [
        { log: { level: 'info', message: 'info-msg' } },
        { log: { level: 'warn', message: 'warn-msg' } },
        { log: { level: 'error', message: 'error-msg' } },
      ] as unknown as BridgeEntry[];

      await transport.emit(entries);

      // Should only count warn and error
      expect(consoleDebug).toHaveBeenCalledWith(expect.stringContaining('Would send 2 entries'));
      consoleDebug.mockRestore();
    });
  });

  describe('NDJSON Retention Policy', () => {
    it('should keep specified number of files', () => {
      const dbDir = tempDir;
      
      // Create some dummy files
      // Create some dummy content
      
      // We need to simulate different days or different filenames
      // appendLogEntries uses getCurrentNdjsonPath which uses current date
      // So let's mock path for a moment or just create files manually
      
      const ndjsonDir = path.join(dbDir, 'ndjson', scope);
      if (!fs.existsSync(ndjsonDir)) fs.mkdirSync(ndjsonDir, { recursive: true });
      
      for (let i = 1; i <= 5; i++) {
        fs.writeFileSync(path.join(ndjsonDir, `app-logs-2026-04-0${i}.ndjson`), 'test');
      }

      expect(listAppNdjsonFiles(scope, dbDir).length).toBe(5);

      // Keep 2 files
      deleteAppNdjsonFiles(scope, 2, dbDir);

      const remaining = listAppNdjsonFiles(scope, dbDir);
      expect(remaining.length).toBe(2);
      expect(remaining[0]).toContain('2026-04-04');
      expect(remaining[1]).toContain('2026-04-05');
    });

    it('should delete all files if keepCount is 0', () => {
      const dbDir = tempDir;
      const ndjsonDir = path.join(dbDir, 'ndjson', scope);
      if (!fs.existsSync(ndjsonDir)) fs.mkdirSync(ndjsonDir, { recursive: true });
      
      fs.writeFileSync(path.join(ndjsonDir, `app-logs-2026-04-01.ndjson`), 'test');
      
      deleteAppNdjsonFiles(scope, 0, dbDir);
      expect(listAppNdjsonFiles(scope, dbDir).length).toBe(0);
    });
  });
});
