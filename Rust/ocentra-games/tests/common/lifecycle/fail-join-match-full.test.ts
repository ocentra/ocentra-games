/**
 * Test: Fails to join match when full
 * Category: LIFECYCLE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import type { AnchorError } from '@/helpers'

class FailJoinMatchFullTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-join-match-full',
      name: 'Fails to join match when full',
      description: 'Verifies that joining a match when it is full fails',
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
      player4,
      generateUniqueMatchId,
      getTestGame,
      getTestSeed,
      getTestUserId,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('join-full-test')
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

    // Join 4 players (max for CLAIM)
    const players = [player1, player2, player3, player4]
    for (let i = 0; i < 4; i++) {
      await program.methods
        .joinMatch(testMatchId, getTestUserId(i))
        .accounts({
          matchAccount: matchPDA,
          registry: registryPDA,
          escrowAccount: null, // Escrow not needed for free matches
          userDepositAccount: null, // Not needed for free matches
          playerWallet: null, // Not needed for free matches
          player: players[i].publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([players[i]])
        .rpc()
    }

    // Try to join 5th player
    const player5 = anchor.web3.Keypair.generate()
    try {
      await program.methods
        .joinMatch(testMatchId, 'user-invalid-999')
        .accounts({
          matchAccount: matchPDA,
          registry: registryPDA,
          escrowAccount: null, // Escrow not needed for free matches
          userDepositAccount: null, // Not needed for free matches
          playerWallet: null, // Not needed for free matches
          player: player5.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([player5])
        .rpc()

      this.assert(false, 'Should have thrown MatchFull error')
    } catch (err: unknown) {
      const error = err as AnchorError
      this.assertEqual(error.error?.errorCode?.code, 'MatchFull')
    }
  }
}

const testInstance = new FailJoinMatchFullTest()
registerMochaTest(testInstance)
