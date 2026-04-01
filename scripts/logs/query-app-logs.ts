#!/usr/bin/env node

import * as fs from 'fs';
import { AppLogDuckDb, getDefaultAppDbPath } from '@ocentra/logging-domain/app-log/appLogDuckDb';
import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';

const commands = ['recent', 'errors', 'stats', 'search'] as const;

function parseArgs(): {
  command: string;
  scope: 'main' | 'vite';
  limit: number;
  level?: string;
  source?: string;
  since?: string;
  format: 'table' | 'json';
  searchQuery?: string;
} {
  const argv = process.argv.slice(2);
  let command = 'recent';
  let scope: 'main' | 'vite' = 'main';
  let limit = 50;
  let level: string | undefined;
  let source: string | undefined;
  let since: string | undefined;
  let format: 'table' | 'json' = 'table';
  let searchQuery: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (commands.includes(arg as (typeof commands)[number])) {
      command = arg;
      if (command === 'search' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
        searchQuery = argv[i + 1];
        i++;
      }
    } else if (arg === '--scope' && argv[i + 1]) {
      scope = argv[i + 1] === 'vite' ? 'vite' : 'main';
      i++;
    } else if (arg === '--limit' && argv[i + 1]) {
      limit = Math.min(parseInt(argv[i + 1], 10) || 50, 1000);
      i++;
    } else if (arg === '--level' && argv[i + 1]) {
      level = argv[i + 1];
      i++;
    } else if (arg === '--source' && argv[i + 1]) {
      source = argv[i + 1];
      i++;
    } else if (arg === '--since' && argv[i + 1]) {
      since = argv[i + 1];
      i++;
    } else if (arg === '--format' && argv[i + 1]) {
      format = argv[i + 1] === 'json' ? 'json' : 'table';
      i++;
    }
  }

  return { command, scope, limit, level, source, since, format, searchQuery };
}

function formatEntryTable(entries: LogEntry[]): string {
  if (entries.length === 0) return 'No logs found.';
  const lines: string[] = [];
  for (const e of entries) {
    const ts = new Date(e.timestamp).toISOString();
    const msg = (e.message ?? '').substring(0, 80).replace(/\n/g, ' ');
    lines.push(`${ts} [${e.level}] ${e.source}: ${msg}`);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const { command, scope, limit, level, source, since, format, searchQuery } = parseArgs();

  const dbPath = getDefaultAppDbPath(scope);
  if (!fs.existsSync(dbPath)) {
    console.error(`DB not found: ${dbPath}`);
    console.error('Run "npm run dev" first to generate logs, or "npm run logs:db:rebuild" to rebuild from NDJSON.');
    process.exit(1);
  }

  const db = await AppLogDuckDb.create(dbPath);
  try {
    if (command === 'stats') {
      const stats = await db.getStats(source);
      if (format === 'json') {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log('Total logs:', stats.total_logs);
        console.log('By level:', JSON.stringify(stats.by_level, null, 2));
        console.log('By source (top 10):', JSON.stringify(Object.fromEntries(Object.entries(stats.by_source).slice(0, 10)), null, 2));
        if (stats.oldest_timestamp) console.log('Oldest:', new Date(stats.oldest_timestamp).toISOString());
        if (stats.newest_timestamp) console.log('Newest:', new Date(stats.newest_timestamp).toISOString());
      }
      return;
    }

    const query = {
      limit,
      ...(level && { level: level as LogEntry['level'] }),
      ...(source && { source }),
      ...(since && { since }),
    };

    let entries: LogEntry[];
    if (command === 'errors') {
      entries = await db.queryLogs({ ...query, level: 'error' });
    } else if (command === 'search' && searchQuery) {
      entries = await db.searchLogs(searchQuery, {
        limit,
        level: level as import('@ocentra/logging-domain/types/logEntry').LogEntry['level'] | undefined,
        since,
      });
    } else {
      entries = await db.queryLogs(query);
    }

    if (format === 'json') {
      console.log(JSON.stringify({ logs: entries }, null, 2));
    } else {
      console.log(formatEntryTable(entries));
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
