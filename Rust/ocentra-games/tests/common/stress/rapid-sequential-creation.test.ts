/**
 * Test: Can handle rapid sequential match creation
 * Category: STRESS
 */

import {
  BaseTest,
  TestCategory,
  ClusterRequirement,
  registerMochaTest,
} from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class RapidSequentialCreationTest extends BaseTest {
  constructor() {
    super({
      id: 'rapid-sequential-creation',
      name: 'Can handle rapid sequential match creation',
      description:
        'Verifies that rapid sequential match creation works correctly',
      tags: {
        category: TestCategory.STRESS,
        cluster: ClusterRequirement.DEVNET_ALLOWED,
        expensive: true,
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const {
      program,
      authority,
      generateUniqueMatchId,
      getTestGame,
      getTestSeed,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()
    const [registryPDA] = await getRegistryPDA()

    // Create 10 matches sequentially (stress test)
    for (let i = 0; i < 10; i++) {
      const matchId = generateUniqueMatchId(`rapid-${i}`)
      const [matchPDA] = await getMatchPDA(matchId)

      await program.methods
        .createMatch(
          matchId,
          claimGame.game_id,
          new anchor.BN(seed + i),
          null, // entry_fee (None = free match)
          null, // payment_method (None = default)
          null, // match_type (None = default FREE)
          null // tournament_id (None = not a tournament)
        )
        .accounts({
          matchAccount: matchPDA,
          registry: registryPDA,
          escrowAccount: null, // Escrow not needed for free matches
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()

      const matchAccount = await program.account.match.fetch(matchPDA)
      const matchIdStr = Array.from(matchAccount.matchId)
        .map(b => String.fromCharCode(b))
        .join('')
        .replace(/\0/g, '')
        .substring(0, 36)
      this.assertEqual(matchIdStr, matchId)
    }
  }
}

const testInstance = new RapidSequentialCreationTest()
registerMochaTest(testInstance)
