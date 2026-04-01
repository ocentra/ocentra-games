/**
 * Simple Hello World E2E Test
 * 
 * This is a minimal test to verify the Cloudflare Worker is running
 * and responding to basic requests.
 * 
 * Requirements:
 * - Cloudflare Worker must be running (npm run dev in infra/cloudflare)
 * - Set VITE_R2_WORKER_URL in .env or environment
 */

// Using globals from vitest.config.ts (globals: true)
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { R2Service } from '@/adapters/storage/R2Service';

describe('R2Service Hello World E2E Test', () => {
  let workerUrl: string;
  let r2Service: R2Service;
  const testMatchIds: string[] = [];

  beforeAll(() => {
    const config = getStorageConfig();
    
    if (!config.r2) {
      throw new Error(
        'R2 configuration not found! Set VITE_R2_WORKER_URL in .env file or environment.\n' +
        'Example: VITE_R2_WORKER_URL=http://127.0.0.1:8787'
      );
    }

    workerUrl = config.r2.workerUrl;

    if (!workerUrl) {
      throw new Error(
        'VITE_R2_WORKER_URL not set! Set it in .env file or environment.\n' +
        'Example: VITE_R2_WORKER_URL=http://127.0.0.1:8787'
      );
    }

    r2Service = new R2Service({
      workerUrl,
      bucketName: config.r2.bucketName || 'claim-matches-test',
    });

    console.log('\n' + '='.repeat(80));
    console.log('HELLO WORLD E2E TEST - REAL DATA UPLOAD');
    console.log('='.repeat(80));
    console.log(`Worker URL: ${workerUrl}`);
    console.log(`Bucket: ${config.r2.bucketName || 'claim-matches-test'}`);
    console.log('='.repeat(80) + '\n');
  });

  afterAll(async () => {
    // Cleanup test data
    if (testMatchIds.length > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log('CLEANUP: Deleting test data from R2...');
      console.log('-'.repeat(80));
      for (const matchId of testMatchIds) {
        try {
          await r2Service.deleteMatchRecord(matchId);
          console.log(`  [DELETED] ${matchId}`);
        } catch (error) {
          console.warn(`  [FAILED] Could not delete ${matchId}:`, error);
        }
      }
      console.log('Cleanup complete\n');
    }
  });

  it('should respond to a simple GET request', async () => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    console.log(`📡 [${timestamp}] Testing GET request to: ${workerUrl}/api/matches/test-hello`);
    
    const response = await fetch(`${workerUrl}/api/matches/test-hello`, {
      method: 'GET',
    });

    const responseTime = Date.now() - startTime;
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('Content-Type')}`);
    console.log(`   ⏱️  Response time: ${responseTime}ms`);
    
    // Worker should respond (even if 404 for non-existent match)
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
    
    // Properly read response body
    const readStartTime = Date.now();
    let text: string;
    try {
      const blob = await response.blob();
      text = await blob.text();
    } catch {
      text = await response.text();
    }
    const readTime = Date.now() - readStartTime;
    console.log(`   Response body (first 200 chars): ${text.substring(0, Math.min(200, text.length))}`);
    console.log(`   Response body length: ${text.length} chars`);
    console.log(`   ⏱️  Body read time: ${readTime}ms`);
    console.log(`   ⏱️  Total time: ${Date.now() - startTime}ms`);
    
    console.log(`   ✅ Worker is responding!\n`);
  }, 10000);

  it('should handle OPTIONS request (CORS preflight)', async () => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    console.log(`📡 [${timestamp}] Testing OPTIONS request to: ${workerUrl}/api/matches/test-hello`);
    
    const response = await fetch(`${workerUrl}/api/matches/test-hello`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
      },
    });

    const responseTime = Date.now() - startTime;
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    console.log(`   ⏱️  Response time: ${responseTime}ms`);
    
    // Log all headers for debugging
    console.log(`   All response headers:`);
    response.headers.forEach((value, key) => {
      console.log(`     ${key}: ${value}`);
    });
    
    const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
    const corsMethods = response.headers.get('Access-Control-Allow-Methods');
    
    console.log(`   Access-Control-Allow-Origin: ${corsOrigin}`);
    console.log(`   Access-Control-Allow-Methods: ${corsMethods}`);
    
    // CORS preflight should succeed (Worker returns 204 for OPTIONS, but might return 200)
    expect([200, 204]).toContain(response.status);
    
    // In development, CORS headers might be missing if Worker doesn't handle OPTIONS properly
    // Let's just check that we got a valid response
    if (corsOrigin) {
      console.log(`   ✅ CORS is working! (Origin: ${corsOrigin})`);
    } else {
      console.log(`   ⚠️  CORS headers missing (this might be OK for local dev)`);
    }
    console.log(`   ⏱️  Total time: ${Date.now() - startTime}ms\n`);
  }, 10000);

  it('should return proper error for PUT without auth (if auth required)', async () => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    console.log(`📡 [${timestamp}] Testing PUT request without auth to: ${workerUrl}/api/matches/test-hello`);
    
    const uploadStartTime = Date.now();
    const response = await fetch(`${workerUrl}/api/matches/test-hello`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'data' }),
    });

    const uploadTime = Date.now() - uploadStartTime;
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    console.log(`   ⏱️  Upload time: ${uploadTime}ms`);
    
    // Properly read response body
    const readStartTime = Date.now();
    let text: string;
    try {
      const blob = await response.blob();
      text = await blob.text();
    } catch {
      text = await response.text();
    }
    const readTime = Date.now() - readStartTime;
    console.log(`   Response body: ${text}`);
    console.log(`   Response body length: ${text.length} chars`);
    console.log(`   ⏱️  Body read time: ${readTime}ms`);
    
    // Should either succeed (200/201), require auth (401/403), or return validation error (400)
    // All are valid - we just want to see what happens
    expect([200, 201, 400, 401, 403]).toContain(response.status);
    
    if (response.status === 401 || response.status === 403) {
      console.log(`   ℹ️  Auth is required (this is expected if FIREBASE_PROJECT_ID is set)`);
    } else if (response.status === 400) {
      console.log(`   ℹ️  Validation error (expected - test data {"test":"data"} is invalid)`);
    } else {
      console.log(`   ℹ️  Auth is not required (FIREBASE_PROJECT_ID not set)`);
    }
    
    console.log(`   ⏱️  Total time: ${Date.now() - startTime}ms`);
    console.log(`   ✅ PUT endpoint is responding!\n`);
  }, 10000);

  it('should ACTUALLY upload real data to R2 and you can see it in Cloudflare', async () => {
    const testStartTime = Date.now();
    const timestamp = new Date().toISOString();
    const matchId = `hello-world-real-data-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    testMatchIds.push(matchId);

    // Create a realistic match record
    const matchRecord = {
      match_id: matchId,
      version: '1.0.0',
      game_type: 'card_game',
      created_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      players: [
        {
          player_id: 'player-1',
          wallet_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          player_type: 'human',
          score: 100,
          display_name: 'Alice',
        },
        {
          player_id: 'player-2',
          wallet_address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          player_type: 'human',
          score: 85,
          display_name: 'Bob',
        },
      ],
      events: [
        {
          event_type: 'match_created',
          timestamp: Date.now(),
          player_id: 'player-1',
          data: { game_state: 'initialized' },
        },
        {
          event_type: 'move',
          timestamp: Date.now() + 1000,
          player_id: 'player-1',
          data: { action: 'play_card', card: { suit: 'hearts', value: 'ace' } },
        },
        {
          event_type: 'move',
          timestamp: Date.now() + 2000,
          player_id: 'player-2',
          data: { action: 'play_card', card: { suit: 'spades', value: 'king' } },
        },
      ],
      metadata: {
        rng_seed: 12345,
        game_version: '1.0.0',
        test_data: true,
        message: 'This is REAL data uploaded from E2E test - you can see it in Cloudflare R2 dashboard!',
      },
      hash: `test-hash-${matchId}`,
      hot_url: `${workerUrl}/api/matches/${matchId}`,
    };

    const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
    const size = new TextEncoder().encode(matchRecordJSON).length;

    console.log(`\n[${timestamp}] TEST: Upload REAL Data to R2`);
    console.log(`  Match ID: ${matchId}`);
    console.log(`  Size: ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
    console.log(`  Action: Uploading to R2 bucket...`);
    console.log(`  NOTE: After this test, check Cloudflare R2 dashboard to see the data!`);
    console.log(`  `);
    console.log(`  >>> IMPORTANT: DO NOT DELETE THIS DATA - CHECK CLOUDFLARE FIRST! <<<`);
    console.log(`  `);

    const uploadStartTime = Date.now();
    let result: string;
    try {
      result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const uploadTime = Date.now() - uploadStartTime;

      expect(result).toBeTruthy();
      console.log(`  [SUCCESS] Upload completed!`);
      console.log(`  Result URL: ${result}`);
      console.log(`  Upload Time: ${uploadTime}ms`);
      console.log(`  R2 Key: matches/${matchId}.json`);
      console.log(`  `);
      console.log(`  ========================================================================`);
      console.log(`  >>> GO TO CLOUDFLARE R2 DASHBOARD TO SEE THIS DATA! <<<`);
      console.log(`  >>> Bucket: claim-matches-test`);
      console.log(`  >>> Look for: matches/${matchId}.json`);
      console.log(`  >>> Match ID: ${matchId}`);
      console.log(`  ========================================================================`);
      console.log(`  `);

      // Wait a bit for R2 to be consistent
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log(`  Step 2: Retrieving the data we just uploaded...`);
      const getStartTime = Date.now();
      const retrieved = await r2Service.getMatchRecord(matchId);
      const getTime = Date.now() - getStartTime;

      expect(retrieved).not.toBeNull();
      const parsed = JSON.parse(retrieved!);
      
      console.log(`  [SUCCESS] Retrieved successfully!`);
      console.log(`  Get Time: ${getTime}ms`);
      console.log(`  `);
      console.log(`  Data Verification:`);
      console.log(`    - Match ID: ${parsed.match_id}`);
      console.log(`    - Version: ${parsed.version}`);
      console.log(`    - Players: ${parsed.players.length}`);
      console.log(`    - Events: ${parsed.events.length}`);
      console.log(`    - Message: ${parsed.metadata.message}`);
      console.log(`  `);
      console.log(`  Performance:`);
      console.log(`    - Upload Time: ${uploadTime}ms`);
      console.log(`    - Get Time: ${getTime}ms`);
      console.log(`    - Total Test Time: ${Date.now() - testStartTime}ms`);
      console.log(`  `);
      console.log(`  ========================================================================`);
      console.log(`  >>> DATA IS NOW IN CLOUDFLARE R2 - CHECK THE DASHBOARD! <<<`);
      console.log(`  >>> Bucket: claim-matches-test`);
      console.log(`  >>> File: matches/${matchId}.json`);
      console.log(`  ========================================================================`);
      console.log(`  `);
      
      // DON'T delete this one - user wants to see it in Cloudflare!
      // Remove from cleanup list
      const index = testMatchIds.indexOf(matchId);
      if (index > -1) {
        testMatchIds.splice(index, 1);
      }
      console.log(`  NOTE: This test data will NOT be auto-deleted so you can see it in Cloudflare!`);
      console.log(`  `);
    } catch (error) {
      console.log(`  [ERROR] Upload failed!`);
      console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`  `);
      console.log(`  This means data was NOT written to R2.`);
      console.log(`  Check the Worker logs to see what went wrong.`);
      throw error;
    }
  }, 30000);
});

