#!/usr/bin/env node

const { spawnSync } = require('child_process');

const filter = process.argv[2];

if (!filter) {
  process.stderr.write('Missing Turbo filter.\n');
  process.exit(1);
}

const result = spawnSync(
  'npx',
  ['turbo', 'run', 'build', `--filter=${filter}`],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      SKIP_DOMAIN_BUILD: '1',
    },
  },
);

process.exit(result.status ?? 1);
