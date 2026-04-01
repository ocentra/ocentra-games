/**
 * Test: Fails to join match in wrong phase
 * Category: LIFECYCLE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import type { AnchorError } from '@/helpers'

class FailJoinWrongPhaseTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-join-wrong-phase',
      name: 'Fails to join match in wrong phase',
      description: 'Verifies that joining a match after it has started fails',
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
      player1,
      player2,
      player3,
      generateUniqueMatchId,
      getTestGame,
      getTestSeed,
      getTestUserId,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('join-wrong-phase-test')
    const [matchPDA] = await getMatchPDA(testMatchId)
    const [registryPDA] = await getRegistryPDA()
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

    // Create match
    await program.methods
      .createMatch(
        testMatchId,
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
        authority: (await import('@/helpers')).authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Join 2 players
    await program.methods
      .joinMatch(testMatchId, getTestUserId(0))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: null, // Escrow not needed for free matches
        userDepositAccount: null, // Not needed for free matches
        playerWallet: null, // Not needed for free matches
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player1])
      .rpc()

    await program.methods
      .joinMatch(testMatchId, getTestUserId(1))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: null, // Escrow not needed for free matches
        userDepositAccount: null, // Not needed for free matches
        playerWallet: null, // Not needed for free matches
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player2])
      .rpc()

    // Start match (transitions to phase 1 - PLAYING)
    await program.methods
      .startMatch(testMatchId)
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: null, // Escrow not needed for free matches
        authority: (await import('@/helpers')).authority.publicKey,
      } as never)
      .rpc()

    // Verify match is in phase 1
    const matchBefore = await program.account.match.fetch(matchPDA)
    this.assertEqual(matchBefore.phase, 1)
    this.assertEqual(matchBefore.playerCount, 2)

    // Try to join after match started
    try {
      await program.methods
        .joinMatch(testMatchId, getTestUserId(2))
        .accounts({
          matchAccount: matchPDA,
          registry: registryPDA,
          escrowAccount: null, // Escrow not needed for free matches
          userDepositAccount: null, // Not needed for free matches
          playerWallet: null, // Not needed for free matches
          player: player3.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([player3])
        .rpc()

      this.assert(false, 'Should have thrown InvalidPhase error')
    } catch (err: unknown) {
      const error = err as AnchorError
      this.assertEqual(error.error?.errorCode?.code, 'InvalidPhase')
    }
  }
}

const testInstance = new FailJoinWrongPhaseTest()
registerMochaTest(testInstance)
