// Main helpers.ts - re-exports from organized modules
// This file maintains backward compatibility while organizing code properly

// Re-export common utilities
export * from './common'

// Re-export CLAIM-specific helpers (for now, CLAIM is the only game)
export * from './games/claim/helpers'

// Legacy aliases for backward compatibility
export {
  submitClaimMoveManual as submitMoveManual,
  submitClaimBatchMovesManual as submitBatchMovesManual,
} from './games/claim/helpers'

// Re-export AnchorError for convenience
export { AnchorError } from '@coral-xyz/anchor'

// Import report generator to enable automatic report generation
import './report-generator'
// Import Mocha hooks to automatically capture test results
import './mocha-hooks'

// Legacy exports for backward compatibility
// TODO: Update test files to use organized imports from ./common or ./games/claim
import { loadMatchRecord, loadGameRegistry, loadAllUsers } from '@/test-data'
import { Keypair } from '@solana/web3.js'
import { player1, player2, player3, player4 } from '@/common'

// Map test users to Keypairs (legacy)
export const testMatchRecord = loadMatchRecord('claim-4player-complete')
export const testGameRegistry = loadGameRegistry()
export const testUsers = loadAllUsers()

// Map real user IDs from test data to our test keypairs (legacy)
export const userKeypairMap: Map<string, Keypair> = new Map([
  [testMatchRecord.players[0].player_id, player1],
  [testMatchRecord.players[1].player_id, player2],
  [testMatchRecord.players[2].player_id, player3],
  [testMatchRecord.players[3].player_id, player4],
])
