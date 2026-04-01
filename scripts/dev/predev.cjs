#!/usr/bin/env node
if (!process.env.SKIP_DOMAIN_BUILD) {
  require('child_process').execSync('npm run validate:main', { stdio: 'inherit' });
}
