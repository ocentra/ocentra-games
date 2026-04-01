#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as http from 'http';
import * as readline from 'readline';
import * as crypto from 'crypto';
import { getUnstableIncludeFiles } from './lib/suite-type-map.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptDir = __dirname;
const parentDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(parentDir);
const testRunnerDir = parentDir;
const testsDir = path.join(cloudflareDir, 'tests');
const testRunnerScriptsDir = path.join(testRunnerDir, 'script');

if (!fs.existsSync(testRunnerDir)) {
    fs.mkdirSync(testRunnerDir, { recursive: true });
}
const testRunnerReportJsonDir = path.join(testRunnerDir, 'ReportJson');
const testRunnerReportsDir = path.join(testRunnerDir, 'reports');
const testRunnerLogsDir = path.join(testRunnerDir, 'logs');
const testRunnerDatabasesDir = path.join(testRunnerDir, 'databases');
const testRunnerCoverageDir = path.join(testRunnerDir, 'coverage');
if (!fs.existsSync(testRunnerReportJsonDir)) fs.mkdirSync(testRunnerReportJsonDir, { recursive: true });
if (!fs.existsSync(testRunnerReportsDir)) fs.mkdirSync(testRunnerReportsDir, { recursive: true });
if (!fs.existsSync(testRunnerLogsDir)) fs.mkdirSync(testRunnerLogsDir, { recursive: true });
if (!fs.existsSync(testRunnerDatabasesDir)) fs.mkdirSync(testRunnerDatabasesDir, { recursive: true });
if (!fs.existsSync(testRunnerCoverageDir)) fs.mkdirSync(testRunnerCoverageDir, { recursive: true });
if (!fs.existsSync(testRunnerScriptsDir)) fs.mkdirSync(testRunnerScriptsDir, { recursive: true });

const args = process.argv.slice(2);
const mode = args[0] || 'local';

if (!['local', 'real', 'cloud'].includes(mode)) {
    console.error(`Invalid mode: ${mode}`);
    console.log('Usage: npx tsx run-all-tests.ts [local|real|cloud] [--skip-tests=vitest,coverage,...] [--yes]');
    console.log('  --skip-tests: Comma-separated list of tests to skip (vitest,coverage,analytics,schemathesis,k6,mutation,static-analysis,observability)');
    console.log('  --yes: Skip all prompts and run all tests');
    process.exit(1);
}

interface TestOptions {
    runVitest: boolean;
    runCoverage: boolean;
    runSchemathesis: boolean;
    runK6: boolean;
    runMutation: boolean;
    runStaticAnalysis: boolean;
    runObservability: boolean;
}

interface SecurityTestResults {
    schemathesis: boolean;
    k6: boolean;
    mutation: boolean;
    mutationAttempted: boolean;
    observability: boolean;
    observabilityAttempted: boolean;
    staticAnalysis: {
        semgrep: boolean;
        codeql: boolean;
        trivy: boolean;
    };
}

interface RunCommandOptions {
    cwd?: string;
    env?: Record<string, string>;
    onProgress?: (text: string) => void;
    timeout?: number;
    toolLogStream?: fs.WriteStream;
}

const isRealMode = mode === 'real' || mode === 'cloud';
const testMode = isRealMode ? 'REAL CLOUDFLARE WORKER' : 'LOCAL TEST WORKER';

process.env.TEST_MODE = isRealMode ? 'real' : 'local';
if (isRealMode) {
    const workerUrl = process.env.WORKER_URL;
    if (!workerUrl || workerUrl.trim().length === 0) {
        console.error('WORKER_URL must be set when running in real or cloud mode');
        process.exit(1);
    }
} else {
    delete process.env.WORKER_URL;
}

const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
};

const mainLogPath = path.join(testRunnerLogsDir, 'main.log');
const mainLogStream = fs.createWriteStream(mainLogPath, { flags: 'w' });

const codeqlLogPath = path.join(testRunnerLogsDir, 'codeql.log');
const codeqlLogStream = fs.createWriteStream(codeqlLogPath, { flags: 'w' });

const semgrepLogPath = path.join(testRunnerLogsDir, 'semgrep.log');
const semgrepLogStream = fs.createWriteStream(semgrepLogPath, { flags: 'w' });

const k6LogPath = path.join(testRunnerLogsDir, 'k6.log');
const k6LogStream = fs.createWriteStream(k6LogPath, { flags: 'w' });

const schemathesisLogPath = path.join(testRunnerLogsDir, 'schemathesis.log');
const schemathesisLogStream = fs.createWriteStream(schemathesisLogPath, { flags: 'w' });

const trivyLogPath = path.join(testRunnerLogsDir, 'trivy.log');
const trivyLogStream = fs.createWriteStream(trivyLogPath, { flags: 'w' });

const mutationLogPath = path.join(testRunnerLogsDir, 'mutation.log');
const mutationLogStream = fs.createWriteStream(mutationLogPath, { flags: 'w' });

const vitestLogPath = path.join(testRunnerLogsDir, 'vitest-full.log');
const vitestLogStream = fs.createWriteStream(vitestLogPath, { flags: 'w' });


function log(message: string, color?: keyof typeof colors) {
    const ansiEscape = '\u001b';
    const plainMessage = message.replace(new RegExp(`${ansiEscape}\\[[0-9;]*m`, 'g'), '');
    mainLogStream.write(`${plainMessage}\n`);
    
    if (color && colors[color]) {
        console.log(`${colors[color]}${message}${colors.reset}`);
    } else {
        console.log(message);
    }
}

function parseSkipTests(skipArg: string | undefined): TestOptions {
    const skipList = skipArg?.split(',').map(s => s.trim()) || [];
    return {
        runVitest: !skipList.includes('vitest'),
        runCoverage: !skipList.includes('coverage'),
        runSchemathesis: !skipList.includes('schemathesis'),
        runK6: !skipList.includes('k6'),
        runMutation: !skipList.includes('mutation'),
        runStaticAnalysis: !skipList.includes('static-analysis'),
        runObservability: !skipList.includes('observability'),
    };
}

function createReadlineInterface(): readline.Interface {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });
}

function question(rl: readline.Interface, query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
}

function displayTestMenu(options: TestOptions, lastMessage?: string): void {
    if (process.stdout.isTTY && !lastMessage) {
        process.stdout.write('\x1b[2J\x1b[0f');
    } else {
        console.log('\n'.repeat(2));
    }
    console.log('');
    log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║         Cloudflare Worker Test Suite - Test Selection          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
    console.log('');
    if (lastMessage) {
        if (lastMessage.includes('✓')) {
            log(`  ${lastMessage}`, 'green');
        } else {
            log(`  ${lastMessage}`, 'yellow');
        }
        console.log('');
    }
    log('Type a number (1-8) to toggle, or A/N to select all/none, then press ENTER:', 'yellow');
    if (lastMessage && lastMessage.includes('selected')) {
        log('  → Press ENTER again to proceed with your selection', 'cyan');
    }
    console.log('');
    
    const tests = [
        { key: '1', name: 'Vitest Tests', desc: 'Unit + Integration + E2E + Security', value: 'runVitest' },
        { key: '2', name: 'Coverage Analysis', desc: 'Code coverage report (90% line, 80% branch)', value: 'runCoverage' },
        { key: '3', name: 'Schemathesis', desc: 'API fuzzing (requires pip install schemathesis)', value: 'runSchemathesis' },
        { key: '4', name: 'k6 Load Tests', desc: 'Concurrency/load testing (requires k6)', value: 'runK6' },
        { key: '5', name: 'Mutation Tests', desc: 'Stryker mutation testing (slow ~5-10min)', value: 'runMutation' },
        { key: '6', name: 'Static Analysis', desc: 'Semgrep, CodeQL, Trivy', value: 'runStaticAnalysis' },
        { key: '7', name: 'Observability', desc: 'Observability hooks verification', value: 'runObservability' },
    ];
    
    tests.forEach(test => {
        const isEnabled = options[test.value as keyof TestOptions] as boolean;
        const status = isEnabled ? '✅ ENABLED' : '❌ DISABLED';
        const statusColor = isEnabled ? 'green' : 'gray';
        log(`  [${test.key}] ${status.padEnd(12)} ${test.name.padEnd(25)} ${test.desc}`, statusColor);
    });
    
    console.log('');
    log('  [A] Select All', 'cyan');
    log('  [N] Select None', 'cyan');
    log('  [ENTER] Proceed with selection', 'green');
    log('  [Q] Quit', 'red');
    console.log('');
}

