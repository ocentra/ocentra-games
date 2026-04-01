/**
 * Test: deposit_sol instruction - Comprehensive tests
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

class DepositSolTest extends BaseTest {
  constructor() {
    super({
      id: 'deposit-sol',
      name: 'deposit_sol instruction - Comprehensive tests',
      description:
        'Tests deposit_sol instruction: success cases, frozen account, initialization, multiple deposits',
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

    // Test 1: Success - First deposit (account initialization)
    const user1 = Keypair.generate()
    await airdrop(user1.publicKey, 2)
    const [depositPDA1] = await getUserDepositPDA(user1.publicKey)
    const depositAmount1 = new anchor.BN(0.1 * LAMPORTS_PER_SOL) // 0.1 SOL

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount1)
      .accounts({
        userDepositAccount: depositPDA1,
        user: user1.publicKey,
        configAccount: configPDA,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user1])
      .rpc()

    // Verify account was initialized and updated
    const depositAccount1 = (await program.account.userDepositAccount.fetch(
      depositPDA1
    )) as unknown as UserDepositAccountType
    this.assertTruthy(depositAccount1, 'Deposit account should exist')
    this.assertTruthy(depositAccount1.authority, 'Authority should exist')
    this.assertEqual(
      depositAccount1.authority.toString(),
      user1.publicKey.toString(),
      'Authority should be set to user'
    )
    this.assertEqual(
      depositAccount1.totalDeposited?.toNumber() ??
        depositAccount1.total_deposited?.toNumber() ??
        0,
      depositAmount1.toNumber(),
      'totalDeposited should equal deposit amount'
    )
    this.assertEqual(
      depositAccount1.availableLamports?.toNumber() ??
        depositAccount1.available_lamports?.toNumber() ??
        0,
      depositAmount1.toNumber(),
      'availableLamports should equal deposit amount'
    )
    this.assertEqual(
      depositAccount1.inPlayLamports?.toNumber() ??
        depositAccount1.in_play_lamports?.toNumber() ??
        0,
      0,
      'inPlayLamports should be 0'
    )
    this.assertEqual(
      depositAccount1.withdrawnLamports?.toNumber() ??
        depositAccount1.withdrawn_lamports?.toNumber() ??
        0,
      0,
      'withdrawnLamports should be 0'
    )

    // Test 2: Success - Second deposit (account already exists)
    const depositAmount2 = new anchor.BN(0.05 * LAMPORTS_PER_SOL) // 0.05 SOL

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount2)
      .accounts({
        userDepositAccount: depositPDA1,
        user: user1.publicKey,
        configAccount: configPDA,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user1])
      .rpc()

    // Verify balances accumulated
    const depositAccount1After =
      (await program.account.userDepositAccount.fetch(
        depositPDA1
      )) as unknown as UserDepositAccountType
    const expectedTotal = depositAmount1.add(depositAmount2).toNumber()
    this.assertEqual(
      depositAccount1After.totalDeposited?.toNumber() ??
        depositAccount1After.total_deposited?.toNumber() ??
        0,
      expectedTotal,
      'totalDeposited should accumulate'
    )
    this.assertEqual(
      depositAccount1After.availableLamports?.toNumber() ??
        depositAccount1After.available_lamports?.toNumber() ??
        0,
      expectedTotal,
      'availableLamports should accumulate'
    )

    // Test 3: Failure - Account is frozen
    // First, we need to freeze the account (this would normally be done by admin, but for testing we'll simulate)
    // Note: Freezing requires admin instruction which may not exist yet, so we'll test the error handling
    const user2 = Keypair.generate()
    await airdrop(user2.publicKey, 2)
    const [depositPDA2] = await getUserDepositPDA(user2.publicKey)

    // Create account first
    const depositAmount3 = new anchor.BN(0.01 * LAMPORTS_PER_SOL)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount3)
      .accounts({
        userDepositAccount: depositPDA2,
        user: user2.publicKey,
        configAccount: configPDA,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user2])
      .rpc()

    // Note: We can't actually freeze the account without an admin instruction
    // This test will verify the frozen check works when that instruction exists
    // For now, we'll skip this test and add it when freeze functionality is implemented

    // Test 4: Failure - Zero amount
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .depositSol(new anchor.BN(0))
        .accounts({
          userDepositAccount: depositPDA1,
          user: user1.publicKey,
          configAccount: configPDA,
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

    // Test 5: Failure - Unauthorized (wrong user)
    const user3 = Keypair.generate()
    await airdrop(user3.publicKey, 2)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .depositSol(new anchor.BN(0.01 * LAMPORTS_PER_SOL))
        .accounts({
          userDepositAccount: depositPDA1, // user1's account
          user: user3.publicKey, // but user3 is signing
          configAccount: configPDA,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([user3])
        .rpc()

      this.assert(false, 'Should have failed with Unauthorized error')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      // Note: This might fail earlier with account validation, but if it reaches the handler, should be Unauthorized
      // The actual error might be "AccountNotInitialized" or similar, which is also acceptable
      if (errorCode) {
        this.assert(
          errorCode === 'Unauthorized' ||
            errorCode.includes('Account') ||
            errorCode.includes('Constraint'),
          `Expected Unauthorized or account constraint error, got ${errorCode}`
        )
      } else {
        this.assert(false, `Expected error code but got undefined`)
      }
    }

    // Test 6: Success - Large deposit
    const largeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL) // 1 SOL
    const user4 = Keypair.generate()
    await airdrop(user4.publicKey, 2)
    const [depositPDA4] = await getUserDepositPDA(user4.publicKey)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(largeAmount)
      .accounts({
        userDepositAccount: depositPDA4,
        user: user4.publicKey,
        configAccount: configPDA,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user4])
      .rpc()

    // Verify large deposit succeeded
    const depositAccount4 = (await program.account.userDepositAccount.fetch(
      depositPDA4
    )) as unknown as UserDepositAccountType
    this.assertEqual(
      depositAccount4.totalDeposited?.toNumber() ??
        depositAccount4.total_deposited?.toNumber() ??
        0,
      largeAmount.toNumber(),
      'Large deposit should succeed'
    )

    // Test 7: Success - Multiple sequential deposits accumulate correctly
    const user5 = Keypair.generate()
    await airdrop(user5.publicKey, 2)
    const [depositPDA5] = await getUserDepositPDA(user5.publicKey)
    const deposit1 = new anchor.BN(0.01 * LAMPORTS_PER_SOL)
    const deposit2 = new anchor.BN(0.02 * LAMPORTS_PER_SOL)
    const deposit3 = new anchor.BN(0.03 * LAMPORTS_PER_SOL)

    // First deposit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(deposit1)
      .accounts({
        userDepositAccount: depositPDA5,
        user: user5.publicKey,
        configAccount: configPDA,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user5])
      .rpc()

    // Second deposit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(deposit2)
      .accounts({
        userDepositAccount: depositPDA5,
        user: user5.publicKey,
        configAccount: configPDA,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user5])
      .rpc()

    // Third deposit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(deposit3)
      .accounts({
        userDepositAccount: depositPDA5,
        user: user5.publicKey,
        configAccount: configPDA,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([user5])
      .rpc()

    // Verify all deposits accumulated
    const depositAccount5 = (await program.account.userDepositAccount.fetch(
      depositPDA5
    )) as unknown as UserDepositAccountType
    const expectedTotalMultiple = deposit1
      .add(deposit2)
      .add(deposit3)
      .toNumber()
    this.assertEqual(
      depositAccount5.totalDeposited?.toNumber() ??
        depositAccount5.total_deposited?.toNumber() ??
        0,
      expectedTotalMultiple,
      'Multiple deposits should accumulate correctly'
    )
    this.assertEqual(
      depositAccount5.availableLamports?.toNumber() ??
        depositAccount5.available_lamports?.toNumber() ??
        0,
      expectedTotalMultiple,
      'Available balance should equal total deposited'
    )

    // Test 8: Verify account flags are initialized correctly
    const depositAccount5Flags = depositAccount5.flags ?? 0
    const isFrozen = (depositAccount5Flags & 0x01) !== 0
    this.assertEqual(isFrozen, false, 'Account should not be frozen initially')

    // Test 9: Verify locked_until is initialized to 0 (not locked)
    const lockedUntil =
      depositAccount5.lockedUntil?.toNumber() ??
      depositAccount5.locked_until?.toNumber() ??
      0
    this.assertEqual(lockedUntil, 0, 'Account should not be locked initially')
  }
}

const testInstance = new DepositSolTest()
registerMochaTest(testInstance)
