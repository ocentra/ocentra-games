// PDA derivation helpers - applies to all games

import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { program } from './setup'

// Helper to get match PDA
// Note: match_id is 36 bytes (UUID), but Solana seeds have 32-byte limit per seed
// Total seeds length must be <= 32 bytes, so we use "m" (1 byte) + first 31 bytes of match_id
// "m" (1 byte) + truncated match_id (31 bytes) = 32 bytes total
export const getMatchPDA = async (
  matchId: string
): Promise<[PublicKey, number]> => {
  const matchIdBytes = Buffer.from(matchId, 'utf-8')
  const truncated = matchIdBytes.slice(0, 31) // Truncate to 31 bytes
  const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('m'), truncated],
    program.programId
  )
  console.log(`[getMatchPDA] match_id: ${matchId}`)
  console.log(
    `[getMatchPDA] match_id bytes: ${matchIdBytes.length}, truncated: ${truncated.length}`
  )
  console.log(`[getMatchPDA] PDA: ${pda.toString()}, bump: ${bump}`)
  return [pda, bump]
}

// Helper to get GameRegistry PDA
export const getRegistryPDA = async (): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('game_registry')],
    program.programId
  )
}

// Helper to get ConfigAccount PDA
export const getConfigAccountPDA = async (): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('config_account')],
    program.programId
  )
}

// Helper to get move PDA (uses split seeds to match on-chain: first32 + rest)
// Common for all games - game-specific move logic is handled in instruction handlers
export const getMovePDA = async (
  matchId: string,
  player: PublicKey,
  nonce: anchor.BN
): Promise<[PublicKey, number]> => {
  const matchIdBytes = Buffer.from(matchId, 'utf-8')
  const first32 = matchIdBytes.slice(0, Math.min(32, matchIdBytes.length))
  const rest = matchIdBytes.slice(Math.min(32, matchIdBytes.length))
  // Rust uses nonce.to_le_bytes() which always produces 8 bytes for u64
  // Ensure nonce is always 8 bytes in little-endian format
  const nonceBuffer = Buffer.allocUnsafe(8)
  nonceBuffer.writeBigUInt64LE(BigInt(nonce.toString()), 0)
  const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('move'), first32, rest, player.toBuffer(), nonceBuffer],
    program.programId
  )
  console.log(`[getMovePDA] match_id: ${matchId}`)
  console.log(
    `[getMovePDA] player: ${player.toString()}, nonce: ${nonce.toString()}`
  )
  console.log(
    `[getMovePDA] match_id first32: ${first32.toString('hex')}, rest: ${rest.toString('hex')}`
  )
  console.log(`[getMovePDA] PDA: ${pda.toString()}, bump: ${bump}`)
  return [pda, bump]
}

// Helper to get batch move PDA (uses index instead of nonce; matchId split into two seeds)
// Common for all games - game-specific batch move logic is handled in instruction handlers
export const getBatchMovePDA = async (
  matchId: string,
  player: PublicKey,
  index: number
): Promise<[PublicKey, number]> => {
  const matchIdBytes = Buffer.from(matchId, 'utf-8')
  const first32 = matchIdBytes.slice(0, Math.min(32, matchIdBytes.length))
  const rest = matchIdBytes.slice(Math.min(32, matchIdBytes.length))
  const indexBuffer = Buffer.alloc(4)
  indexBuffer.writeUInt32LE(index, 0)
  const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('move'), first32, rest, player.toBuffer(), indexBuffer],
    program.programId
  )
  console.log(`[getBatchMovePDA] match_id: ${matchId}, index: ${index}`)
  console.log(`[getBatchMovePDA] player: ${player.toString()}`)
  console.log(
    `[getBatchMovePDA] match_id first32: ${first32.toString('hex')}, rest: ${rest.toString('hex')}`
  )
  console.log(`[getBatchMovePDA] PDA: ${pda.toString()}, bump: ${bump}`)
  return [pda, bump]
}

// Phase 02: Helper to get EscrowAccount PDA
// Seeds: ["escrow", matchPDA]
export const getEscrowPDA = async (
  matchPDA: PublicKey
): Promise<[PublicKey, number]> => {
  const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('escrow'), matchPDA.toBuffer()],
    program.programId
  )
  return [pda, bump]
}

// Phase 02: Helper to get UserDepositAccount PDA
// Seeds: ["user_deposit", authority]
export const getUserDepositPDA = async (
  authority: PublicKey
): Promise<[PublicKey, number]> => {
  const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('user_deposit'), authority.toBuffer()],
    program.programId
  )
  return [pda, bump]
}
