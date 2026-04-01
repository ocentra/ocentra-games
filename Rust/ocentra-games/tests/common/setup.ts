// Common setup utilities - applies to all games

import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { OcentraGames } from '../../target/types/ocentra_games'
import {
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js'
import { AnchorError } from '@coral-xyz/anchor'
import { getRegistryPDA } from './pda'
import { isLocalnet } from './cluster'
import { loadGameRegistry } from '@/test-data'

// Configure the client
// NOTE: "websocket error" at test start is HARMLESS and can be ignored.
// Anchor tries to connect to validator's websocket for real-time updates,
// but the HTTP RPC connection works fine for all tests. This is a known Anchor quirk.
export const provider = anchor.AnchorProvider.env()
anchor.setProvider(provider)

// Explicitly type the program to help TypeScript inference
export const program: Program<OcentraGames> = anchor.workspace
  .OcentraGames as Program<OcentraGames>

// Test account keypairs (common across all games)
export const authority = provider.wallet
export const player1 = Keypair.generate()
export const player2 = Keypair.generate()
export const player3 = Keypair.generate()
export const player4 = Keypair.generate()
export const unauthorizedPlayer = Keypair.generate()

// Helper to airdrop SOL with retry logic
export const airdrop = async (
  pubkey: PublicKey,
  amount: number,
  retries = 3
): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      const sig = await provider.connection.requestAirdrop(
        pubkey,
        amount * LAMPORTS_PER_SOL
      )
      await provider.connection.confirmTransaction(sig, 'confirmed')
      return
    } catch (err) {
      if (i === retries - 1) throw err
      console.log(`Airdrop attempt ${i + 1} failed, retrying...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}

// Initialize test accounts with SOL
// On localnet: Check balance first (accounts persist), but use lower threshold for efficiency
// On devnet: Check balance first and only airdrop if needed (rate-limited)
export const initializeTestAccounts = async (): Promise<void> => {
  const accounts = [
    authority.publicKey,
    player1.publicKey,
    player2.publicKey,
    player3.publicKey,
    player4.publicKey,
  ]

  for (const account of accounts) {
    try {
      const balance = await provider.connection.getBalance(account)
      const minBalance = isLocalnet()
        ? 1.0 * LAMPORTS_PER_SOL // On localnet: 1 SOL minimum (lower than devnet, accounts persist)
        : 0.5 * LAMPORTS_PER_SOL // On devnet: 0.5 SOL minimum (rate-limited)

      if (balance < minBalance) {
        const amount = isLocalnet() ? 2 : 1 // 2 SOL on localnet, 1 SOL on devnet
        const cluster = isLocalnet() ? 'localnet' : 'devnet'
        console.log(
          `[${cluster}] Airdropping ${amount} SOL to ${account.toString()} (balance: ${balance / LAMPORTS_PER_SOL} SOL)`
        )
        await airdrop(account, amount)
        const newBalance = await provider.connection.getBalance(account)
        console.log(
          `[${cluster}] Airdropped to ${account.toString()} (new balance: ${newBalance / LAMPORTS_PER_SOL} SOL)`
        )
      } else {
        const cluster = isLocalnet() ? 'localnet' : 'devnet'
        console.log(
          `[${cluster}] Skipping airdrop for ${account.toString()} (balance: ${balance / LAMPORTS_PER_SOL} SOL - sufficient)`
        )
      }
    } catch (err) {
      console.error(`Failed to check/airdrop to ${account.toString()}:`, err)
      throw err
    }
  }
}

// Setup: Initialize GameRegistry with REAL game data from test-data
// On devnet, this may be slow due to multiple transactions
export const setupGameRegistry = async (): Promise<void> => {
  const [registryPDA] = await getRegistryPDA()
  const testGameRegistry = loadGameRegistry()

  // First, check if registry exists and initialize if needed
  const accountInfo =
    await program.provider.connection.getAccountInfo(registryPDA)
  if (accountInfo === null) {
    // Initialize registry first
    try {
      await program.methods
        .initializeRegistry()
        .accounts({
          registry: registryPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()
      console.log('✓ GameRegistry initialized')
    } catch (err: unknown) {
      const error = err as { message?: string }
      // If already initialized, that's fine
      if (
        !error.message?.includes('already in use') &&
        !error.message?.includes('0x0')
      ) {
        throw err
      }
      console.log('GameRegistry already initialized')
    }
  }

  // Import isDevnet lazily to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isDevnet } = require('./cluster')

  // On devnet, only register essential games (CLAIM) to save transactions
  const gamesToRegister = isDevnet()
    ? testGameRegistry.filter(g => g.game_id === 0) // Only CLAIM on devnet
    : testGameRegistry // All games on localnet

  for (const game of gamesToRegister) {
    try {
      await program.methods
        .registerGame(
          game.game_id,
          game.name,
          game.min_players,
          game.max_players,
          game.rule_engine_url,
          game.version
        )
        .accounts({
          registry: registryPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()

      console.log(`Game registered: ${game.name} (game_id=${game.game_id})`)
    } catch (err: unknown) {
      // If game already exists, that's fine - check for specific error codes
      const error = err as AnchorError
      const errorCode = error.error?.errorCode?.code

      // GameAlreadyExists is expected if game is already registered
      if (
        errorCode === 'GameAlreadyExists' ||
        error.message?.includes('Game already exists') ||
        error.message?.includes('already in use') ||
        error.message?.includes('0x0')
      ) {
        console.log(`Game ${game.name} already registered`)
        continue
      }

      // Re-throw unexpected errors
      throw err
    }
  }
}
