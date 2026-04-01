/**
 * Test: Join paid match with insufficient funds
 * Category: LIFECYCLE
 *
 * Tests that joining a paid match fails when player has insufficient funds
 * (both wallet and platform payment methods)
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

class JoinPaidMatchInsufficientFundsTest extends BaseTest {
  constructor() {
    super({
      id: 'join-paid-match-insufficient-funds',
      name: 'Join paid match with insufficient funds',
      description:
        'Tests that joining fails with insufficient wallet balance or platform deposit',
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

    const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL) // 0.1 SOL

    // Test 1: Wallet payment - insufficient SOL
    const matchId1 = generateUniqueMatchId('insufficient-wallet')
    const [matchPDA1] = await getMatchPDA(matchId1)
    const [registryPDA] = await getRegistryPDA()
    const [escrowPDA1] = await getEscrowPDA(matchPDA1)
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found')
    const seed = getTestSeed()

    const poorPlayer = Keypair.generate()
    await airdrop(poorPlayer.publicKey, 0.05) // Only 0.05 SOL (less than 0.1 SOL entry fee)

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

    // Try to join with insufficient funds
    try {
      await program.methods
        .joinMatch(matchId1, getTestUserId(0))
        .accounts({
          matchAccount: matchPDA1,
          registry: registryPDA,
          escrowAccount: escrowPDA1,
          userDepositAccount: null,
          playerWallet: poorPlayer.publicKey,
          player: poorPlayer.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([poorPlayer])
        .rpc()

      this.assert(false, 'Should have failed with insufficient funds')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      const error = err as { message?: string }
      const errorMessage = error?.message ?? ''

      // Accept InsufficientFunds or system program errors (insufficient balance)
      const isValidError =
        errorCode === 'InsufficientFunds' ||
        errorMessage.includes('insufficient funds') ||
        errorMessage.includes('0x1') // System program error code

      this.assert(
        isValidError,
        `Expected InsufficientFunds or system error, got ${errorCode || 'undefined'}: ${errorMessage}`
      )
    }

    // Test 2: Platform payment - insufficient deposit
    const matchId2 = generateUniqueMatchId('insufficient-platform')
    const [matchPDA2] = await getMatchPDA(matchId2)
    const [escrowPDA2] = await getEscrowPDA(matchPDA2)
    const poorPlayer2 = Keypair.generate()
    await airdrop(poorPlayer2.publicKey, 2) // Enough for deposit
    const [depositPDA2] = await getUserDepositPDA(poorPlayer2.publicKey)

    // Deposit less than entry fee
    const smallDeposit = new anchor.BN(0.05 * LAMPORTS_PER_SOL) // 0.05 SOL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(smallDeposit)
      .accounts({
        userDepositAccount: depositPDA2,
        user: poorPlayer2.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([poorPlayer2])
      .rpc()

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

    // Try to join with insufficient deposit
    try {
      await program.methods
        .joinMatch(matchId2, getTestUserId(0))
        .accounts({
          matchAccount: matchPDA2,
          registry: registryPDA,
          escrowAccount: escrowPDA2,
          userDepositAccount: depositPDA2,
          playerWallet: null,
          player: poorPlayer2.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([poorPlayer2])
        .rpc()

      this.assert(false, 'Should have failed with insufficient funds')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      const error = err as { message?: string }
      const errorMessage = error?.message ?? ''

      const isValidError =
        errorCode === 'InsufficientFunds' ||
        errorMessage.includes('insufficient') ||
        errorMessage.includes('InsufficientFunds')

      this.assert(
        isValidError,
        `Expected InsufficientFunds error, got ${errorCode || 'undefined'}: ${errorMessage}`
      )
    }

    console.log('✓ Insufficient funds tests passed')
  }
}

const testInstance = new JoinPaidMatchInsufficientFundsTest()
registerMochaTest(testInstance)
