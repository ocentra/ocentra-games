import { HashService } from '@lib/crypto/HashService';

export interface MerkleTree {
  root: string;
  leaves: string[];
  levels: string[][];
}

/**
 * Internal Merkle proof format (for tree construction).
 */
export interface MerkleProofInternal {
  leaf: string;
  path: string[];
  indices: number[];
}

/**
 * Spec-compliant Merkle proof format per spec Section 6, line 221.
 */
export interface MerkleProof {
  match_id: string;
  sha256: string;
  proof: string[];
  index: number;
}

/**
 * Merkle tree implementation per spec Section 6.
 * 
 * Rules:
 * - Leaf input: 0x00 || hash (SHA-256)
 * - Node input: 0x01 || left || right (SHA-256)
 * - Uses SHA-256 for all hashing operations
 */
export class MerkleBatching {
  /**
   * Builds a Merkle tree from match hashes.
   * Each hash is a hex string (64 characters for SHA-256).
   */
  static async buildMerkleTree(matchHashes: string[]): Promise<MerkleTree> {
    if (matchHashes.length === 0) {
      throw new Error('Cannot build Merkle tree from empty array');
    }

    // Hash each match hash as a leaf (0x00 || hash)
    const leaves = await Promise.all(
      matchHashes.map((hash) => this.hashLeaf(hash))
    );
    const levels: string[][] = [leaves];

    let currentLevel = leaves;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const nodeHash = await this.hashPair(left, right);
        nextLevel.push(nodeHash);
      }
      levels.push(nextLevel);
      currentLevel = nextLevel;
    }

    return {
      root: currentLevel[0],
      leaves,
      levels,
    };
  }

  /**
   * Generates a spec-compliant Merkle proof for a given match.
   * Per spec Section 6, line 221: {"match_id":"...","sha256":"...","proof":["<hex>","<hex>"],"index":123}
   */
  static async generateMerkleProof(
    matchId: string,
    matchHash: string,
    tree: MerkleTree
  ): Promise<MerkleProof> {
    // Compute the leaf hash for this match hash
    const leafHash = await this.hashLeaf(matchHash);
    
    // Find the leaf in the tree
    const leafIndex = tree.leaves.indexOf(leafHash);

    if (leafIndex === -1) {
      throw new Error(`Match hash ${matchHash} not found in Merkle tree`);
    }

    const proof: string[] = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < tree.levels.length - 1; level++) {
      const currentLevel = tree.levels[level];
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      match_id: matchId,
      sha256: matchHash,
      proof,
      index: leafIndex,
    };
  }

  /**
   * Generates internal Merkle proof format (for backward compatibility and internal use).
   * Note: This is async because we need to compute the leaf hash.
   */
  static async generateMerkleProofInternal(matchHash: string, tree: MerkleTree): Promise<MerkleProofInternal> {
    // Compute the leaf hash for this match hash
    const leafHash = await this.hashLeaf(matchHash);
    
    // Find the leaf in the tree
    const leafIndex = tree.leaves.indexOf(leafHash);

    if (leafIndex === -1) {
      throw new Error(`Match hash ${matchHash} not found in Merkle tree`);
    }

    const path: string[] = [];
    const indices: number[] = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < tree.levels.length - 1; level++) {
      const currentLevel = tree.levels[level];
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < currentLevel.length) {
        path.push(currentLevel[siblingIndex]);
        indices.push(siblingIndex);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leaf: tree.leaves[leafIndex],
      path,
      indices,
    };
  }

  /**
   * Verifies a spec-compliant Merkle proof against a root.
   * Per spec Section 6: verifies that the proof path correctly reconstructs the root.
   */
  static async verifyMerkleProof(proof: MerkleProof, root: string): Promise<boolean> {
    // Compute the leaf hash for the match hash
    const leafHash = await this.hashLeaf(proof.sha256);
    let current = leafHash;

    // Reconstruct the path using the proof array
    // The index tells us the position in the original array
    let currentIndex = proof.index;

    for (let i = 0; i < proof.proof.length; i++) {
      const sibling = proof.proof[i];
      
      // Determine if current is left or right based on index
      if (currentIndex % 2 === 0) {
        // Current is left, sibling is right
        current = await this.hashPair(current, sibling);
      } else {
        // Sibling is left, current is right
        current = await this.hashPair(sibling, current);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return current === root;
  }

  /**
   * Verifies an internal Merkle proof format (for backward compatibility).
   */
  static async verifyMerkleProofInternal(proof: MerkleProofInternal, root: string): Promise<boolean> {
    let current = proof.leaf;

    for (let i = 0; i < proof.path.length; i++) {
      const sibling = proof.path[i];
      const index = proof.indices[i];

      if (index % 2 === 0) {
        // Current is left, sibling is right
        current = await this.hashPair(current, sibling);
      } else {
        // Sibling is left, current is right
        current = await this.hashPair(sibling, current);
      }
    }

    return current === root;
  }

  /**
   * Hashes a leaf: SHA256(0x00 || hash_bytes)
   * @param hash Hex string of the match hash
   */
  private static async hashLeaf(hash: string): Promise<string> {
    // Convert hex string to bytes
    const hashBytes = this.hexToBytes(hash);
    
    // Prepend 0x00 prefix
    const prefixed = new Uint8Array([0x00, ...hashBytes]);
    
    // Hash with SHA-256
    return await HashService.hashMatchRecord(prefixed);
  }


  /**
   * Hashes a pair: SHA256(0x01 || left_bytes || right_bytes)
   * @param left Hex string of left hash
   * @param right Hex string of right hash
   */
  private static async hashPair(left: string, right: string): Promise<string> {
    // Convert hex strings to bytes
    const leftBytes = this.hexToBytes(left);
    const rightBytes = this.hexToBytes(right);
    
    // Prepend 0x01 prefix and concatenate
    const prefixed = new Uint8Array([0x01, ...leftBytes, ...rightBytes]);
    
    // Hash with SHA-256
    return await HashService.hashMatchRecord(prefixed);
  }

  /**
   * Converts a hex string to Uint8Array.
   */
  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}

