import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import wranglerToml from '../../../wrangler.toml?raw';

type MigrationEntry = {
  tag: string;
  classes: string[];
  rawBlock: string;
};

function parseArrayOfQuotedValues(line: string): string[] {
  const values: string[] = [];
  const regex = /"([^"]+)"/g;
  let match: RegExpExecArray | null = regex.exec(line);
  while (match !== null) {
    values.push(match[1]);
    match = regex.exec(line);
  }
  return values;
}

function parseMigrationEntriesForEnv(toml: string, env: 'development' | 'production'): MigrationEntry[] {
  const blockPattern = new RegExp(
    `\\[\\[env\\.${env}\\.migrations\\]\\]([\\s\\S]*?)(?=\\n\\[\\[env\\.${env}\\.migrations\\]\\]|\\n\\[env\\.|\\n\\[\\[env\\.|$)`,
    'g'
  );
  const entries: MigrationEntry[] = [];
  let blockMatch: RegExpExecArray | null = blockPattern.exec(toml);
  while (blockMatch !== null) {
    const block = blockMatch[1];
    const tagMatch = /tag\s*=\s*"([^"]+)"/.exec(block);
    const newClassesMatch = /new_classes\s*=\s*\[[^\]]*\]/.exec(block);
    const newSqliteClassesMatch = /new_sqlite_classes\s*=\s*\[[^\]]*\]/.exec(block);
    const classes = [
      ...(newClassesMatch ? parseArrayOfQuotedValues(newClassesMatch[0]) : []),
      ...(newSqliteClassesMatch ? parseArrayOfQuotedValues(newSqliteClassesMatch[0]) : []),
    ];
    if (tagMatch) {
      entries.push({ tag: tagMatch[1], classes, rawBlock: block });
    }
    blockMatch = blockPattern.exec(toml);
  }
  return entries;
}

function parseDoBindingClassesForEnv(toml: string, env: 'development' | 'production'): string[] {
  const blockPattern = new RegExp(
    `\\[\\[env\\.${env}\\.durable_objects\\.bindings\\]\\]([\\s\\S]*?)(?=\\n\\[\\[env\\.${env}\\.durable_objects\\.bindings\\]\\]|\\n\\[env\\.|\\n\\[\\[env\\.|$)`,
    'g'
  );
  const classes: string[] = [];
  let blockMatch: RegExpExecArray | null = blockPattern.exec(toml);
  while (blockMatch !== null) {
    const classNameMatch = /class_name\s*=\s*"([^"]+)"/.exec(blockMatch[1]);
    if (classNameMatch) {
      classes.push(classNameMatch[1]);
    }
    blockMatch = blockPattern.exec(toml);
  }
  return classes;
}

function readWranglerToml(): string {
  return wranglerToml;
}

function parseNumericTag(tag: string): number | null {
  const match = /^v(\d+)$/.exec(tag.trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('wrangler migrations: development and production define aligned migration tags'), () => {
    const wranglerToml = readWranglerToml();
    const devMigrations = parseMigrationEntriesForEnv(wranglerToml, 'development');
    const prodMigrations = parseMigrationEntriesForEnv(wranglerToml, 'production');

    expect(devMigrations.length).toBeGreaterThan(0);
    expect(prodMigrations.length).toBeGreaterThan(0);
    expect(devMigrations.map((m) => m.tag)).toEqual(prodMigrations.map((m) => m.tag));
  });

  it(testName('wrangler migrations: every migration entry introduces at least one durable-object class'), () => {
    const wranglerToml = readWranglerToml();
    const devMigrations = parseMigrationEntriesForEnv(wranglerToml, 'development');
    const prodMigrations = parseMigrationEntriesForEnv(wranglerToml, 'production');

    for (const migration of [...devMigrations, ...prodMigrations]) {
      expect(migration.classes.length).toBeGreaterThan(0);
    }
  });

  it(testName('wrangler migrations: migration class sets cover all configured durable-object bindings'), () => {
    const wranglerToml = readWranglerToml();
    const devMigrations = parseMigrationEntriesForEnv(wranglerToml, 'development');
    const prodMigrations = parseMigrationEntriesForEnv(wranglerToml, 'production');
    const devDoClasses = parseDoBindingClassesForEnv(wranglerToml, 'development');
    const prodDoClasses = parseDoBindingClassesForEnv(wranglerToml, 'production');

    const devMigrationClasses = new Set(devMigrations.flatMap((m) => m.classes));
    const prodMigrationClasses = new Set(prodMigrations.flatMap((m) => m.classes));

    expect(devDoClasses.length).toBeGreaterThan(0);
    expect(prodDoClasses.length).toBeGreaterThan(0);
    expect(new Set(devDoClasses)).toEqual(new Set(prodDoClasses));

    for (const className of devDoClasses) {
      expect(devMigrationClasses.has(className)).toBe(true);
    }
    for (const className of prodDoClasses) {
      expect(prodMigrationClasses.has(className)).toBe(true);
    }
  });

  it(testName('wrangler migrations: rollback safety forbids destructive migration directives'), () => {
    const wranglerToml = readWranglerToml();
    const devMigrations = parseMigrationEntriesForEnv(wranglerToml, 'development');
    const prodMigrations = parseMigrationEntriesForEnv(wranglerToml, 'production');
    const forbiddenPatterns = [
      /\bdeleted_classes\b/,
      /\bdeleted_sqlite_classes\b/,
      /\brenamed_classes\b/,
      /\btransferred_classes\b/,
    ];

    for (const migration of [...devMigrations, ...prodMigrations]) {
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(migration.rawBlock)).toBe(false);
      }
    }
  });

  it(testName('wrangler migrations: tags are strictly increasing and cumulative per environment'), () => {
    const wranglerToml = readWranglerToml();
    const validateMonotonicTags = (entries: MigrationEntry[]): void => {
      const numericTags = entries.map((entry) => parseNumericTag(entry.tag));
      for (const numericTag of numericTags) {
        expect(numericTag).not.toBeNull();
      }
      for (let i = 1; i < numericTags.length; i++) {
        expect((numericTags[i] as number) > (numericTags[i - 1] as number)).toBe(true);
      }
    };

    const validateCumulativeClasses = (entries: MigrationEntry[]): void => {
      const seenClasses = new Set<string>();
      let classesIntroduced = 0;
      for (const entry of entries) {
        for (const className of entry.classes) {
          expect(seenClasses.has(className)).toBe(false);
          seenClasses.add(className);
          classesIntroduced += 1;
        }
      }
      expect(classesIntroduced).toBeGreaterThan(0);
    };

    const devMigrations = parseMigrationEntriesForEnv(wranglerToml, 'development');
    const prodMigrations = parseMigrationEntriesForEnv(wranglerToml, 'production');

    validateMonotonicTags(devMigrations);
    validateMonotonicTags(prodMigrations);
    validateCumulativeClasses(devMigrations);
    validateCumulativeClasses(prodMigrations);
  });
});