async function promptForTests(skipAll: boolean): Promise<TestOptions> {
    const skipTestsArg = args.find(arg => arg.startsWith('--skip-tests='));
    if (skipTestsArg) {
        const skipList = skipTestsArg.replace('--skip-tests=', '');
        log(`  Using --skip-tests: ${skipList}`, 'gray');
        return parseSkipTests(skipList);
    }

    if (skipAll) {
        log('  Running all tests (--yes flag set)', 'green');
        return {
            runVitest: true,
            runCoverage: true,
            runSchemathesis: true,
            runK6: true,
            runMutation: true,
            runStaticAnalysis: true,
            runObservability: true,
        };
    }

    const rl = createReadlineInterface();
    const options: TestOptions = {
        runVitest: true,
        runCoverage: true,
        runSchemathesis: true,
        runK6: true,
        runMutation: true,
        runStaticAnalysis: true,
        runObservability: true,
    };

    try {
        let done = false;
        let lastMessage: string | undefined;
        let skipConfirmation = false;
        
        while (!done) {
            displayTestMenu(options, lastMessage);
            lastMessage = undefined;
            
            try {
                const answer = await question(rl, '  Your choice: ');
                const rawAnswer = answer;
                const choice = answer.trim().toLowerCase();
                
                mainLogStream.write(`[DEBUG] Raw input: "${rawAnswer}" (bytes: ${Buffer.from(rawAnswer).toString('hex')}), trimmed: "${choice}"\n`);
                
                if (!rawAnswer || rawAnswer.trim() === '' || choice === '' || choice === 'enter') {
                    mainLogStream.write('[DEBUG] Empty input detected - proceeding\n');
                    done = true;
                    break;
                } else if (choice === 'q' || choice === 'quit' || choice === 'exit') {
                    log('Test run cancelled by user', 'yellow');
                    rl.close();
                    process.exit(0);
                } else if (choice === 'a' || choice === 'all' || choice === 'select all') {
                    mainLogStream.write('[DEBUG] User selected "A" - enabling all tests\n');
                    options.runVitest = true;
                    options.runCoverage = true;
                    options.runSchemathesis = true;
                    options.runK6 = true;
                    options.runMutation = true;
                    options.runStaticAnalysis = true;
                    options.runObservability = true;
                    mainLogStream.write('[DEBUG] All tests enabled, proceeding automatically\n');
                    skipConfirmation = true;
                    done = true;
                    break;
                } else if (choice === 'n' || choice === 'none' || choice === 'select none') {
                    options.runVitest = false;
                    options.runCoverage = false;
                    options.runSchemathesis = false;
                    options.runK6 = false;
                    options.runMutation = false;
                    options.runStaticAnalysis = false;
                    options.runObservability = false;
                    mainLogStream.write('[DEBUG] All tests deselected, proceeding automatically\n');
                    skipConfirmation = true;
                    done = true;
                    break;
                } else {
                    const testMap: Record<string, keyof TestOptions> = {
                        '1': 'runVitest',
                        '2': 'runCoverage',
                        '3': 'runSchemathesis',
                        '4': 'runK6',
                        '5': 'runMutation',
                        '6': 'runStaticAnalysis',
                        '7': 'runObservability',
                    };
                    
                    const testKey = testMap[choice];
                    if (testKey) {
                        options[testKey] = !options[testKey];
                        const testNames: Record<string, string> = {
                            'runVitest': 'Vitest Tests',
                            'runCoverage': 'Coverage Analysis',
                            'runSchemathesis': 'Schemathesis',
                            'runK6': 'k6 Load Tests',
                            'runMutation': 'Mutation Tests',
                            'runStaticAnalysis': 'Static Analysis',
                            'runObservability': 'Observability',
                        };
                        const status = options[testKey] ? 'ENABLED' : 'DISABLED';
                        lastMessage = `✓ ${testNames[testKey]} ${status} - Press ENTER to proceed`;
                    } else {
                        lastMessage = `✗ Invalid choice: "${choice}". Valid: 1-7, A, N, ENTER, Q`;
                    }
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                mainLogStream.write(`[ERROR] Input error: ${errorMsg}\n`);
                log(`  [ERROR] Input error: ${errorMsg}`, 'red');
                lastMessage = 'Input error occurred - try again';
            }
        }

        console.log('');
        log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
        log('║                      Final Selection Summary                    ║', 'cyan');
        log('╚════════════════════════════════════════════════════════════════╝', 'cyan');
        console.log('');
        log('Selected tests:', 'cyan');
        log(`  ✅ Vitest: ${options.runVitest ? 'YES' : 'NO'}`, options.runVitest ? 'green' : 'gray');
        log(`  ✅ Coverage: ${options.runCoverage ? 'YES' : 'NO'}`, options.runCoverage ? 'green' : 'gray');
        log(`  ✅ Schemathesis: ${options.runSchemathesis ? 'YES' : 'NO'}`, options.runSchemathesis ? 'green' : 'gray');
        log(`  ✅ k6: ${options.runK6 ? 'YES' : 'NO'}`, options.runK6 ? 'green' : 'gray');
        log(`  ✅ Mutation: ${options.runMutation ? 'YES' : 'NO'}`, options.runMutation ? 'green' : 'gray');
        log(`  ✅ Static Analysis: ${options.runStaticAnalysis ? 'YES' : 'NO'}`, options.runStaticAnalysis ? 'green' : 'gray');
        log(`  ✅ Observability: ${options.runObservability ? 'YES' : 'NO'}`, options.runObservability ? 'green' : 'gray');
        console.log('');
        
        if (!skipConfirmation) {
            const confirmAnswer = await question(rl, 'Proceed with these tests? [Y/n]: ');
            if (confirmAnswer.toLowerCase() === 'n') {
                log('Test run cancelled by user', 'yellow');
                rl.close();
                process.exit(0);
            }
        } else {
            log('Proceeding automatically...', 'green');
        }
    } finally {
        rl.close();
    }

    return options;
}

function runCommand(command: string, args: string[], options: RunCommandOptions = {}): Promise<number> {
    return new Promise((resolve) => {
        const quotedCommand = command.includes(' ') && process.platform === 'win32' ? `"${command}"` : command;
        const toolLogStream = options.toolLogStream;
        
        if (toolLogStream) {
            const stream = toolLogStream;
            let stdoutBackpressure = false;
            let stderrBackpressure = false;
            const stdoutBuffer: string[] = [];
            const stderrBuffer: string[] = [];
            let drainHandler: (() => void) | null = null;

            function flushBuffers() {
                while (stdoutBuffer.length > 0 && !stdoutBackpressure) {
                    const text = stdoutBuffer.shift()!;
                    stdoutBackpressure = !stream.write(text);
                }
                
                while (stderrBuffer.length > 0 && !stderrBackpressure) {
                    const text = stderrBuffer.shift()!;
                    stderrBackpressure = !stream.write(text);
                }
            }

            stream.on('drain', () => {
                stdoutBackpressure = false;
                stderrBackpressure = false;
                if (drainHandler) {
                    drainHandler = null;
                }
                flushBuffers();
            });

            stream.on('error', (error) => {
                console.error(`[Log Stream Error] Failed to write to log stream:`, error);
            });

            const child = spawn(quotedCommand, args, {
                stdio: ['inherit', 'pipe', 'pipe'],
                shell: true,
                cwd: options.cwd || cloudflareDir,
                env: { ...process.env, ...options.env },
            });

            child.stdout?.on('data', (data) => {
                const text = data.toString();
                process.stdout.write(text);
                
                if (stdoutBackpressure) {
                    stdoutBuffer.push(text);
                } else {
                    stdoutBackpressure = !stream.write(text);
                    if (stdoutBackpressure) {
                        stdoutBuffer.push(text);
                    }
                }
            });

            child.stderr?.on('data', (data) => {
                const text = data.toString();
                process.stderr.write(text);
                
                if (stderrBackpressure) {
                    stderrBuffer.push(text);
                } else {
                    stderrBackpressure = !stream.write(text);
                    if (stderrBackpressure) {
                        stderrBuffer.push(text);
                    }
                }
            });

            child.on('close', () => {
                flushBuffers();
            });

            child.on('close', (code) => {
                resolve(code || 0);
            });

            child.on('error', (error) => {
                const errorText = `Error executing ${command}: ${error instanceof Error ? error.message : String(error)}\n`;
                console.error(errorText);
                stream.write(errorText);
                resolve(1);
            });
        } else {
            const child = spawn(quotedCommand, args, {
                stdio: 'inherit',
                shell: true,
                cwd: options.cwd || cloudflareDir,
                env: { ...process.env, ...options.env },
            });

            child.on('close', (code) => {
                resolve(code || 0);
            });

            child.on('error', (error) => {
                console.error(`Error executing ${command}:`, error);
                resolve(1);
            });
        }
    });
}

function runCommandWithOutput(command: string, args: string[], options: RunCommandOptions = {}): Promise<{ code: number; output: string }> {
    return new Promise((resolve) => {
        let output = '';
        let resolved = false;
        let lastDataTime = Date.now();
        const timeout = options.timeout || 300000;
        const quotedCommand = command.includes(' ') && process.platform === 'win32' ? `"${command}"` : command;
        
        mainLogStream.write(`[DEBUG] Spawning command: ${quotedCommand} ${args.join(' ')}\n`);
        const child = spawn(quotedCommand, args, {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: true,
            cwd: options.cwd || cloudflareDir,  // Default to infra/cloudflare where package.json lives
            env: { ...process.env, ...options.env },
        });

        mainLogStream.write(`[DEBUG] Process PID: ${child.pid}\n`);

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                const timeSinceLastData = Date.now() - lastDataTime;
                mainLogStream.write(`\n[WARN] Command timeout after ${timeout}ms (last data: ${timeSinceLastData}ms ago), killing process...\n`);
                try {
                    child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!child.killed) {
                            mainLogStream.write(`[DEBUG] Process still alive, sending SIGKILL\n`);
                            child.kill('SIGKILL');
                        }
                    }, 5000);
                } catch (_error: unknown) {
                    void _error;
                }
                resolve({ code: 124, output: output + '\n[ERROR] Command timed out' });
            }
        }, timeout);

        const dataCheckInterval = setInterval(() => {
            if (!resolved) {
                const timeSinceLastData = Date.now() - lastDataTime;
                if (timeSinceLastData > 30000) {
                    mainLogStream.write(`[DEBUG] No data received for ${(timeSinceLastData / 1000).toFixed(1)}s, process may be stuck\n`);
                }
            } else {
                clearInterval(dataCheckInterval);
            }
        }, 10000);

        const toolLogStream = options.toolLogStream;
        const outputLogStream = toolLogStream || mainLogStream;

        child.stdout?.on('data', (data) => {
            lastDataTime = Date.now();
            const text = data.toString();
            output += text;
            process.stdout.write(text);
            outputLogStream.write(text);
            if (options.onProgress) {
                options.onProgress(text);
            }
        });

        child.stderr?.on('data', (data) => {
            lastDataTime = Date.now();
            const text = data.toString();
            output += text;
            process.stderr.write(text);
            outputLogStream.write(text);
            if (options.onProgress) {
                options.onProgress(text);
            }
        });

        child.on('close', (code) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                clearInterval(dataCheckInterval);
                const finalOutputLength = output.length;
                mainLogStream.write(`[DEBUG] Process closed with code ${code}, output length: ${finalOutputLength}\n`);
                resolve({ code: code || 0, output });
            }
        });

        child.on('error', (error) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                clearInterval(dataCheckInterval);
                const errorMsg = error.message;
                mainLogStream.write(`[ERROR] Error executing ${command}: ${errorMsg}\n`);
                resolve({ code: 1, output: errorMsg });
            }
        });
    });
}

async function checkWorkerHealth(url: string, timeout: number = 2000): Promise<boolean> {
    return new Promise((resolve) => {
        const req = http.get(url, { timeout }, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function waitForWorker(port: number, maxWait: number = 30): Promise<boolean> {
    const url = `http://localhost:${port}/health`;
    const checkInterval = 1000;
    let elapsed = 0;

    while (elapsed < maxWait * 1000) {
        const healthy = await checkWorkerHealth(url);
        if (healthy) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        elapsed += checkInterval;
        process.stdout.write(`\r  Waiting for worker... (${Math.floor(elapsed / 1000)}s)`);
    }
    process.stdout.write('\r');
    return false;
}

async function checkPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.listen(port, () => {
            server.close(() => resolve(false));
        });
        server.on('error', () => resolve(true));
    });
}

async function killProcess(proc: ReturnType<typeof spawn> | null, signal: NodeJS.Signals = 'SIGTERM', timeout: number = 2000): Promise<void> {
    if (!proc || proc.killed) {
        return;
    }

    try {
        proc.kill(signal);
        await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
                if (proc && !proc.killed) {
                    proc.kill('SIGKILL');
                }
                resolve();
            }, timeout);
            
            if (proc) {
                proc.on('exit', () => {
                    clearTimeout(timeoutId);
                    resolve();
                });
            } else {
                clearTimeout(timeoutId);
                resolve();
            }
        });
    } catch {
        return;
    }
}

function printHeader() {
    log(`\nTest run started at: ${new Date().toISOString()}`, 'gray');
    log(`Log files:`, 'gray');
    log(`  Main: ${mainLogPath}`, 'gray');
    log(`  CodeQL: ${codeqlLogPath}`, 'gray');
    log(`  Semgrep: ${semgrepLogPath}`, 'gray');
    log(`  k6: ${k6LogPath}`, 'gray');
    log(`  Schemathesis: ${schemathesisLogPath}`, 'gray');
    log(`  Trivy: ${trivyLogPath}`, 'gray');
    log(`  Mutation: ${mutationLogPath}`, 'gray');
    console.log('');
    log('================================================================', 'cyan');
    log('  Cloudflare Worker - Complete Test Suite', 'cyan');
    log(`  Mode: ${testMode}`, isRealMode ? 'red' : 'green');
    log('  (Analytics + Security + E2E + Integration + Unit Tests + Coverage)', 'cyan');
    log('  Includes: R2, KV, Durable Objects, Manifest Loader verification', 'cyan');
    log('  Security Tests: Path Traversal, SSRF, DoS, JWT Forgery, Header Injection, Fuzzing', 'cyan');
    log('  Coverage: Lines (95%), Branches (90%), Functions (95%), Statements (95%) [Plan A]', 'cyan');
    log('  Security Tools: Schemathesis, k6, Stryker, Observability, Static Analysis', 'cyan');
    log('  Property-Based: Economic invariants, retry protection, partial failure', 'cyan');
    console.log('');

    if (isRealMode) {
        log('  WARNING: Testing against REAL worker - costs apply!', 'yellow');
        log(`  Worker URL: ${process.env.WORKER_URL}`, 'yellow');
    } else {
        log('  Testing locally (no costs)', 'green');
    }
    log('================================================================', 'cyan');
    console.log('');
    log('Usage: npx tsx run-all-tests.ts [local|real|cloud] [--skip-tests=...] [--yes]', 'gray');
    log('  local  - Test against local worker (default, no costs)', 'gray');
    log('  real   - Test against real deployed worker (costs apply)', 'gray');
    log('  cloud  - Same as real', 'gray');
    log('  --skip-tests=vitest,coverage,... - Skip specific tests', 'gray');
    log('  --yes  - Skip prompts and run all tests', 'gray');
    console.log('');
}

async function exportFailedTests(jsonOutputPath: string): Promise<void> {
    if (!fs.existsSync(jsonOutputPath)) {
        return;
    }

    try {
        const vitestResults = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf-8')) as {
            testResults?: Array<{
                name: string;
                assertionResults?: Array<{
                    title: string;
                    status?: string;
                    duration?: number;
                    ancestorTitles?: string[];
                    failureMessages?: string[];
                    stdout?: string[];
                    stderr?: string[];
                    logs?: Array<{ type: string; content: string }>;
                }>;
            }>;
        };
        const failedTests: Array<{
            name: string;
            suite: string;
            file: string;
            status: string;
            duration: number | undefined;
            failureMessages: string[];
            stdout: string[] | undefined;
            stderr: string[] | undefined;
            logs: Array<{ type: string; content: string }>;
            fullError: string;
        }> = [];

        vitestResults.testResults?.forEach((testFile) => {
            testFile.assertionResults?.forEach((assertion) => {
                if (assertion.status === 'failed') {
                    const suiteName = (assertion.ancestorTitles && assertion.ancestorTitles.length > 0)
                        ? assertion.ancestorTitles.join(' > ')
                        : 'Root';
                    
                    failedTests.push({
                        name: assertion.title,
                        suite: suiteName,
                        file: testFile.name,
                        status: assertion.status,
                        duration: assertion.duration,
                        failureMessages: assertion.failureMessages || [],
                        stdout: assertion.stdout,
                        stderr: assertion.stderr,
                        logs: assertion.logs || [],
                        fullError: (assertion.failureMessages || []).join('\n\n')
                    });
                }
            });
        });

        if (failedTests.length > 0) {
            const failedTestsFileName = 'failed-tests.json';
            const failedTestsLogPath = path.join(testRunnerLogsDir, failedTestsFileName);
            const failedTestsJson = JSON.stringify(failedTests, null, 2);

            if (!fs.existsSync(testRunnerLogsDir)) {
                fs.mkdirSync(testRunnerLogsDir, { recursive: true });
            }

            fs.writeFileSync(failedTestsLogPath, failedTestsJson, 'utf-8');
            log(`  📥 Exported ${failedTests.length} failed test(s) to: ${failedTestsLogPath}`, 'cyan');
        }
    } catch (error) {
        log(`  ⚠️  Could not export failed tests: ${error instanceof Error ? error.message : String(error)}`, 'yellow');
    }
}

interface VitestResult {
    numTotalTests?: number;
    numPassedTests?: number;
    numFailedTests?: number;
    numPendingTests?: number;
    numTodoTests?: number;
    numSkippedTests?: number;
    testResults?: unknown[];
    [key: string]: unknown;
}

function mergeVitestResults(mainResults: VitestResult, websocketResults: VitestResult): VitestResult {
    const merged: VitestResult = {
        ...mainResults,
        numTotalTests: (mainResults.numTotalTests || 0) + (websocketResults.numTotalTests || 0),
        numPassedTests: (mainResults.numPassedTests || 0) + (websocketResults.numPassedTests || 0),
        numFailedTests: (mainResults.numFailedTests || 0) + (websocketResults.numFailedTests || 0),
        numPendingTests: (mainResults.numPendingTests || 0) + (websocketResults.numPendingTests || 0),
        numTodoTests: (mainResults.numTodoTests || 0) + (websocketResults.numTodoTests || 0),
        numSkippedTests: (mainResults.numSkippedTests || 0) + (websocketResults.numSkippedTests || 0),
        testResults: [
            ...(mainResults.testResults || []),
            ...(websocketResults.testResults || [])
        ]
    };
    return merged;
}

