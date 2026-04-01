#!/usr/bin/env node
import { execSync } from 'child_process';
const adb = process.platform === 'win32'
  ? `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`
  : 'adb';
execSync(`"${adb}" shell am start -n com.ocentra.claim/com.ocentra.claim.MainActivity`, {
  stdio: 'inherit',
  shell: true,
});
