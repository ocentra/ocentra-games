/**
 * Test: Paid match cancellation and refund
 * Category: LIFECYCLE
 *
 * Tests that cancelled paid matches properly refund escrow using refund_escrow instruction
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
const CANCELLATION_REASON = {
  PLATFORM_FAULT: 0,
  PLAYER_ABANDONMENT: 1,
  INSUFFICIENT_PLAYERS: 2,
  TIMEOUT: 3,
  GRACE_PERIOD_EXPIRED: 4,
} as const

class PaidMatchCancellationRefundTest extends BaseTest {
  constructor() {
    super({
      id: 'paid-match-cancellation-refund',
      name: 'Paid match cancellation and refund',
      description: 'Tests that cancelled paid matches refund escrow correctly',
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

    const matchId = generateUniqueMatchId('cancellation-refund')
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

    // Join 2 players
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

    // Verify escrow is funded
    const escrowAccountBefore = (await program.account.escrowAccount.fetch(
      escrowPDA
    )) as unknown as {
      totalEntryLamports?: { toNumber(): number }
      total_entry_lamports?: { toNumber(): number }
    }
    const totalEscrow =
      escrowAccountBefore.totalEntryLamports?.toNumber() ??
      escrowAccountBefore.total_entry_lamports?.toNumber() ??
      0
    this.assertEqual(
      totalEscrow,
      entryFee.toNumber() * 2,
      "Escrow should have both players' entry fees"
    )

    // Capture balance after joining (before refund)
    const player1BalanceBeforeRefund =
      await program.provider.connection.getBalance(player1.publicKey)

    // Mark match as cancelled (in real scenario, this would happen via cancelMatch instruction)
    // For now, we'll test refund_escrow directly
    // Note: In production, cancelMatch would set match phase and call refund_escrow

    // Test refund with PLATFORM_FAULT (all players get full refunds)
    // Anchor expects Vec<u8> as Buffer, not plain array
    await program.methods
      .refundEscrow(
        matchId,
        Buffer.from([0, 1]), // All players - Buffer required for Vec<u8>
        CANCELLATION_REASON.PLATFORM_FAULT,
        null // No abandoned player
      )
      .accounts({
        escrowAccount: escrowPDA,
        matchAccount: matchPDA,
        configAccount: configPDA,
        player0: player1.publicKey,
        player1: player2.publicKey,
        player2: player1.publicKey,
        player3: player1.publicKey,
        player4: player1.publicKey,
        player5: player1.publicKey,
        player6: player1.publicKey,
        player7: player1.publicKey,
        player8: player1.publicKey,
        player9: player1.publicKey,
        playerDeposit0: null,
        playerDeposit1: null,
        playerDeposit2: null,
        playerDeposit3: null,
        playerDeposit4: null,
        playerDeposit5: null,
        playerDeposit6: null,
        playerDeposit7: null,
        playerDeposit8: null,
        playerDeposit9: null,
        treasury: null,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Verify escrow is marked as cancelled
    // status_flags bit 2 (0x04) = cancelled
    const escrowAccountAfter = (await program.account.escrowAccount.fetch(
      escrowPDA
    )) as unknown as {
      statusFlags?: number
      status_flags?: number
    }
    const statusFlags =
      escrowAccountAfter.statusFlags ?? escrowAccountAfter.status_flags ?? 0
    const isCancelled = (statusFlags & 0x04) !== 0
    this.assert(isCancelled, 'Escrow should be marked as cancelled')

    // Verify players received refunds (balance increased from before refund)
    const player1BalanceAfterRefund =
      await program.provider.connection.getBalance(player1.publicKey)
    this.assert(
      player1BalanceAfterRefund > player1BalanceBeforeRefund,
      'Player should receive refund'
    )

    console.log('✓ Cancellation refund test passed')
  }
}

const testInstance = new PaidMatchCancellationRefundTest()
registerMochaTest(testInstance)
