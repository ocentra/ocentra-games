#!/usr/bin/env node
process.env.SKIP_DOMAIN_BUILD = '1';
process.env.VITE_SKIP_ASSET_SCAN = '1';
process.env.VITE_SKIP_ASSET_VALIDATION = '1';
require('child_process').execSync('npm run dev', { stdio: 'inherit', env: process.env });
