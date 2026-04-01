import { execSync, spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const darkThemeScript = join(__dirname, 'apply-dark-theme-coverage.ts');

const coverageDir = join(process.cwd(), 'test-runner', 'coverage');
const coverageHtml = join(coverageDir, 'index.html');

function openCoverageReport(): boolean {
  if (!existsSync(coverageHtml)) {
    return false;
  }

  console.log('\n✅ Coverage report generated!');
  console.log(`📊 Opening coverage report: ${coverageHtml}\n`);
  
  const osPlatform = platform();
  let command: string;
  
  if (osPlatform === 'win32') {
    command = `start "" "${coverageHtml}"`;
  } else if (osPlatform === 'darwin') {
    command = `open "${coverageHtml}"`;
  } else {
    command = `xdg-open "${coverageHtml}"`;
  }
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('🌐 Coverage report opened in browser\n');
    return true;
  } catch {
    console.error('⚠️  Could not open browser automatically');
    const fileUrl = `file:///${coverageHtml.replace(/\\/g, '/')}`;
    console.error(`   Please open: ${fileUrl}`);
    return false;
  }
}

console.log('Running tests with coverage...\n');

const vitestProcess: ChildProcess = spawn('npx', ['vitest', 'run', '--coverage'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

vitestProcess.on('close', (code: number | null) => {
  setTimeout(() => {
    if (existsSync(coverageHtml)) {
      try {
        execSync(`npx tsx "${darkThemeScript}"`, { stdio: 'inherit', cwd: process.cwd() });
      } catch {
        console.warn('⚠️  Could not apply dark theme (continuing anyway)');
      }
      openCoverageReport();
    } else {
      console.error('\n❌ Coverage report not found!');
      console.error(`   Expected: ${coverageHtml}`);
      console.error('\n   Coverage data was collected (found .tmp files), but final reports were not generated.');
      console.error('   This usually happens when tests fail and vitest exits before processing coverage.');
      console.error('\n   To view coverage even with test failures, you may need to:');
      console.error('   - Fix failing tests, or');
      console.error('   - Run with a single test file to verify coverage generation works');
      process.exit(code || 1);
    }
  }, 1000);
});

vitestProcess.on('error', (error: Error) => {
  console.error('Failed to start vitest:', error);
  process.exit(1);
});
