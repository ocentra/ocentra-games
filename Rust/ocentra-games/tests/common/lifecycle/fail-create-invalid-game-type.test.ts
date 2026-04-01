/**
 * Test: Fails to create match with invalid game_type
 * Category: LIFECYCLE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { normalizeAndRethrowAnchorError } from '@/common'

class FailCreateInvalidGameTypeTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-create-invalid-game-type',
      name: 'Fails to create match with invalid game_type',
      description:
        'Verifies that creating a match with an unregistered game_type fails',
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
      getTestSeed,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('invalid-game')
    const invalidGameType = 255
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(matchId)
    const [registryPDA] = await getRegistryPDA()

    try {
      await program.methods
        .createMatch(
          matchId,
          invalidGameType,
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

      this.assert(false, 'Should have thrown InvalidPayload error')
    } catch (err: unknown) {
      // Normalize the error to get proper AnchorError structure
      try {
        normalizeAndRethrowAnchorError(
          err,
          'createMatch with invalid game_type'
        )
      } catch (normalizedErr: unknown) {
        const errorCode = this.getErrorCode(normalizedErr)
        this.assertEqual(errorCode, 'InvalidPayload')
      }
    }
  }
}

const testInstance = new FailCreateInvalidGameTypeTest()
registerMochaTest(testInstance)
