/**
 * Test: Can update an existing game
 * Category: REGISTRY
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'

class UpdateGameTest extends BaseTest {
  constructor() {
    super({
      id: 'update-game',
      name: 'Can update an existing game',
      description:
        'Verifies that an existing game can be updated in the registry',
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

    // Find an available game_id
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

    // First register a game
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

    // Update the game
    await program.methods
      .updateGame(gameId, 'UpdatedGame', null, null, null, 2, null)
      .accounts({
        registry: registryPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Verify update
    registry = await program.account.gameRegistry.fetch(registryPDA)
    const game = registry.games.find(
      (g: { gameId: number }) => g.gameId === gameId
    )
    this.assertTruthy(game, 'Game should exist')
    if (game) {
      this.assertEqual(
        game.version,
        2,
        `Game version should be 2, got ${game.version}`
      )
      const gameName = Array.from(game.name)
        .map(b => String.fromCharCode(b))
        .join('')
        .replace(/\0/g, '')
      this.assertEqual(
        gameName,
        'UpdatedGame',
        `Game name should be UpdatedGame, got ${gameName}`
      )
    }
  }
}

const testInstance = new UpdateGameTest()
registerMochaTest(testInstance)
