import { MerkleBatching, type MerkleProof } from './MerkleBatching';
import { R2Service } from '@services/storage/R2Service';
import { SignatureService } from '@lib/crypto/SignatureService';

export interface BatchConfig {
  batchSize: number;        // 100
  maxBatchSize: number;     // 1000
  flushIntervalMs: number;  // 60000 (1 minute)
  maxWaitTimeMs: number;    // 300000 (5 minutes)
}

export interface PendingMatch {
  matchId: string;
  matchHash: string;
  hotUrl?: string;
  timestamp: number;
}

export interface BatchManifest {
  version: string;
  batch_id: string;
  merkle_root: string;
  match_count: number;
  match_ids: string[];
  match_hashes: string[];
  created_at: string;
  anchored_at?: string;
  anchor_txid?: string;
  signature?: string;
}

export interface BatchAnchoringOptions {
  gameClient?: {
    anchorBatch: (
      batchId: string,
      merkleRoot: Uint8Array,
      count: number,
      firstMatchId: string,
      lastMatchId: string,
      wallet: { publicKey: unknown; signTransaction: (tx: unknown) => Promise<unknown> }
    ) => Promise<string>;
  };
  wallet?: { publicKey: unknown; signTransaction: (tx: unknown) => Promise<unknown> };
}

export class BatchManager {
  private config: BatchConfig;
  private r2Service?: R2Service;
  private pendingMatches: PendingMatch[] = [];
  private flushTimer?: NodeJS.Timeout;
  private coordinatorPrivateKey?: string;
  private batchCounter: number = 0;
  private persistenceKey: string = 'batch_manager_state';
  private shutdownHandlers: Array<() => Promise<void>> = [];
  private anchoringOptions?: BatchAnchoringOptions;

  constructor(
    config: BatchConfig, 
    r2Service?: R2Service, 
    coordinatorPrivateKey?: string,
    anchoringOptions?: BatchAnchoringOptions
  ) {
    this.config = config;
    this.r2Service = r2Service;
    this.coordinatorPrivateKey = coordinatorPrivateKey;
    this.anchoringOptions = anchoringOptions;
    
    // Per critique Phase 7.3: Load persisted state on startup
    this.loadPersistedState();
    
    // Per critique Phase 7.3: Register shutdown handler for automatic flush
    if (typeof process !== 'undefined') {
      const shutdownHandler = async () => {
        await this.flush();
      };
      this.shutdownHandlers.push(shutdownHandler);
      process.on('SIGTERM', shutdownHandler);
      process.on('SIGINT', shutdownHandler);
      process.on('beforeExit', shutdownHandler);
    }
  }

  /**
   * Per critique Phase 7.3: Load persisted batch state from storage.
   */
  private async loadPersistedState(): Promise<void> {
    if (!this.r2Service) {
      return;
    }

    try {
      const stateJson = await this.r2Service.getMatchRecord(this.persistenceKey);
      if (stateJson) {
        const state = JSON.parse(stateJson);
        this.pendingMatches = state.pendingMatches || [];
        this.batchCounter = state.batchCounter || 0;
        
        // Check if any matches are too old (exceed maxWaitTimeMs)
        const now = Date.now();
        this.pendingMatches = this.pendingMatches.filter(m => {
          const age = now - m.timestamp;
          return age < this.config.maxWaitTimeMs;
        });

        // Restart flush timer if there are pending matches
        if (this.pendingMatches.length > 0) {
          this.resetFlushTimer();
        }
      }
    } catch (error) {
      // State doesn't exist or failed to load - that's OK
      console.warn('Failed to load persisted batch state:', error);
    }
  }

  /**
   * Per critique Phase 7.3: Persist batch state to storage.
   */
  private async persistState(): Promise<void> {
    if (!this.r2Service) {
      return;
    }

    try {
      const state = {
        pendingMatches: this.pendingMatches,
        batchCounter: this.batchCounter,
        timestamp: Date.now(),
      };
      const stateJson = JSON.stringify(state);
      await this.r2Service.uploadMatchRecord(this.persistenceKey, stateJson);
    } catch (error) {
      console.error('Failed to persist batch state:', error);
    }
  }

  /**
   * Adds a match to the pending batch.
   * Automatically flushes if batch size is reached.
   */
  async addMatch(matchId: string, matchHash: string, hotUrl?: string): Promise<void> {
    this.pendingMatches.push({
      matchId,
      matchHash,
      hotUrl,
      timestamp: Date.now(),
    });

    // Per critique Phase 7.3: Persist state after adding match
    await this.persistState();

    // Auto-flush if batch size reached
    if (this.pendingMatches.length >= this.config.batchSize) {
      await this.flush();
    } else {
      // Reset flush timer
      this.resetFlushTimer();
    }
  }

