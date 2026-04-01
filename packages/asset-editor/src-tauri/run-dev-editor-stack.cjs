const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '..', '..', '..');
execSync('npm run dev:editor:stack', { cwd: root, stdio: 'inherit' });
