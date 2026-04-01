/**
 * Test: Fails to submit move when match ended
 * Category: ERRORS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class FailMoveMatchEndedTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-move-match-ended',
      name: 'Fails to submit move when match ended',
      description:
        'Verifies that submitting a move after match has ended fails',
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
    const {
      program,
      player1,
      generateUniqueMatchId,
      getTestMatchHash,
      getTestHotUrl,
      getTestUserId,
      getMovePDA,
      createStartedMatch,
      submitMoveManual,
      AnchorError: AnchorErrorType,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('ended-match')
    const [matchPDA, registryPDA] = await createStartedMatch(matchId, 2)

    // End the match
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

    // Try to submit move after match ended
    const userId = getTestUserId(0)
    const nonce = new anchor.BN(Date.now())
    const [movePDA] = await getMovePDA(matchId, player1.publicKey, nonce)

    try {
      await submitMoveManual(
        matchId,
        userId,
        2,
        Buffer.from([0]),
        nonce,
        matchPDA,
        registryPDA,
        movePDA,
        player1
      )

      this.assert(
        false,
        'Should have thrown MatchAlreadyEnded or InvalidPhase error'
      )
    } catch (err: unknown) {
      if (!(err instanceof AnchorErrorType)) {
        throw new Error(
          `Expected AnchorError, got ${err?.constructor?.name}: ${err}`
        )
      }
      const code = err.error?.errorCode?.code
      this.assert(
        code === 'MatchAlreadyEnded' || code === 'InvalidPhase',
        `Expected MatchAlreadyEnded or InvalidPhase, got ${code}`
      )
    }
  }
}

const testInstance = new FailMoveMatchEndedTest()
registerMochaTest(testInstance)
