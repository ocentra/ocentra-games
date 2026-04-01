/**
 * Test: Can end match
 * Category: LIFECYCLE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class EndMatchTest extends BaseTest {
  constructor() {
    super({
      id: 'end-match',
      name: 'Can end match',
      description: 'Verifies that a match can be ended',
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
      generateUniqueMatchId,
      getTestGame,
      getTestSeed,
      getTestMatchHash,
      getTestHotUrl,
      getTestUserId,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('end-test')
    const [matchPDA] = await getMatchPDA(matchId)
    const [registryPDA] = await getRegistryPDA()
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

    // Create match
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
        authority: (await import('@/helpers')).authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Join 2 players and start match
    await program.methods
      .joinMatch(matchId, getTestUserId(0))
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
      .joinMatch(matchId, getTestUserId(1))
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

    await program.methods
      .startMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: null, // Escrow not needed for free matches
        authority: (await import('@/helpers')).authority.publicKey,
      } as never)
      .rpc()

    // End match
    const matchHash = getTestMatchHash()
    const hotUrl = getTestHotUrl()

    await program.methods
      .endMatch(matchId, Array.from(matchHash), hotUrl)
      .accounts({
        matchAccount: matchPDA,
        escrowAccount: null, // Escrow not needed for free matches
        authority: (await import('@/helpers')).authority.publicKey,
      } as never)
      .rpc()

    const matchAccount = await program.account.match.fetch(matchPDA)
    this.assertEqual(matchAccount.phase, 2) // Ended
    this.assert(matchAccount.endedAt.toNumber() !== 0, 'endedAt should be set')
  }
}

const testInstance = new EndMatchTest()
registerMochaTest(testInstance)
