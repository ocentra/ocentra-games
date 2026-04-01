/**
 * Test: Free match unaffected by Phase 04 changes
 * Category: LIFECYCLE
 *
 * Verifies that free matches continue to work exactly as before Phase 04.
 * This ensures backward compatibility.
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import {
  getMatchPDA,
  getRegistryPDA,
  getEscrowPDA,
  MatchAccountType,
} from '@/common'
import * as anchor from '@coral-xyz/anchor'

class FreeMatchUnaffectedTest extends BaseTest {
  constructor() {
    super({
      id: 'free-match-unaffected',
      name: 'Free match unaffected by Phase 04 changes',
      description:
        'Verifies backward compatibility - free matches work without paid match parameters',
      tags: {
        category: TestCategory.LIFECYCLE,
        cluster: ClusterRequirement.ANY,
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
      getTestUserId,
      player1,
      player2,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('free-match')
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(matchId)
    const [registryPDA] = await getRegistryPDA()

    // Test: Create free match (no paid match parameters - backward compatible)
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

    // Verify match is free
    const matchAccount = (await program.account.match.fetch(
      matchPDA
    )) as unknown as MatchAccountType
    this.assertEqual(
      matchAccount.matchType ?? matchAccount.match_type ?? 0,
      0,
      'Match type should be FREE (0)'
    )
    this.assertEqual(
      matchAccount.entryFeeLamports?.toNumber() ??
        matchAccount.entry_fee_lamports?.toNumber() ??
        0,
      0,
      'Entry fee should be 0 for free match'
    )
    this.assertEqual(
      matchAccount.prizePoolLamports?.toNumber() ??
        matchAccount.prize_pool_lamports?.toNumber() ??
        0,
      0,
      'Prize pool should be 0 for free match'
    )

    // Verify escrow account does NOT exist for free matches
    const [escrowPDA] = await getEscrowPDA(matchPDA)
    try {
      await program.account.escrowAccount.fetch(escrowPDA)
      this.assert(false, 'Escrow account should NOT exist for free matches')
    } catch (err: unknown) {
      const error = err as { message?: string }
      // Expected: account not found
      const hasAccountError =
        error.message?.includes('Account does not exist') ?? false
      const hasNotFoundError =
        error.message?.includes('account not found') ?? false
      const hasInvalidDataError =
        error.message?.includes('Invalid account data') ?? false
      this.assert(
        hasAccountError || hasNotFoundError || hasInvalidDataError,
        `Expected account not found error, got: ${error.message}`
      )
    }

    // Test: Join free match (no payment required)
    await program.methods
      .joinMatch(matchId, getTestUserId(0))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: null, // Not needed for free matches
        userDepositAccount: null, // Not needed for free matches
        playerWallet: null, // Not needed for free matches
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player1])
      .rpc()

    await program.methods
      .joinMatch(matchId, getTestUserId(1))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: null,
        userDepositAccount: null,
        playerWallet: null,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player2])
      .rpc()

    // Verify players joined
    const matchAccountAfterJoin = (await program.account.match.fetch(
      matchPDA
    )) as unknown as MatchAccountType
    this.assertEqual(
      matchAccountAfterJoin.playerCount ??
        matchAccountAfterJoin.player_count ??
        0,
      2,
      'Should have 2 players'
    )

    // Test: Start free match (no escrow verification needed)
    await program.methods
      .startMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: null, // Not needed for free matches
        authority: authority.publicKey,
      } as never)
      .rpc()

    // Verify match started
    const matchAccountAfterStart = await program.account.match.fetch(matchPDA)
    this.assertEqual(
      matchAccountAfterStart.phase,
      1,
      'Match should be in Playing phase'
    )

    // Test: End free match (no escrow validation needed)
    await program.methods
      .endMatch(matchId, null, null)
      .accounts({
        matchAccount: matchPDA,
        escrowAccount: null, // Not needed for free matches
        authority: authority.publicKey,
      } as never)
      .rpc()

    // Verify match ended
    const matchAccountAfterEnd = await program.account.match.fetch(matchPDA)
    this.assertEqual(
      matchAccountAfterEnd.phase,
      2,
      'Match should be in Ended phase'
    )

    console.log(
      '✓ Free match lifecycle completed successfully (backward compatible)'
    )
  }
}

const testInstance = new FreeMatchUnaffectedTest()
registerMochaTest(testInstance)
