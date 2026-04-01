/**
 * Test: Fails to submit batch with more than 5 moves
 * Category: MOVES (CLAIM-specific)
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class FailBatchTooManyTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-batch-too-many',
      name: 'Fails to submit batch with more than 5 moves',
      description:
        'Verifies that submitting a batch with more than 5 moves fails',
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
      player1,
      generateUniqueMatchId,
      getTestUserId,
      getBatchMovePDA,
      createStartedMatch,
      submitBatchMovesManual,
      AnchorError: AnchorErrorType,
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('batch-test')
    const [testMatchPDA, registryPDA] = await createStartedMatch(testMatchId, 2)

    const userId = getTestUserId(0)
    const baseNonce = Date.now()

    const moves = Array.from({ length: 6 }, (_, i) => ({
      actionType: 2,
      payload: Buffer.from([0]),
      nonce: new anchor.BN(baseNonce + i),
    }))

    // Get PDAs for first 5 moves using correct indices (0-4) as Rust expects
    // Rust uses hardcoded indices 0-4 in the Anchor account constraints
    // Type requires 5 PDAs, but Rust will validate moves.length > 5
    const movePDAs = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        getBatchMovePDA(testMatchId, player1.publicKey, i)
      )
    )

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
      movePDAs[4][0], // Type requires 5 PDAs, but Rust will reject moves.length > 5
    ]

    try {
      await submitBatchMovesManual(
        testMatchId,
        userId,
        moves,
        testMatchPDA,
        registryPDA,
        moveAccountPDAs,
        player1
      )

      this.assert(false, 'Should have thrown InvalidPayload error')
    } catch (err: unknown) {
      if (!(err instanceof AnchorErrorType)) {
        throw new Error(
          `Expected AnchorError, got ${err?.constructor?.name}: ${err}`
        )
      }
      this.assertEqual(err.error?.errorCode?.code, 'InvalidPayload')
    }
  }
}

const testInstance = new FailBatchTooManyTest()
registerMochaTest(testInstance)
