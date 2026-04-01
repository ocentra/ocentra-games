// Match lifecycle helpers - applies to all games

import * as anchor from '@coral-xyz/anchor'
import { SystemProgram, PublicKey, Keypair } from '@solana/web3.js'
import { program, authority } from './setup'
import {
  getMatchPDA,
  getRegistryPDA,
  getConfigAccountPDA,
  getUserDepositPDA,
  getEscrowPDA,
} from './pda'
import { createTestContext, TestContext } from './test-context'
import { getTestUserId, getTestGame, getTestSeed } from './test-data'
import { ConfigAccountType } from './types'

// Match type and payment method constants
export const MATCH_TYPE = {
  FREE: 0,
  PAID: 1,
} as const

export const PAYMENT_METHOD = {
  WALLET: 0,
  PLATFORM: 1,
} as const

/**
 * Create a started match (common for all games)
 * Returns [matchPDA, registryPDA]
 */
export const createStartedMatch = async (
  matchId: string,
  numPlayers: number
): Promise<[PublicKey, PublicKey]> => {
  const ctx = createTestContext(`createStartedMatch(${matchId})`)

  try {
    ctx.set('matchId', matchId)
    ctx.set('numPlayers', numPlayers)

    // Get game registry
    const [registryPDA] = await getRegistryPDA()
    ctx.set('registryPDA', registryPDA)

    // Get CLAIM game (game_id = 0)
    const claimGame = getTestGame(0)
    if (!claimGame) {
      throw new Error('CLAIM game not found in test data')
    }

    // Get match PDA
    const [matchPDA] = await getMatchPDA(matchId)
    ctx.set('matchPDA', matchPDA)

    // Create match
    const seed = getTestSeed()
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

    ctx.log('✓ Match created')

    // Join players
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { player1, player2, player3, player4 } = require('./setup')
    const playerKeypairs = [player1, player2, player3, player4]
    for (let i = 0; i < numPlayers; i++) {
      const userId = getTestUserId(i)
      const player = playerKeypairs[i]

      ctx.set(`player${i + 1}`, player.publicKey.toString())
      ctx.set(`userId${i + 1}`, userId)

      await program.methods
        .joinMatch(matchId, userId)
        .accounts({
          matchAccount: matchPDA,
          registry: registryPDA,
          escrowAccount: null, // Escrow not needed for free matches
          userDepositAccount: null, // Not needed for free matches
          playerWallet: null, // Not needed for free matches
          player: player.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([player])
        .rpc()

      ctx.log(`✓ Player ${i + 1} joined`)
    }

    // Start match
    await program.methods
      .startMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        registry: registryPDA,
        escrowAccount: null, // Escrow not needed for free matches
        authority: authority.publicKey,
      } as never)
      .rpc()

    ctx.log('✓ Match started')
    ctx.finish()

    return [matchPDA, registryPDA]
  } catch (err) {
    ctx.error('Failed to create started match', err)
    throw err
  }
}

/**
 * Create match with context (for better error messages)
 */
