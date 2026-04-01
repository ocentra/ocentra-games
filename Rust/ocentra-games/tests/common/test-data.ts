// Test data access utilities - applies to all games

import {
  loadMatchRecord,
  loadGameRegistry,
  loadAllUsers,
  getMatchHash,
  parseSeed,
  type GameDefinition,
} from '@/test-data'

// Counter to ensure unique match IDs even with same suffix
let matchIdCounter = 0

// Load test data ONCE at module level
export const testMatchRecord = loadMatchRecord('claim-4player-complete')
export const testGameRegistry = loadGameRegistry()
export const testUsers = loadAllUsers()

// Get real match ID from test data (base match ID)
export const getTestMatchId = (): string => {
  return testMatchRecord.match_id
}

// Generate unique match ID for tests
// IMPORTANT: Result must be exactly 36 characters (UUID v4 format)
// IMPORTANT: First 31 bytes must be unique to avoid PDA collisions
export const generateUniqueMatchId = (suffix: string = ''): string => {
  // Increment counter for uniqueness
  matchIdCounter++

  // Generate unique data: timestamp + counter + suffix + random + process time
  const timestamp = Date.now()
  const random = Math.random()
  const uniqueData = `${timestamp}-${matchIdCounter}-${suffix}-${random}-${process.hrtime.bigint()}`

  // Create hash from unique data
  let hash = 0
  for (let i = 0; i < uniqueData.length; i++) {
    const char = uniqueData.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Generate multiple hash values to ensure uniqueness
  const h1 = Math.abs(hash).toString(16).padStart(8, '0')
  const h2 = Math.abs(hash * 31 + matchIdCounter)
    .toString(16)
    .padStart(8, '0')
  const h3 = Math.abs(hash * 17 + timestamp)
    .toString(16)
    .padStart(8, '0')
  const h4 = Math.abs(hash * 7 + Math.floor(random * 1000000))
    .toString(16)
    .padStart(8, '0')

  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)
  // First 31 chars: xxxxxxxx-xxxx-xxxx-xxxx-xxx (positions 0-30)
  // Build UUID ensuring first 31 chars are unique by using different hash parts
  const part1 = h1 // 8 chars: positions 0-7
  const part2 = h2.slice(0, 4) // 4 chars: positions 9-12
  const part3 = h3.slice(0, 4) // 4 chars: positions 14-17
  const part4 = h4.slice(0, 4) // 4 chars: positions 19-22
  const part5a = h1.slice(4, 7) // 3 chars: positions 24-26
  const part5b = h2.slice(4, 8) // 4 chars: positions 27-30 (completes first 31)
  const part5c = h3.slice(4, 8) // 4 chars: positions 31-34
  const part5d = h4.slice(4, 5) // 1 char: position 35

  const result = `${part1}-${part2}-${part3}-${part4}-${part5a}${part5b}${part5c}${part5d}`

  // Final validation: must be exactly 36 characters
  if (result.length !== 36) {
    throw new Error(
      `Generated match_id is ${result.length} characters, must be 36`
    )
  }

  // Log the generated match ID for debugging
  const first31Bytes = Buffer.from(result, 'utf-8').slice(0, 31)
  console.log(`[generateUniqueMatchId] Generated match_id: ${result}`)
  console.log(
    `[generateUniqueMatchId] Counter: ${matchIdCounter}, Suffix: "${suffix}"`
  )
  console.log(
    `[generateUniqueMatchId] First 31 bytes (for PDA): ${first31Bytes.toString('hex')} (${first31Bytes.length} bytes)`
  )
  console.log(
    `[generateUniqueMatchId] First 31 chars: ${result.substring(0, 31)}`
  )

  return result
}

// Get real user IDs from test data
export const getTestUserIds = (): string[] => {
  return testMatchRecord.players.map(p => p.player_id)
}

// Get real user ID by index
export const getTestUserId = (index: number): string => {
  return (
    testMatchRecord.players[index]?.player_id ||
    testMatchRecord.players[0].player_id
  )
}

// Get real game definition from test data
export const getTestGame = (gameId: number): GameDefinition | undefined => {
  return testGameRegistry.find(g => g.game_id === gameId)
}

// Get real seed from test data
export const getTestSeed = (): number => {
  return parseSeed(testMatchRecord.seed)
}

// Get real match hash from test data
export const getTestMatchHash = (): Buffer => {
  return getMatchHash(testMatchRecord)
}

// Get real hot URL from test data
export const getTestHotUrl = (): string => {
  return (
    testMatchRecord.storage?.hot_url ||
    `https://r2.example.com/matches/${testMatchRecord.match_id}.json`
  )
}
