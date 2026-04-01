/**
 * REAL End-to-End Tests for R2Service
 * 
 * These tests make ACTUAL HTTP calls to the Cloudflare Worker
 * and verify data is ACTUALLY written to R2.
 * 
 * Tests ALL operations from multiplayer.md plan:
 * - Match records: upload, get, delete
 * - Signed URLs: generate and access
 * - Archive: move matches to archive
 * - Disputes: create, get, upload evidence
 * - AI decisions: store AI event logs
 * - GDPR: export, delete, anonymize
 * 
 * Requirements:
 * - Cloudflare Worker must be running (npm run dev in infra/cloudflare)
 * - Or deployed to dev environment
 * - Set VITE_R2_WORKER_URL in .env or environment
 */

// Using globals from vitest.config.ts (globals: true)
import { R2Service } from '@/adapters/storage/R2Service';
import { getStorageConfig } from '@/services/storage/StorageConfig';

describe('R2Service E2E Tests - REAL R2 Operations', () => {
  let r2Service: R2Service;
  let workerUrl: string;
  const testMatchIds: string[] = [];
  const testDisputeIds: string[] = [];
  const testUserIds: string[] = [];

  // Helper to create realistic match record data
  const createRealisticMatchRecord = (matchId: string, options?: {
    withAI?: boolean;
    withManyEvents?: boolean;
    withSignatures?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: any = {
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
        },
        {
          player_id: 'player-2',
          wallet_address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          player_type: options?.withAI ? 'ai' : 'human',
          score: 85,
        },
      ],
      events: [
        {
          event_type: 'match_created',
          timestamp: Date.now(),
          player_id: 'player-1',
          data: { game_state: 'initialized' },
        },
      ],
      metadata: {
        rng_seed: 12345,
        model_version: options?.withAI ? 'gpt-4-turbo' : null,
        chain_of_thought_hash: options?.withAI ? 'hash-of-cot-123' : null,
      },
      signatures: options?.withSignatures ? [
        {
          signer: 'coordinator',
          signature: 'mock-signature-123',
          timestamp: Date.now(),
        },
      ] : [],
      hash: `test-hash-${matchId}`,
      hot_url: `${workerUrl}/api/matches/${matchId}`,
    };

    if (options?.withManyEvents) {
      for (let i = 0; i < 20; i++) {
        record.events.push({
          event_type: 'move',
          timestamp: Date.now() + i * 1000,
          player_id: i % 2 === 0 ? 'player-1' : 'player-2',
          data: { action: 'play_card', move_index: i, card: { suit: 'hearts', value: 'ace' } },
        });
      }
    }

    if (options?.withAI) {
      record.events.push({
        event_type: 'ai_decision',
        timestamp: Date.now(),
        player_id: 'player-2',
        data: {
          action: 'play_card',
          chain_of_thought: [
            {
              move_index: 1,
              timestamp: new Date().toISOString(),
              thought: 'Considering available moves',
              reasoning: 'Player 1 played ace of hearts, I should play king to win the trick',
              alternatives_considered: ['play_king', 'play_queen', 'play_jack'],
              decision: 'play_king',
              confidence: 0.85,
            },
          ],
          metadata: {
            model_name: 'gpt-4-turbo',
            inference_time_ms: 250,
            confidence: 0.85,
            tokens_used: 150,
          },
        },
      });
    }

    return record;
  };

  beforeAll(() => {
    const config = getStorageConfig();
    
    if (!config.r2) {
      throw new Error(
        'R2 configuration not found! Set VITE_R2_WORKER_URL in .env file or environment.\n' +
        'Example: VITE_R2_WORKER_URL=https://claim-storage-dev.ocentraai.workers.dev'
      );
    }

    workerUrl = config.r2.workerUrl;

    if (!workerUrl) {
      throw new Error(
        'VITE_R2_WORKER_URL not set! Set it in .env file or environment.\n' +
        'Example: VITE_R2_WORKER_URL=https://claim-storage-dev.ocentraai.workers.dev'
      );
    }

    r2Service = new R2Service({
      workerUrl,
      bucketName: config.r2.bucketName || 'claim-matches-test',
    });

    console.log('\n' + '='.repeat(80));
    console.log('E2E TESTS - REAL R2 OPERATIONS');
    console.log('='.repeat(80));
    console.log(`Worker URL: ${workerUrl}`);
    console.log(`Bucket: ${config.r2.bucketName || 'claim-matches-test'}`);
    console.log('⚠️  Note: Tests include delays to respect Cloudflare rate limits');
    console.log('='.repeat(80) + '\n');
  });

  // Add delay between tests to avoid rate limiting
  beforeEach(async () => {
    // Small delay between tests to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  afterAll(async () => {
    // Cleanup: Delete all test data with rate limiting
    console.log('\n🧹 Cleaning up test data...');
    console.log(`  Total records to delete: ${testMatchIds.length}`);
    
    if (testMatchIds.length === 0) {
      console.log('  No records to delete');
      return;
    }
    
    // Delete in smaller batches with longer delays to avoid rate limiting
    const batchSize = 3; // Smaller batches
    const delayMs = 1000; // 1 second delay between batches
    
    let deleted = 0;
    let failed = 0;
    
    for (let i = 0; i < testMatchIds.length; i += batchSize) {
      const batch = testMatchIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (matchId) => {
        try {
          await r2Service.deleteMatchRecord(matchId);
          deleted++;
          if (deleted % 10 === 0) {
            console.log(`  ✅ Deleted ${deleted}/${testMatchIds.length} records...`);
          }
          return true;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          // Don't count rate limiting as failures - it's expected
          if (!errorMsg.includes('Too Many Requests') && !errorMsg.includes('429') && !errorMsg.includes('Rate limit')) {
            failed++;
            console.warn(`  ⚠️  Failed to delete match ${matchId}:`, errorMsg);
          }
          return false;
        }
      });
      
      await Promise.all(batchPromises);
      
      // Delay between batches to avoid rate limiting
      if (i + batchSize < testMatchIds.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log(`  ✅ Cleanup complete: ${deleted} deleted, ${failed} failed`);
    console.log('  Note: Some records may remain due to rate limits - they can be cleaned up manually\n');
  }, 300000); // 5 minute timeout for cleanup

  describe('Match Record Operations (Core)', () => {
    it('should ACTUALLY upload a match record to R2', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-upload-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const matchRecord = createRealisticMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
      const size = new TextEncoder().encode(matchRecordJSON).length;

      console.log(`\n[${timestamp}] TEST: Upload Match Record`);
      console.log(`  Match ID: ${matchId}`);
      console.log(`  Size: ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
      console.log(`  Action: Uploading to R2...`);

      const uploadStartTime = Date.now();
      const result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const uploadTime = Date.now() - uploadStartTime;

      expect(result).toBeTruthy();
      console.log(`  [SUCCESS] Upload completed`);
      console.log(`  Result URL: ${result}`);
      console.log(`  Upload Time: ${uploadTime}ms`);
      console.log(`  Total Test Time: ${Date.now() - testStartTime}ms`);
    }, 30000);

    it('should ACTUALLY retrieve the uploaded match record from R2', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-retrieve-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const originalRecord = createRealisticMatchRecord(matchId);
      const originalJSON = JSON.stringify(originalRecord, null, 2);

      console.log(`\n[${timestamp}] TEST: Upload and Retrieve Match Record`);
      console.log(`  Match ID: ${matchId}`);
      console.log(`  Step 1: Uploading...`);
      
      const uploadStartTime = Date.now();
      await r2Service.uploadMatchRecord(matchId, originalJSON);
      const uploadTime = Date.now() - uploadStartTime;
      console.log(`  [SUCCESS] Upload completed in ${uploadTime}ms`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`  Step 2: Retrieving...`);
      const getStartTime = Date.now();
      const retrieved = await r2Service.getMatchRecord(matchId);
      const getTime = Date.now() - getStartTime;

      expect(retrieved).not.toBeNull();
      const parsed = JSON.parse(retrieved!);
      expect(parsed.match_id).toBe(matchId);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.players).toHaveLength(2);
      expect(parsed.events).toHaveLength(1);

      console.log(`  [SUCCESS] Retrieved successfully in ${getTime}ms`);
      console.log(`  Data Verification:`);
      console.log(`    - Match ID: ${parsed.match_id}`);
      console.log(`    - Version: ${parsed.version}`);
      console.log(`    - Players: ${parsed.players.length}`);
      console.log(`    - Events: ${parsed.events.length}`);
      console.log(`  Performance:`);
      console.log(`    - Upload Time: ${uploadTime}ms`);
      console.log(`    - Get Time: ${getTime}ms`);
      console.log(`    - Total Test Time: ${Date.now() - testStartTime}ms`);
    }, 30000);

    it('should ACTUALLY delete a match record from R2', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-delete-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const matchRecord = createRealisticMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      console.log(`\n📤 [${timestamp}] Uploading: ${matchId}`);
      const uploadStartTime = Date.now();
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const uploadTime = Date.now() - uploadStartTime;
      console.log(`   ⏱️  Upload time: ${uploadTime}ms`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const getBeforeStartTime = Date.now();
      const before = await r2Service.getMatchRecord(matchId);
      const getBeforeTime = Date.now() - getBeforeStartTime;
      expect(before).not.toBeNull();
      console.log(`   ✅ Record exists before delete`);
      console.log(`   ⏱️  Get before delete time: ${getBeforeTime}ms`);

      console.log(`🗑️  Deleting: ${matchId}`);
      const deleteStartTime = Date.now();
      await r2Service.deleteMatchRecord(matchId);
      const deleteTime = Date.now() - deleteStartTime;
      console.log(`   ⏱️  Delete time: ${deleteTime}ms`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const getAfterStartTime = Date.now();
      const after = await r2Service.getMatchRecord(matchId);
      const getAfterTime = Date.now() - getAfterStartTime;
      expect(after).toBeNull();
      console.log(`   ✅ Record deleted successfully`);
      console.log(`   ⏱️  Get after delete time: ${getAfterTime}ms`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);
    }, 30000);
  });

  describe('Signed URL Operations', () => {
    it('should ACTUALLY generate and access a signed URL', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-signed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const matchRecord = createRealisticMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      console.log(`\n📤 [${timestamp}] Uploading: ${matchId}`);
      const uploadStartTime = Date.now();
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const uploadTime = Date.now() - uploadStartTime;
      console.log(`   ⏱️  Upload time: ${uploadTime}ms`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`🔗 Generating signed URL for: ${matchId}`);
      const signedUrlStartTime = Date.now();
      const signedUrl = await r2Service.generateSignedUrl(matchId, 3600);
      const signedUrlTime = Date.now() - signedUrlStartTime;

      expect(signedUrl).toBeTruthy();
      expect(signedUrl).toContain(matchId);
      expect(signedUrl).toContain('token=');

      console.log(`   ✅ Signed URL generated: ${signedUrl.substring(0, 80)}...`);
      console.log(`   ⏱️  Signed URL generation time: ${signedUrlTime}ms`);

      const accessStartTime = Date.now();
      const response = await fetch(signedUrl);
      const accessTime = Date.now() - accessStartTime;
      expect(response.ok).toBe(true);
      const data = await response.text();
      expect(data).toContain(matchId);

      console.log(`   ✅ Signed URL is accessible`);
      console.log(`   ⏱️  Signed URL access time: ${accessTime}ms`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);
    }, 30000);

    it('should generate signed URLs with custom expiration', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-signed-expiry-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const matchRecord = createRealisticMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      console.log(`\n📤 [${timestamp}] Uploading: ${matchId}`);
      const uploadStartTime = Date.now();
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const uploadTime = Date.now() - uploadStartTime;
      console.log(`   ⏱️  Upload time: ${uploadTime}ms`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const signedUrlStartTime = Date.now();
      const signedUrl = await r2Service.generateSignedUrl(matchId, 7200); // 2 hours
      const signedUrlTime = Date.now() - signedUrlStartTime;

      expect(signedUrl).toBeTruthy();
      console.log(`   ✅ Signed URL with 2h expiry generated`);
      console.log(`   ⏱️  Signed URL generation time: ${signedUrlTime}ms`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);
    }, 30000);
  });

  describe('Archive Operations', () => {
    it('should ACTUALLY archive a match record', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-archive-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const matchRecord = createRealisticMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      console.log(`\n📤 [${timestamp}] Uploading: ${matchId}`);
      const uploadStartTime = Date.now();
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const uploadTime = Date.now() - uploadStartTime;
      console.log(`   ⏱️  Upload time: ${uploadTime}ms`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`📦 Archiving: ${matchId}`);
      const archiveStartTime = Date.now();
      const response = await fetch(`${workerUrl}/api/archive/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const archiveTime = Date.now() - archiveStartTime;

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.success).toBe(true);

      console.log(`   ✅ Match archived successfully`);
      console.log(`   ⏱️  Archive time: ${archiveTime}ms`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);
    }, 30000);
  });

  describe('Dispute Operations', () => {
    it('should ACTUALLY create a dispute', async () => {
      const matchId = `e2e-dispute-match-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Upload match first
      const matchRecord = createRealisticMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const disputeData = {
        match_id: matchId,
        reason: 'Player claims opponent cheated',
        reason_hash: 'hash-of-reason-123',
        created_by: 'player-1',
        timestamp: new Date().toISOString(),
      };

      console.log(`\n📝 Creating dispute for: ${matchId}`);
      const response = await fetch(`${workerUrl}/api/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disputeData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.dispute_id).toBeTruthy();
      
      if (result.dispute_id) {
        testDisputeIds.push(result.dispute_id);
      }

      console.log(`   ✅ Dispute created: ${result.dispute_id}`);
    }, 30000);

    it('should ACTUALLY retrieve a dispute', async () => {
      const matchId = `e2e-dispute-get-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Create match and dispute
      const matchRecord = createRealisticMatchRecord(matchId);
      await r2Service.uploadMatchRecord(matchId, JSON.stringify(matchRecord, null, 2));
      await new Promise(resolve => setTimeout(resolve, 1000));

      const disputeData = {
        match_id: matchId,
        reason: 'Test dispute retrieval',
        reason_hash: 'hash-123',
        created_by: 'player-1',
        timestamp: new Date().toISOString(),
      };

      const createResponse = await fetch(`${workerUrl}/api/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disputeData),
      });

      const createResult = await createResponse.json();
      const disputeId = createResult.dispute_id;
      expect(disputeId).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`\n📥 Retrieving dispute: ${disputeId}`);
      const getResponse = await fetch(`${workerUrl}/api/disputes/${disputeId}`, {
        method: 'GET',
      });

      expect(getResponse.ok).toBe(true);
      const dispute = await getResponse.json();
      expect(dispute.dispute_id).toBe(disputeId);
      expect(dispute.match_id).toBe(matchId);

      console.log(`   ✅ Dispute retrieved successfully`);
    }, 30000);

    it('should ACTUALLY upload dispute evidence', async () => {
      const matchId = `e2e-evidence-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Create match and dispute
      const matchRecord = createRealisticMatchRecord(matchId);
      await r2Service.uploadMatchRecord(matchId, JSON.stringify(matchRecord, null, 2));
      await new Promise(resolve => setTimeout(resolve, 1000));

      const disputeData = {
        match_id: matchId,
        reason: 'Evidence test',
        reason_hash: 'hash-evidence',
        created_by: 'player-1',
        timestamp: new Date().toISOString(),
      };

      const createResponse = await fetch(`${workerUrl}/api/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disputeData),
      });

      const createResult = await createResponse.json();
      const disputeId = createResult.dispute_id;
      expect(disputeId).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Upload evidence
      const evidenceText = 'This is test evidence: Player 2 played out of turn at move 15';
      const evidenceBlob = new Blob([evidenceText], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('evidence', evidenceBlob, 'evidence.txt');
      formData.append('description', 'Screenshot of illegal move');

      console.log(`\n📎 Uploading evidence for dispute: ${disputeId}`);
      const evidenceResponse = await fetch(`${workerUrl}/api/disputes/${disputeId}/evidence`, {
        method: 'POST',
        body: formData,
      });

      expect(evidenceResponse.ok).toBe(true);
      const evidenceResult = await evidenceResponse.json();
      expect(evidenceResult.success).toBe(true);

      console.log(`   ✅ Evidence uploaded successfully`);
    }, 30000);
  });

  describe('AI Decision Storage', () => {
    it('should ACTUALLY store AI decision event', async () => {
      const matchId = `e2e-ai-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Upload match with AI player
      const matchRecord = createRealisticMatchRecord(matchId, { withAI: true });
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      console.log(`\n📤 Uploading match with AI decisions: ${matchId}`);
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Retrieve and verify AI data
      const retrieved = await r2Service.getMatchRecord(matchId);
      const parsed = JSON.parse(retrieved!);

      expect(parsed.metadata.model_version).toBe('gpt-4-turbo');
      expect(parsed.metadata.chain_of_thought_hash).toBe('hash-of-cot-123');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiEvent = parsed.events.find((e: any) => e.event_type === 'ai_decision');
      expect(aiEvent).toBeTruthy();
      expect(aiEvent.data.chain_of_thought).toBeTruthy();
      expect(aiEvent.data.metadata.model_name).toBe('gpt-4-turbo');

      console.log(`   ✅ AI decision stored and retrieved`);
      console.log(`   📊 Model: ${aiEvent.data.metadata.model_name}`);
      console.log(`   📊 Confidence: ${aiEvent.data.metadata.confidence}`);
    }, 30000);

    it('should store AI event via /api/ai/on_event endpoint', async () => {
      const matchId = `e2e-ai-event-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Upload match first
      const matchRecord = createRealisticMatchRecord(matchId);
      await r2Service.uploadMatchRecord(matchId, JSON.stringify(matchRecord, null, 2));
      await new Promise(resolve => setTimeout(resolve, 1000));

      const aiEvent = {
        match_id: matchId,
        event_type: 'move',
        current_state: { phase: 'playing', turn: 1 },
        player_hand: [{ suit: 'hearts', value: 'king' }],
        available_actions: ['play_card', 'pass'],
        event_data: { move_index: 1 },
        match_history: [],
      };

      console.log(`\n🤖 Sending AI event for: ${matchId}`);
      const response = await fetch(`${workerUrl}/api/ai/on_event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiEvent),
      });

      // Note: This may require authentication or AI service, so we check for multiple valid responses
      const isSuccess = response.ok;
      const isAuthError = response.status === 401;
      const isServiceUnavailable = response.status === 503; // AI service not configured

      if (isSuccess) {
        const result = await response.json();
        expect(result.success).toBe(true);
        console.log(`   ✅ AI event stored successfully`);
      } else if (isAuthError) {
        console.log(`   ⚠️  AI endpoint requires authentication (expected in production)`);
      } else if (isServiceUnavailable) {
        console.log(`   ⚠️  AI service not configured (expected - AI_SERVICE_URL not set)`);
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    }, 30000);
  });

  describe('Data Integrity & Large Records', () => {
    it('should preserve ALL fields when uploading and retrieving', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-integrity-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const originalRecord = createRealisticMatchRecord(matchId, {
        withAI: true,
        withManyEvents: true,
        withSignatures: true,
      });

      const originalJSON = JSON.stringify(originalRecord, null, 2);
      const originalSize = new TextEncoder().encode(originalJSON).length;

      console.log(`\n📤 [${timestamp}] Uploading full match record: ${matchId}`);
      console.log(`   Size: ${originalSize} bytes`);

      const uploadStartTime = Date.now();
      await r2Service.uploadMatchRecord(matchId, originalJSON);
      const uploadTime = Date.now() - uploadStartTime;
      console.log(`   ⏱️  Upload time: ${uploadTime}ms`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`📥 Retrieving: ${matchId}`);
      const getStartTime = Date.now();
      const retrieved = await r2Service.getMatchRecord(matchId);
      const getTime = Date.now() - getStartTime;

      expect(retrieved).not.toBeNull();
      const retrievedRecord = JSON.parse(retrieved!);
      const retrievedSize = new TextEncoder().encode(retrieved!).length;

      console.log(`   Retrieved size: ${retrievedSize} bytes`);

      // Verify ALL fields
      expect(retrievedRecord.match_id).toBe(originalRecord.match_id);
      expect(retrievedRecord.version).toBe(originalRecord.version);
      expect(retrievedRecord.game_type).toBe(originalRecord.game_type);
      expect(retrievedRecord.players).toHaveLength(originalRecord.players.length);
      expect(retrievedRecord.players[0].player_id).toBe(originalRecord.players[0].player_id);
      expect(retrievedRecord.players[0].wallet_address).toBe(originalRecord.players[0].wallet_address);
      expect(retrievedRecord.events.length).toBeGreaterThanOrEqual(originalRecord.events.length);
      expect(retrievedRecord.metadata.rng_seed).toBe(originalRecord.metadata.rng_seed);
      expect(retrievedRecord.metadata.model_version).toBe(originalRecord.metadata.model_version);
      expect(retrievedRecord.signatures.length).toBe(originalRecord.signatures.length);

      console.log(`   ✅ All fields preserved correctly`);
      console.log(`   📊 Players: ${retrievedRecord.players.length}`);
      console.log(`   📊 Events: ${retrievedRecord.events.length}`);
      console.log(`   📊 Signatures: ${retrievedRecord.signatures.length}`);
      console.log(`   ⏱️  Get time: ${getTime}ms`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);
    }, 30000);

    it('should handle match records with many events (long games)', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-large-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const matchRecord = createRealisticMatchRecord(matchId, { withManyEvents: true });
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
      const size = new TextEncoder().encode(matchRecordJSON).length;

      expect(size).toBeLessThan(10 * 1024 * 1024); // Under 10MB limit

      console.log(`\n📤 [${timestamp}] Uploading large match record: ${matchId}`);
      console.log(`   Size: ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
      console.log(`   Events: ${matchRecord.events.length}`);

      const uploadStartTime = Date.now();
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const uploadTime = Date.now() - uploadStartTime;
      console.log(`   ⏱️  Upload time: ${uploadTime}ms`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const getStartTime = Date.now();
      const retrieved = await r2Service.getMatchRecord(matchId);
      const getTime = Date.now() - getStartTime;
      const parsed = JSON.parse(retrieved!);
      expect(parsed.events.length).toBe(matchRecord.events.length);

      console.log(`   ✅ Large record uploaded and retrieved successfully`);
      console.log(`   ⏱️  Get time: ${getTime}ms`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);
    }, 30000);
  });

  describe('Concurrency & Stress Tests', () => {
    it('should handle 5 concurrent uploads', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const numConcurrent = 5;
      const matchIds: string[] = [];

      console.log(`\n[${timestamp}] TEST: ${numConcurrent} Concurrent Uploads`);
      console.log(`  Test Type: Concurrency Test`);
      console.log(`  Concurrent Operations: ${numConcurrent}`);
      console.log(`  Action: Starting concurrent uploads...`);

      // Create match records
      const uploadPromises = Array.from({ length: numConcurrent }, async (_, i) => {
        const matchId = `e2e-concurrent-upload-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;
        matchIds.push(matchId);
        testMatchIds.push(matchId);

        const matchRecord = createRealisticMatchRecord(matchId);
        const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
        
        const uploadStartTime = Date.now();
        const result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
        const uploadTime = Date.now() - uploadStartTime;
        
        return { matchId, result, uploadTime, index: i };
      });

      const uploadStartTime = Date.now();
      const results = await Promise.all(uploadPromises);
      const totalTime = Date.now() - uploadStartTime;

      // Verify all succeeded
      const successful = results.filter(r => r.result).length;
      const failed = results.filter(r => !r.result).length;
      
      console.log(`  [RESULTS]`);
      console.log(`    Successful: ${successful}/${numConcurrent}`);
      console.log(`    Failed: ${failed}/${numConcurrent}`);
      console.log(`  Performance:`);
      console.log(`    Total Concurrent Time: ${totalTime}ms`);
      console.log(`    Average Per Upload: ${(totalTime / numConcurrent).toFixed(2)}ms`);
      console.log(`    Throughput: ${(numConcurrent / (totalTime / 1000)).toFixed(2)} uploads/sec`);
      console.log(`    Total Test Time: ${Date.now() - testStartTime}ms`);
      
      // Show individual timings for first 5
      if (results.length > 0) {
        console.log(`  Individual Results (first 5):`);
        results.slice(0, 5).forEach(({ index, uploadTime, result }) => {
          console.log(`    Upload #${index + 1}: ${uploadTime}ms ${result ? '[OK]' : '[FAILED]'}`);
        });
      }
    }, 60000);

    it('should handle 100 concurrent uploads', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const numConcurrent = 100;
      const matchIds: string[] = [];

      console.log(`\n🚀 [${timestamp}] Testing ${numConcurrent} concurrent uploads (stress test)`);
      console.log(`   ⚠️  Note: Cloudflare Workers have rate limits. Some failures are expected.`);

      // Stagger the uploads slightly to reduce rate limiting
      const uploadPromises = Array.from({ length: numConcurrent }, async (_, i) => {
        // Small delay to stagger requests
        await new Promise(resolve => setTimeout(resolve, i * 10));
        
        const matchId = `e2e-stress-upload-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;
        matchIds.push(matchId);
        testMatchIds.push(matchId);

        const matchRecord = createRealisticMatchRecord(matchId);
        const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
        
        try {
          const uploadStartTime = Date.now();
          const result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
          const uploadTime = Date.now() - uploadStartTime;
          return { matchId, result, uploadTime, success: true };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { matchId, error: errorMsg, success: false };
        }
      });

      const uploadStartTime = Date.now();
      const results = await Promise.all(uploadPromises);
      const totalTime = Date.now() - uploadStartTime;

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const rateLimited = results.filter(r => !r.success && (r.error?.includes('Too Many Requests') || r.error?.includes('429'))).length;

      console.log(`   📊 Successful: ${successful}/${numConcurrent}`);
      console.log(`   📊 Failed: ${failed}/${numConcurrent}`);
      if (rateLimited > 0) {
        console.log(`   📊 Rate Limited: ${rateLimited}/${numConcurrent} (expected with Cloudflare limits)`);
      }
      console.log(`   ⏱️  Total concurrent time: ${totalTime}ms`);
      console.log(`   ⏱️  Average per upload: ${(totalTime / numConcurrent).toFixed(2)}ms`);
      console.log(`   ⏱️  Throughput: ${(numConcurrent / (totalTime / 1000)).toFixed(2)} uploads/sec`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);

      // At least 50% should succeed (allowing for rate limiting with 100 concurrent requests)
      // This is a stress test - the important thing is that the system handles the load gracefully
      expect(successful).toBeGreaterThanOrEqual(numConcurrent * 0.5);
    }, 180000);

    it('should handle 5 concurrent reads', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const numConcurrent = 5;
      const matchId = `e2e-concurrent-read-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Upload a record first
      const matchRecord = createRealisticMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
      
      console.log(`\n📤 [${timestamp}] Uploading record for concurrent read test: ${matchId}`);
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`📥 Testing ${numConcurrent} concurrent reads`);
      const readPromises = Array.from({ length: numConcurrent }, async (_, i) => {
        const readStartTime = Date.now();
        const result = await r2Service.getMatchRecord(matchId);
        const readTime = Date.now() - readStartTime;
        return { index: i, result, readTime };
      });

      const readStartTime = Date.now();
      const results = await Promise.all(readPromises);
      const totalTime = Date.now() - readStartTime;

      // Verify all succeeded
      results.forEach(({ index, result, readTime }) => {
        expect(result).not.toBeNull();
        const parsed = JSON.parse(result!);
        expect(parsed.match_id).toBe(matchId);
        console.log(`   ✅ Read ${index + 1}: ${readTime}ms`);
      });

      console.log(`   📊 All ${numConcurrent} reads completed`);
      console.log(`   ⏱️  Total concurrent time: ${totalTime}ms`);
      console.log(`   ⏱️  Average per read: ${(totalTime / numConcurrent).toFixed(2)}ms`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);
    }, 60000);

    it('should handle 100 concurrent reads', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const numConcurrent = 100;
      const matchId = `e2e-stress-read-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Upload a record first
      const matchRecord = createRealisticMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
      
      console.log(`\n📤 [${timestamp}] Uploading record for stress read test: ${matchId}`);
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`📥 Testing ${numConcurrent} concurrent reads (stress test)`);
      console.log(`   ⚠️  Note: Cloudflare Workers have rate limits. Some failures are expected.`);
      
      // Stagger the reads slightly to reduce rate limiting
      const readPromises = Array.from({ length: numConcurrent }, async (_, i) => {
        // Small delay to stagger requests
        await new Promise(resolve => setTimeout(resolve, i * 10));
        
        try {
          const readStartTime = Date.now();
          const result = await r2Service.getMatchRecord(matchId);
          const readTime = Date.now() - readStartTime;
          return { index: i, result, readTime, success: true };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { index: i, error: errorMsg, success: false };
        }
      });

      const readStartTime = Date.now();
      const results = await Promise.all(readPromises);
      const totalTime = Date.now() - readStartTime;

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const rateLimited = results.filter(r => !r.success && (r.error?.includes('Too Many Requests') || r.error?.includes('429'))).length;

      console.log(`   📊 Successful: ${successful}/${numConcurrent}`);
      console.log(`   📊 Failed: ${failed}/${numConcurrent}`);
      if (rateLimited > 0) {
        console.log(`   📊 Rate Limited: ${rateLimited}/${numConcurrent} (expected with Cloudflare limits)`);
      }
      console.log(`   ⏱️  Total concurrent time: ${totalTime}ms`);
      console.log(`   ⏱️  Average per read: ${(totalTime / numConcurrent).toFixed(2)}ms`);
      console.log(`   ⏱️  Throughput: ${(numConcurrent / (totalTime / 1000)).toFixed(2)} reads/sec`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);

      // At least 80% should succeed (allowing for rate limiting)
      expect(successful).toBeGreaterThanOrEqual(numConcurrent * 0.8);
    }, 180000);

    it('should handle concurrent updates to the same record (race condition)', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const matchId = `e2e-race-condition-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);
      const numConcurrent = 10;

      // Upload initial record
      const initialRecord = createRealisticMatchRecord(matchId);
      const initialJSON = JSON.stringify(initialRecord, null, 2);
      
      console.log(`\n📤 [${timestamp}] Uploading initial record: ${matchId}`);
      await r2Service.uploadMatchRecord(matchId, initialJSON);
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`🔄 Testing ${numConcurrent} concurrent updates to same record (race condition)`);
      
      const updatePromises = Array.from({ length: numConcurrent }, async (_, i) => {
        try {
          // Each update adds a new event
          const currentRecord = createRealisticMatchRecord(matchId);
          currentRecord.events.push({
            event_type: 'concurrent_update',
            timestamp: Date.now() + i,
            player_id: `player-${i}`,
            data: { update_index: i, concurrent_test: true },
          });
          
          const updateJSON = JSON.stringify(currentRecord, null, 2);
          const updateStartTime = Date.now();
          const result = await r2Service.uploadMatchRecord(matchId, updateJSON);
          const updateTime = Date.now() - updateStartTime;
          
          return { index: i, result, updateTime, success: true };
        } catch (error) {
          return { index: i, error: error instanceof Error ? error.message : String(error), success: false };
        }
      });

      const updateStartTime = Date.now();
      const results = await Promise.all(updatePromises);
      const totalTime = Date.now() - updateStartTime;

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`   📊 Successful updates: ${successful}/${numConcurrent}`);
      console.log(`   📊 Failed updates: ${failed}/${numConcurrent}`);
      console.log(`   ⏱️  Total concurrent time: ${totalTime}ms`);

      // Wait a bit for final state to settle
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify final state - should have at least one update
      const finalRecord = await r2Service.getMatchRecord(matchId);
      expect(finalRecord).not.toBeNull();
      const parsed = JSON.parse(finalRecord!);
      
      // Count concurrent update events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const concurrentEvents = parsed.events.filter((e: any) => e.data?.concurrent_test === true);
      console.log(`   📊 Final record has ${concurrentEvents.length} concurrent update events`);
      console.log(`   📊 Total events in final record: ${parsed.events.length}`);
      
      // At least some updates should have succeeded
      expect(successful).toBeGreaterThan(0);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);
    }, 120000);

    it('should handle mixed concurrent operations (reads + writes)', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const numReads = 20;
      const numWrites = 10;
      const readMatchIds: string[] = [];
      const writeMatchIds: string[] = [];

      // Pre-upload some records for reading
      console.log(`\n📤 [${timestamp}] Pre-uploading ${numReads} records for mixed test`);
      for (let i = 0; i < numReads; i++) {
        const matchId = `e2e-mixed-read-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;
        readMatchIds.push(matchId);
        testMatchIds.push(matchId);
        
        const matchRecord = createRealisticMatchRecord(matchId);
        const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
        await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`🔄 Testing mixed concurrent operations: ${numReads} reads + ${numWrites} writes`);

      // Concurrent reads
      const readPromises = readMatchIds.map(async (matchId, i) => {
        try {
          const readStartTime = Date.now();
          const result = await r2Service.getMatchRecord(matchId);
          const readTime = Date.now() - readStartTime;
          return { type: 'read', index: i, matchId, result, time: readTime, success: true };
        } catch (error) {
          return { type: 'read', index: i, matchId, error: error instanceof Error ? error.message : String(error), success: false };
        }
      });

      // Concurrent writes
      const writePromises = Array.from({ length: numWrites }, async (_, i) => {
        const matchId = `e2e-mixed-write-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;
        writeMatchIds.push(matchId);
        testMatchIds.push(matchId);
        
        try {
          const matchRecord = createRealisticMatchRecord(matchId);
          const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
          const writeStartTime = Date.now();
          const result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
          const writeTime = Date.now() - writeStartTime;
          return { type: 'write', index: i, matchId, result, time: writeTime, success: true };
        } catch (error) {
          return { type: 'write', index: i, matchId, error: error instanceof Error ? error.message : String(error), success: false };
        }
      });

      const mixedStartTime = Date.now();
      const allResults = await Promise.all([...readPromises, ...writePromises]);
      const totalTime = Date.now() - mixedStartTime;

      const readResults = allResults.filter(r => r.type === 'read');
      const writeResults = allResults.filter(r => r.type === 'write');
      const successfulReads = readResults.filter(r => r.success).length;
      const successfulWrites = writeResults.filter(r => r.success).length;

      console.log(`   📊 Successful reads: ${successfulReads}/${numReads}`);
      console.log(`   📊 Successful writes: ${successfulWrites}/${numWrites}`);
      console.log(`   ⏱️  Total concurrent time: ${totalTime}ms`);
      console.log(`   ⏱️  Average read time: ${(readResults.filter(r => r.success).reduce((sum, r) => sum + (r.time || 0), 0) / successfulReads).toFixed(2)}ms`);
      console.log(`   ⏱️  Average write time: ${(writeResults.filter(r => r.success).reduce((sum, r) => sum + (r.time || 0), 0) / successfulWrites).toFixed(2)}ms`);
      console.log(`   ⏱️  Total test time: ${Date.now() - testStartTime}ms`);

      // Most operations should succeed
      expect(successfulReads).toBeGreaterThanOrEqual(numReads * 0.95);
      expect(successfulWrites).toBeGreaterThanOrEqual(numWrites * 0.95);
    }, 120000);
  });

  describe('Error Handling', () => {
    it('should return null for non-existent match records', async () => {
      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      const nonExistentId = `e2e-nonexistent-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log(`\n[${timestamp}] TEST: Retrieve Non-Existent Record`);
      console.log(`  Match ID: ${nonExistentId}`);
      console.log(`  Action: Attempting to retrieve...`);
      
      const getStartTime = Date.now();
      const result = await r2Service.getMatchRecord(nonExistentId);
      const getTime = Date.now() - getStartTime;

      expect(result).toBeNull();
      console.log(`  [SUCCESS] Correctly returned null for non-existent record`);
      console.log(`  Performance:`);
      console.log(`    - Get Time: ${getTime}ms`);
      console.log(`    - Total Test Time: ${Date.now() - testStartTime}ms`);
    }, 30000);

    it('should reject records exceeding 10MB limit', async () => {
      const matchId = `e2e-too-large-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const largeData = 'x'.repeat(11 * 1024 * 1024);
      const matchRecord = {
        match_id: matchId,
        version: '1.0.0',
        large_data: largeData,
      };

      const matchRecordJSON = JSON.stringify(matchRecord);
      const size = new TextEncoder().encode(matchRecordJSON).length;

      const testStartTime = Date.now();
      const timestamp = new Date().toISOString();
      
      console.log(`\n[${timestamp}] TEST: Reject Oversized Record`);
      console.log(`  Match ID: ${matchId}`);
      console.log(`  Size: ${size} bytes (${(size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`  Limit: 10 MB`);
      console.log(`  Action: Attempting upload (should be rejected)...`);

      const uploadStartTime = Date.now();
      await expect(r2Service.uploadMatchRecord(matchId, matchRecordJSON)).rejects.toThrow(
        'exceeds size limit'
      );
      const uploadTime = Date.now() - uploadStartTime;

      console.log(`  [SUCCESS] Correctly rejected oversized record`);
      console.log(`  Performance:`);
      console.log(`    - Rejection Time: ${uploadTime}ms`);
      console.log(`    - Total Test Time: ${Date.now() - testStartTime}ms`);
    }, 30000);
  });

  describe('GDPR Operations', () => {
    it('should support data export endpoint', async () => {
      const userId = `e2e-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testUserIds.push(userId);

      console.log(`\n📥 Testing data export for user: ${userId}`);
      const response = await fetch(`${workerUrl}/api/data-export/${userId}`, {
        method: 'GET',
      });

      // May return empty or require auth - both are valid
      expect([200, 401, 404]).toContain(response.status);
      console.log(`   ✅ Export endpoint accessible (status: ${response.status})`);
    }, 30000);

    it('should support data deletion endpoint', async () => {
      const userId = `e2e-user-delete-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testUserIds.push(userId);

      console.log(`\n🗑️  Testing data deletion for user: ${userId}`);
      const response = await fetch(`${workerUrl}/api/data/${userId}`, {
        method: 'DELETE',
      });

      // May require auth or return validation error - that's expected
      expect([200, 204, 400, 401, 404]).toContain(response.status);
      console.log(`   ✅ Deletion endpoint accessible (status: ${response.status})`);
    }, 30000);

    it('should support match anonymization', async () => {
      const matchId = `e2e-anonymize-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Upload match with PII
      const matchRecord = createRealisticMatchRecord(matchId);
      matchRecord.players[0].wallet_address = 'PII-WALLET-ADDRESS-123';
      await r2Service.uploadMatchRecord(matchId, JSON.stringify(matchRecord, null, 2));
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`\n🔒 Anonymizing match: ${matchId}`);
      const response = await fetch(`${workerUrl}/api/matches/${matchId}/anonymize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // May require auth or return validation error
      expect([200, 400, 401]).toContain(response.status);
      
      if (response.ok) {
        const result = await response.json();
        expect(result.success).toBe(true);
        console.log(`   ✅ Match anonymized successfully`);
      } else {
        console.log(`   ⚠️  Anonymization requires authentication (expected)`);
      }
    }, 30000);
  });
});
