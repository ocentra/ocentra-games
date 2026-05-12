import { spawnSync } from 'node:child_process';

const runCommand = (command, args) => {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', `${command} ${args.join(' ')}`], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  }

  return spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
};

const validations = [
  ['npx', ['turbo', 'run', 'build', 'lint:exec', 'type-check', '--force']],
  ['npm', ['run', 'validate:pages:local']],
];

for (const [command, args] of validations) {
  const result = runCommand(command, args);

  if (result.error) {
    console.error(`[validation] ${result.error.message}`);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.exit(0);
