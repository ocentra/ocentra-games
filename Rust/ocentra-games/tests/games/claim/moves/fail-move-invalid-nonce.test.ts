/**
 * Test: Fails to submit move with invalid nonce (replay attack)
 * Category: MOVES (CLAIM-specific)
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class FailMoveInvalidNonceTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-move-invalid-nonce',
      name: 'Fails to submit move with invalid nonce (replay attack)',
      description: 'Verifies that replaying a move with the same nonce fails',
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
      getMovePDA,
      createStartedMatch,
      submitMoveManual,
      AnchorError: AnchorErrorType,
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('moves-test')
    const [testMatchPDA, registryPDA] = await createStartedMatch(testMatchId, 2)

    const userId = getTestUserId(0)
    const nonce = new anchor.BN(Date.now())
    const [movePDA] = await getMovePDA(testMatchId, player1.publicKey, nonce)

    const actionType = 2
    const payload = Buffer.from([0])

    // First move succeeds
    await submitMoveManual(
      testMatchId,
      userId,
      actionType,
      payload,
      nonce,
      testMatchPDA,
      registryPDA,
      movePDA,
      player1
    )

    // Try to replay with same nonce
    const [movePDA2] = await getMovePDA(testMatchId, player1.publicKey, nonce)
    try {
      await submitMoveManual(
        testMatchId,
        userId,
        actionType,
        payload,
        nonce,
        testMatchPDA,
        registryPDA,
        movePDA2,
        player1
      )

      this.assert(false, 'Should have thrown InvalidNonce error')
    } catch (err: unknown) {
      if (!(err instanceof AnchorErrorType)) {
        throw new Error(
          `Expected AnchorError, got ${err?.constructor?.name}: ${err}`
        )
      }
      this.assertEqual(err.error?.errorCode?.code, 'InvalidNonce')
    }
  }
}

const testInstance = new FailMoveInvalidNonceTest()
registerMochaTest(testInstance)
