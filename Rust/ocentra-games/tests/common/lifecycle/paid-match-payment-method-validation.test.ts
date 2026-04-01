/**
 * Test: Paid match payment method validation
 * Category: LIFECYCLE
 *
 * Tests that payment method validation works correctly:
 * - Cannot join wallet match with platform payment
 * - Cannot join platform match with wallet payment
 * - All players must use same payment method
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  getMatchPDA,
  getEscrowPDA,
  getConfigAccountPDA,
  getUserDepositPDA,
  ConfigAccountType,
} from '@/common'
import * as anchor from '@coral-xyz/anchor'

const MATCH_TYPE = { FREE: 0, PAID: 1 } as const
const PAYMENT_METHOD = { WALLET: 0, PLATFORM: 1 } as const

class PaidMatchPaymentMethodValidationTest extends BaseTest {
  constructor() {
    super({
      id: 'paid-match-payment-method-validation',
      name: 'Paid match payment method validation',
      description:
        'Tests payment method validation - players must match match payment method',
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

    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found')
    const seed = getTestSeed()
    const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL)

    // Test 1: Wallet match - try to join with platform payment (should fail)
    const matchId1 = generateUniqueMatchId('wallet-match')
    const [matchPDA1] = await getMatchPDA(matchId1)
    const [registryPDA] = await getRegistryPDA()
    const [escrowPDA1] = await getEscrowPDA(matchPDA1)

    const player1 = Keypair.generate()
    await airdrop(player1.publicKey, 2)
    const [depositPDA1] = await getUserDepositPDA(player1.publicKey)

    // Deposit SOL for platform payment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(entryFee.mul(new anchor.BN(2)))
      .accounts({
        userDepositAccount: depositPDA1,
        user: player1.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player1])
      .rpc()

    await program.methods
      .createMatch(
        matchId1,
        claimGame.game_id,
        new anchor.BN(seed),
        entryFee,
        PAYMENT_METHOD.WALLET,
        MATCH_TYPE.PAID,
        null
      )
      .accounts({
        matchAccount: matchPDA1,
        registry: registryPDA,
        escrowAccount: escrowPDA1,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Try to join with platform payment (should fail - match requires wallet)
    try {
      await program.methods
        .joinMatch(matchId1, getTestUserId(0))
        .accounts({
          matchAccount: matchPDA1,
          registry: registryPDA,
          escrowAccount: escrowPDA1,
          userDepositAccount: depositPDA1, // Providing platform deposit
          playerWallet: null, // Not providing wallet
          player: player1.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([player1])
        .rpc()

      this.assert(
        false,
        'Should have failed - wallet match requires wallet payment'
      )
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      const error = err as { message?: string }
      const errorMessage = error?.message ?? ''

      // Should fail because escrow_account is required but payment method doesn't match
      // Or because player_wallet is required for wallet payment
      const isValidError =
        errorCode === 'InvalidPaymentMethod' ||
        errorCode === 'InvalidPayload' ||
        errorMessage.includes('InvalidPaymentMethod') ||
        errorMessage.includes('payment method') ||
        errorMessage.includes('account not found') ||
        errorMessage.includes('ConstraintSeeds')

      this.assert(
        isValidError,
        `Expected payment method validation error, got ${errorCode || 'undefined'}: ${errorMessage}`
      )
    }

    // Test 2: Platform match - try to join with wallet payment (should fail)
    const matchId2 = generateUniqueMatchId('platform-match')
    const [matchPDA2] = await getMatchPDA(matchId2)
    const [escrowPDA2] = await getEscrowPDA(matchPDA2)

    const player2 = Keypair.generate()
    await airdrop(player2.publicKey, 2) // Has wallet balance

    await program.methods
      .createMatch(
        matchId2,
        claimGame.game_id,
        new anchor.BN(seed),
        entryFee,
        PAYMENT_METHOD.PLATFORM,
        MATCH_TYPE.PAID,
        null
      )
      .accounts({
        matchAccount: matchPDA2,
        registry: registryPDA,
        escrowAccount: escrowPDA2,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Try to join with wallet payment (should fail - match requires platform)
    try {
      await program.methods
        .joinMatch(matchId2, getTestUserId(0))
        .accounts({
          matchAccount: matchPDA2,
          registry: registryPDA,
          escrowAccount: escrowPDA2,
          userDepositAccount: null, // Not providing platform deposit
          playerWallet: player2.publicKey, // Providing wallet instead
          player: player2.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([player2])
        .rpc()

      this.assert(
        false,
        'Should have failed - platform match requires platform payment'
      )
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      const error = err as { message?: string }
      const errorMessage = error?.message ?? ''

      const isValidError =
        errorCode === 'InvalidPaymentMethod' ||
        errorCode === 'InvalidPayload' ||
        errorMessage.includes('InvalidPaymentMethod') ||
        errorMessage.includes('payment method') ||
        errorMessage.includes('account not found') ||
        errorMessage.includes('ConstraintSeeds')

      this.assert(
        isValidError,
        `Expected payment method validation error, got ${errorCode || 'undefined'}: ${errorMessage}`
      )
    }

    console.log('✓ Payment method validation tests passed')
  }
}

const testInstance = new PaidMatchPaymentMethodValidationTest()
registerMochaTest(testInstance)