async function runVitestTests(jsonOutputPath: string, testOptions: TestOptions): Promise<void> {
    if (!testOptions.runVitest) {
        log('STEP 2/8: Skipping Vitest tests (disabled by user)', 'gray');
        return;
    }

    const includeCoverage = testOptions.runCoverage;
    const stepLabel = includeCoverage ? 'STEP 2/8: Running ALL Vitest tests with Coverage' : 'STEP 2/8: Running ALL Vitest tests (Unit + Integration + E2E + Security)';
    
    log(stepLabel, 'yellow');
        log(`  Mode: ${testMode}`, isRealMode ? 'red' : 'green');
    log('  Test Categories:', 'gray');
    log('    - Unit Tests: auth, cors, admin-check, security-monitoring', 'gray');
    log('    - Integration Tests: resources-api, assets-api, kv, durable-objects, etc.', 'gray');
    log('    - E2E Tests: real-worker, security, upload-download, auth-order', 'gray');
    log('    - Security Tests: path-traversal, ssrf, dos, header-injection, fuzzing', 'gray');
    log('    - WebSocket Tests: websocket-security, websocket-isolated-storage', 'gray');
        console.log('');

    const mainJsonPath = path.join(testRunnerReportJsonDir, 'vitest-main.json');
    const websocketJsonPath = path.join(testRunnerReportJsonDir, 'vitest-websocket.json');

    const testStartTime = Date.now();

    const unstableExclude = getUnstableIncludeFiles(cloudflareDir);
    log('  Running main config (excluding unstable-only tests from suite-type-map)...', 'cyan');
    const mainCommandArgs = [
        '--yes',
        'vitest',
        'run',
        '--reporter=verbose',
        '--reporter=json',
        `--outputFile=${mainJsonPath}`,
        ...unstableExclude.flatMap((f) => ['--exclude', f]),
    ];
    
    if (includeCoverage) {
        mainCommandArgs.push('--coverage');
    }

    await runCommand('npx', mainCommandArgs, { 
        toolLogStream: vitestLogStream,
        env: { TEST_RUN_TYPE: 'full' }
    });

    log('  Running websocket config (isolatedStorage: false, from suite-type-map)...', 'cyan');
    const websocketCommandArgs = [
        '--yes',
        'vitest',
        'run',
        '--config',
        'vitest.websocket.config.ts',
        '--reporter=verbose',
        '--reporter=json',
        `--outputFile=${websocketJsonPath}`,
    ];
    
    if (includeCoverage) {
        websocketCommandArgs.push('--coverage');
    }

    await runCommand('npx', websocketCommandArgs, { 
        toolLogStream: vitestLogStream,
        env: { TEST_RUN_TYPE: 'full' }
    });

    const vitestDuration = ((Date.now() - testStartTime) / 1000).toFixed(1);
    console.log('');
    log(`  [DONE] Vitest tests completed in ${vitestDuration} s`, 'green');

    let mainResults: VitestResult = {};
    let websocketResults: VitestResult = {};

    if (fs.existsSync(mainJsonPath)) {
        try {
            mainResults = JSON.parse(fs.readFileSync(mainJsonPath, 'utf-8')) as VitestResult;
        } catch {
            log('  Could not parse main config results', 'yellow');
        }
    }

    if (fs.existsSync(websocketJsonPath)) {
        try {
            websocketResults = JSON.parse(fs.readFileSync(websocketJsonPath, 'utf-8')) as VitestResult;
        } catch {
            log('  Could not parse websocket config results', 'yellow');
        }
    }

    const mergedResults = mergeVitestResults(mainResults, websocketResults);
    fs.writeFileSync(jsonOutputPath, JSON.stringify(mergedResults, null, 2));

    if ((mergedResults.numTotalTests ?? 0) > 0) {
        log(`  Summary: ${mergedResults.numTotalTests ?? 0} tests, ${mergedResults.numPassedTests ?? 0} passed, ${mergedResults.numFailedTests ?? 0} failed`, 'cyan');
        
        if ((mergedResults.numFailedTests ?? 0) > 0) {
            await exportFailedTests(jsonOutputPath);
        }
    }
}

async function runCoverageAnalysis(testOptions: TestOptions): Promise<void> {
    if (!testOptions.runCoverage) {
        log('STEP 2.5/9: Skipping Coverage analysis (disabled by user)', 'gray');
        return;
    }

    const coverageAlreadyRun = testOptions.runVitest;
    
    if (coverageAlreadyRun) {
        log('STEP 2.5/9: Processing coverage results (already collected with tests)', 'yellow');
        log('  Coverage was collected during test execution - processing results...', 'gray');
        console.log('');
    } else {
        log('STEP 2.5/9: Running coverage (standalone runner)...', 'yellow');
        const coverageStartTime = Date.now();
        log('  Invoking test:runner:coverage (run-coverage.ts)...', 'cyan');
        log('  Note: Coverage HTML will be embedded in unified test report', 'gray');
        console.log('');

        const { code: coverageCode } = await runCommandWithOutput('npm', ['run', 'test:runner:coverage'], {
            cwd: cloudflareDir,
        });
        if (coverageCode !== 0) {
            log('  [WARN] Coverage runner exited with non-zero code', 'yellow');
        }
        const coverageDuration = ((Date.now() - coverageStartTime) / 1000).toFixed(1);
        console.log('');
        log(`  Coverage run completed in ${coverageDuration} s`, 'gray');
    }

    const coverageHtmlPath = path.join(testRunnerCoverageDir, 'index.html');
    if (fs.existsSync(coverageHtmlPath)) {
        log('  Applying dark theme to coverage HTML...', 'gray');
        try {
            await runCommand('npx', [
                '--yes',
                'tsx',
                path.join(scriptDir, 'report', 'apply-dark-theme-coverage.ts'),
            ]);
        } catch (error) {
            log(`  [WARN] Could not apply dark theme to coverage: ${error}`, 'yellow');
        }
    }

    const coverageSummaryPath = path.join(testRunnerCoverageDir, 'coverage-summary.json');
        if (fs.existsSync(coverageSummaryPath)) {
            try {
                const coverageData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf-8'));
                const { lines, branches, functions, statements } = coverageData.total;

                console.log('');
                log('  Coverage Summary:', 'cyan');
                log(`    Lines:      ${lines.pct.toFixed(1)}% (threshold: 95%)`, lines.pct >= 95 ? 'green' : 'red');
                log(`    Branches:   ${branches.pct.toFixed(1)}% (threshold: 90%)`, branches.pct >= 90 ? 'green' : 'red');
                log(`    Functions:  ${functions.pct.toFixed(1)}% (threshold: 95%)`, functions.pct >= 95 ? 'green' : 'red');
                log(`    Statements: ${statements.pct.toFixed(1)}% (threshold: 95%)`, statements.pct >= 95 ? 'green' : 'red');

                const allMet = lines.pct >= 95 && branches.pct >= 90 && functions.pct >= 95 && statements.pct >= 95;
                console.log('');
                if (allMet) {
                    log('  [PASS] All coverage thresholds met!', 'green');
                } else {
                    log('  [WARN] Some coverage thresholds not met', 'yellow');
                }
            } catch (error) {
                log(`  [WARN] Could not parse coverage summary: ${error}`, 'yellow');
        }
    }
}


async function startWorkerForSecurityTests(): Promise<{ workerJob: ReturnType<typeof spawn> | null; workerStartedByScript: boolean; workerRunning: boolean }> {
    if (isRealMode) {
        log('  [SKIP] Real mode - skipping local fuzzing tests', 'yellow');
        return { workerJob: null, workerStartedByScript: false, workerRunning: false };
    }

    log('STEP 3/8: Starting worker for security fuzzing tests (if needed)...', 'yellow');
    log('  Note: Normal tests (Vitest, Coverage, Analytics) completed above', 'gray');
    log('  Security fuzzing tests (k6, Schemathesis) require worker running on localhost:8787', 'gray');
    console.log('');

    log('  Checking if worker is running on localhost:8787...', 'cyan');
    const portInUse = await checkPortInUse(8787);

    let workerRunning = false;
    if (portInUse) {
        log('  Port 8787 is in use - checking if it is a worker...', 'yellow');
        log('  Waiting for worker to be ready (max 30 seconds)...', 'gray');
        workerRunning = await waitForWorker(8787, 30);
    }

    let workerJob: ReturnType<typeof spawn> | null = null;
    let workerStartedByScript = false;

    if (portInUse && !workerRunning) {
        log('  [FAIL] Port 8787 is in use but worker health check failed', 'red');
        log('     Troubleshooting:', 'yellow');
        log('       1. Check if another process is using port 8787', 'gray');
        log('       2. Try starting worker manually: npm run dev', 'gray');
    } else if (!workerRunning) {
        log('  [WARN] Worker not running - starting unified worker helper...', 'yellow');
        log('  Starting: npm run worker:start', 'cyan');

        const isWindows = process.platform === 'win32';
        const npmCommand = isWindows ? 'npm.cmd' : 'npm';
        
        workerJob = spawn(npmCommand, ['run', 'worker:start'], {
            cwd: cloudflareDir,  // package.json is in infra/cloudflare
            env: { ...process.env, WORKER_HTTP_PORT: '8787' },
            stdio: 'pipe',
            detached: false,
            shell: isWindows,
            windowsHide: true,
        });

        workerStartedByScript = true;
        log(`  Worker process started (PID: ${workerJob.pid})`, 'green');
        log('  Waiting for worker to be ready (max 30 seconds)...', 'gray');

        workerRunning = await waitForWorker(8787, 30);

        if (workerRunning) {
            log('  [OK] Worker is ready!', 'green');
        } else {
            log('  [FAIL] Worker failed to start within 30 seconds', 'red');
            log('  Check worker process output for errors', 'yellow');
            if (workerJob) {
                workerJob.kill();
            }
            workerRunning = false;
        }
    } else {
        log('  [OK] Worker is already running (using existing instance)', 'green');
        log('     Both k6 and Schemathesis will use this shared worker instance', 'gray');
    }

    return { workerJob, workerStartedByScript, workerRunning };
}

interface K6Metrics {
    requests?: number;
    errors?: number;
    errorRate?: number;
    avgResponseTime?: number;
    p95ResponseTime?: number;
    p90ResponseTime?: number;
    maxResponseTime?: number;
    throughput?: number;
    vus?: {
        max?: number;
        avg?: number;
    };
    
    thresholds?: Array<{ name: string; passed: boolean; value?: string; actualValue?: string; thresholdValue?: string }>;
    checkFailures?: Array<{ name: string; passes: number; fails: number; failureRate: number }>;
}

function parseSchemathesisOutput(output: string): { 
    testCases?: number; 
    failures?: number; 
    errors?: number;
    errorCategories?: Record<string, number>;
    errorMessages?: string[];
} {
    try {
        const testCasesMatch = output.match(/(\d+)\s+generated/i) || output.match(/(\d+)\s+test cases?/i);
        const failuresMatch = output.match(/(\d+)\s+failures?/i);
        const errorsMatch = output.match(/(\d+)\s+error/i);
        
        const errorCategories: Record<string, number> = {};
        
        const categoryPatterns = [
            { pattern: /❌\s+API accepts requests without authentication:\s+(\d+)/i, key: 'missing_auth' },
            { pattern: /❌\s+Server error:\s+(\d+)/i, key: 'server_error' },
            { pattern: /❌\s+Response violates schema:\s+(\d+)/i, key: 'schema_violation' },
            { pattern: /❌\s+API accepted schema-violating request:\s+(\d+)/i, key: 'invalid_data_accepted' },
            { pattern: /❌\s+API rejected schema-compliant request:\s+(\d+)/i, key: 'valid_data_rejected' },
            { pattern: /❌\s+Missing header not rejected:\s+(\d+)/i, key: 'missing_header' },
            { pattern: /❌\s+Undocumented Content-Type:\s+(\d+)/i, key: 'undocumented_content_type' },
            { pattern: /❌\s+Undocumented HTTP status code:\s+(\d+)/i, key: 'undocumented_status' },
            { pattern: /❌\s+Unsupported methods:\s+(\d+)/i, key: 'unsupported_method' },
        ];
        
        categoryPatterns.forEach(({ pattern, key }) => {
            const match = output.match(pattern);
            if (match && match[1]) {
                errorCategories[key] = parseInt(match[1], 10);
            }
        });
        
        const errors: string[] = [];
        const errorPatterns = [
            /Error:\s*([^\n]+)/gi,
            /FAILED:\s*([^\n]+)/gi,
            /Exception:\s*([^\n]+)/gi,
            /Network Error[\s\S]*?Reproduce with:[\s\S]*?curl[^\n]+/gi,
        ];
        
        errorPatterns.forEach(pattern => {
            const matches = output.matchAll(pattern);
            for (const match of matches) {
                if (match[1] && !errors.includes(match[1].trim())) {
                    const errorText = match[1].trim();
                    if (errorText.length < 200) {
                        errors.push(errorText);
                    }
                }
            }
        });
        
        return {
            testCases: testCasesMatch ? parseInt(testCasesMatch[1], 10) : undefined,
            failures: failuresMatch ? parseInt(failuresMatch[1], 10) : undefined,
            errors: errorsMatch ? parseInt(errorsMatch[1], 10) : undefined,
            errorCategories: Object.keys(errorCategories).length > 0 ? errorCategories : undefined,
            errorMessages: errors.length > 0 ? errors.slice(0, 10) : undefined,
        };
    } catch {
        return {};
    }
}