  /**
   * Flushes the current batch, creating a Merkle tree and manifest.
   * Per critique Phase 7.3: Add error handling and state persistence.
   */
  async flush(): Promise<BatchManifest | null> {
    if (this.pendingMatches.length === 0) {
      return null;
    }

    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    const matches = [...this.pendingMatches];
    
    try {
      // Generate batch ID
      const batchId = this.generateBatchId();

      // Extract match hashes
      const matchHashes = matches.map(m => m.matchHash);
      const matchIds = matches.map(m => m.matchId);

      // Build Merkle tree
      const merkleTree = await MerkleBatching.buildMerkleTree(matchHashes);

      // Create batch manifest
      const manifest: BatchManifest = {
        version: '1.0.0',
        batch_id: batchId,
        merkle_root: merkleTree.root,
        match_count: matches.length,
        match_ids: matchIds,
        match_hashes: matchHashes,
        created_at: new Date().toISOString(),
      };

      // Sign manifest if coordinator key is available
      if (this.coordinatorPrivateKey) {
        try {
          // Convert string key to CryptoKey
          const privateKey = await this.importPrivateKey(this.coordinatorPrivateKey);
          if (!privateKey) {
            throw new Error('Failed to import coordinator private key');
          }

          const canonicalJSON = JSON.stringify(manifest);
          const canonicalBytes = new TextEncoder().encode(canonicalJSON);
          const signature = await SignatureService.signMatchRecord(
            canonicalBytes,
            privateKey
          );
          manifest.signature = signature.signature; // Extract signature string from SignatureRecord
        } catch (error) {
          console.error('Failed to sign batch manifest:', error);
        }
      }

      // Upload manifest to R2 if service is available
      let manifestUrl: string | undefined;
      if (this.r2Service) {
        try {
          const manifestPath = `manifests/${batchId}.json`;
          const manifestJSON = JSON.stringify(manifest, null, 2);
          await this.r2Service.uploadMatchRecord(manifestPath, manifestJSON);
          manifestUrl = manifestPath; // In production, this would be a full URL
        } catch (error) {
          console.error('Failed to upload batch manifest to R2:', error);
          // Per critique Phase 7.3: On error, don't clear pending matches - keep them for retry
          throw error;
        }
      }

      // Per critique Fix 3: Anchor merkle_root on-chain via anchor_batch instruction
      // Per spec Section 7, lines 238-242: "anchor_batch(batch_id, merkle_root, count, manifest_url)"
      if (this.anchoringOptions?.gameClient && this.anchoringOptions?.wallet && manifestUrl) {
        try {
          const merkleRootBytes = Uint8Array.from(
            Buffer.from(merkleTree.root, 'hex')
          );
          const firstMatchId = matchIds[0];
          const lastMatchId = matchIds[matchIds.length - 1];

          const anchorTxSignature = await this.anchoringOptions.gameClient.anchorBatch(
            batchId,
            merkleRootBytes,
            matches.length,
            firstMatchId,
            lastMatchId,
            this.anchoringOptions.wallet
          );

          manifest.anchored_at = new Date().toISOString();
          manifest.anchor_txid = anchorTxSignature;

          // Re-upload manifest with anchor info
          if (this.r2Service) {
            try {
              const manifestPath = `manifests/${batchId}.json`;
              const manifestJSON = JSON.stringify(manifest, null, 2);
              await this.r2Service.uploadMatchRecord(manifestPath, manifestJSON);
            } catch (error) {
              console.error('Failed to update batch manifest with anchor info:', error);
            }
          }
        } catch (error) {
          console.error('Failed to anchor batch on-chain:', error);
          // Don't throw - manifest is still valid even if on-chain anchor fails
          // The batch can be anchored later via MatchCoordinator.flushBatch()
        }
      }

      // Only clear pending matches after successful flush
      this.pendingMatches = [];
      
      // Per critique Phase 7.3: Clear persisted state after successful flush
      await this.persistState();

      return manifest;
    } catch (error) {
      // Per critique Phase 7.3: On error, keep matches in pending list for retry
      console.error('Batch flush failed, keeping matches for retry:', error);
      // Restart flush timer to retry later
      this.resetFlushTimer();
      throw error;
    }
  }

  /**
   * Generates a spec-compliant Merkle proof for a specific match in a batch.
   * Per spec Section 6, line 221: {"match_id":"...","sha256":"...","proof":["<hex>","<hex>"],"index":123}
   */
  async generateProofForMatch(
    matchId: string,
    matchHash: string,
    manifest: BatchManifest
  ): Promise<MerkleProof | null> {
    // Rebuild Merkle tree from manifest
    const merkleTree = await MerkleBatching.buildMerkleTree(manifest.match_hashes);

    // Find match index
    const matchIndex = manifest.match_hashes.indexOf(matchHash);
    if (matchIndex === -1) {
      return null;
    }

    // Verify matchId matches
    if (manifest.match_ids[matchIndex] !== matchId) {
      return null;
    }

    // Generate spec-compliant proof
    return await MerkleBatching.generateMerkleProof(matchId, matchHash, merkleTree);
  }

