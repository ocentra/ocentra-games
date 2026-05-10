#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, unlinkSync } = require('fs');
const { join } = require('path');

const appBuildInfoPath = join(process.cwd(), 'node_modules', '.tmp', 'tsconfig.app.tsbuildinfo');

if (existsSync(appBuildInfoPath)) {
  unlinkSync(appBuildInfoPath);
}

if (!process.env.SKIP_DOMAIN_BUILD) {
  execSync('npm run build:domains:exec', { stdio: 'inherit' });
}

execSync('npm run validate:game-assets', { stdio: 'inherit' });