function parseK6Metrics(output: string): K6Metrics | undefined {
    try {
        const jsonMatch = output.match(/\{[\s\S]*"metrics"[\s\S]*\}/);
        if (!jsonMatch) {
            return undefined;
        }

        let k6Json;
        try {
            k6Json = JSON.parse(jsonMatch[0]);
        } catch {
            const lastBrace = jsonMatch[0].lastIndexOf('}');
            if (lastBrace > 0) {
                try {
                    k6Json = JSON.parse(jsonMatch[0].substring(0, lastBrace + 1));
                } catch {
                    return undefined;
                }
            } else {
                return undefined;
            }
        }
        const metrics = k6Json.metrics || {};
        const rootGroup = k6Json.root_group || {};
        const httpReqs = metrics.http_reqs?.values || {};
        const httpReqDuration = metrics.http_req_duration?.values || {};
        const httpReqFailed = metrics.http_req_failed?.values || {};
        const errors = metrics.errors?.values || {};
        const iterations = metrics.iterations?.values || {};
        const vus = metrics.vus?.values || {};

        const thresholds: Array<{ name: string; passed: boolean; value?: string; actualValue?: string; thresholdValue?: string }> = [];
        if (metrics.http_req_duration?.thresholds) {
            Object.entries(metrics.http_req_duration.thresholds).forEach(([name, result]) => {
                const thresholdResult = result as { ok?: boolean };
                const actualValue = httpReqDuration['p(95)'] !== undefined ? `${httpReqDuration['p(95)'].toFixed(2)}ms` : undefined;
                thresholds.push({
                    name: `http_req_duration: ${name}`,
                    passed: thresholdResult.ok === true,
                    value: thresholdResult.ok !== undefined ? (thresholdResult.ok ? 'PASS' : 'FAIL') : undefined,
                    actualValue: actualValue,
                    thresholdValue: name.includes('<') ? name.split('<')[1] : name.includes('>') ? name.split('>')[1] : undefined
                });
            });
        }
        if (metrics.errors?.thresholds) {
            Object.entries(metrics.errors.thresholds).forEach(([name, result]) => {
                const thresholdResult = result as { ok?: boolean };
                const actualRate = errors.rate !== undefined ? errors.rate : (errors.count && httpReqs.count ? errors.count / httpReqs.count : 0);
                const actualValue = `${(actualRate * 100).toFixed(1)}%`;
                const thresholdValue = name.includes('<') ? name.split('<')[1] : name.includes('>') ? name.split('>')[1] : undefined;
                thresholds.push({
                    name: `errors: ${name}`,
                    passed: thresholdResult.ok === true,
                    value: thresholdResult.ok !== undefined ? (thresholdResult.ok ? 'PASS' : 'FAIL') : undefined,
                    actualValue: actualValue,
                    thresholdValue: thresholdValue ? `${(parseFloat(thresholdValue) * 100).toFixed(1)}%` : undefined
                });
            });
        }
        if (metrics.correctness?.thresholds) {
            Object.entries(metrics.correctness.thresholds).forEach(([name, result]) => {
                const thresholdResult = result as { ok?: boolean };
                const correctness = metrics.correctness?.values || {};
                const actualRate = correctness.rate !== undefined ? correctness.rate : 0;
                const actualValue = `${(actualRate * 100).toFixed(1)}%`;
                const thresholdValue = name.includes('<') ? name.split('<')[1] : name.includes('>') ? name.split('>')[1] : undefined;
                thresholds.push({
                    name: `correctness: ${name}`,
                    passed: thresholdResult.ok === true,
                    value: thresholdResult.ok !== undefined ? (thresholdResult.ok ? 'PASS' : 'FAIL') : undefined,
                    actualValue: actualValue,
                    thresholdValue: thresholdValue ? `${(parseFloat(thresholdValue) * 100).toFixed(1)}%` : undefined
                });
            });
        }

        const checkFailures: Array<{ name: string; passes: number; fails: number; failureRate: number }> = [];
        interface K6Check {
            name?: string;
            path?: string;
            passes?: number;
            fails?: number;
        }
        interface K6Group {
            checks?: K6Check[];
            groups?: K6Group[];
        }
        const extractChecks = (group: K6Group): void => {
            if (group.checks && Array.isArray(group.checks)) {
                group.checks.forEach((check: K6Check) => {
                    if (check.fails && check.fails > 0) {
                        const total = (check.passes || 0) + check.fails;
                        checkFailures.push({
                            name: check.name || check.path || 'Unknown check',
                            passes: check.passes || 0,
                            fails: check.fails || 0,
                            failureRate: total > 0 ? (check.fails / total) * 100 : 0
                        });
                    }
                });
            }
            if (group.groups && Array.isArray(group.groups)) {
                group.groups.forEach((subGroup: K6Group) => extractChecks(subGroup));
            }
        };
        extractChecks(rootGroup);

        return {
            requests: httpReqs.count || iterations.count || 0,
            errors: errors.count || 0,
            errorRate: httpReqFailed.rate !== undefined ? httpReqFailed.rate : (errors.rate !== undefined ? errors.rate : (errors.count && httpReqs.count ? errors.count / httpReqs.count : 0)),
            avgResponseTime: httpReqDuration.avg || 0,
            p95ResponseTime: httpReqDuration['p(95)'] || 0,
            p90ResponseTime: httpReqDuration['p(90)'] || 0,
            maxResponseTime: httpReqDuration.max || 0,
            throughput: httpReqs.rate || 0,
            vus: {
                max: vus.max || 0,
                avg: vus.avg || 0
            },
            thresholds: thresholds,
            checkFailures: checkFailures.length > 0 ? checkFailures : undefined
        };
    } catch {
        return undefined;
    }
}

async function runSchemathesisTest(securityTestsRun: SecurityTestResults): Promise<void> {
    log('  [1/2] Starting Schemathesis API fuzzing (parallel)...', 'cyan');
    const schemathesisStartTime = Date.now();
    try {
        const { code, output } = await runCommandWithOutput('schemathesis', [
            'run',
            'http://localhost:8787/openapi.json',
            '--url',
            'http://localhost:8787',
            '--checks',
            'all',
            '--max-examples',
            '50',
        ], {
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                PYTHONLEGACYWINDOWSSTDIO: '0',
            },
            toolLogStream: schemathesisLogStream,
        });
        
        const isNotInstalled = output.includes('is not recognized') || 
                               output.includes('command not found') || 
                               (output.length < 50 && !output.includes('Schemathesis'));
        const isEncodingError = output.includes('UnicodeEncodeError') || output.includes('charmap codec');
        const isInstalled = output.includes('Schemathesis v') || output.includes('Loaded specification');
        
        if (isNotInstalled && !isInstalled) {
            log('  [FAIL] Schemathesis not installed', 'red');
            log('    REQUIRED: Install with: pip install schemathesis', 'yellow');
            log('    Or: pipx install schemathesis', 'yellow');
            securityTestsRun.schemathesis = false;
            
            const schemathesisJsonPath = path.join(testRunnerReportJsonDir, 'schemathesis-results.json');
            const errorMessage = output.includes('is not recognized') 
                ? 'Command not found in PATH'
                : output.includes('command not found')
                ? 'Command not found'
                : 'Installation check failed';
            const schemathesisResult = {
                name: 'Schemathesis API Fuzzing',
                status: 'failed',
                exitCode: code,
                errorType: 'not_installed',
                duration: 0,
                output: output,
                errorMessage: errorMessage,
                summary: 'Schemathesis not installed - install with: pip install schemathesis',
                installCommand: 'pip install schemathesis',
            };
            fs.writeFileSync(schemathesisJsonPath, JSON.stringify(schemathesisResult, null, 2), 'utf-8');
        } else if (isEncodingError) {
            log('  [WARN] Schemathesis encoding error (Windows console issue)', 'yellow');
            log('    Schemathesis is installed but failed due to Windows console encoding', 'gray');
            log('    Workaround: Set PYTHONIOENCODING=utf-8 or run in UTF-8 terminal', 'gray');
            log('    Marking as run (encoding issue, not test failure)', 'gray');
            securityTestsRun.schemathesis = true;
            
            const schemathesisJsonPath = path.join(testRunnerReportJsonDir, 'schemathesis-results.json');
            const errorMatch = output.match(/UnicodeEncodeError: '([^']+)' codec can't encode characters/);
            const errorMessage = errorMatch 
                ? `Encoding error: ${errorMatch[1]} codec cannot encode Unicode characters`
                : 'Windows console encoding error';
            const schemathesisResult = {
                name: 'Schemathesis API Fuzzing',
                status: 'warning',
                exitCode: code,
                errorType: 'encoding_error',
                duration: ((Date.now() - schemathesisStartTime) / 1000),
                output: output,
                errorMessage: errorMessage,
                summary: 'Schemathesis encoding error (Windows console) - test may have run but output encoding failed',
                workaround: 'Set PYTHONIOENCODING=utf-8 or run in UTF-8 terminal',
            };
            fs.writeFileSync(schemathesisJsonPath, JSON.stringify(schemathesisResult, null, 2), 'utf-8');
        } else {
            const schemathesisStatus = code === 0 ? 'passed' : 'failed';
            const schemathesisDuration = ((Date.now() - schemathesisStartTime) / 1000).toFixed(1);
            
            if (code === 0) {
                log(`  [PASS] Schemathesis fuzzing completed in ${schemathesisDuration} s`, 'green');
                securityTestsRun.schemathesis = true;
            } else {
                log(`  [WARN] Schemathesis exited with code ${code}`, 'yellow');
                securityTestsRun.schemathesis = true;
            }

            const schemathesisJsonPath = path.join(testRunnerReportJsonDir, 'schemathesis-results.json');
            const parsedOutput = parseSchemathesisOutput(output);
            const schemathesisResult = {
                name: 'Schemathesis API Fuzzing',
                status: schemathesisStatus,
                exitCode: code,
                duration: parseFloat(schemathesisDuration),
                output: output,
                summary: code === 0 ? 'Schemathesis API fuzzing test completed' : `Schemathesis exited with code ${code}`,
                ...parsedOutput,
            };
            fs.writeFileSync(schemathesisJsonPath, JSON.stringify(schemathesisResult, null, 2), 'utf-8');
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isEncodingError = errorMessage.includes('UnicodeEncodeError') || errorMessage.includes('charmap codec');
        
        if (isEncodingError) {
            log('  [WARN] Schemathesis encoding error (Windows console issue)', 'yellow');
            log('    Schemathesis is installed but failed due to Windows console encoding', 'gray');
            log('    Workaround: Set PYTHONIOENCODING=utf-8 or run in UTF-8 terminal', 'gray');
            log('    Marking as run (encoding issue, not test failure)', 'gray');
            securityTestsRun.schemathesis = true;
        } else {
            log('  [FAIL] Schemathesis not installed', 'red');
            log('    REQUIRED: Install with: pip install schemathesis', 'yellow');
            log('    Or: pipx install schemathesis', 'yellow');
            securityTestsRun.schemathesis = false;
        }
        
        const schemathesisJsonPath = path.join(testRunnerReportJsonDir, 'schemathesis-results.json');
        const schemathesisResult = {
            name: 'Schemathesis API Fuzzing',
            status: isEncodingError ? 'warning' : 'failed',
            exitCode: 1,
            errorType: isEncodingError ? 'encoding_error' : 'execution_error',
            duration: 0,
            output: errorMessage,
            errorMessage: errorMessage,
            summary: isEncodingError 
                ? 'Schemathesis encoding error (Windows console) - test may have run but output encoding failed'
                : `Schemathesis failed: ${errorMessage}`,
            ...(isEncodingError ? { workaround: 'Set PYTHONIOENCODING=utf-8 or run in UTF-8 terminal' } : {}),
        };
        fs.writeFileSync(schemathesisJsonPath, JSON.stringify(schemathesisResult, null, 2), 'utf-8');
    }
}

