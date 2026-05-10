import { spawnSync } from 'node:child_process';

const validationArgs = ['turbo', 'run', 'build', 'lint:exec', 'type-check', '--force'];

const runValidation = () => {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', `npx ${validationArgs.join(' ')}`], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  }

  return spawnSync('npx', validationArgs, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
};

const result = runValidation();

if (result.error) {
  console.error(`[validation] ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
