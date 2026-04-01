/**
 * Test: Player can declare intent
 * Category: MOVES (CLAIM-specific)
 */

import {
  BaseTest,
  TestCategory,
  ClusterRequirement,
  registerMochaTest,
} from '@/core'
import * as anchor from '@coral-xyz/anchor'

class DeclareIntentTest extends BaseTest {
  constructor() {
    super({
      id: 'declare-intent',
      name: 'Player can declare intent',
      description: 'Verifies that a player can declare intent in a CLAIM match',
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
      getMovePDA,
      createStartedMatch,
      submitMoveManual,
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('moves-test')
    const [testMatchPDA, registryPDA] = await createStartedMatch(testMatchId, 2)

    const userId = getTestUserId(0)
    const nonce = new anchor.BN(Date.now())
    const [movePDA] = await getMovePDA(testMatchId, player1.publicKey, nonce)

    const actionType = 2 // declare_intent
    const payload = Buffer.from([0]) // spades

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

    const moveAccount = await program.account.move.fetch(movePDA)
    this.assertEqual(moveAccount.actionType, actionType)
    this.assert(
      typeof moveAccount.moveIndex === 'number',
      'moveIndex should be a number'
    )
  }
}

const testInstance = new DeclareIntentTest()
registerMochaTest(testInstance)
