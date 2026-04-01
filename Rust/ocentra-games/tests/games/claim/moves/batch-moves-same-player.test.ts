/**
 * Test: Can submit batch moves from same player in their turn
 * Category: MOVES (CLAIM-specific)
 */

import {
  BaseTest,
  TestCategory,
  ClusterRequirement,
  registerMochaTest,
} from '@/core'
import { PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class BatchMovesSamePlayerTest extends BaseTest {
  constructor() {
    super({
      id: 'batch-moves-same-player',
      name: 'Can submit batch moves from same player in their turn',
      description:
        'Verifies that a player can submit multiple moves in a batch during their turn',
      tags: {
        category: TestCategory.MOVES,
        cluster: ClusterRequirement.ANY,
        game: 'claim',
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const {
      program,
      player1,
      generateUniqueMatchId,
      getTestUserId,
      getBatchMovePDA,
      createStartedMatch,
      submitBatchMovesManual,
    } = await import('@/helpers')

    // Import CLAIM-specific helpers for floor card
    const { revealFloorCard, generateMockFloorCardHash } = await import(
      '@/claim'
    )

    const testMatchId = generateUniqueMatchId('batch-test')
    const [testMatchPDA, registryPDA] = await createStartedMatch(testMatchId, 2)

    const userId = getTestUserId(0)
    const baseNonce = Date.now()

    // Reveal floor card before pick_up action (required by validation)
    const floorCardHash = generateMockFloorCardHash(0)
    const revealNonce = new anchor.BN(baseNonce - 10000)
    try {
      await revealFloorCard(
        testMatchId,
        userId,
        testMatchPDA,
        registryPDA,
        floorCardHash,
        revealNonce,
        player1
      )
    } catch (err: unknown) {
      // If floor card already revealed, that's fine
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg !== 'skipped') {
        throw err
      }
    }

    // Wait for state to sync
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check moveCount before batch submission (floor card reveal counts as a move)
    const matchAccountBefore = await program.account.match.fetch(testMatchPDA)
    const moveCountBefore = matchAccountBefore.moveCount

    const moves = [
      {
        actionType: 2, // declare_intent
        payload: Buffer.from([0]), // spades
        nonce: new anchor.BN(baseNonce),
      },
      {
        actionType: 0, // pick_up (requires floor card to be revealed)
        payload: floorCardHash, // Floor card hash (32 bytes)
        nonce: new anchor.BN(baseNonce + 1),
      },
    ]

    // Get move PDAs using correct indices (0-4) as Rust expects
    // Rust uses hardcoded indices 0-4 in the Anchor account constraints for move_account_0 through move_account_4
    // For 2 moves, we use indices 0 and 1; remaining 3 are dummy PDAs (not used but required by type)
    const [movePDA0] = await getBatchMovePDA(testMatchId, player1.publicKey, 0)
    const [movePDA1] = await getBatchMovePDA(testMatchId, player1.publicKey, 1)
    const [movePDA2] = await getBatchMovePDA(testMatchId, player1.publicKey, 2) // Dummy
    const [movePDA3] = await getBatchMovePDA(testMatchId, player1.publicKey, 3) // Dummy
    const [movePDA4] = await getBatchMovePDA(testMatchId, player1.publicKey, 4) // Dummy

    const moveAccountPDAs: [
      PublicKey,
      PublicKey,
      PublicKey,
      PublicKey,
      PublicKey,
    ] = [
      movePDA0,
      movePDA1,
      movePDA2, // Dummy (not used for this batch)
      movePDA3, // Dummy (not used for this batch)
      movePDA4, // Dummy (not used for this batch)
    ]

    await submitBatchMovesManual(
      testMatchId,
      userId,
      moves,
      testMatchPDA,
      registryPDA,
      moveAccountPDAs,
      player1
    )

    const matchAccount = await program.account.match.fetch(testMatchPDA)
    // Batch submission adds 2 moves (declare_intent + pick_up)
    this.assertEqual(matchAccount.moveCount, moveCountBefore + 2)
  }
}

const testInstance = new BatchMovesSamePlayerTest()
registerMochaTest(testInstance)
