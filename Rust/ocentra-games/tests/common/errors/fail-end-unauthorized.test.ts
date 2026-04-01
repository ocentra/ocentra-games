/**
 * Test: Fails to end match with unauthorized authority
 * Category: ERRORS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class FailEndUnauthorizedTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-end-unauthorized',
      name: 'Fails to end match with unauthorized authority',
      description:
        'Verifies that ending a match with unauthorized authority fails',
      tags: {
        category: TestCategory.ERRORS,
        cluster: ClusterRequirement.ANY,
        expensive: true,
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const {
      program,
      unauthorizedPlayer,
      generateUniqueMatchId,
      getTestGame,
      getTestSeed,
      getTestMatchHash,
      getTestHotUrl,
      getMatchPDA,
      getRegistryPDA,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('unauth-test')
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

    const matchHash = getTestMatchHash()
    const hotUrl = getTestHotUrl()

    try {
      await program.methods
        .endMatch(matchId, Array.from(matchHash), hotUrl)
        .accounts({
          matchAccount: matchPDA,
          escrowAccount: null, // Escrow not needed for free matches
          authority: unauthorizedPlayer.publicKey,
        } as never)
        .signers([unauthorizedPlayer])
        .rpc()

      this.assert(false, 'Should have thrown Unauthorized or constraint error')
    } catch (err: unknown) {
      const error = err as {
        error?: { errorCode?: { code?: string } }
        message?: string
      }
      const isUnauthorized = error.error?.errorCode?.code === 'Unauthorized'
      const hasConstraint = error.message?.includes('constraint') ?? false
      this.assert(
        isUnauthorized || hasConstraint,
        'Should have Unauthorized or constraint error'
      )
    }
  }
}

const testInstance = new FailEndUnauthorizedTest()
registerMochaTest(testInstance)
