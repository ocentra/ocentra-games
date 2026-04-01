/**
 * Test: Can submit multiple batch moves in sequence
 * Category: STRESS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class BatchMovesSequenceTest extends BaseTest {
  constructor() {
    super({
      id: 'batch-moves-sequence',
      name: 'Can submit multiple batch moves in sequence',
      description:
        'Verifies that multiple batch moves can be submitted in sequence (stress test)',
      tags: {
        category: TestCategory.STRESS,
        cluster: ClusterRequirement.DEVNET_ALLOWED,
        expensive: true,
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const {
      program,
      player1,
      player2,
      generateUniqueMatchId,
      getTestUserId,
      getBatchMovePDA,
      createStartedMatch,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('batch-stress')
    const [matchPDA, registryPDA] = await createStartedMatch(matchId, 2)

    // Import CLAIM-specific helpers
    const {
      revealFloorCard,
      generateMockFloorCardHash,
      CLAIM_ACTIONS,
      submitClaimBatchMovesManual,
    } = await import('@/claim')

    // Submit 5 batch moves in sequence (each with 5 moves = 25 total moves)
    // This stress test verifies that multiple batches can be submitted in sequence
    // IMPORTANT: The program decides who's turn it is - we query the match account to get the current player
    // Track if player1 has declared intent (can only be done once)
    let player1HasDeclaredIntent = false

    // Track initial moveCount (after floor card reveal in batch 0, if any)
    let initialMoveCount = 0

    for (let batchNum = 0; batchNum < 5; batchNum++) {
      // Wait for previous batch transaction to fully confirm and state to sync
      if (batchNum > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Query match account to get the current player (program decides who's turn it is)
      let matchAccount = await program.account.match.fetch(matchPDA)
      let retryCount = 0
      while (
        matchAccount.currentPlayer >= matchAccount.playerCount &&
        retryCount < 5
      ) {
        // Sometimes state takes a moment to sync
        await new Promise(resolve => setTimeout(resolve, 200))
        matchAccount = await program.account.match.fetch(matchPDA)
        retryCount++
      }

      const currentPlayerIndex = matchAccount.currentPlayer
      if (currentPlayerIndex >= matchAccount.playerCount) {
        throw new Error(
          `Batch ${batchNum}: Invalid current player index ${currentPlayerIndex} (player count: ${matchAccount.playerCount})`
        )
      }

      // Get the player object that matches the current player index
      // We know from createStartedMatch that players join in order:
      // - player1 joins first (index 0)
      // - player2 joins second (index 1)
      // The match account stores player_ids (user IDs), but we can map by index
      const playerIndex = currentPlayerIndex
      const currentPlayer = playerIndex === 0 ? player1 : player2
      const userId = getTestUserId(playerIndex)

      console.log(
        `[Batch ${batchNum}] Program says it's player ${playerIndex}'s turn (using ${currentPlayer === player1 ? 'player1' : 'player2'})`
      )

      const baseNonce = Date.now() + batchNum * 1000

      // Create moves for this batch FIRST to determine what we need
      const floorCardHash = generateMockFloorCardHash(batchNum)
      const moves = Array.from({ length: 5 }, (_, i) => {
        // Only allow declare_intent if player1 hasn't declared yet (can only be done once per player)
        if (!player1HasDeclaredIntent && playerIndex === 0 && i === 0) {
          player1HasDeclaredIntent = true // Mark as declared
          return {
            actionType: CLAIM_ACTIONS.DECLARE_INTENT,
            payload: Buffer.from([0]), // spades
            nonce: new anchor.BN(baseNonce + i),
          }
        } else {
          // All other moves: decline (can be repeated, requires floor card but doesn't clear it)
          // decline is a valid repeating action for stress testing
          return {
            actionType: CLAIM_ACTIONS.DECLINE,
            payload: Buffer.alloc(0), // decline has no payload
            nonce: new anchor.BN(baseNonce + i),
          }
        }
      })

      // All batches need a floor card for decline actions
      // decline requires floor card but doesn't clear it, so once revealed it stays revealed
      // We check before each batch to handle any edge cases
      const needsFloorCard = true // All batches need floor card for decline

      // Reveal floor card if needed BEFORE submitting batch
      // decline requires floor card but doesn't clear it, so we check if already revealed
      if (needsFloorCard) {
        // Refresh match account to get latest state
        // Wait for previous transaction to confirm and state to sync
        await new Promise(resolve => setTimeout(resolve, 200))
        let matchAccount = await program.account.match.fetch(matchPDA)
        let isFloorCardRevealed = (matchAccount.flags & 0x01) !== 0

        // Retry check if state seems inconsistent (sometimes needs multiple attempts)
        let retryCount = 0
        while (retryCount < 3 && matchAccount.phase !== 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
          matchAccount = await program.account.match.fetch(matchPDA)
          isFloorCardRevealed = (matchAccount.flags & 0x01) !== 0
          retryCount++
        }

        // Verify match is in playing phase (required for reveal_floor_card)
        if (matchAccount.phase !== 1) {
          throw new Error(
            `Cannot reveal floor card: match is in phase ${matchAccount.phase}, expected phase 1 (playing)`
          )
        }

        if (!isFloorCardRevealed) {
          // Reveal floor card before this batch
          const revealNonce = new anchor.BN(baseNonce - 10000 - batchNum)
          console.log(
            `[Batch ${batchNum}] Revealing floor card, nonce: ${revealNonce.toString()}`
          )
          let revealTx: string | undefined
          try {
            revealTx = await revealFloorCard(
              matchId,
              userId,
              matchPDA,
              registryPDA,
              floorCardHash,
              revealNonce,
              currentPlayer
            )
            console.log(`[Batch ${batchNum}] Floor card reveal tx: ${revealTx}`)

            // Check if revealFloorCard returned "skipped" (already revealed)
            if (revealTx === 'skipped') {
              console.log(
                `[Batch ${batchNum}] Floor card already revealed, skipping reveal`
              )
              // Verify floor card is actually revealed
              await new Promise(resolve => setTimeout(resolve, 200)) // Wait for state to sync
              const matchAccountCheck =
                await program.account.match.fetch(matchPDA)
              const isRevealed = (matchAccountCheck.flags & 0x01) !== 0
              if (!isRevealed) {
                throw new Error(
                  `Floor card marked as skipped but not actually revealed`
                )
              }
            } else {
              // Wait for transaction to fully confirm and state to update
              await new Promise(resolve => setTimeout(resolve, 500))

              // Verify floor card was actually revealed
              const matchAccountAfter =
                await program.account.match.fetch(matchPDA)
              const isRevealedAfter = (matchAccountAfter.flags & 0x01) !== 0
              console.log(
                `[Batch ${batchNum}] Floor card revealed check: ${isRevealedAfter}, flags: ${matchAccountAfter.flags.toString(16)}`
              )
              if (!isRevealedAfter) {
                throw new Error(
                  `Floor card reveal failed - transaction: ${revealTx}, floor card still not revealed after revealFloorCard call`
                )
              }
              console.log(
                `[Batch ${batchNum}] ✓ Floor card revealed successfully`
              )
            }
          } catch (err) {
            console.error(`[Batch ${batchNum}] Floor card reveal error:`, err)
            // Check if error is InvalidPhase from floor card validation (floor card already revealed)
            if (
              this.isAnchorError(err) &&
              this.getErrorCode(err) === 'InvalidPhase'
            ) {
              // Wait a bit and check again - may be race condition
              await new Promise(resolve => setTimeout(resolve, 300))
              const matchAccountCheck =
                await program.account.match.fetch(matchPDA)
              const isAlreadyRevealed = (matchAccountCheck.flags & 0x01) !== 0
              if (isAlreadyRevealed) {
                console.log(
                  `[Batch ${batchNum}] Floor card already revealed (from previous transaction or race condition), continuing`
                )
              } else {
                // InvalidPhase error but floor card not revealed - check phase again
                if (matchAccountCheck.phase !== 1) {
                  throw new Error(
                    `Cannot reveal floor card: match is in phase ${matchAccountCheck.phase}, expected phase 1`
                  )
                }
                // If phase is correct but still InvalidPhase, might be validation logic issue
                throw new Error(
                  `Failed to reveal floor card before batch ${batchNum}: InvalidPhase error but floor card still not revealed and phase is correct`
                )
              }
            } else {
              // Check if revealFloorCard returned "skipped" (already revealed)
              const errorMsg = err instanceof Error ? err.message : String(err)
              if (errorMsg === 'skipped') {
                console.log(
                  `[Batch ${batchNum}] Floor card already revealed, skipping`
                )
              } else {
                throw new Error(
                  `Failed to reveal floor card before batch ${batchNum}: ${errorMsg}`
                )
              }
            }
          }
        } else {
          console.log(
            `[Batch ${batchNum}] Floor card already revealed, skipping reveal`
          )
        }
      }

      // Get PDAs using correct indices (0-4) as Rust expects
      // Rust uses hardcoded indices 0-4 in the Anchor account constraints for each batch
      // Each batch reuses the same 5 PDAs (indices 0-4), but the move_index stored in the account is sequential
      // Use current player's public key for PDA derivation
      const movePDAs = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          getBatchMovePDA(matchId, currentPlayer.publicKey, i)
        )
      )

      // Extract PDAs and ensure we have exactly 5 (required tuple type)
      const moveAccountPDAs: [
        PublicKey,
        PublicKey,
        PublicKey,
        PublicKey,
        PublicKey,
      ] = [
        movePDAs[0][0],
        movePDAs[1][0],
        movePDAs[2][0],
        movePDAs[3][0],
        movePDAs[4][0],
      ]

      // Match account already fetched above - current player is determined by the program

      await submitClaimBatchMovesManual(
        matchId,
        userId,
        moves,
        matchPDA,
        registryPDA,
        moveAccountPDAs,
        currentPlayer
      )

      // Wait for transaction to fully confirm and state to sync before next batch
      await new Promise(resolve => setTimeout(resolve, 300))

      // After first batch (which includes floor card reveal), capture the moveCount
      // Floor card reveal counts as 1 move, then the batch adds 5 more = 6 total after batch 0
      if (batchNum === 0) {
        await new Promise(resolve => setTimeout(resolve, 300)) // Extra wait for state sync
        const matchAccountAfterBatch0 =
          await program.account.match.fetch(matchPDA)
        initialMoveCount = matchAccountAfterBatch0.moveCount
        console.log(
          `[Batch ${batchNum}] MoveCount after batch 0 (includes floor card reveal): ${initialMoveCount}`
        )
      }
    }

    // Final moveCount should be: initial (floor card + batch 0 = 6 moves) + 4 more batches (4 × 5 = 20 moves) = 26
    // OR: 5 batches × 5 moves = 25 moves + 1 floor card reveal = 26 total
    const matchAccount = await program.account.match.fetch(matchPDA)
    const expectedMoveCount = initialMoveCount + 4 * 5 // 4 remaining batches after batch 0
    this.assertEqual(
      matchAccount.moveCount,
      expectedMoveCount,
      `Expected ${expectedMoveCount} moves (${initialMoveCount} after batch 0 + 20 from batches 1-4), got ${matchAccount.moveCount}`
    )
  }
}

const testInstance = new BatchMovesSequenceTest()
registerMochaTest(testInstance)