async function runK6Test(securityTestsRun: SecurityTestResults, testOptions: TestOptions): Promise<void> {
    if (!testOptions.runK6) {
        log('  [SKIP] k6 disabled by user', 'gray');
        return;
    }

    log('  [2/2] Starting k6 concurrency/load tests (parallel)...', 'cyan');
    const k6StartTime = Date.now();
    try {
        const k6Command = process.platform === 'win32' && !process.env.PATH?.includes('k6') 
            ? 'C:\\Program Files\\k6\\k6.exe' 
            : 'k6';
        const k6ScriptPath = path.join(testsDir, 'k6', 'concurrency.test.js');
        log(`  [DEBUG] k6 command: ${k6Command}`, 'gray');
        log(`  [DEBUG] k6 script: ${k6ScriptPath}`, 'gray');
        log(`  [DEBUG] Script exists: ${fs.existsSync(k6ScriptPath)}`, 'gray');
        log('  [DEBUG] Executing k6 command...', 'gray');
        
        const commandStartTime = Date.now();
        const { code, output } = await runCommandWithOutput(k6Command, [
            'run',
            k6ScriptPath,
        ], {
            timeout: 120000,
            toolLogStream: k6LogStream,
        });
        
        const commandDuration = ((Date.now() - commandStartTime) / 1000).toFixed(1);
        log(`  [DEBUG] k6 command completed in ${commandDuration}s, exit code: ${code}`, 'gray');
        log(`  [DEBUG] Output length: ${output.length} characters`, 'gray');
        
        const isNotInstalled = output.includes('is not recognized') || output.includes('command not found') || code === 1 && output.includes('k6');
        
        if (isNotInstalled) {
            log('  [FAIL] k6 not installed', 'red');
            log('    REQUIRED: Install with:', 'yellow');
            log('      Windows: choco install k6', 'yellow');
            log('      macOS: brew install k6', 'yellow');
            log('      Linux: See https://k6.io/docs/getting-started/installation/', 'yellow');
            securityTestsRun.k6 = false;
            
            const k6JsonPath = path.join(testRunnerReportJsonDir, 'k6-results.json');
            const k6Result = {
                name: 'k6 Concurrency/Load Tests',
                status: 'failed',
                duration: 0,
                output: output,
                summary: 'k6 not installed - install with: choco install k6 (Windows) or brew install k6 (macOS)',
            };
            fs.writeFileSync(k6JsonPath, JSON.stringify(k6Result, null, 2), 'utf-8');
        } else {
            log('  [DEBUG] Processing k6 results...', 'gray');
            const k6Status = code === 0 ? 'passed' : (code === 99 ? 'threshold_failed' : 'failed');
            const k6Duration = ((Date.now() - k6StartTime) / 1000).toFixed(1);
            
            log('  [DEBUG] Parsing k6 metrics from output...', 'gray');
            const parseStartTime = Date.now();
            const k6Metrics = parseK6Metrics(output);
            const parseDuration = ((Date.now() - parseStartTime) / 1000).toFixed(3);
            log(`  [DEBUG] Metrics parsing completed in ${parseDuration}s`, 'gray');
            log(`  [DEBUG] Metrics found: ${k6Metrics ? 'yes' : 'no'}`, 'gray');
            if (k6Metrics) {
                log(`  [DEBUG] Requests: ${k6Metrics.requests || 'N/A'}, Error Rate: ${k6Metrics.errorRate ? (k6Metrics.errorRate * 100).toFixed(2) + '%' : 'N/A'}`, 'gray');
            }
            
            log('  [DEBUG] Determining status...', 'gray');
            if (code === 0) {
                log(`  [PASS] k6 concurrency tests completed in ${k6Duration} s`, 'green');
                securityTestsRun.k6 = true;
            } else if (code === 99) {
                log(`  [WARN] k6 thresholds crossed (exit code 99)`, 'yellow');
                log(`    This is expected when performance thresholds are not met`, 'gray');
                log(`    Test ran successfully but thresholds were not met`, 'gray');
                securityTestsRun.k6 = true;
            } else {
                log(`  [WARN] k6 exited with code ${code}`, 'yellow');
                securityTestsRun.k6 = true;
            }

            log('  [DEBUG] Calculating threshold failures...', 'gray');
            const thresholdFailures = k6Metrics?.thresholds?.filter(t => !t.passed).map(t => t.name) || [];
            log(`  [DEBUG] Threshold failures: ${thresholdFailures.length}`, 'gray');
            
            log('  [DEBUG] Building result object...', 'gray');
            const k6JsonPath = path.join(testRunnerReportJsonDir, 'k6-results.json');
            const k6Result = {
                name: 'k6 Concurrency/Load Tests',
                status: k6Status,
                exitCode: code,
                errorType: code === 99 ? 'threshold_violation' : code !== 0 ? 'execution_error' : undefined,
                duration: parseFloat(k6Duration),
                output: output,
                errorMessage: code === 99 
                    ? `Threshold violations: ${thresholdFailures.join(', ')}`
                    : code !== 0 
                        ? `k6 exited with code ${code}`
                        : undefined,
                summary: code === 0 
                    ? (k6Metrics ? `${k6Metrics.requests?.toLocaleString() || 0} requests, ${((k6Metrics.errorRate || 0) * 100).toFixed(2)}% errors, ${k6Metrics.avgResponseTime?.toFixed(2) || 0}ms avg response time` : 'k6 concurrency/load test completed')
                    : code === 99
                        ? `k6 completed but ${thresholdFailures.length} threshold(s) violated: ${thresholdFailures.join(', ')}`
                        : `k6 exited with code ${code}`,
                metrics: k6Metrics,
                thresholdFailures: thresholdFailures.length > 0 ? thresholdFailures : undefined,
            };
            
            log('  [DEBUG] Writing k6 results to JSON file...', 'gray');
            const writeStartTime = Date.now();
            fs.writeFileSync(k6JsonPath, JSON.stringify(k6Result, null, 2), 'utf-8');
            const writeDuration = ((Date.now() - writeStartTime) / 1000).toFixed(3);
            log(`  [DEBUG] Results written in ${writeDuration}s`, 'gray');
            log(`  [DEBUG] k6 test function completed successfully`, 'gray');
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('  [FAIL] k6 not installed', 'red');
        log('    REQUIRED: Install with:', 'yellow');
        log('      Windows: choco install k6', 'yellow');
        log('      macOS: brew install k6', 'yellow');
        log('      Linux: See https://k6.io/docs/getting-started/installation/', 'yellow');
        securityTestsRun.k6 = false;
        
        const k6JsonPath = path.join(testRunnerReportJsonDir, 'k6-results.json');
        const isNotInstalled = errorMessage.includes('is not recognized') || errorMessage.includes('command not found');
        const k6Result = {
            name: 'k6 Concurrency/Load Tests',
            status: 'failed',
            exitCode: 1,
            errorType: isNotInstalled ? 'not_installed' : 'execution_error',
            duration: 0,
            output: errorMessage,
            errorMessage: errorMessage,
            summary: `k6 failed: ${errorMessage}`,
            ...(isNotInstalled ? {
                installCommand: process.platform === 'win32' 
                    ? 'choco install k6'
                    : process.platform === 'darwin'
                        ? 'brew install k6'
                        : 'See https://k6.io/docs/getting-started/installation/',
            } : {}),
        };
        fs.writeFileSync(k6JsonPath, JSON.stringify(k6Result, null, 2), 'utf-8');
    }
}

async function runSecurityFuzzingTests(workerRunning: boolean, testOptions: TestOptions, securityTestsRun: SecurityTestResults): Promise<void> {
    if (!workerRunning) {
        log('  [FAIL] Worker not available - SKIPPING Schemathesis and k6 tests', 'red');
        log('     These are REQUIRED per SECURITY_TESTING.md', 'red');
        return;
    }

    console.log('');
    log('STEP 4.5/9: Running security fuzzing tests in parallel...', 'yellow');
    log('  Worker is ready - running Schemathesis and k6 in parallel (independent operations)', 'green');
    console.log('');

    const fuzzingPromises: Promise<void>[] = [];

    if (testOptions.runSchemathesis) {
        fuzzingPromises.push(runSchemathesisTest(securityTestsRun));
    } else {
        log('  [SKIP] Schemathesis disabled by user', 'gray');
    }

    if (testOptions.runK6) {
        fuzzingPromises.push(runK6Test(securityTestsRun, testOptions));
    }

    if (fuzzingPromises.length > 0) {
        log('  Waiting for all fuzzing tests to complete...', 'gray');
        await Promise.all(fuzzingPromises);
        log('  All fuzzing tests completed', 'green');
    }
}

async function runMutationTests(testOptions: TestOptions, securityTestsRun: SecurityTestResults): Promise<void> {
    const mutationJsonPath = path.join(testRunnerReportJsonDir, 'mutation-results.json');
    
    let mutationResult: {
        name: string;
        status: string;
        duration: number;
        output: string;
        summary: string;
        targets?: Array<{
            symbol: string;
            kind: string;
            file: string;
            reason?: string;
        }>;
    };
    
    if (!testOptions.runMutation) {
        log('STEP 4.6/9: Skipping Mutation tests (disabled by user)', 'gray');
        securityTestsRun.mutationAttempted = false;
        
        mutationResult = {
            name: 'Stryker Mutation Testing',
            status: 'skipped',
            duration: 0,
            output: 'Mutation tests were disabled by user',
            summary: 'Mutation tests were skipped',
        };
        fs.writeFileSync(mutationJsonPath, JSON.stringify(mutationResult, null, 2), 'utf-8');
        return;
    }

    log('STEP 4.6/9: Running mutation tests (standalone runner)...', 'yellow');
    log('  Note: Mutation testing can take several minutes', 'gray');
    log('  Invoking test:runner:mutation (run-mutation-only.ts: collect + Stryker)', 'cyan');
    const mutationStartTime = Date.now();
    securityTestsRun.mutationAttempted = true;
    
    const mutationPlanPath = path.join(testRunnerReportJsonDir, 'mutation-plan.json');
    let mutationTargetCount = 0;
    let mutationTargets: Array<{ file: string; symbolName: string; kind: string; reason?: string }> = [];
    if (fs.existsSync(mutationPlanPath)) {
        try {
            const plan = JSON.parse(fs.readFileSync(mutationPlanPath, 'utf-8'));
            mutationTargetCount = plan.targets?.length || 0;
            mutationTargets = plan.targets || [];
        } catch {
            void 0;
        }
    }
    
    try {
        const { code, output } = await runCommandWithOutput('npm', ['run', 'test:runner:mutation'], {
            toolLogStream: mutationLogStream,
        });
        const mutationExitCode = code;
        const mutationDuration = parseFloat(((Date.now() - mutationStartTime) / 1000).toFixed(1));
        if (fs.existsSync(mutationPlanPath)) {
            try {
                const plan = JSON.parse(fs.readFileSync(mutationPlanPath, 'utf-8'));
                mutationTargetCount = plan.targets?.length || 0;
                mutationTargets = plan.targets || [];
            } catch {
                void 0;
            }
        }
        console.log('');
        if (mutationExitCode === 0) {
            securityTestsRun.mutation = true;
            log(`  [PASS] Mutation tests completed successfully in ${mutationDuration} s`, 'green');
            log('  Mutation Test Summary:', 'cyan');
            log(`    Targets tested: ${mutationTargetCount}`, 'green');
            log(`    Duration: ${mutationDuration} s`, 'gray');
            log('    All mutants were killed (tests detected all mutations)', 'green');
            
            mutationResult = {
                name: 'Stryker Mutation Testing',
                status: 'passed',
                duration: mutationDuration,
                output: output,
                summary: `Mutation tests passed. Tested ${mutationTargetCount} @mutation-decorated target(s). All mutants killed.`,
                targets: mutationTargets.map(t => ({
                    symbol: t.symbolName,
                    kind: t.kind,
                    file: t.file,
                    reason: t.reason,
                })),
            };
        } else {
            log(`  [FAIL] Mutation tests exited with code ${mutationExitCode}`, 'red');
            log('  Mutation Test Summary:', 'cyan');
            log(`    Targets tested: ${mutationTargetCount}`, 'yellow');
            log(`    Duration: ${mutationDuration} s`, 'gray');
            log('    Some mutants survived (check Stryker report for details)', 'yellow');
            log('    Review surviving mutants and strengthen test assertions', 'gray');
            
            mutationResult = {
                name: 'Stryker Mutation Testing',
                status: 'failed',
                duration: mutationDuration,
                output: output,
                summary: `Mutation tests failed (exit code ${mutationExitCode}). Tested ${mutationTargetCount} target(s). Some mutants survived.`,
                targets: mutationTargets.map(t => ({
                    symbol: t.symbolName,
                    kind: t.kind,
                    file: t.file,
                    reason: t.reason,
                })),
            };
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`  [FAIL] Mutation tests encountered an error: ${errorMessage}`, 'red');
        const mutationDuration = parseFloat(((Date.now() - mutationStartTime) / 1000).toFixed(1));
        log(`  Duration: ${mutationDuration} s`, 'gray');
        
        mutationResult = {
            name: 'Stryker Mutation Testing',
            status: 'failed',
            duration: mutationDuration,
            output: errorMessage,
            summary: `Mutation tests failed: ${errorMessage}`,
            targets: mutationTargets.map(t => ({
                symbol: t.symbolName,
                kind: t.kind,
                file: t.file,
                reason: t.reason,
            })),
        };
    }
    
    fs.writeFileSync(mutationJsonPath, JSON.stringify(mutationResult, null, 2), 'utf-8');
}

async function runObservabilityVerification(testOptions: TestOptions, securityTestsRun: SecurityTestResults): Promise<void> {
    if (!testOptions.runObservability) {
        log('STEP 4.7/9: Skipping Observability verification (disabled by user)', 'gray');
        securityTestsRun.observabilityAttempted = false;
        return;
    }

    log('STEP 4.7/9: Verifying observability hooks (REQUIRED per SECURITY_TESTING.md)...', 'yellow');
    log('  Running observability verification tests...', 'cyan');
    const observabilityStartTime = Date.now();
    securityTestsRun.observabilityAttempted = true;
    try {
        const { code } = await runCommandWithOutput('npx', [
            '--yes',
            'vitest',
            'run',
            'tests/integration/observability.test.ts',
            '--reporter=verbose',
        ]);
        const observabilityExitCode = code;
        
        if (observabilityExitCode === 0) {
            const observabilityDuration = ((Date.now() - observabilityStartTime) / 1000).toFixed(1);
            log(`  [PASS] Observability verification completed in ${observabilityDuration} s`, 'green');
            securityTestsRun.observability = true;
        } else {
            log(`  [WARN] Observability verification exited with code ${observabilityExitCode}`, 'yellow');
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`  [WARN] Observability verification had issues: ${errorMessage}`, 'yellow');
    }
}

const codeqlChecksumPath = path.join(testRunnerDatabasesDir, '.codeql-db-checksum.json');

async function computeSourceChecksum(): Promise<string> {
    const srcDir = path.join(cloudflareDir, 'src');
    const files: string[] = [];

    function collectFiles(dir: string): void {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                collectFiles(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                files.push(fullPath);
            }
        }
    }

    collectFiles(srcDir);
    files.sort();

    const hashPromises = files.map(file =>
        new Promise<string>((resolve) => {
            const content = fs.readFileSync(file, 'utf-8');
            const hash = crypto.createHash('md5').update(content).digest('hex');
            resolve(`${path.relative(cloudflareDir, file)}:${hash}`);
        })
    );

    const fileHashes = await Promise.all(hashPromises);

    const combinedHash = crypto.createHash('sha256')
        .update(fileHashes.join('\n'))
        .digest('hex');

    return combinedHash;
}

