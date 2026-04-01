/**
 * Test: Paid match with wallet payment - Full flow
 * Category: LIFECYCLE
 *
 * Tests the complete lifecycle of a paid match using wallet payment method:
 * create → join → start → end → distribute prizes
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
  EscrowAccountType,
} from '@/common'
import * as anchor from '@coral-xyz/anchor'

// Match type and payment method constants
const MATCH_TYPE = {
  FREE: 0,
  PAID: 1,
} as const

const PAYMENT_METHOD = {
  WALLET: 0,
  PLATFORM: 1,
} as const

class PaidMatchWalletFlowTest extends BaseTest {
  constructor() {
    super({
      id: 'paid-match-wallet-flow',
      name: 'Paid match with wallet payment - Full flow',
      description:
        'Tests complete lifecycle: create paid match → join with wallet → start → end → distribute prizes',
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

    const matchId = generateUniqueMatchId('paid-wallet')
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(matchId)
    const [registryPDA] = await getRegistryPDA()
    const [escrowPDA] = await getEscrowPDA(matchPDA)

    // Create 2 players with sufficient SOL
    const player1 = Keypair.generate()
    const player2 = Keypair.generate()
    await airdrop(player1.publicKey, 2) // 2 SOL
    await airdrop(player2.publicKey, 2) // 2 SOL

    const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL) // 0.1 SOL entry fee

    // Test 1: Create paid match with wallet payment
    await program.methods
      .createMatch(
        matchId,
        claimGame.game_id,
        new anchor.BN(seed),
        entryFee, // entry_fee
        PAYMENT_METHOD.WALLET, // payment_method
        MATCH_TYPE.PAID, // match_type
        null // tournament_id
      )
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Verify match is paid
    const matchAccount = await program.account.match.fetch(matchPDA)
    this.assertEqual(
      matchAccount.matchType ?? 0,
      MATCH_TYPE.PAID,
      'Match type should be PAID'
    )
    this.assertEqual(
      matchAccount.entryFeeLamports?.toNumber() ?? 0,
      entryFee.toNumber(),
      'Entry fee should match'
    )
    this.assertEqual(
      matchAccount.paymentMethod ?? 0,
      PAYMENT_METHOD.WALLET,
      'Payment method should be WALLET'
    )

    // Verify escrow account exists and is initialized
    const escrowAccount = (await program.account.escrowAccount.fetch(
      escrowPDA
    )) as unknown as EscrowAccountType
    this.assertTruthy(escrowAccount, 'Escrow account should exist')
    this.assertEqual(
      escrowAccount.matchPda?.toString() ??
        escrowAccount.match_pda?.toString() ??
        '',
      matchPDA.toString(),
      'Escrow should belong to match'
    )
    this.assertEqual(
      escrowAccount.totalEntryLamports?.toNumber() ??
        escrowAccount.total_entry_lamports?.toNumber() ??
        0,
      0,
      'Escrow should start with 0 lamports'
    )

    // Test 2: Join match with wallet payment
    const player1BalanceBefore = await program.provider.connection.getBalance(
      player1.publicKey
    )

    await program.methods
      .joinMatch(matchId, getTestUserId(0))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        userDepositAccount: null, // Not needed for wallet payment
        playerWallet: player1.publicKey, // Player wallet for payment
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player1])
      .rpc()

    // Verify player balance decreased by entry fee
    const player1BalanceAfter = await program.provider.connection.getBalance(
      player1.publicKey
    )
    const balanceDiff = player1BalanceBefore - player1BalanceAfter
    // Account for transaction fees, so balance diff should be >= entry fee
    this.assert(
      balanceDiff >= entryFee.toNumber(),
      `Player balance should decrease by at least entry fee. Expected >= ${entryFee.toNumber()}, got ${balanceDiff}`
    )

    // Verify escrow received payment
    const escrowAccountAfterJoin1 = (await program.account.escrowAccount.fetch(
      escrowPDA
    )) as unknown as {
      totalEntryLamports?: { toNumber(): number }
      total_entry_lamports?: { toNumber(): number }
      playerStakes?: Array<{ toNumber(): number }>
      player_stakes?: Array<{ toNumber(): number }>
    }
    this.assertEqual(
      escrowAccountAfterJoin1.totalEntryLamports?.toNumber() ??
        escrowAccountAfterJoin1.total_entry_lamports?.toNumber() ??
        0,
      entryFee.toNumber(),
      'Escrow should have received entry fee'
    )
    this.assertEqual(
      escrowAccountAfterJoin1.playerStakes?.[0]?.toNumber() ??
        escrowAccountAfterJoin1.player_stakes?.[0]?.toNumber() ??
        0,
      entryFee.toNumber(),
      'Player 0 stake should equal entry fee'
    )

    // Join second player

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
    const escrowAccountAfterJoin2 = (await program.account.escrowAccount.fetch(
      escrowPDA
    )) as unknown as {
      totalEntryLamports?: { toNumber(): number }
      total_entry_lamports?: { toNumber(): number }
      statusFlags?: number
      status_flags?: number
    }
    const expectedTotal = entryFee.toNumber() * 2 // 2 players
    this.assertEqual(
      escrowAccountAfterJoin2.totalEntryLamports?.toNumber() ??
        escrowAccountAfterJoin2.total_entry_lamports?.toNumber() ??
        0,
      expectedTotal,
      'Escrow should have total from both players'
    )
    const statusFlags =
      escrowAccountAfterJoin2.statusFlags ??
      escrowAccountAfterJoin2.status_flags ??
      0
    const isFunded = (statusFlags & 0x01) !== 0
    this.assert(isFunded, 'Escrow should be marked as funded')

    // Test 3: Start match (verifies escrow)
    await program.methods
      .startMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        authority: authority.publicKey,
      } as never)
      .rpc()

    const matchAccountAfterStart = await program.account.match.fetch(matchPDA)
    this.assertEqual(
      matchAccountAfterStart.phase,
      1,
      'Match should be in Playing phase'
    )

    // Test 4: End match (validates escrow state)
    await program.methods
      .endMatch(matchId, null, null)
      .accounts({
        matchAccount: matchPDA,
        escrowAccount: escrowPDA,
        authority: authority.publicKey,
      } as never)
      .rpc()

    const matchAccountAfterEnd = await program.account.match.fetch(matchPDA)
    this.assertEqual(
      matchAccountAfterEnd.phase,
      2,
      'Match should be in Ended phase'
    )

    // Test 5: Distribute prizes
    // Get config to calculate platform fee
    const configForFee = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    const platformFeeBps =
      configForFee.platformFeeBps ?? configForFee.platform_fee_bps ?? 500 // Default 5%
    const platformFee = Math.floor((expectedTotal * platformFeeBps) / 10000)
    const prizePool = expectedTotal - platformFee

    // Capture balances before distribution
    const treasuryBalanceBefore = await program.provider.connection.getBalance(
      authority.publicKey
    )
    const player1BalanceBeforeDistribute =
      await program.provider.connection.getBalance(player1.publicKey)

    // Distribute prizes (winner gets all prize pool)
    // Note: All winner accounts must be provided (use dummy for unused slots)
    await program.methods
      .distributePrizes(
        matchId,
        Buffer.from([0]), // Winner index - Buffer required for Vec<u8>
        [new anchor.BN(prizePool)] // Prize amount
      )
      .accounts({
        escrowAccount: escrowPDA,
        matchAccount: matchPDA,
        configAccount: configPDA,
        winner0: player1.publicKey,
        winner1: player1.publicKey, // Dummy - not used but required
        winner2: player1.publicKey, // Dummy - not used but required
        winner3: player1.publicKey, // Dummy - not used but required
        winner4: player1.publicKey, // Dummy - not used but required
        winner5: player1.publicKey, // Dummy - not used but required
        winner6: player1.publicKey, // Dummy - not used but required
        winner7: player1.publicKey, // Dummy - not used but required
        winner8: player1.publicKey, // Dummy - not used but required
        winner9: player1.publicKey, // Dummy - not used but required
        winnerDeposit0: null, // Wallet payment - no deposit accounts needed
        winnerDeposit1: null,
        winnerDeposit2: null,
        winnerDeposit3: null,
        winnerDeposit4: null,
        winnerDeposit5: null,
        winnerDeposit6: null,
        winnerDeposit7: null,
        winnerDeposit8: null,
        winnerDeposit9: null,
        treasury: authority.publicKey, // Treasury receives platform fee
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Verify escrow is marked as distributed
    // status_flags bit 1 (0x02) = distributed
    const escrowAccountAfterDistribute =
      (await program.account.escrowAccount.fetch(escrowPDA)) as unknown as {
        statusFlags?: number
        status_flags?: number
        totalEntryLamports?: { toNumber(): number }
        total_entry_lamports?: { toNumber(): number }
      }
    const distributedFlags =
      escrowAccountAfterDistribute.statusFlags ??
      escrowAccountAfterDistribute.status_flags ??
      0
    const isDistributed = (distributedFlags & 0x02) !== 0
    this.assert(isDistributed, 'Escrow should be marked as distributed')

    // Verify escrow balance is empty (all funds distributed)
    const escrowBalanceAfter =
      await program.provider.connection.getBalance(escrowPDA)
    // Escrow should only have rent-exempt balance left (minimal)
    // Rent-exempt minimum for EscrowAccount is ~2.2M lamports (0.0022 SOL)
    // Check that balance is close to rent-exempt minimum (within 10% tolerance)
    const rentExemptMinimum = 2000000 // ~0.002 SOL
    const rentExemptMaximum = 3000000 // ~0.003 SOL (allows for small variations)
    this.assert(
      escrowBalanceAfter >= rentExemptMinimum &&
        escrowBalanceAfter <= rentExemptMaximum,
      `Escrow should only have rent-exempt balance. Expected between ${rentExemptMinimum} and ${rentExemptMaximum} lamports, got ${escrowBalanceAfter}`
    )

    // Verify escrow account total_entry_lamports is 0
    const escrowTotalAfter =
      escrowAccountAfterDistribute.totalEntryLamports?.toNumber() ??
      escrowAccountAfterDistribute.total_entry_lamports?.toNumber() ??
      0
    this.assertEqual(
      escrowTotalAfter,
      0,
      'Escrow total_entry_lamports should be 0 after distribution'
    )

    // Verify treasury received platform fee (accounting for transaction fees)
    const treasuryBalanceAfter = await program.provider.connection.getBalance(
      authority.publicKey
    )
    const treasuryIncrease = treasuryBalanceAfter - treasuryBalanceBefore
    // Treasury receives platform fee but pays transaction fees (~5000 lamports)
    // So net increase should be platformFee - transactionFee
    // Allow tolerance for transaction fees (typically 5000-10000 lamports)
    const transactionFeeTolerance = 10000 // Allow up to 0.00001 SOL for transaction fees
    this.assert(
      treasuryIncrease >= platformFee - transactionFeeTolerance,
      `Treasury should receive platform fee (minus transaction fees). Expected >= ${platformFee - transactionFeeTolerance} lamports, got ${treasuryIncrease}`
    )

    // Verify winner received prize (exact amount, accounting for transaction fees)
    const player1BalanceFinal = await program.provider.connection.getBalance(
      player1.publicKey
    )
    const player1Increase = player1BalanceFinal - player1BalanceBeforeDistribute
    // Winner should receive prize pool (accounting for transaction fees)
    // Transaction fees reduce the net increase, so check that increase is >= prize pool minus some tolerance
    const tolerance = 5000 // 0.000005 SOL tolerance for transaction fees
    this.assert(
      player1Increase >= prizePool - tolerance,
      `Winner should receive prize pool. Expected >= ${prizePool - tolerance} lamports, got ${player1Increase}`
    )

    console.log('✓ Paid match wallet flow completed successfully')
    console.log(`  - Entry fee: ${entryFee.toNumber() / LAMPORTS_PER_SOL} SOL`)
    console.log(`  - Total escrow: ${expectedTotal / LAMPORTS_PER_SOL} SOL`)
    console.log(`  - Platform fee: ${platformFee / LAMPORTS_PER_SOL} SOL`)
    console.log(`  - Prize pool: ${prizePool / LAMPORTS_PER_SOL} SOL`)
  }
}

const testInstance = new PaidMatchWalletFlowTest()
registerMochaTest(testInstance)