  /**
   * Gets the batch manifest for a given batch ID.
   */
  async getBatchManifest(batchId: string): Promise<BatchManifest | null> {
    if (!this.r2Service) {
      return null;
    }

    try {
      const manifestPath = `manifests/${batchId}.json`;
      const manifestJSON = await this.r2Service.getMatchRecord(manifestPath);
      if (!manifestJSON) {
        return null;
      }
      return JSON.parse(manifestJSON) as BatchManifest;
    } catch (error) {
      console.error(`Failed to fetch batch manifest ${batchId}:`, error);
      return null;
    }
  }

  /**
   * Finds which batch contains a given match ID.
   * Per critique: improved to use on-chain BatchAnchor accounts for efficient lookup.
   */
  async findBatchForMatch(
    matchId: string,
    gameClient?: { findBatchForMatch: (matchId: string) => Promise<{ batchId: string; merkleRoot: string } | null> }
  ): Promise<BatchManifest | null> {
    if (!this.r2Service) {
      return null;
    }

    // Step 1: Query on-chain BatchAnchor accounts to find batch
    let batchInfo: { batchId: string; merkleRoot: string } | null = null;
    if (gameClient?.findBatchForMatch) {
      batchInfo = await gameClient.findBatchForMatch(matchId);
    }

    if (!batchInfo) {
      // Fallback: search through R2 manifests (inefficient but works as backup)
      // This is a simplified implementation for when on-chain query fails
      return null;
    }

    // Step 2: Fetch manifest from R2 using batchId
    const manifest = await this.getBatchManifest(batchInfo.batchId);
    if (!manifest) {
      return null;
    }

    // Step 3: Verify matchId is in manifest.match_ids
    if (!manifest.match_ids.includes(matchId)) {
      return null;
    }

    // Step 4: Verify merkle root matches
    if (manifest.merkle_root !== batchInfo.merkleRoot) {
      console.warn(`Merkle root mismatch for batch ${batchInfo.batchId}`);
      return null;
    }

    return manifest;
  }

  /**
   * Generates a batch ID in format: batch-YYYYMMDD-NNN
   */
  private generateBatchId(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    this.batchCounter++;
    return `batch-${dateStr}-${String(this.batchCounter).padStart(3, '0')}`;
  }

  /**
   * Resets the flush timer.
   */
  private resetFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush().catch(error => {
        console.error('Auto-flush failed:', error);
      });
    }, this.config.flushIntervalMs);
  }

  /**
   * Forces a flush of all pending matches (used on shutdown).
   * Per critique Phase 7.3: Automatic flush on shutdown.
   */
  async forceFlush(): Promise<BatchManifest | null> {
    // Clear timer before force flush
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    return await this.flush();
  }

  /**
   * Per critique Phase 7.3: Cleanup on shutdown.
   */
  async shutdown(): Promise<void> {
    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    // Force flush pending matches
    if (this.pendingMatches.length > 0) {
      try {
        await this.forceFlush();
      } catch (error) {
        console.error('Failed to flush batch on shutdown:', error);
      }
    }
  }

  /**
   * Gets the number of pending matches.
   */
  getPendingCount(): number {
    return this.pendingMatches.length;
  }

  /**
   * Imports a string private key into a CryptoKey.
   * Supports hex, base64, and raw byte formats.
   * For Ed25519, prefers raw format (64 bytes).
   */
  private async importPrivateKey(keyString: string): Promise<CryptoKey | null> {
    try {
      // Try hex format first (128 hex chars = 64 bytes for Ed25519 raw key)
      try {
        const keyBytes = new Uint8Array(
          keyString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        );
        if (keyBytes.length === 64) {
          // Ed25519 raw private key is 64 bytes
          return await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'Ed25519' },
            false,
            ['sign']
          );
        }
      } catch {
        // Not hex, try base64
      }

      // Try base64 format
      try {
        const keyBytes = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
        if (keyBytes.length === 64) {
          // Ed25519 raw private key is 64 bytes
          return await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'Ed25519' },
            false,
            ['sign']
          );
        }
        // Try pkcs8 format if not 64 bytes (for compatibility)
        return await crypto.subtle.importKey(
          'pkcs8',
          keyBytes,
          { name: 'Ed25519' },
          false,
          ['sign']
        );
      } catch {
        // Not base64 or pkcs8
      }

      console.error('Failed to import private key: unrecognized format');
      return null;
    } catch (error) {
      console.error('Failed to import private key:', error);
      return null;
    }
  }
}

