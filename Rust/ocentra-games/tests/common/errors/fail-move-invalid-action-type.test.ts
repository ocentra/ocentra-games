/**
 * Test: Fails to submit move with invalid action_type
 * Category: ERRORS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class FailMoveInvalidActionTypeTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-move-invalid-action-type',
      name: 'Fails to submit move with invalid action_type',
      description:
        'Verifies that submitting a move with invalid action_type fails',
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

    const matchId = generateUniqueMatchId('invalid-action')
    const [matchPDA, registryPDA] = await createStartedMatch(matchId, 2)

    const userId = getTestUserId(0)
    const nonce = new anchor.BN(Date.now())
    const [movePDA] = await getMovePDA(matchId, player1.publicKey, nonce)

    // Invalid action_type > 5 (REVEAL_FLOOR_CARD is 5, max is 5)
    const invalidActionType = 6

    try {
      await submitMoveManual(
        matchId,
        userId,
        invalidActionType,
        Buffer.alloc(0),
        nonce,
        matchPDA,
        registryPDA,
        movePDA,
        player1
      )

      this.assert(false, 'Should have thrown InvalidAction error')
    } catch (err: unknown) {
      if (!(err instanceof AnchorErrorType)) {
        throw new Error(
          `Expected AnchorError, got ${err?.constructor?.name}: ${err}`
        )
      }
      this.assertEqual(err.error?.errorCode?.code, 'InvalidAction')
    }
  }
}

const testInstance = new FailMoveInvalidActionTypeTest()
registerMochaTest(testInstance)
