// CLAIM-specific test helpers

import * as anchor from '@coral-xyz/anchor'
import { AnchorError } from '@coral-xyz/anchor'
import {
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  SendTransactionError,
} from '@solana/web3.js'
import { program, provider } from '@/common'
import { getMovePDA } from '@/common'
import {
  normalizeAndRethrowAnchorError,
  retryOnUnsupportedSysvar,
} from '@/common'

/**
 * CLAIM game action types
 */
export const CLAIM_ACTIONS = {
  PICK_UP: 0,
  DECLINE: 1,
  DECLARE_INTENT: 2,
  CALL_SHOWDOWN: 3,
  REBUTTAL: 4,
  REVEAL_FLOOR_CARD: 5,
} as const

/**
 * CLAIM game constants
 */
export const CLAIM_CONSTANTS = {
  MAX_HAND_SIZE: 13,
  MAX_ACTION_TYPE: 5,
} as const

/**
 * Generate a mock floor card hash for testing
 * In real game, this would be SHA-256(suit + value) of the actual card
 * For tests, we use deterministic hashes based on an index
 */
export function generateMockFloorCardHash(index: number = 0): Buffer {
  // Create a deterministic 32-byte hash from index
  // Format: [0x00...FF, index repeated]
  const hash = Buffer.alloc(32)
  hash.fill(index % 256)
  // Add some variation based on index
  for (let i = 0; i < 32; i++) {
    hash[i] = (index + i) % 256
  }
  return hash
}

/**
 * Reveal a floor card (dealer/platform action)
 * This simulates the dealer placing a card face up on the floor
 */
export async function revealFloorCard(
  matchId: string,
  userId: string,
  matchPDA: PublicKey,
  registryPDA: PublicKey,
  floorCardHash: Buffer,
  nonce: anchor.BN,
  player: Keypair
): Promise<string> {
  // Verify match is in playing phase before attempting reveal
  const matchAccount = await program.account.match.fetch(matchPDA)
  if (matchAccount.phase !== 1) {
    throw new Error(
      `Cannot reveal floor card: match is in phase ${matchAccount.phase}, expected phase 1 (playing)`
    )
  }

  // Verify floor card is not already revealed
  const isFloorCardRevealed = (matchAccount.flags & 0x01) !== 0
  if (isFloorCardRevealed) {
    // Floor card already revealed - this is fine, just return success
    console.log(`[revealFloorCard] Floor card already revealed, skipping`)
    return 'skipped'
  }

  const [movePDA] = await getMovePDA(matchId, player.publicKey, nonce)

  return await submitClaimMoveManual(
    matchId,
    userId,
    CLAIM_ACTIONS.REVEAL_FLOOR_CARD,
    floorCardHash,
    nonce,
    matchPDA,
    registryPDA,
    movePDA,
    player
  )
}

// Helper to submit CLAIM move manually (bypasses Anchor's PDA verification)
// This is used when Anchor's PDA derivation doesn't match our manual derivation
export const submitClaimMoveManual = async (
  matchId: string,
  userId: string,
  actionType: number,
  payload: Buffer,
  nonce: anchor.BN,
  matchPDA: PublicKey,
  registryPDA: PublicKey,
  movePDA: PublicKey,
  player: Keypair
): Promise<string> => {
  try {
    // First, try using Anchor's RPC (works for most cases)
    return await program.methods
      .submitMove(matchId, userId, actionType, payload, nonce)
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        moveAccount: movePDA,
        player: player.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player])
      .rpc()
  } catch (err: unknown) {
    // If ConstraintSeeds error, use manual instruction encoding
    if (
      err instanceof AnchorError &&
      err.error?.errorCode?.code === 'ConstraintSeeds'
    ) {
      console.log(
        `[submitClaimMoveManual] ConstraintSeeds error, using manual encoding`
      )
      return await submitClaimMoveManualRaw(
        matchId,
        userId,
        actionType,
        payload,
        nonce,
        matchPDA,
        registryPDA,
        movePDA,
        player
      )
    }

    // Normalize and rethrow
    normalizeAndRethrowAnchorError(err, 'submitClaimMoveManual')
  }
}

// Raw manual submission (bypasses Anchor entirely)
async function submitClaimMoveManualRaw(
  matchId: string,
  userId: string,
  actionType: number,
  payload: Buffer,
  nonce: anchor.BN,
  matchPDA: PublicKey,
  registryPDA: PublicKey,
  movePDA: PublicKey,
  player: Keypair
): Promise<string> {
  const [derivedMovePDA] = await getMovePDA(matchId, player.publicKey, nonce)

  // Verify PDA matches
  if (!derivedMovePDA.equals(movePDA)) {
    throw new Error(
      `PDA mismatch: expected ${movePDA.toString()}, got ${derivedMovePDA.toString()}`
    )
  }

  // Manually encode instruction
  const instruction = await program.methods
    .submitMove(matchId, userId, actionType, payload, nonce)
    .accounts({
      matchAccount: matchPDA,
      registry: registryPDA,
      moveAccount: movePDA,
      player: player.publicKey,
      systemProgram: SystemProgram.programId,
    } as never)
    .instruction()

  const transaction = new Transaction().add(instruction)
  if (!provider) {
    throw new Error('Provider not initialized')
  }
  const signature = await provider.sendAndConfirm(transaction, [player])

  return signature
}

