/**
 * Test data loader for Rust/Anchor tests.
 * Loads canonical test data from test-data/ directory.
 *
 * This ensures tests use REAL data, not mocks/stubs.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// Path from Rust/ocentra-games/tests/ to test-data/ at root
const TEST_DATA_DIR = path.join(__dirname, '../../../test-data')

export interface MatchRecord {
  match_id: string
  version: string
  game: {
    name: string
    ruleset: string
  }
  start_time: string
  end_time: string
  seed: string
  players: Array<{
    player_id: string
    type: string
    public_key: string
    metadata?: {
      display_name?: string
      avatar_url?: string
    }
  }>
  moves: Array<{
    index: number
    timestamp: string
    player_id: string
    action: string
    payload: unknown
  }>
  storage?: {
    hot_url?: string
  }
  signatures?: Array<{
    signer: string
    sig_type: string
    signature: string
    signed_at: string
  }>
}

export interface GameDefinition {
  game_id: number
  name: string
  min_players: number
  max_players: number
  rule_engine_url: string
  version: number
  enabled: number
}

export interface UserData {
  user_id: string
  total_games: number
  wins: number
  losses: number
  win_streak: number
  total_score: number
  game_points: number
  ai_credits: number
  subscription_tier: number
  current_tier: number
  active_multiplier: number
  last_daily_login: number
  last_ad_watch: number
}

/**
 * Load a canonical match record from test-data/matches/
 */
export function loadMatchRecord(name: string): MatchRecord {
  const filePath = path.join(TEST_DATA_DIR, 'matches', `${name}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${filePath}`)
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as MatchRecord
}

/**
 * Load game registry from test-data/games/
 */
export function loadGameRegistry(): GameDefinition[] {
  const filePath = path.join(TEST_DATA_DIR, 'games', 'registry.json')
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${filePath}`)
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(content)
  return data.games || []
}

/**
 * Load all users from test-data/users/
 */
export function loadAllUsers(): UserData[] {
  const filePath = path.join(TEST_DATA_DIR, 'users', 'sample-users.json')
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${filePath}`)
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(content)
  return data.users || []
}

/**
 * Load a specific user by user_id
 */
export function loadUser(userId: string): UserData | undefined {
  const users = loadAllUsers()
  return users.find(u => u.user_id === userId)
}

/**
 * Get match hash from match record (for testing anchor_match_record)
 */
export function getMatchHash(matchRecord: MatchRecord): Buffer {
  // In production, this would be the canonical hash of the match record
  // For tests, we'll use a deterministic hash based on match_id
  return crypto.createHash('sha256').update(matchRecord.match_id).digest()
}

/**
 * Convert match record seed string to u64
 */
export function parseSeed(seed: string): number {
  // Parse seed string to number (handle both string and number formats)
  const parsed = parseInt(seed, 10)
  if (isNaN(parsed)) {
    // If not a number, hash it to get a deterministic number
    const hash = crypto.createHash('sha256').update(seed).digest()
    return hash.readUInt32LE(0)
  }
  return parsed
}
