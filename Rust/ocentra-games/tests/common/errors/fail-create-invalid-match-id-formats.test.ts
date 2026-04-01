/**
 * Test: Tests all invalid match_id formats
 * Category: ERRORS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class FailCreateInvalidMatchIdFormatsTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-create-invalid-match-id-formats',
      name: 'Tests all invalid match_id formats',
      description:
        'Verifies that creating matches with invalid match_id formats fails',
      tags: {
        category: TestCategory.ERRORS,
        cluster: ClusterRequirement.DEVNET_ALLOWED,
        expensive: true,
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, getTestGame, getTestSeed, getMatchPDA, getRegistryPDA } =
      await import('@/helpers')

    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()
    const [registryPDA] = await getRegistryPDA()

    const invalidIds = [
      '', // empty
      'a', // too short
      'a'.repeat(35), // 35 chars (need 36)
      'a'.repeat(37), // 37 chars (too long)
      'not-a-uuid-format-at-all-just-text', // invalid format
    ]

    for (const invalidId of invalidIds) {
      const [matchPDA] = await getMatchPDA(invalidId)
      try {
        await program.methods
          .createMatch(
            invalidId,
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

        this.assert(
          false,
          `Should have failed for invalid match_id: ${invalidId}`
        )
      } catch (err: unknown) {
        // Expected to fail - check for InvalidPayload or constraint error
        const error = err as {
          error?: { errorCode?: { code?: string } }
          message?: string
        }
        const isInvalidPayload =
          error.error?.errorCode?.code === 'InvalidPayload'
        const hasConstraint = error.message?.includes('constraint') ?? false
        this.assert(
          isInvalidPayload || hasConstraint,
          `Should have InvalidPayload or constraint error for ${invalidId}`
        )
      }
    }
  }
}

const testInstance = new FailCreateInvalidMatchIdFormatsTest()
registerMochaTest(testInstance)
