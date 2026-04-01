/**
 * Test: Fails to submit move with payload too large
 * Category: ERRORS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class FailMovePayloadTooLargeTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-move-payload-too-large',
      name: 'Fails to submit move with payload too large',
      description:
        'Verifies that submitting a move with payload > 128 bytes fails',
      tags: {
        category: TestCategory.ERRORS,
        cluster: ClusterRequirement.DEVNET_ALLOWED,
        expensive: true,
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

    const matchId = generateUniqueMatchId('large-payload')
    const [matchPDA, registryPDA] = await createStartedMatch(matchId, 2)

    const userId = getTestUserId(0)
    const nonce = new anchor.BN(Date.now())
    const [movePDA] = await getMovePDA(matchId, player1.publicKey, nonce)

    // Payload > 128 bytes
    const largePayload = Buffer.alloc(129, 1)

    try {
      await submitMoveManual(
        matchId,
        userId,
        2,
        largePayload,
        nonce,
        matchPDA,
        registryPDA,
        movePDA,
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

const testInstance = new FailMovePayloadTooLargeTest()
registerMochaTest(testInstance)
