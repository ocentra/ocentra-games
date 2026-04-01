/**
 * Test: Can create and manage multiple matches simultaneously
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
import { retryOnUnsupportedSysvar } from '@/common'

class MultipleMatchesSimultaneousTest extends BaseTest {
  constructor() {
    super({
      id: 'multiple-matches-simultaneous',
      name: 'Can create and manage multiple matches simultaneously',
      description:
        'Verifies that multiple matches can be created and managed in parallel',
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

    // Create 5 matches in parallel
    const matchIds = Array.from({ length: 5 }, (_, i) =>
      generateUniqueMatchId(`stress-${i}`)
    )
    const matchPDAs = await Promise.all(matchIds.map(id => getMatchPDA(id)))

    // Create all matches with retry logic for "Unsupported sysvar" errors
    await Promise.all(
      matchIds.map((matchId, i) =>
        retryOnUnsupportedSysvar(async () => {
          return await program.methods
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
              matchAccount: matchPDAs[i][0],
              registry: registryPDA,
              escrowAccount: null, // Escrow not needed for free matches
              authority: authority.publicKey,
              systemProgram: SystemProgram.programId,
            } as never)
            .rpc()
        })
      )
    )

    // Verify all matches exist
    for (let i = 0; i < matchIds.length; i++) {
      const matchAccount = await program.account.match.fetch(matchPDAs[i][0])
      const matchIdStr = Array.from(matchAccount.matchId)
        .map(b => String.fromCharCode(b))
        .join('')
        .replace(/\0/g, '')
        .substring(0, 36)
      this.assertEqual(matchIdStr, matchIds[i])
    }
  }
}

const testInstance = new MultipleMatchesSimultaneousTest()
registerMochaTest(testInstance)
