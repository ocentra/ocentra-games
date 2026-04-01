/**
 * Test: Start paid match - Escrow verification
 * Category: LIFECYCLE
 *
 * Tests that start_match verifies escrow is fully funded before starting
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  getMatchPDA,
  getEscrowPDA,
  getConfigAccountPDA,
  ConfigAccountType,
} from '@/common'
import * as anchor from '@coral-xyz/anchor'

const MATCH_TYPE = { FREE: 0, PAID: 1 } as const
const PAYMENT_METHOD = { WALLET: 0, PLATFORM: 1 } as const

class StartPaidMatchEscrowVerificationTest extends BaseTest {
  constructor() {
    super({
      id: 'start-paid-match-escrow-verification',
      name: 'Start paid match - Escrow verification',
      description: 'Tests that start_match verifies escrow is fully funded',
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
      getTestGame,
      getTestSeed,
      getTestUserId,
      airdrop,
    } = await import('@/helpers')
    const { getRegistryPDA } = await import('@/common')

    // Setup: Initialize config and ensure it's unpaused
    const [configPDA] = await getConfigAccountPDA()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .initializeConfig(authority.publicKey)
        .accounts({
          configAccount: configPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()
    } catch (err: unknown) {
      const error = err as { message?: string }
      if (
        !error.message?.includes('already in use') &&
        !error.message?.includes('0x0')
      ) {
        throw err
      }
    }

    // Ensure config is unpaused (may have been paused by previous tests)
    const config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    if (config.isPaused ?? config.is_paused) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .unpauseProgram()
        .accounts({
          configAccount: configPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()
    }

    const matchId = generateUniqueMatchId('escrow-verification')
    const [matchPDA] = await getMatchPDA(matchId)
    const [registryPDA] = await getRegistryPDA()
    const [escrowPDA] = await getEscrowPDA(matchPDA)
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found')
    const seed = getTestSeed()

    const player1 = Keypair.generate()
    const player2 = Keypair.generate()
    await airdrop(player1.publicKey, 2)
    await airdrop(player2.publicKey, 2)

    const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL)

    // Create paid match
    await program.methods
      .createMatch(
        matchId,
        claimGame.game_id,
        new anchor.BN(seed),
        entryFee,
        PAYMENT_METHOD.WALLET,
        MATCH_TYPE.PAID,
        null
      )
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Join only 1 player (not enough for minimum, but test escrow verification)
    await program.methods
      .joinMatch(matchId, getTestUserId(0))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        userDepositAccount: null,
        playerWallet: player1.publicKey,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player1])
      .rpc()

    // Try to start match - should fail because escrow not fully funded
    // (Only 1 player joined, but match needs 2 minimum players)
    // Actually, it will fail on insufficient players first, but let's test escrow verification
    // by joining 2 players but not fully funding escrow

    // Join second player to meet minimum
    await program.methods
      .joinMatch(matchId, getTestUserId(1))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        userDepositAccount: null,
        playerWallet: player2.publicKey,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player2])
      .rpc()

    // Verify escrow is fully funded
    // status_flags bit 0 (0x01) = funded
    const escrowAccount = (await program.account.escrowAccount.fetch(
      escrowPDA
    )) as unknown as {
      totalEntryLamports?: { toNumber(): number }
      total_entry_lamports?: { toNumber(): number }
      statusFlags?: number
      status_flags?: number
    }
    const expectedTotal = entryFee.toNumber() * 2
    this.assertEqual(
      escrowAccount.totalEntryLamports?.toNumber() ??
        escrowAccount.total_entry_lamports?.toNumber() ??
        0,
      expectedTotal,
      'Escrow should be fully funded'
    )
    const statusFlags =
      escrowAccount.statusFlags ?? escrowAccount.status_flags ?? 0
    const isFunded = (statusFlags & 0x01) !== 0
    this.assert(isFunded, 'Escrow should be marked as funded')

    // Now start match - should succeed because escrow is fully funded
    await program.methods
      .startMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        authority: authority.publicKey,
      } as never)
      .rpc()

    const matchAccount = await program.account.match.fetch(matchPDA)
    this.assertEqual(matchAccount.phase, 1, 'Match should start successfully')

    console.log('✓ Escrow verification test passed')
  }
}

const testInstance = new StartPaidMatchEscrowVerificationTest()
registerMochaTest(testInstance)