export const createMatchWithContext = async (
  ctx: TestContext,
  matchId: string,
  gameId: number,
  seed: number
): Promise<[PublicKey, PublicKey]> => {
  const [registryPDA] = await getRegistryPDA()
  const [matchPDA] = await getMatchPDA(matchId)

  ctx.set('registryPDA', registryPDA)
  ctx.set('matchPDA', matchPDA)

  const game = getTestGame(gameId)
  if (!game) {
    throw new Error(`Game ${gameId} not found in test data`)
  }

  await program.methods
    .createMatch(
      matchId,
      gameId,
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

  return [matchPDA, registryPDA]
}

/**
 * Check GameRegistry status
 */
export const checkGameRegistryStatus = async (
  ctx?: TestContext
): Promise<{
  exists: boolean
  registryPDA: PublicKey
}> => {
  const [registryPDA] = await getRegistryPDA()

  if (ctx) {
    ctx.set('registryPDA', registryPDA)
  }

  const accountInfo =
    await program.provider.connection.getAccountInfo(registryPDA)
  const exists = accountInfo !== null

  if (ctx) {
    ctx.set('registryExists', exists.toString())
    ctx.log(`Registry exists: ${exists}`)
  }

  return { exists, registryPDA }
}

/**
 * Ensure config is initialized and unpaused
 * Helper function used by paid match operations
 */
const ensureConfigUnpaused = async (): Promise<PublicKey> => {
  const [configPDA] = await getConfigAccountPDA()

  // Initialize config if needed
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

  // Ensure config is unpaused and payment methods are enabled
  let config = (await program.account.configAccount.fetch(
    configPDA
  )) as unknown as ConfigAccountType
  let needsUpdate = false

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
    needsUpdate = true // Re-fetch config after unpause
  }

  // Check if payment methods are enabled (0x03 = both WALLET and PLATFORM)
  const supportedMethods =
    config.supportedPaymentMethods ?? config.supported_payment_methods ?? 0
  if (supportedMethods !== 0x03) {
    // Enable both payment methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .updateConfig(
        null, // platform_fee_bps
        null, // withdrawal_fee_lamports
        null, // min_entry_fee
        null, // max_entry_fee
        null, // treasury_multisig
        0x03 // supported_payment_methods (enable both WALLET and PLATFORM)
      )
      .accounts({
        configAccount: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()
    needsUpdate = true
  }

  if (needsUpdate) {
    // Re-fetch config to get updated values
    config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
  }

  return configPDA
}

/**
 * Deposit SOL to user's deposit account
 * Handles config initialization and unpause check
 */
export const depositSol = async (
  user: Keypair,
  amount: anchor.BN
): Promise<PublicKey> => {
  await ensureConfigUnpaused()

  const [depositPDA] = await getUserDepositPDA(user.publicKey)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (program.methods as any)
    .depositSol(amount)
    .accounts({
      userDepositAccount: depositPDA,
      user: user.publicKey,
      systemProgram: SystemProgram.programId,
    } as never)
    .signers([user])
    .rpc()

  return depositPDA
}

/**
 * Create a paid match
 * Handles config initialization and unpause check
 * Returns [matchPDA, registryPDA, escrowPDA]
 */
export const createPaidMatch = async (
  matchId: string,
  gameId: number,
  seed: number,
  entryFee: anchor.BN,
  paymentMethod: number = PAYMENT_METHOD.WALLET,
  tournamentId: number[] | null = null
): Promise<[PublicKey, PublicKey, PublicKey]> => {
  await ensureConfigUnpaused()

  const [matchPDA] = await getMatchPDA(matchId)
  const [registryPDA] = await getRegistryPDA()
  const [escrowPDA] = await getEscrowPDA(matchPDA)

  const tournamentIdArray = tournamentId ? new Uint8Array(tournamentId) : null

  await program.methods
    .createMatch(
      matchId,
      gameId,
      new anchor.BN(seed),
      entryFee,
      paymentMethod,
      MATCH_TYPE.PAID,
      tournamentIdArray
        ? (Array.from(tournamentIdArray) as [
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
            number,
          ])
        : null
    )
    .accounts({
      matchAccount: matchPDA,
      registry: registryPDA,
      escrowAccount: escrowPDA,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc()

  return [matchPDA, registryPDA, escrowPDA]
}

/**
 * Join a paid match
 * Handles config initialization and unpause check
 *
 * @param matchId - Match ID
 * @param userId - User ID
 * @param player - Player keypair
 * @param paymentMethod - Payment method (WALLET or PLATFORM)
 * @param userDepositPDA - User deposit PDA (required for PLATFORM payment, null for WALLET)
 */
export const joinPaidMatch = async (
  matchId: string,
  userId: string,
  player: Keypair,
  paymentMethod: number = PAYMENT_METHOD.WALLET,
  userDepositPDA: PublicKey | null = null
): Promise<void> => {
  await ensureConfigUnpaused()

  const [matchPDA] = await getMatchPDA(matchId)
  const [registryPDA] = await getRegistryPDA()
  const [escrowPDA] = await getEscrowPDA(matchPDA)

  await program.methods
    .joinMatch(matchId, userId)
    .accounts({
      matchAccount: matchPDA,
      registry: registryPDA,
      escrowAccount: escrowPDA,
      userDepositAccount: userDepositPDA,
      playerWallet:
        paymentMethod === PAYMENT_METHOD.WALLET ? player.publicKey : null,
      player: player.publicKey,
      systemProgram: SystemProgram.programId,
    } as never)
    .signers([player])
    .rpc()
}
