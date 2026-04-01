/**
 * Test: Can commit hand hash
 * Category: MOVES (CLAIM-specific)
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class CommitHandHashTest extends BaseTest {
  constructor() {
    super({
      id: 'commit-hand-hash',
      name: 'Can commit hand hash',
      description:
        'Verifies that a player can commit their hand hash in a CLAIM match',
      tags: {
        category: TestCategory.MOVES,
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
      getTestUserId,
      getTestMatchHash,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const testMatchId = generateUniqueMatchId('commit-test')
    // Create match but DON'T start it (commitHand requires phase 0 - DEALING)
    const [matchPDA] = await getMatchPDA(testMatchId)
    const [registryPDA] = await getRegistryPDA()
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

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

    // Join 2 players (but don't start - stay in phase 0)
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

    // Use real match hash from test data (deterministic)
    const handHash = getTestMatchHash()
    const handSize = 13 // Standard hand size for CLAIM

    await program.methods
      .commitHand(testMatchId, getTestUserId(0), Array.from(handHash), handSize)
      .accounts({
        matchAccount: matchPDA,
        player: player1.publicKey,
      } as never)
      .signers([player1])
      .rpc()

    const matchAccount = await program.account.match.fetch(matchPDA)
    // Verify hand was committed (check committed_hand_hashes field)
    const committedHashes = matchAccount.committedHandHashes
    const player0Hash = Array.from(committedHashes.slice(0, 32))
    const hasNonZero = player0Hash.some(b => b !== 0)
    this.assert(hasNonZero, 'Player 0 hand hash should be set')
  }
}

const testInstance = new CommitHandHashTest()
registerMochaTest(testInstance)
