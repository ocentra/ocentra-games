/**
 * Test: Fails to start match with insufficient players
 * Category: LIFECYCLE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import type { AnchorError } from '@/helpers'

class FailStartInsufficientPlayersTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-start-insufficient-players',
      name: 'Fails to start match with insufficient players',
      description:
        'Verifies that starting a match with less than minimum players fails',
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
      generateUniqueMatchId,
      getTestGame,
      getTestSeed,
      getTestUserId,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('start-insufficient-test')
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

    // Join only 1 player (minimum is 2)
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

    try {
      await program.methods
        .startMatch(testMatchId)
        .accounts({
          matchAccount: matchPDA,
          registry: registryPDA,
          escrowAccount: null, // Escrow not needed for free matches
          authority: (await import('@/helpers')).authority.publicKey,
        } as never)
        .rpc()

      this.assert(false, 'Should have thrown InsufficientPlayers error')
    } catch (err: unknown) {
      const error = err as AnchorError
      this.assertEqual(error.error?.errorCode?.code, 'InsufficientPlayers')
    }
  }
}

const testInstance = new FailStartInsufficientPlayersTest()
registerMochaTest(testInstance)
