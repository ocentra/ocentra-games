#!/usr/bin/env node

/**
 * Development Server Manager
 * 
 * Ensures clean start of Vite development server:
 * 1. Kills existing Node.js processes
 * 2. Starts Vite server on port 3000
 */

const { exec, spawn } = require('child_process');

function killNodeProcesses() {
  return new Promise((resolve) => {
    console.log('🔍 Killing existing Node.js processes...');
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      exec('taskkill /F /IM node.exe 2>nul', (error, stdout, stderr) => {
        if (error) {
          console.log('✅ No existing Node.js processes found');
        } else {
          console.log('✅ Node.js processes terminated');
        }
        resolve();
      });
    } else {
      exec('pkill -f node 2>/dev/null || true', (error, stdout, stderr) => {
        console.log('✅ Node.js processes terminated (or none found)');
        resolve();
      });
    }
  });
}

function startViteServer() {
  console.log('🚀 Starting Vite development server on port 3000...');
  
  const isWindows = process.platform === 'win32';
  
  // Spawn Vite process
  const vite = spawn('vite', [], { 
    stdio: 'inherit', 
    shell: isWindows
  });
  
  vite.on('error', (error) => {
    console.error('❌ Failed to start Vite server:', error.message);
    process.exit(1);
  });
  
  vite.on('spawn', () => {
    console.log('✅ Vite server started successfully');
  });
}

async function main() {
  console.log('🔄 Ensuring clean start of development environment...\n');
  
  await killNodeProcesses();
  // Small delay to ensure processes are fully terminated
  await new Promise(resolve => setTimeout(resolve, 1000));
  startViteServer();
  
  // Keep the script running
  process.on('SIGINT', () => {
    console.log('\n👋 Development server stopped');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Error in dev script:', error.message);
  process.exit(1);
});