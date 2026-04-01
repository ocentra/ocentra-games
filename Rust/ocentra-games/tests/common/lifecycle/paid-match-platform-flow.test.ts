/**
 * Test: Paid match with platform payment - Full flow
 * Category: LIFECYCLE
 *
 * Tests the complete lifecycle of a paid match using platform payment method:
 * deposit → create → join → start → end → distribute prizes
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
  UserDepositAccountType,
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

class PaidMatchPlatformFlowTest extends BaseTest {
  constructor() {
    super({
      id: 'paid-match-platform-flow',
      name: 'Paid match with platform payment - Full flow',
      description:
        'Tests complete lifecycle: deposit → create paid match → join with platform → start → end → distribute prizes',
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

    const matchId = generateUniqueMatchId('paid-platform')
    const claimGame = getTestGame(0)
    if (!claimGame) throw new Error('CLAIM game not found in test data')
    const seed = getTestSeed()

    const [matchPDA] = await getMatchPDA(matchId)
    const [registryPDA] = await getRegistryPDA()
    const [escrowPDA] = await getEscrowPDA(matchPDA)

    // Create 2 players
    const player1 = Keypair.generate()
    const player2 = Keypair.generate()
    await airdrop(player1.publicKey, 2) // 2 SOL
    await airdrop(player2.publicKey, 2) // 2 SOL

    const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL) // 0.1 SOL entry fee
    const depositAmount = new anchor.BN(1 * LAMPORTS_PER_SOL) // 1 SOL deposit

    // Step 1: Players deposit SOL into platform accounts
    const [depositPDA1] = await getUserDepositPDA(player1.publicKey)
    const [depositPDA2] = await getUserDepositPDA(player2.publicKey)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount)
      .accounts({
        userDepositAccount: depositPDA1,
        user: player1.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player1])
      .rpc()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .depositSol(depositAmount)
      .accounts({
        userDepositAccount: depositPDA2,
        user: player2.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player2])
      .rpc()

    // Verify deposits
    const depositAccount1 = (await program.account.userDepositAccount.fetch(
      depositPDA1
    )) as unknown as UserDepositAccountType
    this.assertEqual(
      depositAccount1.availableLamports?.toNumber() ??
        depositAccount1.available_lamports?.toNumber() ??
        0,
      depositAmount.toNumber(),
      'Player 1 should have deposited SOL'
    )

    // Step 2: Create paid match with platform payment
    await program.methods
      .createMatch(
        matchId,
        claimGame.game_id,
        new anchor.BN(seed),
        entryFee,
        PAYMENT_METHOD.PLATFORM,
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

    // Step 3: Join match with platform payment
    const depositAccount1BeforeJoin =
      (await program.account.userDepositAccount.fetch(
        depositPDA1
      )) as unknown as {
        availableLamports?: { toNumber(): number }
        available_lamports?: { toNumber(): number }
      }
    const availableBefore1 =
      depositAccount1BeforeJoin.availableLamports?.toNumber() ??
      depositAccount1BeforeJoin.available_lamports?.toNumber() ??
      0

    await program.methods
      .joinMatch(matchId, getTestUserId(0))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        userDepositAccount: depositPDA1,
        playerWallet: null, // Not needed for platform payment
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player1])
      .rpc()

    // Verify deposit account updated
    const depositAccount1AfterJoin =
      (await program.account.userDepositAccount.fetch(
        depositPDA1
      )) as unknown as {
        availableLamports?: { toNumber(): number }
        available_lamports?: { toNumber(): number }
        inPlayLamports?: { toNumber(): number }
        in_play_lamports?: { toNumber(): number }
      }
    const availableAfter1 =
      depositAccount1AfterJoin.availableLamports?.toNumber() ??
      depositAccount1AfterJoin.available_lamports?.toNumber() ??
      0
    const inPlayAfter1 =
      depositAccount1AfterJoin.inPlayLamports?.toNumber() ??
      depositAccount1AfterJoin.in_play_lamports?.toNumber() ??
      0

    this.assertEqual(
      availableAfter1,
      availableBefore1 - entryFee.toNumber(),
      'Available balance should decrease by entry fee'
    )
    this.assertEqual(
      inPlayAfter1,
      entryFee.toNumber(),
      'Entry fee should be locked in in_play_lamports'
    )

    // Join second player
    const [depositPDA2After] = await getUserDepositPDA(player2.publicKey)
    await program.methods
      .joinMatch(matchId, getTestUserId(1))
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        userDepositAccount: depositPDA2After,
        playerWallet: null,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([player2])
      .rpc()

    // Verify escrow is fully funded
    const escrowAccountAfterJoin = (await program.account.escrowAccount.fetch(
      escrowPDA
    )) as unknown as {
      totalEntryLamports?: { toNumber(): number }
      total_entry_lamports?: { toNumber(): number }
    }
    const expectedTotal = entryFee.toNumber() * 2
    this.assertEqual(
      escrowAccountAfterJoin.totalEntryLamports?.toNumber() ??
        escrowAccountAfterJoin.total_entry_lamports?.toNumber() ??
        0,
      expectedTotal,
      'Escrow should have total from both players'
    )

    // Step 4: Start match
    await program.methods
      .startMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: escrowPDA,
        authority: authority.publicKey,
      } as never)
      .rpc()

    // Step 5: End match
    await program.methods
      .endMatch(matchId, null, null)
      .accounts({
        matchAccount: matchPDA,
        escrowAccount: escrowPDA,
        authority: authority.publicKey,
      } as never)
      .rpc()

    // Step 6: Distribute prizes
    const configForFee = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    const platformFeeBps =
      configForFee.platformFeeBps ?? configForFee.platform_fee_bps ?? 500
    const platformFee = Math.floor((expectedTotal * platformFeeBps) / 10000)
    const prizePool = expectedTotal - platformFee

    // Capture balances before distribution
    const treasuryBalanceBefore = await program.provider.connection.getBalance(
      authority.publicKey
    )

    // Provide all winner accounts (required by Anchor, even if not all used)
    // Use player1 as dummy for unused slots
    await program.methods
      .distributePrizes(
        matchId,
        Buffer.from([0]), // Winner index - Buffer required for Vec<u8>
        [new anchor.BN(prizePool)] // Prize amounts as BN[] required for Vec<u64>
      )
      .accounts({
        escrowAccount: escrowPDA,
        matchAccount: matchPDA,
        configAccount: configPDA,
        treasury: authority.publicKey,
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
        winnerDeposit0: depositPDA1, // Platform payment - prize goes to deposit account
        winnerDeposit1: null,
        winnerDeposit2: null,
        winnerDeposit3: null,
        winnerDeposit4: null,
        winnerDeposit5: null,
        winnerDeposit6: null,
        winnerDeposit7: null,
        winnerDeposit8: null,
        winnerDeposit9: null,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

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
    const escrowAccountAfterDistribute =
      (await program.account.escrowAccount.fetch(escrowPDA)) as unknown as {
        totalEntryLamports?: { toNumber(): number }
        total_entry_lamports?: { toNumber(): number }
      }
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

    // Verify winner's deposit account received prize (exact amount)
    const depositAccount1AfterDistribute =
      (await program.account.userDepositAccount.fetch(
        depositPDA1
      )) as unknown as {
        availableLamports?: { toNumber(): number }
        available_lamports?: { toNumber(): number }
        inPlayLamports?: { toNumber(): number }
        in_play_lamports?: { toNumber(): number }
      }
    const availableFinal =
      depositAccount1AfterDistribute.availableLamports?.toNumber() ??
      depositAccount1AfterDistribute.available_lamports?.toNumber() ??
      0
    const inPlayFinal =
      depositAccount1AfterDistribute.inPlayLamports?.toNumber() ??
      depositAccount1AfterDistribute.in_play_lamports?.toNumber() ??
      0

    // Winner should have prize added to available, and in_play should be unlocked (entry fee removed)
    // Expected: availableAfter1 (after join) + prizePool = availableFinal
    const expectedAvailableFinal = availableAfter1 + prizePool
    this.assertEqual(
      availableFinal,
      expectedAvailableFinal,
      `Winner should receive exact prize pool. Expected ${expectedAvailableFinal} lamports, got ${availableFinal}`
    )
    this.assertEqual(
      inPlayFinal,
      0,
      'Entry fee should be unlocked after match ends'
    )

    console.log('✓ Paid match platform flow completed successfully')
    console.log(`  - Entry fee: ${entryFee.toNumber() / LAMPORTS_PER_SOL} SOL`)
    console.log(`  - Total escrow: ${expectedTotal / LAMPORTS_PER_SOL} SOL`)
    console.log(`  - Prize pool: ${prizePool / LAMPORTS_PER_SOL} SOL`)
  }
}

const testInstance = new PaidMatchPlatformFlowTest()
registerMochaTest(testInstance)
