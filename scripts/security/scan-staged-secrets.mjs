import { execSync, spawnSync } from 'node:child_process';

const DIFF_MAX_BUFFER = 100 * 1024 * 1024;
const LIST_MAX_BUFFER = 50 * 1024 * 1024;

const FORBIDDEN_FILE_PATTERNS = [
  /(^|\/)google-services\.json$/i,
  /(^|\/)GoogleService-Info\.plist$/i,
  /(^|\/)\.env(\..+)?$/i,
  /\.(pem|p12|pfx|key)$/i,
  /(^|\/)id_rsa(\.pub)?$/i
];

const ALLOWED_PATH_PATTERNS = [
  /(^|\/)\.env\.example$/i,
  /(^|\/)\.env\.sample$/i,
  /(^|\/)\.env\.template$/i
];

const SECRET_RULES = [
  {
    name: 'Google API key',
    regex: /AIza[0-9A-Za-z\-_]{35}/
  },
  {
    name: 'Google OAuth client secret',
    regex: /GOCSPX-[0-9A-Za-z\-_]{28,}/
  },
  {
    name: 'GitHub token',
    regex: /\bgh[pousr]_[0-9A-Za-z]{20,}\b/
  },
  {
    name: 'Stripe live secret key',
    regex: /\bsk_live_[0-9A-Za-z]{16,}\b/
  },
  {
    name: 'AWS access key id',
    regex: /\b(A3T[A-Z0-9]|AKIA|ASIA|AGPA|AIDA|ANPA|ANVA|AROA|AIPA)[A-Z0-9]{16}\b/
  },
  {
    name: 'Private key material',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/
  }
];

function run(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: LIST_MAX_BUFFER
  }).trim();
}

function runGitDiffCachedForFile(filePath) {
  const result = spawnSync(
    'git',
    ['diff', '--cached', '--no-color', '--unified=0', '--', filePath],
    {
      encoding: 'utf8',
      maxBuffer: DIFF_MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  if (result.error) {
    return '';
  }
  const out = result.stdout ?? '';
  if (out.startsWith('Binary files ') && out.includes(' differ')) {
    return '';
  }
  return out;
}

function getFiles(command) {
  const output = run(command);
  if (!output) {
    return [];
  }
  return output
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getStagedFiles() {
  return getFiles('git diff --cached --name-only --diff-filter=ACMR');
}

function getTrackedFiles() {
  return getFiles('git ls-files');
}

function isAllowedPath(filePath) {
  return ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}

function isForbiddenPath(filePath) {
  if (isAllowedPath(filePath)) {
    return false;
  }
  return FORBIDDEN_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function collectAddedLines(patchText) {
  const lines = patchText.split('\n');
  return lines
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
}

function scanAddedLinesWithPaths(filePath, addedLines) {
  const findings = [];
  for (const line of addedLines) {
    for (const rule of SECRET_RULES) {
      if (rule.regex.test(line)) {
        const sample = line.length > 160 ? `${line.slice(0, 160)}...` : line;
        findings.push({
          rule: rule.name,
          sample: `${filePath}: ${sample}`
        });
      }
    }
  }
  return findings;
}

function scanStagedPatches(stagedFiles) {
  const findings = [];
  for (const filePath of stagedFiles) {
    if (isAllowedPath(filePath)) {
      continue;
    }
    const patch = runGitDiffCachedForFile(filePath);
    if (!patch) {
      continue;
    }
    const addedLines = collectAddedLines(patch);
    findings.push(...scanAddedLinesWithPaths(filePath, addedLines));
  }
  return findings;
}

function scanFilesContent() {
  const findings = [];
  const grepRules = [
    { name: 'Google API key', regex: 'AIza[0-9A-Za-z_-]{35}' },
    { name: 'Google OAuth client secret', regex: 'GOCSPX-[0-9A-Za-z_-]{28,}' },
    { name: 'GitHub token', regex: 'gh[pousr]_[0-9A-Za-z]{20,}' },
    { name: 'Stripe live secret key', regex: 'sk_live_[0-9A-Za-z]{16,}' },
    { name: 'AWS access key id', regex: '(A3T[A-Z0-9]|AKIA|ASIA|AGPA|AIDA|ANPA|ANVA|AROA|AIPA)[A-Z0-9]{16}' },
    { name: 'Private key material', regex: '-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----' }
  ];

  for (const rule of grepRules) {
    let output = '';
    try {
      output = run(`git grep -n -I -E "${rule.regex}"`);
    } catch {
      output = '';
    }
    if (!output) {
      continue;
    }
    const lines = output
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => {
        const filePath = value.split(':')[0] ?? '';
        return !isAllowedPath(filePath);
      });
    for (const line of lines) {
      findings.push({
        rule: rule.name,
        sample: line.length > 220 ? `${line.slice(0, 220)}...` : line
      });
    }
  }

  return findings;
}

function printBlocked(forbiddenFiles, findings, repoMode) {
  console.error('\n[security] Commit blocked: potential secret exposure detected.\n');

  if (forbiddenFiles.length > 0) {
    console.error(repoMode ? 'Forbidden file(s) detected in repository:' : 'Forbidden file(s) in staged changes:');
    for (const filePath of forbiddenFiles) {
      console.error(`  - ${filePath}`);
    }
    console.error('');
  }

  if (findings.length > 0) {
    console.error('Secret pattern match(es) in added lines:');
    const limited = findings.slice(0, 10);
    for (const finding of limited) {
      console.error(`  - ${finding.rule}: ${finding.sample}`);
    }
    if (findings.length > limited.length) {
      console.error(`  - ...and ${findings.length - limited.length} more`);
    }
    console.error('');
  }

  console.error('How to fix:');
  console.error('  1) Remove secret values from tracked files.');
  console.error('  2) Move sensitive config to environment-specific local files or secret manager.');
  console.error('  3) Unstage with: git restore --staged <file>');
  console.error('  4) If leaked already, rotate credentials immediately.\n');
}

function main() {
  const repoMode = process.argv.includes('--repo');
  const files = repoMode ? getTrackedFiles() : getStagedFiles();
  if (files.length === 0) {
    process.exit(0);
  }

  const forbiddenFiles = files.filter((filePath) => isForbiddenPath(filePath));
  const findings = repoMode ? scanFilesContent() : scanStagedPatches(files);

  if (forbiddenFiles.length > 0 || findings.length > 0) {
    printBlocked(forbiddenFiles, findings, repoMode);
    process.exit(1);
  }

  process.exit(0);
}

main();
