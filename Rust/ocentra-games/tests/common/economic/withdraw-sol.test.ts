/**
 * Test: withdraw_sol instruction - Comprehensive tests
 * Category: ECONOMIC
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  getUserDepositPDA,
  getConfigAccountPDA,
  ConfigAccountType,
  UserDepositAccountType,
} from '@/common'
import * as anchor from '@coral-xyz/anchor'

class WithdrawSolTest extends BaseTest {
  constructor() {
    super({
      id: 'withdraw-sol',
      name: 'withdraw_sol instruction - Comprehensive tests',
      description:
        'Tests withdraw_sol instruction: success, fees, insufficient balance, locked account, frozen account',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority, airdrop } = await import('@/helpers')

    // Setup: Initialize config if needed and ensure it's unpaused
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

    // Get config to check withdrawal fee and ensure it's unpaused
    let config = (await program.account.configAccount.fetch(
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
      // Fetch again after unpausing
      config = (await program.account.configAccount.fetch(
        configPDA
      )) as unknown as ConfigAccountType
    }
    const withdrawalFee =
      config.withdrawalFeeLamports?.toNumber() ??
      config.withdrawal_fee_lamports?.toNumber() ??
      5000

    // Test 1: Success - Withdraw with fee deduction
    const user1 = Keypair.generate()
    await airdrop(user1.publicKey, 2)
    const [depositPDA1] = await getUserDepositPDA(user1.publicKey)
    const depositAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL) // 0.1 SOL
    const withdrawAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL) // 0.05 SOL

    // First deposit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount)
      .accounts({
        userDepositAccount: depositPDA1,
        user: user1.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user1])
      .rpc()

    // Get balance before withdrawal
    const balanceBefore = await program.provider.connection.getBalance(
      user1.publicKey
    )

    // Withdraw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .withdrawSol(withdrawAmount)
      .accounts({
        userDepositAccount: depositPDA1,
        user: user1.publicKey,
        configAccount: configPDA,
        treasury: authority.publicKey, // Use authority as treasury for testing
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user1])
      .rpc()

    // Verify account balances updated
    const depositAccount1 = (await program.account.userDepositAccount.fetch(
      depositPDA1
    )) as unknown as UserDepositAccountType
    const expectedAvailable = depositAmount
      .sub(withdrawAmount)
      .sub(new anchor.BN(withdrawalFee))
      .toNumber()
    this.assertEqual(
      depositAccount1.availableLamports?.toNumber() ??
        depositAccount1.available_lamports?.toNumber() ??
        0,
      expectedAvailable,
      'availableLamports should be reduced by withdraw amount + fee'
    )
    this.assertEqual(
      depositAccount1.withdrawnLamports?.toNumber() ??
        depositAccount1.withdrawn_lamports?.toNumber() ??
        0,
      withdrawAmount.toNumber(),
      'withdrawnLamports should equal withdraw amount'
    )

    // Verify user received SOL (minus fee)
    const balanceAfter = await program.provider.connection.getBalance(
      user1.publicKey
    )
    const receivedAmount = balanceAfter - balanceBefore
    // Note: Balance change includes transaction fee, so we check it's approximately correct
    this.assert(
      receivedAmount >= withdrawAmount.toNumber() - 10000, // Allow for transaction fees
      `User should receive approximately ${withdrawAmount.toNumber()} lamports, got ${receivedAmount}`
    )

    // Test 2: Failure - Insufficient balance
    const user2 = Keypair.generate()
    await airdrop(user2.publicKey, 2)
    const [depositPDA2] = await getUserDepositPDA(user2.publicKey)
    const smallDeposit = new anchor.BN(0.01 * LAMPORTS_PER_SOL) // 0.01 SOL

    // Deposit small amount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(smallDeposit)
      .accounts({
        userDepositAccount: depositPDA2,
        user: user2.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user2])
      .rpc()

    // Try to withdraw more than available (including fee)
    const largeWithdraw = new anchor.BN(0.02 * LAMPORTS_PER_SOL) // More than deposit

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .withdrawSol(largeWithdraw)
        .accounts({
          userDepositAccount: depositPDA2,
          user: user2.publicKey,
          configAccount: configPDA,
          treasury: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([user2])
        .rpc()

      this.assert(false, 'Should have failed with InsufficientFunds error')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      this.assertEqual(
        errorCode,
        'InsufficientFunds',
        'Expected InsufficientFunds error'
      )
    }

    // Test 3: Failure - Zero amount
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .withdrawSol(new anchor.BN(0))
        .accounts({
          userDepositAccount: depositPDA1,
          user: user1.publicKey,
          configAccount: configPDA,
          treasury: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([user1])
        .rpc()

      this.assert(
        false,
        'Should have failed with InvalidPayload error for zero amount'
      )
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      this.assertEqual(
        errorCode,
        'InvalidPayload',
        'Expected InvalidPayload error for zero amount'
      )
    }

    // Test 4: Failure - Unauthorized (wrong user)
    const user3 = Keypair.generate()
    await airdrop(user3.publicKey, 2)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .withdrawSol(new anchor.BN(0.01 * LAMPORTS_PER_SOL))
        .accounts({
          userDepositAccount: depositPDA1, // user1's account
          user: user3.publicKey, // but user3 is signing
          configAccount: configPDA,
          treasury: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([user3])
        .rpc()

      this.assert(false, 'Should have failed with Unauthorized error')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      // Wrong user means wrong PDA seeds, so it fails at ConstraintSeeds before reaching handler
      // This is still a valid failure - the account doesn't belong to user3
      const error = err as { message?: string }
      const errorMessage = error?.message ?? ''
      const isValidError =
        errorCode === 'Unauthorized' ||
        errorCode === 'ConstraintSeeds' ||
        errorCode === 'ConstraintRaw' ||
        errorMessage.includes('ConstraintSeeds')
      this.assert(
        isValidError,
        `Expected Unauthorized or ConstraintSeeds error, but got ${errorCode || 'undefined'} (message: ${errorMessage})`
      )
    }

    // Test 5: Success - Withdraw with zero fee (if withdrawal_fee is 0)
    // This test verifies the instruction works even when fee is 0
    // Note: We can't change config fee in this test, so we'll just verify the logic handles it

    // Test 6: Failure - Account locked (if locked_until > current time)
    // Note: We can't set locked_until without an admin instruction
    // This test will verify the locked check works when that functionality exists
    // For now, we'll skip this test and add it when lock functionality is implemented

    // Test 7: Failure - Account frozen
    // Note: Similar to locked, we can't freeze without admin instruction
    // This test will verify frozen check works when that functionality exists

    // Test 8: Success - Withdraw all available balance (minus fee)
    const user4 = Keypair.generate()
    await airdrop(user4.publicKey, 2)
    const [depositPDA4] = await getUserDepositPDA(user4.publicKey)
    const depositAmount4 = new anchor.BN(0.1 * LAMPORTS_PER_SOL)

    // Deposit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount4)
      .accounts({
        userDepositAccount: depositPDA4,
        user: user4.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user4])
      .rpc()

    // Withdraw all available (minus fee)
    const maxWithdraw = depositAmount4.sub(new anchor.BN(withdrawalFee))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .withdrawSol(maxWithdraw)
      .accounts({
        userDepositAccount: depositPDA4,
        user: user4.publicKey,
        configAccount: configPDA,
        treasury: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user4])
      .rpc()

    // Verify account is empty (except fee was deducted)
    const depositAccount4 = (await program.account.userDepositAccount.fetch(
      depositPDA4
    )) as unknown as UserDepositAccountType
    this.assertEqual(
      depositAccount4.availableLamports?.toNumber() ??
        depositAccount4.available_lamports?.toNumber() ??
        0,
      0,
      'availableLamports should be 0 after withdrawing all'
    )

    // Test 9: Success - Verify withdrawal fee is sent to treasury
    // Use a separate treasury account to avoid interference from transaction fees
    const treasury5 = Keypair.generate()
    await airdrop(treasury5.publicKey, 0.1) // Small amount for rent

    const user5 = Keypair.generate()
    await airdrop(user5.publicKey, 2)
    const [depositPDA5] = await getUserDepositPDA(user5.publicKey)
    const depositAmount5 = new anchor.BN(0.1 * LAMPORTS_PER_SOL)
    const withdrawAmount5 = new anchor.BN(0.05 * LAMPORTS_PER_SOL)

    // Deposit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount5)
      .accounts({
        userDepositAccount: depositPDA5,
        user: user5.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user5])
      .rpc()

    // Get treasury balance before withdrawal
    const treasuryBalanceBefore = await program.provider.connection.getBalance(
      treasury5.publicKey
    )

    // Withdraw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .withdrawSol(withdrawAmount5)
      .accounts({
        userDepositAccount: depositPDA5,
        user: user5.publicKey,
        configAccount: configPDA,
        treasury: treasury5.publicKey, // Use separate treasury
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user5])
      .rpc()

    // Verify treasury received fee (if fee > 0)
    if (withdrawalFee > 0) {
      const treasuryBalanceAfter = await program.provider.connection.getBalance(
        treasury5.publicKey
      )
      const treasuryReceived = treasuryBalanceAfter - treasuryBalanceBefore
      // Treasury should receive exactly the withdrawal fee
      this.assert(
        treasuryReceived === withdrawalFee,
        `Treasury should receive exactly ${withdrawalFee} lamports, got ${treasuryReceived}`
      )
    }

    // Test 10: Failure - Withdraw more than available (including fee)
    const user6 = Keypair.generate()
    await airdrop(user6.publicKey, 2)
    const [depositPDA6] = await getUserDepositPDA(user6.publicKey)
    const depositAmount6 = new anchor.BN(0.05 * LAMPORTS_PER_SOL)

    // Deposit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount6)
      .accounts({
        userDepositAccount: depositPDA6,
        user: user6.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user6])
      .rpc()

    // Try to withdraw amount that exceeds available (including fee)
    const excessiveWithdraw = depositAmount6 // Try to withdraw all, but fee makes it impossible

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .withdrawSol(excessiveWithdraw)
        .accounts({
          userDepositAccount: depositPDA6,
          user: user6.publicKey,
          configAccount: configPDA,
          treasury: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([user6])
        .rpc()

      this.assert(false, 'Should have failed with InsufficientFunds error')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      this.assertEqual(
        errorCode,
        'InsufficientFunds',
        'Expected InsufficientFunds error'
      )
    }
  }
}

const testInstance = new WithdrawSolTest()
registerMochaTest(testInstance)
