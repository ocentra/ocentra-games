/**
 * Test: Fails to submit move when player not in match
 * Category: ERRORS
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import * as anchor from '@coral-xyz/anchor'

class FailMovePlayerNotInMatchTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-move-player-not-in-match',
      name: 'Fails to submit move when player not in match',
      description:
        'Verifies that submitting a move when player is not in match fails',
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
      player3,
      generateUniqueMatchId,
      getMovePDA,
      createStartedMatch,
      submitMoveManual,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('not-in-match')
    const [matchPDA, registryPDA] = await createStartedMatch(matchId, 2)

    // Use a user ID that doesn't exist in test data
    const userId = 'user-invalid-999' // Not in match
    const nonce = new anchor.BN(Date.now())
    const [movePDA] = await getMovePDA(matchId, player3.publicKey, nonce)

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
        player3
      )

      this.assert(false, 'Should have thrown PlayerNotInMatch error')
    } catch (err: unknown) {
      // Handle "Unsupported sysvar" error (localnet validator issue) or actual AnchorError
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg.includes('Unsupported sysvar')) {
        // Localnet validator issue - skip this test or use a different approach
        console.log(
          '[fail-move-player-not-in-match] Skipping due to localnet Clock sysvar issue'
        )
        this.assert(false, 'Test skipped: localnet Clock sysvar not available')
        return
      }

      if (!this.isAnchorError(err)) {
        throw new Error(
          `Expected AnchorError, got ${err?.constructor?.name}: ${err}`
        )
      }
      const errorCode = this.getErrorCode(err)
      this.assertEqual(errorCode, 'PlayerNotInMatch')
    }
  }
}

const testInstance = new FailMovePlayerNotInMatchTest()
registerMochaTest(testInstance)
