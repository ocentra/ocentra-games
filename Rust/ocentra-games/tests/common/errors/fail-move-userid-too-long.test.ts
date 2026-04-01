/**
 * Test: Fails to submit move with user_id too long
 * Category: ERRORS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class FailMoveUserIdTooLongTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-move-userid-too-long',
      name: 'Fails to submit move with user_id too long',
      description:
        'Verifies that submitting a move with user_id > 64 chars fails',
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
      getMovePDA,
      createStartedMatch,
      submitMoveManual,
      AnchorError: AnchorErrorType,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('long-userid')
    const [matchPDA, registryPDA] = await createStartedMatch(matchId, 2)

    // user_id > 64 chars (invalid)
    const longUserId = 'a'.repeat(65)
    const nonce = new anchor.BN(Date.now())
    const [movePDA] = await getMovePDA(matchId, player1.publicKey, nonce)

    try {
      await submitMoveManual(
        matchId,
        longUserId,
        2,
        Buffer.from([0]),
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

const testInstance = new FailMoveUserIdTooLongTest()
registerMochaTest(testInstance)
