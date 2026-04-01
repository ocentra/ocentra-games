#!/usr/bin/env node

const { spawnSync } = require('child_process');

const env = {
  ...process.env,
  SKIP_DOMAIN_BUILD: '1',
};

const turboBuild = spawnSync(
  'npx',
  ['turbo', 'run', 'build', '--filter=./packages/*', '--filter=!@ocentra/asset-editor'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  },
);

if ((turboBuild.status ?? 1) !== 0) {
  process.exit(turboBuild.status ?? 1);
}

const appBuild = spawnSync(
  'npm',
  ['run', 'build'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  },
);

process.exit(appBuild.status ?? 1);
