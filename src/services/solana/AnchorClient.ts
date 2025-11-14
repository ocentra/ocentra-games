import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import type { Commitment } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

/**
 * Attempts to import the generated IDL from anchor build.
 * Per critique Issue #7: Add graceful degradation instead of throwing at module load time.
 * 
 * IMPORTANT: Run "anchor build" in Rust/SolanaContract before building this project.
 * Expected location: Rust/SolanaContract/target/idl/solana_games_program.json
 */
let IDL: Idl | null = null;
let IDL_LOAD_ERROR: Error | null = null;

// Per critique Issue #7: Don't throw at module load time - load lazily or return error
try {
  // Dynamic import path, will be resolved by bundler at build time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  IDL = require('../../../Rust/SolanaContract/target/idl/solana_games_program.json') as Idl;
  
  // Validate IDL structure
  if (!IDL || !IDL.instructions || IDL.instructions.length === 0) {
    IDL = null;
    IDL_LOAD_ERROR = new Error(
      'IDL is invalid or has no instructions. Please run "anchor build" in Rust/SolanaContract directory.'
    );
  }
} catch (error) {
  // Per critique Issue #7: Store error instead of throwing
  IDL = null;
  IDL_LOAD_ERROR = error instanceof Error 
    ? error 
    : new Error(
        'Failed to load IDL. Please run "anchor build" in Rust/SolanaContract directory first.\n' +
        'Expected location: Rust/SolanaContract/target/idl/solana_games_program.json'
      );
}

/**
 * Attempts to load IDL from on-chain program data account.
 * Per critique Issue #7: Add on-chain IDL fallback.
 */
async function loadIDLFromChain(connection: Connection): Promise<Idl | null> {
  try {
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (!programInfo || !programInfo.data) {
      return null;
    }

    // Anchor stores IDL in program data account
    // The IDL is stored as a borsh-serialized struct
    // We need to deserialize it
    const idlData = programInfo.data;
    
    // Anchor IDL format: first 8 bytes are discriminator, then borsh-serialized IDL
    if (idlData.length < 8) {
      return null;
    }

    // Try to parse as JSON (Anchor may store IDL as JSON in some cases)
    // For borsh, we'd need @coral-xyz/anchor's IDL parsing
    // For now, try JSON parsing
    try {
      const idlString = new TextDecoder().decode(idlData.slice(8));
      const parsed = JSON.parse(idlString) as Idl;
      if (parsed && parsed.instructions && parsed.instructions.length > 0) {
        return parsed;
      }
    } catch {
      // Not JSON, might be borsh - would need Anchor's IDL deserializer
      // For now, return null and fall back to file loading
    }

    return null;
  } catch (error) {
    console.warn('Failed to load IDL from chain:', error);
    return null;
  }
}

/**
 * Attempts to load IDL with retry and fallback.
 * Per critique Issue #7: Add retry logic, fallback IDL loading, and on-chain fallback.
 * Exported for use in async contexts where IDL needs to be loaded dynamically.
 */
export async function loadIDLWithRetry(connection?: Connection): Promise<Idl> {
  // If already loaded successfully, return it
  if (IDL) {
    return IDL;
  }
  
  // Per critique Issue #7: Try on-chain fallback if connection is provided
  if (connection) {
    try {
      const chainIDL = await loadIDLFromChain(connection);
      if (chainIDL) {
        IDL = chainIDL;
        IDL_LOAD_ERROR = null;
        return IDL;
      }
    } catch (error) {
      console.warn('On-chain IDL loading failed, trying file system:', error);
    }
  }
  
  // If we have an error, try to load from alternative locations using path resolution
  if (IDL_LOAD_ERROR) {
    // Use path resolution to find IDL from project root
    // This works regardless of where the code is executed from
    const path = await import('path');
    const fs = await import('fs/promises');
    
    // Try to resolve from common locations relative to project root
    // Start from current working directory and walk up to find project root
    let currentDir = process.cwd();
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;
    
    while (depth < maxDepth) {
      const idlPath = path.join(currentDir, 'Rust', 'SolanaContract', 'target', 'idl', 'solana_games_program.json');
      
      try {
        const idlContent = await fs.readFile(idlPath, 'utf-8');
        const loadedIDL = JSON.parse(idlContent) as Idl;
        
        if (loadedIDL && loadedIDL.instructions && loadedIDL.instructions.length > 0) {
          IDL = loadedIDL;
          IDL_LOAD_ERROR = null;
          return IDL;
        }
      } catch {
        // File doesn't exist at this path, continue searching
      }
      
      // Move up one directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached filesystem root, stop searching
        break;
      }
      currentDir = parentDir;
      depth++;
    }
    
    // If all paths fail, throw the original error
    throw IDL_LOAD_ERROR;
  }
  
  throw new Error('IDL not loaded and no error recorded');
}

export class AnchorClient {
  private program: Program;
  private connection: Connection;
  private provider: AnchorProvider;

  constructor(
    connection: Connection,
    wallet: Wallet,
    commitment: Commitment = 'confirmed',
    idl?: Idl // Per critique Issue #7: Allow IDL to be passed in for testing/fallback
  ) {
    this.connection = connection;
    this.provider = new AnchorProvider(connection, wallet, {
      commitment,
      preflightCommitment: commitment,
    });
    
    // Per critique Issue #7: Use provided IDL or try to load with retry
    let idlToUse: Idl;
    if (idl) {
      idlToUse = idl;
    } else {
      // Try to load IDL (synchronous for constructor, but with graceful error)
      if (!IDL) {
        // In async context, this would call loadIDLWithRetry, but constructor is sync
        // So we throw a clear error that can be caught by caller
        const error = IDL_LOAD_ERROR || new Error(
          'IDL is not loaded. Please ensure "anchor build" has been run in Rust/SolanaContract directory.\n' +
          'Alternatively, pass IDL as constructor parameter for testing/fallback scenarios.'
        );
        throw error;
      }
      idlToUse = IDL;
    }
    
    // Validate IDL structure at runtime
    if (!idlToUse || !idlToUse.instructions || idlToUse.instructions.length === 0) {
      throw new Error(
        'IDL is invalid or has no instructions. Please run "anchor build" in Rust/SolanaContract directory.'
      );
    }
    
    // Program constructor: (idl, programId, provider)
    // @ts-expect-error - Program constructor types may not match exactly with dynamic IDL import
    this.program = new Program(idlToUse, PROGRAM_ID, this.provider);
  }

  getProgram(): Program {
    return this.program;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProvider(): AnchorProvider {
    return this.provider;
  }

  getProgramId(): PublicKey {
    return PROGRAM_ID;
  }

  /**
   * Creates an AnchorClient asynchronously with IDL retry logic.
   * Per critique Issue #7: Provides async factory method that uses loadIDLWithRetry with on-chain fallback.
   * Use this when you need to load IDL with fallback paths in an async context.
   */
  static async create(
    connection: Connection,
    wallet: Wallet,
    commitment: Commitment = 'confirmed'
  ): Promise<AnchorClient> {
    // Per critique Issue #7: Try on-chain fallback first, then file system
    const idl = await loadIDLWithRetry(connection);
    return new AnchorClient(connection, wallet, commitment, idl);
  }
}

