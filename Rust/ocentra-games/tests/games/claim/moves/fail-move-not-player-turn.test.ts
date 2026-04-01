/**
 * Test: Fails to submit move when not player's turn
 * Category: MOVES (CLAIM-specific)
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class FailMoveNotPlayerTurnTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-move-not-player-turn',
      name: "Fails to submit move when not player's turn",
      description:
        "Verifies that submitting a move when it's not the player's turn fails",
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
      player2,
      generateUniqueMatchId,
      getTestUserId,
      getMovePDA,
      createStartedMatch,
      submitMoveManual,
      AnchorError: AnchorErrorType,
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('moves-test')
    const [testMatchPDA, registryPDA] = await createStartedMatch(testMatchId, 2)

    const userId = getTestUserId(1)
    const nonce = new anchor.BN(Date.now())
    const [movePDA] = await getMovePDA(testMatchId, player2.publicKey, nonce)

    // current_player is 0 (player1), but player2 tries to move
    // Use decline (1) which requires turn validation
    const actionType = 1 // decline - requires turn validation
    const payload = Buffer.alloc(0) // decline has no payload

    try {
      await submitMoveManual(
        testMatchId,
        userId,
        actionType,
        payload,
        nonce,
        testMatchPDA,
        registryPDA,
        movePDA,
        player2
      )

      this.assert(false, 'Should have thrown NotPlayerTurn error')
    } catch (err: unknown) {
      if (!(err instanceof AnchorErrorType)) {
        throw new Error(
          `Expected AnchorError, got ${err?.constructor?.name}: ${err}`
        )
      }
      this.assertEqual(err.error?.errorCode?.code, 'NotPlayerTurn')
    }
  }
}

const testInstance = new FailMoveNotPlayerTurnTest()
registerMochaTest(testInstance)
