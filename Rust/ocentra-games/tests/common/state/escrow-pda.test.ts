/**
 * Test: EscrowAccount PDA derivation
 * Category: STATE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { getMatchPDA, getEscrowPDA } from '@/common'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class EscrowPDATest extends BaseTest {
  constructor() {
    super({
      id: 'escrow-pda',
      name: 'EscrowAccount PDA derivation',
      description:
        'Verifies EscrowAccount PDA can be derived correctly from match PDA',
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
    const matchId = generateUniqueMatchId('escrow-pda')
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(matchId)

    // Create a match first
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

    // Derive EscrowAccount PDA
    const [escrowPDA, escrowBump] = await getEscrowPDA(matchPDA)

    // Verify PDA derivation
    this.assertTruthy(escrowPDA, 'Escrow PDA should be derived')
    this.assert(
      escrowBump >= 0 && escrowBump <= 255,
      `Escrow bump should be between 0-255, got ${escrowBump}`
    )

    // Verify PDA is deterministic (derive again should give same result)
    const [escrowPDA2, escrowBump2] = await getEscrowPDA(matchPDA)
    this.assert(
      escrowPDA.equals(escrowPDA2),
      'Escrow PDA derivation should be deterministic'
    )
    this.assertEqual(
      escrowBump,
      escrowBump2,
      'Escrow bump should be consistent'
    )

    // Verify PDA is different for different matches
    const matchId2 = generateUniqueMatchId('escrow-pda-2')
    const [matchPDA2] = await getMatchPDA(matchId2)
    const [escrowPDA3] = await getEscrowPDA(matchPDA2)

    this.assert(
      !escrowPDA.equals(escrowPDA3),
      'Escrow PDAs for different matches should be different'
    )
  }
}

const testInstance = new EscrowPDATest()
registerMochaTest(testInstance)
