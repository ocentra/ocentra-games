const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '..', '..', '..');
execSync('npm run build:main', { cwd: root, stdio: 'inherit' });
