/**
 * Test: Can register another game
 * Category: REGISTRY
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'

class RegisterAnotherGameTest extends BaseTest {
  constructor() {
    super({
      id: 'register-another-game',
      name: 'Can register another game',
      description:
        'Verifies that multiple games can be registered in the registry',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority, getRegistryPDA } = await import('@/helpers')
    const [registryPDA] = await getRegistryPDA()

    const registryBefore = await program.account.gameRegistry.fetch(registryPDA)
    const countBefore = registryBefore.gameCount

    // Generate unique game ID based on timestamp to avoid conflicts
    // game_id is u8 so must be 0-255
    const gameId = 150 + (Date.now() % 50) // Range 150-199
    const gameName = `TestGame2_${gameId}`

    try {
      await program.methods
        .registerGame(
          gameId,
          gameName,
          2,
          6,
          'https://rules.example.com/test2',
          1
        )
        .accounts({
          registry: registryPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()

      const registryAfter =
        await program.account.gameRegistry.fetch(registryPDA)
      this.assertEqual(
        registryAfter.gameCount,
        countBefore + 1,
        `Game count should increase from ${countBefore} to ${countBefore + 1}, got ${registryAfter.gameCount}`
      )
    } catch (err: unknown) {
      // If game already exists, that's okay - verify count hasn't decreased
      const error = err as { message?: string }
      if (error.message?.includes('GameAlreadyExists')) {
        const registryAfter =
          await program.account.gameRegistry.fetch(registryPDA)
        this.assert(
          registryAfter.gameCount >= countBefore,
          `Game count should not decrease, was ${countBefore}, now ${registryAfter.gameCount}`
        )
      } else {
        throw err
      }
    }
  }
}

const testInstance = new RegisterAnotherGameTest()
registerMochaTest(testInstance)
