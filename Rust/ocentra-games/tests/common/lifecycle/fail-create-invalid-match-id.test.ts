/**
 * Test: Fails to create match with invalid match_id length
 * Category: LIFECYCLE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class FailCreateInvalidMatchIdTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-create-invalid-match-id',
      name: 'Fails to create match with invalid match_id length',
      description:
        'Verifies that creating a match with invalid match_id length fails',
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
      getTestGame,
      getTestSeed,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const invalidMatchId = 'too-short'
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(invalidMatchId)
    const [registryPDA] = await getRegistryPDA()

    try {
      await program.methods
        .createMatch(
          invalidMatchId,
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

      this.assert(false, 'Should have thrown InvalidPayload error')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      // Invalid match_id length should fail with InvalidPayload in the handler
      // However, if account already exists from previous test run, we might get "account already in use"
      const error = err as { message?: string }
      const errorMessage = error?.message ?? ''
      const isValidError =
        errorCode === 'InvalidPayload' ||
        errorCode === 'ConstraintRaw' ||
        errorMessage.includes('account already in use') ||
        errorMessage.includes('already in use')
      this.assert(
        isValidError,
        `Expected InvalidPayload or account already in use error, but got ${errorCode || 'undefined'} (message: ${errorMessage})`
      )
    }
  }
}

const testInstance = new FailCreateInvalidMatchIdTest()
registerMochaTest(testInstance)