function loadSavedChecksum(): { checksum: string; timestamp: string } | null {
    try {
        if (fs.existsSync(codeqlChecksumPath)) {
            return JSON.parse(fs.readFileSync(codeqlChecksumPath, 'utf-8'));
        }
    } catch (_error: unknown) {
        void _error;
    }
    return null;
}

function saveChecksum(checksum: string): void {
    const data = {
        checksum,
        timestamp: new Date().toISOString(),
        sourceDir: path.join(cloudflareDir, 'src'),
    };
    fs.writeFileSync(codeqlChecksumPath, JSON.stringify(data, null, 2), 'utf-8');
}

async function createCodeQLDatabase(codeqlCommand: string, codeqlDatabasePath: string, forceRebuild = false): Promise<boolean> {
    if (!forceRebuild && fs.existsSync(codeqlDatabasePath)) {
        log('    Checking if existing CodeQL database can be reused...', 'gray');
        const startTime = Date.now();

        const savedChecksum = loadSavedChecksum();
        if (savedChecksum) {
            const currentChecksum = await computeSourceChecksum();
            const checksumTime = ((Date.now() - startTime) / 1000).toFixed(2);

            if (currentChecksum === savedChecksum.checksum) {
                log(`    [CACHE HIT] Source files unchanged (checksum verified in ${checksumTime}s)`, 'green');
                log(`    Database created: ${savedChecksum.timestamp}`, 'gray');
                log('    Skipping database recreation - reusing existing database', 'green');
                return true; // Database is valid, skip recreation
            } else {
                log(`    [CACHE MISS] Source files changed (checksum computed in ${checksumTime}s)`, 'yellow');
                log('    Will rebuild database...', 'gray');
            }
        } else {
            log('    No saved checksum found - will rebuild database', 'gray');
        }

        log('    Removing old CodeQL database...', 'gray');
        fs.rmSync(codeqlDatabasePath, { recursive: true, force: true });
    } else if (fs.existsSync(codeqlDatabasePath)) {
        log('    Force rebuild requested - removing old CodeQL database...', 'gray');
        fs.rmSync(codeqlDatabasePath, { recursive: true, force: true });
    }

    log('    Creating CodeQL database (multi-threaded)...', 'gray');
    log('    Note: This may take several minutes. Extracting source files...', 'gray');
    log('    Only scanning src/ and tests/ directories (excluding all dev/build artifacts)', 'gray');
    
    const codeqlCreateStartTime = Date.now();
    let lastProgressLog = Date.now();
    let lastHeartbeatLog = Date.now();
    const progressInterval = 5000;
    const heartbeatInterval = 30000;
    let extractedFiles = 0;
    let currentPhase = 'Initializing';
    
    const codeqlConfigPath = path.join(cloudflareDir, 'codeql-config.yml');

    const codeqlArgs = [
        'database',
        'create',
        codeqlDatabasePath,
        '--language=javascript',
        '--threads=0',
        '--verbosity=progress+++',  // Maximum verbosity for extraction progress
        `--source-root=${cloudflareDir}`,
        `--codescanning-config=${codeqlConfigPath}`,  // Use config with paths-ignore for exclusions
    ];
    
    log(`    Executing: ${codeqlCommand} ${codeqlArgs.join(' ')}`, 'gray');
    
    const heartbeatIntervalId = setInterval(() => {
        const now = Date.now();
        if (now - lastHeartbeatLog >= heartbeatInterval) {
            const elapsed = ((now - codeqlCreateStartTime) / 1000).toFixed(0);
            log(`    [Progress] Still running... (${elapsed}s elapsed, phase: ${currentPhase})`, 'gray');
            lastHeartbeatLog = now;
        }
    }, heartbeatInterval);
    
    try {
        const { code: createCode, output: createOutput } = await runCommandWithOutput(codeqlCommand, codeqlArgs, {
            timeout: 900000,
            onProgress: (text: string) => {
                const now = Date.now();
                const lines = text.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    
                    if (trimmed.includes('Extracting') || trimmed.includes('extracting')) {
                        currentPhase = 'Extracting';
                        const fileMatch = trimmed.match(/(\d+)\s+file/i);
                        if (fileMatch) {
                            extractedFiles = parseInt(fileMatch[1], 10);
                        }
                        
                        if (now - lastProgressLog >= progressInterval) {
                            const elapsed = ((now - codeqlCreateStartTime) / 1000).toFixed(1);
                            if (extractedFiles > 0) {
                                log(`    [Progress] Extracting files... (${extractedFiles} files, ${elapsed}s elapsed)`, 'cyan');
                            } else {
                                log(`    [Progress] Extracting source files... (${elapsed}s elapsed)`, 'cyan');
                            }
                            lastProgressLog = now;
                            lastHeartbeatLog = now;
                        }
                    } else if (trimmed.includes('Done extracting') || trimmed.includes('done extracting') || trimmed.match(/done.*extract/i)) {
                        currentPhase = 'Extraction Complete';
                        const elapsed = ((now - codeqlCreateStartTime) / 1000).toFixed(1);
                        log(`    [Progress] Extraction complete (${elapsed}s elapsed)`, 'green');
                        lastProgressLog = now;
                        lastHeartbeatLog = now;
                    } else if (trimmed.includes('Finalizing') || trimmed.includes('finalizing')) {
                        currentPhase = 'Finalizing';
                        if (now - lastProgressLog >= progressInterval) {
                            const elapsed = ((now - codeqlCreateStartTime) / 1000).toFixed(1);
                            log(`    [Progress] Finalizing database... (${elapsed}s elapsed)`, 'cyan');
                            lastProgressLog = now;
                            lastHeartbeatLog = now;
                        }
                    } else if (trimmed.match(/\d+%/i)) {
                        const percentMatch = trimmed.match(/(\d+)%/i);
                        if (percentMatch) {
                            currentPhase = `Progress ${percentMatch[1]}%`;
                            if (now - lastProgressLog >= progressInterval) {
                                const elapsed = ((now - codeqlCreateStartTime) / 1000).toFixed(1);
                                log(`    [Progress] ${percentMatch[1]}% complete (${elapsed}s elapsed)`, 'cyan');
                                lastProgressLog = now;
                                lastHeartbeatLog = now;
                            }
                        }
                    } else if (trimmed.includes('Creating') || trimmed.includes('creating')) {
                        currentPhase = 'Creating Database';
                        if (now - lastProgressLog >= progressInterval) {
                            const elapsed = ((now - codeqlCreateStartTime) / 1000).toFixed(1);
                            log(`    [Progress] Creating database structure... (${elapsed}s elapsed)`, 'cyan');
                            lastProgressLog = now;
                            lastHeartbeatLog = now;
                        }
                    }
                }
            },
            toolLogStream: codeqlLogStream,
        });
        
        clearInterval(heartbeatIntervalId);
        
        if (createCode !== 0) {
            const errorDetails = createOutput.trim() || 'No output captured';
            const errorPreview = errorDetails.length > 500 ? errorDetails.substring(0, 500) + '...' : errorDetails;
            log(`    CodeQL database creation failed with exit code ${createCode}`, 'yellow');
            log(`    Error output (first 500 chars): ${errorPreview}`, 'gray');
            throw new Error(`CodeQL database creation failed with exit code ${createCode}: ${errorPreview}`);
        }
        
        const createDuration = ((Date.now() - codeqlCreateStartTime) / 1000).toFixed(1);
        log(`    Database creation completed in ${createDuration} s`, 'green');

        const checksum = await computeSourceChecksum();
        saveChecksum(checksum);
        log('    Saved source checksum for future cache validation', 'gray');

        return false; // Database was rebuilt
    } catch (error) {
        clearInterval(heartbeatIntervalId);
        throw error;
    }
}

async function runCodeQLAnalysis(codeqlCommand: string, codeqlDatabasePath: string, codeqlStartTime: number, securityTestsRun: SecurityTestResults): Promise<void> {
    log('    Installing CodeQL query packs (if needed)...', 'gray');
    try {
        await runCommand(codeqlCommand, [
            'pack',
            'download',
            'codeql/javascript-queries',
        ]);
        log('    Query pack installed/updated successfully', 'green');
    } catch {
        log('    Note: Query pack download had issues (may already be installed)', 'gray');
        log('    Attempting analysis with existing query packs...', 'gray');
    }
    
    log('    Running CodeQL analysis (multi-threaded)...', 'gray');
    let codeqlExitCode: number;
    try {
        codeqlExitCode = await runCommand(codeqlCommand, [
            'database',
            'analyze',
            codeqlDatabasePath,
            '--format=sarif-latest',
            `--output=${path.join(testRunnerReportJsonDir, 'codeql-results.sarif')}`,
            'codeql/javascript-queries',
            '--threads=0',
        ]);
    } catch {
        log('    Retrying with default query pack...', 'yellow');
        codeqlExitCode = await runCommand(codeqlCommand, [
            'database',
            'analyze',
            codeqlDatabasePath,
            '--format=sarif-latest',
            `--output=${path.join(testRunnerReportJsonDir, 'codeql-results.sarif')}`,
            '--threads=0',
        ]);
    }
    
    if (codeqlExitCode === 0) {
        const codeqlResultsPath = path.join(testRunnerReportJsonDir, 'codeql-results.sarif');
        let findings = 0;
        if (fs.existsSync(codeqlResultsPath)) {
            try {
                const codeqlSarif = JSON.parse(fs.readFileSync(codeqlResultsPath, 'utf-8'));
                findings = codeqlSarif.runs?.[0]?.results?.length || 0;
            } catch {
                findings = 0;
            }
        }
        
        const codeqlJsonPath = path.join(testRunnerReportJsonDir, 'codeql-results.json');
        const codeqlResult = {
            name: 'CodeQL Static Analysis',
            status: findings === 0 ? 'passed' : 'failed',
            duration: parseFloat(((Date.now() - codeqlStartTime) / 1000).toFixed(1)),
            findings: findings,
            summary: findings === 0 ? 'No security findings' : `Found ${findings} security findings`,
            sarifPath: codeqlResultsPath,
        };
        fs.writeFileSync(codeqlJsonPath, JSON.stringify(codeqlResult, null, 2), 'utf-8');
        
        securityTestsRun.staticAnalysis.codeql = true;
        const codeqlDuration = ((Date.now() - codeqlStartTime) / 1000).toFixed(1);
        log(`  [PASS] CodeQL completed in ${codeqlDuration} s`, 'green');
        if (findings > 0) {
            log(`    Found ${findings} findings`, 'yellow');
        }
    } else {
        log(`  [WARN] CodeQL analysis failed with exit code ${codeqlExitCode}`, 'yellow');
        securityTestsRun.staticAnalysis.codeql = true;
        
        const codeqlJsonPath = path.join(testRunnerReportJsonDir, 'codeql-results.json');
        const codeqlResult = {
            name: 'CodeQL Static Analysis',
            status: 'warning',
            exitCode: codeqlExitCode,
            errorType: 'execution_error',
            duration: parseFloat(((Date.now() - codeqlStartTime) / 1000).toFixed(1)),
            findings: 0,
            summary: `CodeQL analysis failed with exit code ${codeqlExitCode}`,
            errorMessage: `Analysis returned exit code ${codeqlExitCode}`,
            sarifPath: undefined,
        };
        fs.writeFileSync(codeqlJsonPath, JSON.stringify(codeqlResult, null, 2), 'utf-8');
    }
}

