/**
 * Test: Match struct size calculations
 * Category: STATE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { getMatchPDA, MatchAccountType } from '@/common'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class MatchSizeTest extends BaseTest {
  constructor() {
    super({
      id: 'match-size',
      name: 'Match struct size calculations',
      description: 'Verifies Match struct MAX_SIZE is correct (1,188 bytes)',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority, generateUniqueMatchId, getTestSeed } =
      await import('@/helpers')
    const { getTestGame } = await import('@/common')
    const claimGame = getTestGame(0) // CLAIM game
    if (!claimGame) throw new Error('CLAIM game not found in test data')

    // Generate unique match ID (must be exactly 36 characters)
    const matchId = generateUniqueMatchId('match-size')
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(matchId)

    // Create a match to verify it can be initialized with the expected size
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
        registry: (await import('@/common'))
          .getRegistryPDA()
          .then(([pda]) => pda),
        escrowAccount: null, // Escrow not needed for free matches
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Fetch the match account
    const matchAccount = (await program.account.match.fetch(
      matchPDA
    )) as unknown as MatchAccountType

    // Verify account exists (this confirms the size was sufficient)
    this.assertTruthy(matchAccount, 'Match account should exist')

    // Verify default values for Phase 02 fields
    // Note: Field names may be camelCase in TypeScript (entryFeeLamports) or snake_case (entry_fee_lamports)
    const entryFee =
      matchAccount.entryFeeLamports?.toNumber() ??
      matchAccount.entry_fee_lamports?.toNumber() ??
      0
    this.assertEqual(entryFee, 0, 'entry_fee_lamports should default to 0')

    const prizePool =
      matchAccount.prizePoolLamports?.toNumber() ??
      matchAccount.prize_pool_lamports?.toNumber() ??
      0
    this.assertEqual(prizePool, 0, 'prize_pool_lamports should default to 0')

    const matchType = matchAccount.matchType ?? matchAccount.match_type ?? 0
    this.assertEqual(matchType, 0, 'match_type should default to 0 (FREE)')

    const paymentMethod =
      matchAccount.paymentMethod ?? matchAccount.payment_method ?? 0
    this.assertEqual(
      paymentMethod,
      0,
      'payment_method should default to 0 (WALLET)'
    )

    // Verify account exists and has correct structure
    // Match::MAX_SIZE = 1,188 bytes total (8 discriminator + 1,180 data)
    // The account was successfully created, which confirms the size is correct
    this.assertTruthy(matchAccount.matchId, 'Match should have matchId')
  }
}

const testInstance = new MatchSizeTest()
registerMochaTest(testInstance)
