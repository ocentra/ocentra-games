/**
 * Test: Creates a CLAIM match with proper UUID
 * Category: LIFECYCLE
 */

import {
  BaseTest,
  TestCategory,
  ClusterRequirement,
  registerMochaTest,
} from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class CreateClaimMatchTest extends BaseTest {
  constructor() {
    super({
      id: 'create-claim-match',
      name: 'Creates a CLAIM match with proper UUID',
      description:
        'Verifies that a CLAIM match can be created with a valid UUID',
      tags: {
        category: TestCategory.LIFECYCLE,
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
      authority,
      generateUniqueMatchId,
      getTestGame,
      getTestSeed,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('create-test')
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(matchId)
    const [registryPDA] = await getRegistryPDA()

    await program.methods
      .createMatch(
        matchId,
        claimGame.game_id,
        new anchor.BN(seed),
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
    this.assertEqual(matchAccount.gameType, claimGame.game_id)
    this.assertEqual(matchAccount.seed, seed)
    this.assertEqual(matchAccount.phase, 0)
    this.assertEqual(matchAccount.playerCount, 0)
  }
}

const testInstance = new CreateClaimMatchTest()
registerMochaTest(testInstance)