async function runCodeQLTest(securityTestsRun: SecurityTestResults): Promise<void> {
    log('  [3/3] Starting CodeQL...', 'cyan');
    const codeqlStartTime = Date.now();
    try {
        const codeqlCommand = process.platform === 'win32' && !process.env.PATH?.includes('codeql')
            ? 'E:\\tools\\codeql\\codeql.exe'
            : 'codeql';
        const codeqlDatabasePath = path.join(testRunnerDatabasesDir, 'codeql-database');

        const forceRebuild = process.argv.includes('--force-codeql-rebuild');
        const cacheUsed = await createCodeQLDatabase(codeqlCommand, codeqlDatabasePath, forceRebuild);

        if (cacheUsed) {
            log('    Using cached database - running analysis only...', 'green');
        }

        await runCodeQLAnalysis(codeqlCommand, codeqlDatabasePath, codeqlStartTime, securityTestsRun);
    } catch (error: unknown) {
        const codeqlJsonPath = path.join(testRunnerReportJsonDir, 'codeql-results.json');
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        const isNotInstalled = error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
        const isCommandSyntaxError = errorMessage.includes('Unmatched arguments') || errorMessage.includes('database creation failed');
        
        if (isNotInstalled) {
            log('  [FAIL] CodeQL not installed', 'red');
            log('    REQUIRED: Download from https://github.com/github/codeql-cli-binaries/releases', 'yellow');
            securityTestsRun.staticAnalysis.codeql = false;
        } else {
            log(`  [WARN] CodeQL had issues: ${errorMessage}`, 'yellow');
            if (isCommandSyntaxError) {
                log('    Note: This appears to be a command syntax error, not an installation issue', 'gray');
            }
            securityTestsRun.staticAnalysis.codeql = true;
        }
        
        let errorOutput = errorMessage;
        if (error instanceof Error && error.message.includes('CodeQL database creation failed')) {
            const outputMatch = error.message.match(/CodeQL database creation failed with exit code \d+: (.+)/);
            if (outputMatch) {
                errorOutput = outputMatch[1];
            }
        }
        
        const codeqlResult = {
            name: 'CodeQL Static Analysis',
            status: isNotInstalled ? 'failed' : 'warning',
            exitCode: isNotInstalled ? undefined : 2,
            errorType: isNotInstalled ? 'not_installed' : 'execution_error',
            duration: parseFloat(((Date.now() - codeqlStartTime) / 1000).toFixed(1)),
            findings: 0,
            summary: isNotInstalled 
                ? 'CodeQL not installed - download from https://github.com/github/codeql-cli-binaries/releases'
                : `CodeQL execution failed: ${errorMessage}`,
            errorMessage: errorOutput,
            fullError: errorMessage,
            sarifPath: undefined,
        };
        fs.writeFileSync(codeqlJsonPath, JSON.stringify(codeqlResult, null, 2), 'utf-8');
    }
}

async function runSemgrepTest(securityTestsRun: SecurityTestResults): Promise<void> {
    log('  [1/3] Starting Semgrep...', 'cyan');
    const semgrepStartTime = Date.now();
    const semgrepJsonPath = path.join(testRunnerReportJsonDir, 'semgrep-results.json');
    const semgrepRawOutputPath = path.join(testRunnerReportJsonDir, 'semgrep-raw-output.json');

    try {
        const { code, output } = await runCommandWithOutput('semgrep', [
            '--config=auto',
            '--json',
            '--output', semgrepRawOutputPath,  // Write JSON to file directly
            '--exclude=test-runner',
            '--exclude=node_modules',
            '--exclude=.stryker-tmp',
            '--exclude=.wrangler',
            '--exclude=dist',
            '--exclude=coverage',
            path.join(cloudflareDir, 'src'),  // Scan src/ in infra/cloudflare
        ], {
            toolLogStream: semgrepLogStream,
        });

        const isNotInstalled = output.includes('is not recognized') ||
                               output.includes('command not found') ||
                               (code !== 0 && code !== 1 && code !== 2 && !fs.existsSync(semgrepRawOutputPath));

        if (isNotInstalled) {
            log('  [FAIL] Semgrep not installed', 'red');
            log('    REQUIRED: Install with: pip install semgrep', 'yellow');
            log('    Or: pipx install semgrep', 'yellow');

            const semgrepResult = {
                name: 'Semgrep Static Analysis',
                status: 'failed',
                errorType: 'not_installed' as const,
                duration: parseFloat(((Date.now() - semgrepStartTime) / 1000).toFixed(1)),
                findings: 0,
                summary: 'Semgrep not installed - install with: pip install semgrep',
                installCommand: 'pip install semgrep',
                output: output,
            };
            fs.writeFileSync(semgrepJsonPath, JSON.stringify(semgrepResult, null, 2), 'utf-8');
        } else {
            let semgrepJson: { results?: Array<{ check_id?: string; path?: string; start?: { line?: number }; message?: string }> } | null = null;
            let findings = 0;
            let parsedFindings: Array<{ ruleId: string; level: string; message: string; file: string; line: number }> = [];

            if (fs.existsSync(semgrepRawOutputPath)) {
                try {
                    const rawContent = fs.readFileSync(semgrepRawOutputPath, 'utf-8');
                    semgrepJson = JSON.parse(rawContent);
                    findings = semgrepJson?.results?.length || 0;

                    if (semgrepJson?.results) {
                        parsedFindings = semgrepJson.results.map(r => ({
                            ruleId: r.check_id || 'unknown',
                            level: 'warning',
                            message: r.message || '',
                            file: r.path || '',
                            line: r.start?.line || 0,
                        }));
                    }

                    log(`    Found ${findings} findings`, findings === 0 ? 'green' : 'yellow');
                } catch (parseError) {
                    log(`    Could not parse Semgrep output file: ${parseError instanceof Error ? parseError.message : String(parseError)}`, 'yellow');
                }
            } else {
                try {
                    semgrepJson = JSON.parse(output);
                    findings = semgrepJson?.results?.length || 0;
                    log(`    Found ${findings} findings (from stdout)`, findings === 0 ? 'green' : 'yellow');
                } catch {
                    log('    Semgrep completed but no output file generated', 'yellow');
                }
            }

            const semgrepResult = {
                name: 'Semgrep Static Analysis',
                status: findings === 0 ? 'passed' : 'failed',
                duration: parseFloat(((Date.now() - semgrepStartTime) / 1000).toFixed(1)),
                findings: findings,
                parsedFindings: parsedFindings.length > 0 ? parsedFindings : undefined,
                summary: findings === 0 ? 'No security findings' : `Found ${findings} security findings`,
                resultsPath: fs.existsSync(semgrepRawOutputPath) ? semgrepRawOutputPath : undefined,
            };
            fs.writeFileSync(semgrepJsonPath, JSON.stringify(semgrepResult, null, 2), 'utf-8');

            securityTestsRun.staticAnalysis.semgrep = true;
            const semgrepDuration = ((Date.now() - semgrepStartTime) / 1000).toFixed(1);
            log(`  [PASS] Semgrep completed in ${semgrepDuration} s`, 'green');
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            log('  [FAIL] Semgrep not installed', 'red');
            log('    REQUIRED: Install with: pip install semgrep', 'yellow');
        } else {
            log(`  [WARN] Semgrep had issues: ${errorMessage}`, 'yellow');
        }

        const semgrepResult = {
            name: 'Semgrep Static Analysis',
            status: 'failed',
            errorType: (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') ? 'not_installed' as const : 'execution_error' as const,
            duration: parseFloat(((Date.now() - semgrepStartTime) / 1000).toFixed(1)),
            findings: 0,
            summary: `Semgrep failed: ${errorMessage}`,
            installCommand: 'pip install semgrep',
            output: errorMessage,
        };
        fs.writeFileSync(semgrepJsonPath, JSON.stringify(semgrepResult, null, 2), 'utf-8');
    }
}

async function runTrivyTest(securityTestsRun: SecurityTestResults): Promise<void> {
    log('  [2/3] Starting Trivy...', 'cyan');
    const trivyStartTime = Date.now();
    try {
        const trivyCommand = process.platform === 'win32' && !process.env.PATH?.includes('trivy')
            ? 'E:\\tools\\trivy_0.68.2_windows-64bit\\trivy.exe'
            : 'trivy';

        log('    Scanning for vulnerabilities...', 'gray');
        const trivyArgs = [
            'fs',
            '--severity',
            'CRITICAL,HIGH',
            '--format',
            'json',
            '--output',
            path.join(testRunnerReportJsonDir, 'trivy-results.json'),
            '--skip-dirs',
            'test-runner,node_modules,.stryker-tmp,.wrangler,dist,coverage',
            '--db-repository',
            'public.ecr.aws/aquasecurity/trivy-db:2',
            '--db-repository',
            'mirror.gcr.io/aquasec/trivy-db:2',
            '--db-repository',
            'ghcr.io/aquasecurity/trivy-db:2',
            '--java-db-repository',
            'public.ecr.aws/aquasecurity/trivy-java-db:1',
            '--java-db-repository',
            'mirror.gcr.io/aquasec/trivy-java-db:1',
            '--java-db-repository',
            'ghcr.io/aquasecurity/trivy-java-db:1',
        ];

        trivyArgs.push(cloudflareDir);

        const { code, output } = await runCommandWithOutput(trivyCommand, trivyArgs, {
            toolLogStream: trivyLogStream,
        });
        
        if (code === 0 || code === 1) {
            const trivyResultsPath = path.join(testRunnerReportJsonDir, 'trivy-results.json');
            let vulns = 0;
            let targets: Array<{ target: string; type: string; class?: string; packages?: number }> = [];
            let totalPackages = 0;
            let dbMetadata: { updatedAt?: string; nextUpdate?: string; version?: number } | undefined;
            try {
                let trivyJson: {
                    Metadata?: {
                        UpdatedAt?: string;
                        NextUpdate?: string;
                        Version?: number;
                    };
                    Results?: Array<{ 
                        Target?: string;
                        Type?: string;
                        Class?: string;
                        Vulnerabilities?: unknown[];
                        Packages?: Array<{ Name?: string; Version?: string }>;
                    }>;
                };
                
                if (fs.existsSync(trivyResultsPath)) {
                    trivyJson = JSON.parse(fs.readFileSync(trivyResultsPath, 'utf-8'));
                } else {
                    trivyJson = JSON.parse(output);
                }
                
                if (trivyJson.Metadata) {
                    dbMetadata = {
                        updatedAt: trivyJson.Metadata.UpdatedAt,
                        nextUpdate: trivyJson.Metadata.NextUpdate,
                        version: trivyJson.Metadata.Version
                    };
                }
                
                if (trivyJson.Results) {
                    vulns = trivyJson.Results.flatMap((r) => r.Vulnerabilities || []).length;
                    targets = trivyJson.Results.map((r) => {
                        const packageCount = r.Packages?.length || 0;
                        totalPackages += packageCount;
                        return {
                            target: r.Target || 'Unknown',
                            type: r.Type || 'filesystem',
                            class: r.Class,
                            packages: packageCount
                        };
                    });
                }
                log(`    Found ${vulns} vulnerabilities across ${targets.length} target(s)`, vulns === 0 ? 'green' : 'red');
                if (totalPackages > 0) {
                    log(`    Scanned ${totalPackages} packages`, 'gray');
                }
                if (dbMetadata?.updatedAt) {
                    log(`    Database updated: ${dbMetadata.updatedAt}`, 'gray');
                }
            } catch {
                log('    Trivy scan completed', 'green');
            }
            
            let dbDownloadFailed = false;
            let dbDownloadError: string | undefined;
            if (output.includes('FATAL') && (output.includes('failed to download vulnerability DB') || output.includes('DB error'))) {
                dbDownloadFailed = true;
                if (output.includes('TOOMANYREQUESTS') || output.includes('rate limit')) {
                    dbDownloadError = 'Registry rate limit reached - Trivy tried multiple public registries (AWS ECR Public, GCR Mirror, GHCR) but all hit rate limits. Using cached database.';
                } else if (output.includes('docker-credential') || output.includes('credsStore')) {
                    dbDownloadError = 'Unexpected credential helper error with public registries. Trivy should not need authentication. Using cached database.';
                } else {
                    dbDownloadError = 'Failed to download vulnerability database from all configured public registries - using cached database';
                }
            }
            
            const trivyJsonPath = path.join(testRunnerReportJsonDir, 'trivy-results.json');
            let status: 'passed' | 'failed' | 'warning' = vulns === 0 ? 'passed' : 'failed';
            let summary = vulns === 0 ? 'No CRITICAL or HIGH vulnerabilities found' : `Found ${vulns} CRITICAL or HIGH vulnerabilities`;
            
            if (dbDownloadFailed) {
                status = 'warning';
                summary = `${summary} (WARNING: Vulnerability database may be outdated - ${dbDownloadError})`;
                log('    [WARN] Trivy database download failed - using cached database', 'yellow');
                log(`    [WARN] ${dbDownloadError}`, 'yellow');
                log('    [WARN] Scan completed but results may be incomplete due to outdated database', 'yellow');
            }
            
            const trivyResult = {
                name: 'Trivy Vulnerability Scanner',
                status: status,
                duration: parseFloat(((Date.now() - trivyStartTime) / 1000).toFixed(1)),
                vulnerabilities: vulns,
                summary: summary,
                resultsPath: trivyResultsPath,
                errorType: dbDownloadFailed ? 'execution_error' as const : undefined,
                errorMessage: dbDownloadError,
                targets: targets.length > 0 ? targets : undefined,
                dbMetadata: dbMetadata,
            };
            fs.writeFileSync(trivyJsonPath, JSON.stringify(trivyResult, null, 2), 'utf-8');
            
            securityTestsRun.staticAnalysis.trivy = true;
            const trivyDuration = ((Date.now() - trivyStartTime) / 1000).toFixed(1);
            if (dbDownloadFailed) {
                log(`  [WARN] Trivy completed in ${trivyDuration} s (database update failed)`, 'yellow');
            } else {
                log(`  [PASS] Trivy completed in ${trivyDuration} s`, 'green');
            }
        } else {
            const trivyJsonPath = path.join(testRunnerReportJsonDir, 'trivy-results.json');
            const trivyResult = {
                name: 'Trivy Vulnerability Scanner',
                status: 'failed',
                duration: parseFloat(((Date.now() - trivyStartTime) / 1000).toFixed(1)),
                vulnerabilities: 0,
                summary: `Trivy exited with code ${code}`,
                resultsPath: undefined,
            };
            fs.writeFileSync(trivyJsonPath, JSON.stringify(trivyResult, null, 2), 'utf-8');
            log('  [FAIL] Trivy exited with non-zero code', 'red');
        }
    } catch (error: unknown) {
        const trivyJsonPath = path.join(testRunnerReportJsonDir, 'trivy-results.json');
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            log('  [FAIL] Trivy not installed', 'red');
            log('    REQUIRED: Download from https://aquasecurity.github.io/trivy/latest/getting-started/installation/', 'yellow');
        } else {
            log(`  [WARN] Trivy had issues: ${errorMessage}`, 'yellow');
        }
        
        const trivyResult = {
            name: 'Trivy Vulnerability Scanner',
            status: 'failed',
            duration: parseFloat(((Date.now() - trivyStartTime) / 1000).toFixed(1)),
            vulnerabilities: 0,
            summary: `Trivy failed: ${errorMessage}`,
            resultsPath: undefined,
        };
        fs.writeFileSync(trivyJsonPath, JSON.stringify(trivyResult, null, 2), 'utf-8');
    }
}

