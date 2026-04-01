/**
 * Test: Tests all invalid action types
 * Category: ERRORS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class FailCreateInvalidActionTypesTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-create-invalid-action-types',
      name: 'Tests all invalid action types',
      description:
        'Verifies that submitting moves with invalid action types fails',
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

    const matchId = generateUniqueMatchId('invalid-actions')
    const [matchPDA, registryPDA] = await createStartedMatch(matchId, 2)

    // Action type 5 is REVEAL_FLOOR_CARD (valid), so start from 6
    const invalidActionTypes = [6, 10, 100, 255]
    const userId = getTestUserId(0)
    const nonce = new anchor.BN(Date.now())

    for (const actionType of invalidActionTypes) {
      const moveNonce = new anchor.BN(nonce.toNumber() + actionType)
      const [movePDA] = await getMovePDA(matchId, player1.publicKey, moveNonce)
      try {
        await submitMoveManual(
          matchId,
          userId,
          actionType,
          Buffer.alloc(0),
          moveNonce,
          matchPDA,
          registryPDA,
          movePDA,
          player1
        )

        this.assert(
          false,
          `Should have failed for invalid action_type: ${actionType}`
        )
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
}

const testInstance = new FailCreateInvalidActionTypesTest()
registerMochaTest(testInstance)
