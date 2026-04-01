/**
 * Test: Can register a new game
 * Category: REGISTRY
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'

class RegisterNewGameTest extends BaseTest {
  constructor() {
    super({
      id: 'register-new-game',
      name: 'Can register a new game',
      description: 'Verifies that a new game can be registered in the registry',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority, getRegistryPDA } = await import('@/helpers')
    const [registryPDA] = await getRegistryPDA()

    // Find an available game_id (start from 100 to avoid conflicts)
    let gameId = 100
    let registry = await program.account.gameRegistry.fetch(registryPDA)

    while (gameId < 120) {
      const existing = registry.games.find(
        (g: { gameId: number }) => g.gameId === gameId
      )
      if (!existing || existing.gameId === 0) {
        break
      }
      gameId++
    }

    if (gameId >= 120) {
      throw new Error('Registry is full (20 games max)')
    }

    await program.methods
      .registerGame(
        gameId,
        'TestGame',
        2,
        4,
        'https://rules.example.com/test',
        1
      )
      .accounts({
        registry: registryPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    registry = await program.account.gameRegistry.fetch(registryPDA)
    this.assert(
      registry.gameCount > 0,
      `Registry should have games, got ${registry.gameCount}`
    )
  }
}

const testInstance = new RegisterNewGameTest()
registerMochaTest(testInstance)
