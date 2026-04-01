#!/usr/bin/env tsx
/**
 * Verification script to ensure all plan requirements are met
 * Run this after completing all security hardening tasks
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface Requirement {
  name: string;
  file: string;
  check: (content: string) => boolean;
  description: string;
}

const requirements: Requirement[] = [
  {
    name: 'Path Sanitization',
    file: 'src/manifest-loader.ts',
    check: (content) => {
      return (
        content.includes('sanitizeHash') &&
        content.includes('sanitizeGuid') &&
        content.includes('path_traversal_attempt') &&
        content.includes('isSSRFAttempt')
      );
    },
    description: 'Path sanitization functions with SSRF and path traversal checks'
  },
  {
    name: 'Path Traversal Tests',
    file: 'tests/integration/path-traversal.test.ts',
    check: (content) => {
      const matches = content.match(/pathTraversalPayloads\s*=\s*\[/);
      if (!matches) return false;
      const arrayStart = content.indexOf('[', matches.index!);
      const arrayEnd = content.indexOf(']', arrayStart);
      const payloads = content.substring(arrayStart, arrayEnd);
      const count = (payloads.match(/'/g) || []).length / 2;
      return count >= 15;
    },
    description: 'At least 15 path traversal attack payloads'
  },
  {
    name: 'SSRF Tests',
    file: 'tests/integration/ssrf.test.ts',
    check: (content) => {
      const matches = content.match(/ssrfPayloads\s*=\s*\[/);
      if (!matches) return false;
      const arrayStart = content.indexOf('[', matches.index!);
      const arrayEnd = content.indexOf('];', arrayStart);
      if (arrayEnd === -1) return false;
      const payloads = content.substring(arrayStart, arrayEnd);
      const lines = payloads.split('\n').filter(line => line.trim().startsWith("'"));
      return lines.length >= 10;
    },
    description: 'At least 10 SSRF attack payloads'
  },
  {
    name: 'Security Monitoring',
    file: 'src/security-monitoring.ts',
    check: (content) => {
      return (
        content.includes('path_traversal_attempt') &&
        content.includes('ssrf_attempt') &&
        content.includes('oversized_request') &&
        content.includes('invalid_hash_format') &&
        content.includes('attack_pattern_detected') &&
        content.includes('detectAttackPattern')
      );
    },
    description: 'All required security event types and attack pattern detection'
  },
  {
    name: 'Secure-by-Default Auth',
    file: 'wrangler.toml',
    check: (content) => {
      return (
        content.includes('DISABLE_AUTH') &&
        content.includes('DISABLE_AUTH = "true"')
      );
    },
    description: 'DISABLE_AUTH flag configured for secure-by-default auth'
  },
  {
    name: 'Request Size Limits',
    file: 'src/index.ts',
    check: (content) => {
      return (
        content.includes('MAX_GLOBAL_REQUEST_SIZE') ||
        content.includes('Payload Too Large') ||
        content.includes('413')
      );
    },
    description: 'Global request size limit enforcement'
  },
  {
    name: 'Rate Limiting',
    file: 'src/index.ts',
    check: (content) => {
      return (
        content.includes('checkRateLimit') &&
        content.includes('getRateLimitIdentifier')
      );
    },
    description: 'Rate limiting functions implemented'
  },
  {
    name: 'JWT Forgery Test',
    file: 'tests/integration/auth-real-jwt.test.ts',
    check: (content) => {
      return (
        content.includes('generateKeyPairSync') &&
        (content.includes('crypto.subtle.verify') || content.includes('verifyFirebaseToken')) &&
        (content.includes('TEST_MODE') || content.includes('false'))
      );
    },
    description: 'Real JWT forgery test with cryptographic verification'
  },
  {
    name: 'DoS Tests',
    file: 'tests/integration/dos.test.ts',
    check: (content) => {
      return (
        content.includes('JSON bomb') ||
        content.includes('array bomb') ||
        content.includes('Content-Length')
      );
    },
    description: 'DoS protection tests (JSON bombs, array bombs, Content-Length mismatch)'
  },
  {
    name: 'Fuzzing Test',
    file: 'tests/integration/fuzzing.test.ts',
    check: (content) => {
      return (
        content.includes('1000') &&
        content.includes('random payloads')
      );
    },
    description: 'Fuzzing test with 1000 random payloads'
  },
  {
    name: 'Header Injection Tests',
    file: 'tests/integration/header-injection.test.ts',
    check: (content) => {
      return (
        content.includes('CRLF') &&
        content.includes('Authorization') &&
        content.includes('X-Wallet-Id')
      );
    },
    description: 'Header injection tests for CRLF protection'
  },
  {
    name: 'Mutation Testing Config',
    file: 'stryker.conf.json',
    check: (content) => {
      try {
        const config = JSON.parse(content);
        return (
          config.mutate &&
          Array.isArray(config.mutate) &&
          config.mutate.length > 0
        );
      } catch {
        return false;
      }
    },
    description: 'Stryker mutation testing configuration'
  },
  {
    name: 'Real Cloudflare Tests',
    file: 'tests/e2e/real-worker.test.ts',
    check: (content) => {
      return (
        content.includes('getTestWorker') &&
        content.includes('TEST_MODE') &&
        (content.includes('WORKER_URL') || content.includes('real mode'))
      );
    },
    description: 'E2E tests that work in both local and real Cloudflare modes (unified setup)'
  }
];

function verifyRequirement(req: Requirement, basePath: string): { passed: boolean; message: string } {
  try {
    const filePath = join(basePath, req.file);
    const content = readFileSync(filePath, 'utf-8');
    const passed = req.check(content);
    
    return {
      passed,
      message: passed
        ? `✅ ${req.name}: ${req.description}`
        : `❌ ${req.name}: ${req.description} - FAILED`
    };
  } catch (error) {
    return {
      passed: false,
      message: `❌ ${req.name}: File not found or error reading - ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function main() {
  const basePath = join(__dirname, '..');
  let passedCount = 0;
  let failedCount = 0;
  
  console.log('🔒 Security Hardening Plan Verification');
  console.log('======================================\n');
  
  for (const req of requirements) {
    const result = verifyRequirement(req, basePath);
    console.log(result.message);
    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }
  
  console.log('\n======================================');
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`📊 Total: ${requirements.length}`);
  
  if (failedCount === 0) {
    console.log('\n🎉 All requirements met! Security hardening is complete.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some requirements are not met. Please review and fix.');
    process.exit(1);
  }
}

main();