async function runStaticAnalysis(testOptions: TestOptions, securityTestsRun: SecurityTestResults): Promise<void> {
    if (!testOptions.runStaticAnalysis) {
        log('STEP 4.8/9: Skipping Static Analysis (disabled by user)', 'gray');
        return;
    }

    log('STEP 4.8/9: Running static analysis sequentially (REQUIRED per SECURITY_TESTING.md)...', 'yellow');
    log('  Note: Static analysis tools must be installed separately', 'gray');
    log('  All tools are required - install missing tools to complete security testing', 'yellow');
    log('  Running Semgrep → Trivy → CodeQL sequentially (each tool gets full system resources)', 'green');
    log('  This prevents resource contention and improves stability for heavy tools like CodeQL', 'gray');
    console.log('');

    await runSemgrepTest(securityTestsRun);
    await runTrivyTest(securityTestsRun);
    await runCodeQLTest(securityTestsRun);

    log('  All static analysis tools completed', 'green');

    const staticAnalysisRun = securityTestsRun.staticAnalysis.semgrep && 
                              securityTestsRun.staticAnalysis.codeql && 
                              securityTestsRun.staticAnalysis.trivy;
    if (!staticAnalysisRun) {
        log('  [WARN] Some static analysis tools failed or were not installed', 'yellow');
    }
}

function printSecuritySummary(securityTestsRun: SecurityTestResults): void {
    console.log('');
    log('  Security Test Summary (per SECURITY_TESTING.md):', 'cyan');
    log(`    Schemathesis (API Fuzzing):     ${securityTestsRun.schemathesis ? '[PASS] Run' : '[SKIP] Skipped'}`, 
        securityTestsRun.schemathesis ? 'green' : 'yellow');
    log(`    k6 (Concurrency/Load):         ${securityTestsRun.k6 ? '[PASS] Run' : '[SKIP] Skipped'}`, 
        securityTestsRun.k6 ? 'green' : 'yellow');
    
    const mutationStatus = securityTestsRun.mutation 
        ? '[PASS] All mutants killed' 
        : securityTestsRun.mutationAttempted 
            ? '[FAIL] Some mutants survived' 
            : '[SKIP] No @mutation JSDoc tags detected';
    log(`    Stryker (Mutation):             ${mutationStatus}`, 
        securityTestsRun.mutation ? 'green' : securityTestsRun.mutationAttempted ? 'red' : 'yellow');
    
    if (securityTestsRun.mutationAttempted || securityTestsRun.mutation) {
        const mutationJsonPath = path.join(testRunnerReportJsonDir, 'mutation-results.json');
        if (fs.existsSync(mutationJsonPath)) {
            try {
                const mutationResult = JSON.parse(fs.readFileSync(mutationJsonPath, 'utf-8'));
                if (mutationResult.targets && mutationResult.targets.length > 0) {
                    log(`      Targets tested: ${mutationResult.targets.length}`, 'gray');
                    mutationResult.targets.slice(0, 3).forEach((t: { symbol: string; kind: string }) => {
                        log(`        - ${t.symbol} (${t.kind})`, 'gray');
                    });
                    if (mutationResult.targets.length > 3) {
                        log(`        ... and ${mutationResult.targets.length - 3} more`, 'gray');
                    }
                }
            } catch (_error: unknown) {
                void _error;
            }
        }
    }
    
    const observabilityStatus = securityTestsRun.observability 
        ? '[PASS] Run' 
        : securityTestsRun.observabilityAttempted 
            ? '[FAIL] Attempted' 
            : '[SKIP] Skipped';
    log(`    Observability Verification:     ${observabilityStatus}`, 
        securityTestsRun.observability ? 'green' : securityTestsRun.observabilityAttempted ? 'red' : 'yellow');
    
    log('    Static Analysis:', 'cyan');
    const semgrepStatus = securityTestsRun.staticAnalysis.semgrep ? '[PASS] Run' : '[FAIL] Not installed';
    log(`      - Semgrep:                    ${semgrepStatus}`, 
        securityTestsRun.staticAnalysis.semgrep ? 'green' : 'red');
    
    const codeqlStatusFile = path.join(testRunnerReportJsonDir, 'codeql-results.json');
    let codeqlStatus = securityTestsRun.staticAnalysis.codeql ? '[PASS] Run' : '[FAIL] Not installed';
    let codeqlStatusColor: 'green' | 'yellow' | 'red' = securityTestsRun.staticAnalysis.codeql ? 'green' : 'red';
    if (fs.existsSync(codeqlStatusFile)) {
        try {
            const codeqlResult = JSON.parse(fs.readFileSync(codeqlStatusFile, 'utf-8'));
            if (codeqlResult.status === 'warning' || (codeqlResult.errorType && codeqlResult.errorType !== 'not_installed')) {
                codeqlStatus = '[WARN] Execution error';
                codeqlStatusColor = 'yellow';
            } else if (codeqlResult.status === 'failed' && codeqlResult.errorType === 'not_installed') {
                codeqlStatus = '[FAIL] Not installed';
                codeqlStatusColor = 'red';
            }
        } catch (_error: unknown) {
            void _error;
        }
    }
    log(`      - CodeQL:                     ${codeqlStatus}`, codeqlStatusColor);
    
    const trivyStatus = securityTestsRun.staticAnalysis.trivy ? '[PASS] Run' : '[FAIL] Not installed';
    log(`      - Trivy:                      ${trivyStatus}`, 
        securityTestsRun.staticAnalysis.trivy ? 'green' : 'red');
}

async function stopWorker(workerStartedByScript: boolean, workerJob: ReturnType<typeof spawn> | null): Promise<void> {
    console.log('');
    log('STEP 4.9/9: Stopping worker (if started by script)...', 'yellow');
    if (workerStartedByScript && workerJob && !workerJob.killed) {
        log('  Stopping unified worker helper...', 'gray');
        await killProcess(workerJob, 'SIGTERM', 2000);
        log('  Worker job stopped', 'green');
    } else {
        log('  [SKIP] Worker was not started by script (using existing or real worker)', 'gray');
    }
}

async function generateTestReport(jsonOutputPath: string): Promise<void> {
    console.log('');
    log('STEP 6/9: Generating HTML test report...', 'yellow');

        if (fs.existsSync(jsonOutputPath)) {
            log(`  Found test results JSON: ${jsonOutputPath}`, 'green');
            log('  Generating HTML report...', 'cyan');

            const reportExitCode = await runCommand('npx', [
                '--yes',
                'tsx',
                path.join(testRunnerScriptsDir, 'report', 'generate-test-report.ts'),
            ]);

            if (reportExitCode === 0) {
                log('  [OK] HTML report generated successfully', 'green');
            } else {
                log(`  [WARN] Report generation had issues (exit code: ${reportExitCode})`, 'yellow');
            }
        } else {
            log(`  [WARN] Test results JSON not found: ${jsonOutputPath}`, 'yellow');
        log('     Report generation skipped', 'gray');
    }
}

async function openTestReport(reportPath: string): Promise<void> {
    console.log('');
    log('STEP 7/9: Opening unified test report...', 'yellow');
    log('  Note: Coverage HTML is embedded in the unified report (not opened separately)', 'gray');

    if (fs.existsSync(reportPath)) {
        log(`  Opening unified test report: ${reportPath}`, 'cyan');
        log('     (Includes: Tests + Coverage Summary + Coverage HTML iframe + Analytics)', 'gray');
        const normalizedPath = reportPath.replace(/\\/g, '/');
        try {
            if (process.platform === 'win32') {
                execSync(`start "" "${normalizedPath}"`, { stdio: 'ignore' });
            } else if (process.platform === 'darwin') {
                execSync(`open "${normalizedPath}"`, { stdio: 'ignore' });
            } else {
                execSync(`xdg-open "${normalizedPath}"`, { stdio: 'ignore' });
            }
            log('  [OK] Report opened in browser', 'green');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log(`  [WARN] Could not open report automatically: ${errorMessage}`, 'yellow');
            log(`  Please open manually: file:///${normalizedPath}`, 'gray');
        }
    } else {
        log(`  [WARN] Unified test report not found: ${reportPath}`, 'yellow');
        log('     Report may not have been generated - check for errors above', 'gray');
    }
}

function printSummary(jsonOutputPath: string, reportPath: string, coverageHtmlPath: string, startTime: number): void {
        console.log('');
        log('================================================================', 'green');
        log('         Cloudflare Worker Tests Complete!', 'green');
        log('================================================================', 'green');
        console.log('');

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

        if (fs.existsSync(jsonOutputPath)) {
            try {
                const vitestResults = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf-8'));
            totalTests += vitestResults.numTotalTests;
            totalPassed += vitestResults.numPassedTests;
            totalFailed += vitestResults.numFailedTests;
            } catch {
            totalTests += 0;
        }
    }

    if (totalTests > 0) {
        log(`Total Tests Run: ${totalTests}`, 'cyan');
        log(`  Passed: ${totalPassed} [PASS]`, 'green');
        log(`  Failed: ${totalFailed} [FAIL]`, totalFailed === 0 ? 'green' : 'red');
        const passRate = ((totalPassed / totalTests) * 100).toFixed(1);
        log(`  Pass Rate: ${passRate}%`, 'cyan');
        console.log('');
    }

    if (fs.existsSync(reportPath)) {
        log(`[REPORT] Test Report: ${reportPath}`, 'cyan');
    }
        if (fs.existsSync(coverageHtmlPath)) {
            log(`[REPORT] Coverage Report: ${coverageHtmlPath}`, 'cyan');
        }
        console.log('');

        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`Total execution time: ${totalDuration} s`, 'cyan');
}

async function cleanup(workerStartedByScript: boolean, workerJob: ReturnType<typeof spawn> | null, workerRunning: boolean): Promise<void> {
    if (workerStartedByScript && workerJob && !workerJob.killed) {
        console.log('');
        log('Cleaning up worker job (started by this script)...', 'yellow');
        await killProcess(workerJob, 'SIGTERM', 2000);
    } else if (workerRunning && !workerStartedByScript) {
        console.log('');
        log('Note: Worker was already running (not started by this script)', 'gray');
        log('      Worker process left running for reuse', 'gray');
    }

    const testLogPath = path.join(testRunnerLogsDir, 'test-output.log');
    log('  All log files preserved for debugging:', 'gray');
    log(`    Main log: ${mainLogPath}`, 'gray');
    log(`    Test log: ${testLogPath}`, 'gray');
    log('    (Not deleted for comparison and debugging)', 'gray');

    mainLogStream.end();
}

async function main() {
    printHeader();

    const skipAll = args.includes('--yes');
    const testOptions = await promptForTests(skipAll);

    const startTime = Date.now();
    let workerJob: ReturnType<typeof spawn> | null = null;
    let workerStartedByScript = false;
    let workerRunning = false;
    
    const jsonOutputPath = path.join(testRunnerReportJsonDir, 'test-results.json');
    const coverageHtmlPath = path.join(testRunnerCoverageDir, 'index.html');
    const reportPath = path.join(testRunnerReportsDir, 'test-report.html');

    const securityTestsRun: SecurityTestResults = {
        schemathesis: false,
        k6: false,
        mutation: false,
        mutationAttempted: false,
        observability: false,
        observabilityAttempted: false,
        staticAnalysis: {
            semgrep: false,
            codeql: false,
            trivy: false,
        },
    };

    try {
        process.chdir(cloudflareDir);  // Change to infra/cloudflare where package.json lives

        await runVitestTests(jsonOutputPath, testOptions);
        console.log('');

        await runCoverageAnalysis(testOptions);
        console.log('');

        if (testOptions.runSchemathesis || testOptions.runK6) {
            const workerResult = await startWorkerForSecurityTests();
            workerJob = workerResult.workerJob;
            workerStartedByScript = workerResult.workerStartedByScript;
            workerRunning = workerResult.workerRunning;

            await runSecurityFuzzingTests(workerRunning, testOptions, securityTestsRun);
        }

        console.log('');
        await runMutationTests(testOptions, securityTestsRun);

        console.log('');
        await runObservabilityVerification(testOptions, securityTestsRun);

        console.log('');
        await runStaticAnalysis(testOptions, securityTestsRun);

        printSecuritySummary(securityTestsRun);

        await stopWorker(workerStartedByScript, workerJob);

        await generateTestReport(jsonOutputPath);

        await openTestReport(reportPath);

        printSummary(jsonOutputPath, reportPath, coverageHtmlPath, startTime);
    } catch (error) {
        console.log('');
        log(`ERROR: ${error}`, 'red');
        if (error instanceof Error) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        await cleanup(workerStartedByScript, workerJob, workerRunning);
    }
}

main();
