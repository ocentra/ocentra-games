// Helper to get Node modules safely in Vite/Browser environments
function getNodeModule<T>(name: string): T | null {
  if (typeof process === 'undefined' || !process.versions?.node) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(name);
  } catch {
    return null;
  }
}

export type DuckDbConnection = {
  run: (sql: string, ...args: unknown[]) => unknown;
  exec: (sql: string, cb?: (err: Error | null) => void) => void;
  close: (cb?: (err: Error | null) => void) => void;
};

export type DuckDbDatabase = {
  connect: () => DuckDbConnection;
  close: (cb?: (err: Error | null) => void) => void;
  all?: (sql: string, ...args: unknown[]) => void;
};

export function loadDuckDb(): {
  Database: new (path: string, cb?: (err: Error | null) => void) => DuckDbDatabase;
} {
  const module = getNodeModule<typeof import('module')>('module');
  if (!module) {
    throw new Error('DuckDB helpers require Node.js environment.');
  }
  
  try {
    const req = module.createRequire(import.meta.url);
    return req('duckdb') as {
      Database: new (path: string, cb?: (err: Error | null) => void) => DuckDbDatabase;
    };
  } catch {
    throw new Error(
      'DuckDB helpers require duckdb. Install it: npm install duckdb (optional dependency in @ocentra/logging-domain).'
    );
  }
}

export function runAsync(conn: DuckDbConnection, sql: string, ...params: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    (conn.run as (sql: string, ...args: unknown[]) => unknown)(sql, ...params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function closeConnAsync(conn: DuckDbConnection): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.close((err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function closeDbAsync(db: DuckDbDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function allAsync(
  db: DuckDbDatabase,
  sql: string,
  ...params: unknown[]
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    if (typeof db.all !== 'function') {
      reject(new Error('DuckDB Database.all not available'));
      return;
    }
    (db.all as (sql: string, ...args: unknown[]) => void)(
      sql,
      ...params,
      (err: Error | null, rows: Record<string, unknown>[] | undefined) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
}