// Helper to submit CLAIM batch moves manually
export const submitClaimBatchMovesManual = async (
  matchId: string,
  userId: string,
  moves: Array<{ actionType: number; payload: Buffer; nonce: anchor.BN }>,
  matchPDA: PublicKey,
  registryPDA: PublicKey,
  moveAccountPDAs: [PublicKey, PublicKey, PublicKey, PublicKey, PublicKey],
  player: Keypair
): Promise<string> => {
  // Note: We allow empty moves or > 5 moves to pass through to Rust validation
  // This allows tests to verify Rust validation errors (InvalidPayload for empty/bad batches)
  // However, we still need at least 5 PDAs for Anchor's account constraints
  if (
    moves.length > 0 &&
    moves.length <= 5 &&
    moveAccountPDAs.length < moves.length
  ) {
    // For valid batch sizes, ensure we have enough PDAs for the actual moves
    throw new Error(
      `PDA mismatch: provided ${moveAccountPDAs.length} PDAs for ${moves.length} moves`
    )
  }

  try {
    // First, try using Anchor's RPC (moves are already in correct format with Buffer payloads)
    // Wrap in retry logic for "Unsupported sysvar" errors (known localnet validator issue)
    return await retryOnUnsupportedSysvar(async () => {
      return await program.methods
        .submitBatchMoves(matchId, userId, moves)
        .accounts({
          matchAccount: matchPDA,
          registry: registryPDA,
          moveAccount0: moveAccountPDAs[0],
          moveAccount1: moveAccountPDAs[1],
          moveAccount2: moveAccountPDAs[2],
          moveAccount3: moveAccountPDAs[3],
          moveAccount4: moveAccountPDAs[4],
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([player])
        .rpc()
    })
  } catch (err: unknown) {
    // Check if this is a ConstraintSeeds error (from AnchorError or SendTransactionError)
    // Also check if error message or logs contain "ConstraintSeeds"
    const errorLogs = err instanceof SendTransactionError ? err.logs || [] : []
    const errorMessage = err instanceof Error ? err.message : String(err)
    const hasConstraintSeedsInLogs = errorLogs.some((log: string) =>
      log.includes('ConstraintSeeds')
    )
    const hasConstraintSeedsInMessage = errorMessage.includes('ConstraintSeeds')
    const isConstraintSeeds =
      (err instanceof AnchorError &&
        err.error?.errorCode?.code === 'ConstraintSeeds') ||
      (err instanceof SendTransactionError && hasConstraintSeedsInLogs) ||
      hasConstraintSeedsInMessage

    if (isConstraintSeeds) {
      console.log(
        `[submitClaimBatchMovesManual] ConstraintSeeds error detected, using manual encoding`
      )
      try {
        return await submitClaimBatchMovesManualRaw(
          matchId,
          userId,
          moves,
          matchPDA,
          registryPDA,
          moveAccountPDAs,
          player
        )
      } catch (rawErr: unknown) {
        // If raw submission also fails, normalize and rethrow (should be Rust validation error)
        normalizeAndRethrowAnchorError(rawErr, 'submitClaimBatchMovesManualRaw')
      }
    }

    // Normalize and rethrow (will convert SendTransactionError to AnchorError if possible)
    normalizeAndRethrowAnchorError(err, 'submitClaimBatchMovesManual')
  }
}

// Raw manual batch submission
async function submitClaimBatchMovesManualRaw(
  matchId: string,
  userId: string,
  moves: Array<{ actionType: number; payload: Buffer; nonce: anchor.BN }>,
  matchPDA: PublicKey,
  registryPDA: PublicKey,
  moveAccountPDAs: [PublicKey, PublicKey, PublicKey, PublicKey, PublicKey],
  player: Keypair
): Promise<string> {
  // Validate that moves.length matches provided PDAs (only check actual moves, not dummy PDAs)
  // Note: Caller is responsible for deriving correct PDAs with correct indices
  // We only validate that we have enough PDAs for the actual moves
  if (moves.length > moveAccountPDAs.length) {
    throw new Error(
      `PDA mismatch: provided ${moveAccountPDAs.length} PDAs for ${moves.length} moves`
    )
  }

  // Manually encode instruction (moves are already in correct format with Buffer payloads)
  // Use provided PDAs as-is (caller is responsible for correct derivation)
  const instruction = await program.methods
    .submitBatchMoves(matchId, userId, moves)
    .accounts({
      matchAccount: matchPDA,
      registry: registryPDA,
      moveAccount0: moveAccountPDAs[0],
      moveAccount1: moveAccountPDAs[1],
      moveAccount2: moveAccountPDAs[2],
      moveAccount3: moveAccountPDAs[3],
      moveAccount4: moveAccountPDAs[4],
      player: player.publicKey,
      systemProgram: SystemProgram.programId,
    } as never)
    .instruction()

  const transaction = new Transaction().add(instruction)
  if (!provider) {
    throw new Error('Provider not initialized')
  }

  try {
    // Wrap in retry logic for "Unsupported sysvar" errors
    return await retryOnUnsupportedSysvar(async () => {
      return await provider.sendAndConfirm(transaction, [player])
    })
  } catch (err: unknown) {
    // sendAndConfirm throws SendTransactionError, which needs to be normalized
    normalizeAndRethrowAnchorError(err, 'submitClaimBatchMovesManualRaw')
  }
}
