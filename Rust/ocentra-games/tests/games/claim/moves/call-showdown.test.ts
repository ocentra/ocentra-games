/**
 * Test: Player can call showdown
 * Category: MOVES (CLAIM-specific)
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class CallShowdownTest extends BaseTest {
  constructor() {
    super({
      id: 'call-showdown',
      name: 'Player can call showdown',
      description: 'Verifies that a player can call showdown to end the match',
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
    const nonce1 = new anchor.BN(Date.now())
    const nonce2 = new anchor.BN(Date.now() + 1)

    // Declare intent first
    const [movePDA1] = await getMovePDA(testMatchId, player1.publicKey, nonce1)
    await submitMoveManual(
      testMatchId,
      userId,
      2,
      Buffer.from([0]),
      nonce1,
      testMatchPDA,
      registryPDA,
      movePDA1,
      player1
    )

    // Call showdown
    const [movePDA2] = await getMovePDA(testMatchId, player1.publicKey, nonce2)
    await submitMoveManual(
      testMatchId,
      userId,
      3,
      Buffer.alloc(0),
      nonce2,
      testMatchPDA,
      registryPDA,
      movePDA2,
      player1
    )

    const matchAccount = await program.account.match.fetch(testMatchPDA)
    this.assertEqual(matchAccount.phase, 2) // Ended
  }
}

const testInstance = new CallShowdownTest()
registerMochaTest(testInstance)
