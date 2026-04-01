/**
 * Test: Test player accounts have SOL
 * Category: SETUP
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'

class PlayersHaveSOLTest extends BaseTest {
  constructor() {
    super({
      id: 'players-have-sol',
      name: 'Test player accounts have SOL',
      description: 'Verifies that test player accounts have SOL balance',
      tags: {
        category: TestCategory.SETUP,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, player1, player2 } = await import('@/helpers')
    const balance1 = await program.provider.connection.getBalance(
      player1.publicKey
    )
    const balance2 = await program.provider.connection.getBalance(
      player2.publicKey
    )

    this.assert(
      balance1 > 0,
      `Player1 should have SOL balance, got ${balance1}`
    )
    this.assert(
      balance2 > 0,
      `Player2 should have SOL balance, got ${balance2}`
    )
  }
}

const testInstance = new PlayersHaveSOLTest()
registerMochaTest(testInstance)
