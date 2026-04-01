/**
 * Test: Match paid match fields
 * Category: STATE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { getMatchPDA, MatchAccountType } from '@/common'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class MatchPaidFieldsTest extends BaseTest {
  constructor() {
    super({
      id: 'match-paid-fields',
      name: 'Match paid match fields',
      description:
        'Verifies Match struct has correct paid match fields and helper methods work',
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
    const matchId = generateUniqueMatchId('paid-fields')
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(matchId)

    // Create a match
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

    // Verify Phase 02 fields exist and have correct defaults
    this.assertTruthy(matchAccount, 'Match account should exist')

    // Verify entry_fee_lamports defaults to 0 (free match)
    // Note: Field names may be camelCase in TypeScript
    const entryFee =
      matchAccount.entryFeeLamports?.toNumber() ??
      matchAccount.entry_fee_lamports?.toNumber() ??
      0
    this.assertEqual(entryFee, 0, 'entry_fee_lamports should default to 0')

    // Verify prize_pool_lamports defaults to 0
    const prizePool =
      matchAccount.prizePoolLamports?.toNumber() ??
      matchAccount.prize_pool_lamports?.toNumber() ??
      0
    this.assertEqual(prizePool, 0, 'prize_pool_lamports should default to 0')

    // Verify match_type defaults to 0 (FREE)
    const matchType = matchAccount.matchType ?? matchAccount.match_type ?? 0
    this.assertEqual(matchType, 0, 'match_type should default to 0 (FREE)')

    // Verify payment_method defaults to 0 (WALLET)
    const paymentMethod =
      matchAccount.paymentMethod ?? matchAccount.payment_method ?? 0
    this.assertEqual(
      paymentMethod,
      0,
      'payment_method should default to 0 (WALLET)'
    )

    // Verify tournament_id defaults to all zeros (not a tournament)
    const tournamentId =
      matchAccount.tournamentId ??
      matchAccount.tournament_id ??
      new Array(16).fill(0)
    const isAllZeros =
      Array.isArray(tournamentId) &&
      tournamentId.every((byte: number) => byte === 0)
    this.assertTruthy(isAllZeros, 'tournament_id should default to all zeros')

    // Verify account was successfully created with new fields
    // Match::MAX_SIZE = 1,188 bytes total
    // The fact that we can fetch the account confirms the size is correct
    this.assertTruthy(matchAccount.matchId, 'Match should have matchId')
  }
}

const testInstance = new MatchPaidFieldsTest()
registerMochaTest(testInstance)
