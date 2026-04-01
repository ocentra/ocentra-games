/**
 * Test: Fails to submit empty batch
 * Category: MOVES (CLAIM-specific)
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class FailBatchEmptyTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-batch-empty',
      name: 'Fails to submit empty batch',
      description: 'Verifies that submitting an empty batch of moves fails',
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
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('batch-test')
    const [testMatchPDA, registryPDA] = await createStartedMatch(testMatchId, 2)

    const userId = getTestUserId(0)
    const moves: Array<{
      actionType: number
      payload: Buffer
      nonce: anchor.BN
    }> = []

    // For empty batch test, we need valid unique PDAs to pass Anchor's constraint validation
    // so that Rust validation can run and throw InvalidPayload
    // Use different indices to ensure unique PDAs (Anchor validates all 5 accounts even if moves is empty)
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
      movePDAs[4][0],
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
      if (!this.isAnchorError(err)) {
        throw new Error(
          `Expected AnchorError, got ${err?.constructor?.name}: ${err}`
        )
      }
      const errorCode = this.getErrorCode(err)
      this.assertEqual(errorCode, 'InvalidPayload')
    }
  }
}

const testInstance = new FailBatchEmptyTest()
registerMochaTest(testInstance)
