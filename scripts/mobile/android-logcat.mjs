#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

function resolveAdbPath() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe') : null,
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe') : null,
    process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe') : null,
    'adb',
  ].filter(Boolean);
  return candidates[0];
}

const adb = resolveAdbPath();
const mode = process.argv.includes('--dump') ? 'dump' : 'follow';
const authOnly = process.argv.includes('--auth');

const filters = authOnly
  ? /(FirebaseAuthentication|Capacitor\/Console|Capacitor\/Plugin|AuthProvider|loginWithGoogle|loginUser|FirebaseAuth|CredentialManager)/i
  : /(Capacitor\/Console|Capacitor\/Plugin|FirebaseAuthentication|FirebaseAuth|AuthProvider|loginWithGoogle|loginUser|MainApp|chromium|Console)/i;

const args = mode === 'dump' ? ['logcat', '-d'] : ['logcat'];

const proc = spawn(adb, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});

const forward = (chunk, isError = false) => {
  const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    if (filters.test(line)) {
      (isError ? process.stderr : process.stdout).write(line + '\n');
    }
  }
};

proc.stdout?.on('data', (chunk) => forward(chunk, false));
proc.stderr?.on('data', (chunk) => forward(chunk, true));

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
