import { HashService } from '@ocentra/crypto-domain/services/HashService';

export interface MerkleTree {
  root: string;
  leaves: string[];
  levels: string[][];
}

export interface MerkleProofInternal {
  leaf: string;
  path: string[];
  indices: number[];
}

export interface MerkleProof {
  match_id: string;
  sha256: string;
  proof: string[];
  index: number;
}

export class MerkleBatching {
  static async buildMerkleTree(matchHashes: string[]): Promise<MerkleTree> {
    if (matchHashes.length === 0) {
      throw new Error('Cannot build Merkle tree from empty array');
    }

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

  static async generateMerkleProof(
    matchId: string,
    matchHash: string,
    tree: MerkleTree
  ): Promise<MerkleProof> {
    const leafHash = await this.hashLeaf(matchHash);
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

  static async generateMerkleProofInternal(matchHash: string, tree: MerkleTree): Promise<MerkleProofInternal> {
    const leafHash = await this.hashLeaf(matchHash);
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

  static async verifyMerkleProof(proof: MerkleProof, root: string): Promise<boolean> {
    const leafHash = await this.hashLeaf(proof.sha256);
    let current = leafHash;
    let currentIndex = proof.index;

    for (let i = 0; i < proof.proof.length; i++) {
      const sibling = proof.proof[i];

      if (currentIndex % 2 === 0) {
        current = await this.hashPair(current, sibling);
      } else {
        current = await this.hashPair(sibling, current);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return current === root;
  }

  static async verifyMerkleProofInternal(proof: MerkleProofInternal, root: string): Promise<boolean> {
    let current = proof.leaf;

    for (let i = 0; i < proof.path.length; i++) {
      const sibling = proof.path[i];
      const index = proof.indices[i];

      if (index % 2 === 0) {
        current = await this.hashPair(current, sibling);
      } else {
        current = await this.hashPair(sibling, current);
      }
    }

    return current === root;
  }

  private static async hashLeaf(hash: string): Promise<string> {
    const hashBytes = this.hexToBytes(hash);
    const prefixed = new Uint8Array([0x00, ...hashBytes]);
    return await HashService.hashMatchRecord(prefixed);
  }

  private static async hashPair(left: string, right: string): Promise<string> {
    const leftBytes = this.hexToBytes(left);
    const rightBytes = this.hexToBytes(right);
    const prefixed = new Uint8Array([0x01, ...leftBytes, ...rightBytes]);
    return await HashService.hashMatchRecord(prefixed);
  }

  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}
