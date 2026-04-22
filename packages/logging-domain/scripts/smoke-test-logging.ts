import { createAppLogStorage } from '../src/app-log/createAppLogStorage';
import { MainAppLogger } from '../src/core/mainAppLogger';
import { MainAppPathResolver } from '../src/core/adapters/mainAppPathResolver';
import { listAppNdjsonFiles, readAppNdjsonFile } from '../src/app-log/appNdjsonWriter';
import * as path from 'path';
import * as os from 'os';

async function runSmokeTest() {
  console.log('🚀 Starting Logging Smoke Test...');

  const tempDir = path.join(os.tmpdir(), `ocentra-smoke-test-${Date.now()}`);
  const scope = 'smoke-test';

  console.log(`📂 Using temp directory: ${tempDir}`);

  // 1. Initialize Storage & Logger
  const storage = createAppLogStorage({ 
    scope, 
    dbDir: tempDir,
    ingestIntervalMs: 500 // Fast ingest for testing
  });

  const pathResolver = new MainAppPathResolver({
    getFilePathFromUrl: (url) => url,
    getSourceFromFilePath: () => 'SmokeTest',
  });

  MainAppLogger.initLogger(storage, pathResolver, { consoleEnabled: false });
  const logger = MainAppLogger.instance;

  // 2. Emit some logs
  console.log('✍️  Writing log entries...');
  const { getStackTrace } = await import('../src/core/stackTrace');
  
  logger.logInfo('Hello Smoke Test 1', getStackTrace(), { detail: 'first' });
  logger.logWarn('Hello Smoke Test 2', getStackTrace(), { detail: 'second' });
  logger.logError('Hello Smoke Test 3', getStackTrace(), { detail: 'third' });

  // 3. Flush to storage (this writes to NDJSON)
  await logger.flushLogQueue();
  await storage.flush(); // Ensure any pending writes are done

  // 4. Verify Filesystem
  console.log('🔍 Verifying filesystem...');
  const files = listAppNdjsonFiles(scope, tempDir);
  
  if (files.length === 0) {
    console.error('❌ FAIL: No NDJSON files found!');
    process.exit(1);
  }

  console.log(`✅ Found ${files.length} NDJSON file(s):`);
  files.forEach(f => console.log(`   - ${f}`));

  // 5. Verify Content
  const entries = readAppNdjsonFile(files[0]);
  console.log(`✅ Read ${entries.length} entries from file.`);

  const messages = entries.map(e => e.message);
  if (messages.some(m => m.includes('Hello Smoke Test 1')) && 
      messages.some(m => m.includes('Hello Smoke Test 2')) && 
      messages.some(m => m.includes('Hello Smoke Test 3'))) {
    console.log('✅ SUCCESS: All messages found in NDJSON!');
  } else {
    console.error('❌ FAIL: Some messages missing from NDJSON!');
    console.error('Actual messages:', messages);
    process.exit(1);
  }

  // 6. Cleanup (Optional, but good for local runs)
  // fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`\n🎉 Smoke test passed! Logs are physically present at: ${files[0]}`);
  console.log(`Run 'cat ${files[0]}' to see the raw NDJSON.`);
}

runSmokeTest().catch(err => {
  console.error('💥 Smoke test crashed:', err);
  process.exit(1);
});
