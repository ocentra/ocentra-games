import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Args = {
  env: string;
  config?: string;
};

function parseArgs(argv: string[]): Args {
  const envIdx = argv.indexOf('--env');
  const configIdx = argv.indexOf('--config');
  const env = envIdx >= 0 ? argv[envIdx + 1] : '';
  const config = configIdx >= 0 ? argv[configIdx + 1] : undefined;
  if (!env) throw new Error('Missing required --env');
  return { env, config };
}

function readRootVersion(): string {
  const rootPkgPath = path.resolve(process.cwd(), '..', '..', 'package.json');
  const raw = readFileSync(rootPkgPath, 'utf-8');
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version ?? '0.1.0';
}

function run(): void {
  const args = parseArgs(process.argv.slice(2));
  const version = readRootVersion();
  const wranglerArgs = ['deploy', '--env', args.env, '--var', `APP_VERSION:${version}`];
  if (args.config) {
    wranglerArgs.splice(1, 0, '--config', args.config);
  }
  const result = spawnSync('wrangler', wranglerArgs, { stdio: 'inherit', shell: true });
  if (typeof result.status === 'number' && result.status !== 0) process.exit(result.status);
  if (result.error) throw result.error;
}

run();

