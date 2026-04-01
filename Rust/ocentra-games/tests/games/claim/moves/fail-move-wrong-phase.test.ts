/**
 * Test: Fails to submit move in wrong phase
 * Category: MOVES (CLAIM-specific)
 */

import {
  BaseTest,
  TestCategory,
  ClusterRequirement,
  registerMochaTest,
} from '@/core'
import { SystemProgram } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

class FailMoveWrongPhaseTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-move-wrong-phase',
      name: 'Fails to submit move in wrong phase',
      description:
        'Verifies that submitting a move when match is not in playing phase fails',
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
      generateUniqueMatchId,
      getTestGame,
      getTestSeed,
      getTestUserId,
      getMatchPDA,
      getRegistryPDA,
      getMovePDA,
      submitMoveManual,
      AnchorError: AnchorErrorType,
      authority,
    } = await import('@/helpers')

    const matchId = generateUniqueMatchId('wrong-phase')
    const [matchPDA] = await getMatchPDA(matchId)
    const [registryPDA] = await getRegistryPDA()
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

    // Create match but don't start it (phase 0 - DEALING)
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
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

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

      this.assert(false, 'Should have thrown InvalidPhase error')
    } catch (err: unknown) {
      if (!(err instanceof AnchorErrorType)) {
        throw new Error(
          `Expected AnchorError, got ${err?.constructor?.name}: ${err}`
        )
      }
      this.assertEqual(err.error?.errorCode?.code, 'InvalidPhase')
    }
  }
}

const testInstance = new FailMoveWrongPhaseTest()
registerMochaTest(testInstance)
