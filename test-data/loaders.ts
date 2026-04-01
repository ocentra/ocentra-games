/**
 * Shared test data loaders.
 * Loads canonical test data that flows through the entire system:
 * Game → Solana → Cloudflare → Tests
 * 
 * This ensures E2E tests use the SAME data across all layers.
 */

import type { MatchRecord } from '@ocentra/verification-domain/types';
import * as fs from 'fs';
import * as path from 'path';

// Since this file is in test-data/, __dirname already points to test-data directory
const TEST_DATA_DIR = __dirname;

/**
 * Load a canonical match record from test-data/matches/
 */
export function loadMatchRecord(name: string): MatchRecord {
  const filePath = path.join(TEST_DATA_DIR, 'matches', `${name}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as MatchRecord;
}

/**
 * Load leaderboard entries from test-data/leaderboard/
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadLeaderboardEntries(_gameType: number = 0): any[] {
  // _gameType is reserved for future use (filtering by game type)
  void _gameType;
  const filePath = path.join(TEST_DATA_DIR, 'leaderboard', `claim-top100.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  return data.entries || [];
}

/**
 * Load user data from test-data/users/
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadUserData(userId: string): any {
  const filePath = path.join(TEST_DATA_DIR, 'users', 'sample-users.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.users.find((u: any) => u.user_id === userId);
}

/**
 * Load all users from test-data/users/
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadAllUsers(): any[] {
  const filePath = path.join(TEST_DATA_DIR, 'users', 'sample-users.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  return data.users || [];
}

/**
 * Load game registry from test-data/games/
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadGameRegistry(): any[] {
  const filePath = path.join(TEST_DATA_DIR, 'games', 'registry.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  return data.games || [];
}

/**
 * Load dispute data from test-data/disputes/
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadDisputeData(name: string = 'sample-dispute'): any {
  const filePath = path.join(TEST_DATA_DIR, 'disputes', `${name}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Generate full leaderboard (100 entries) using shared base data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateFullLeaderboard(baseEntries: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullEntries: any[] = [];
  const baseCount = baseEntries.length;
  
  // Use base entries
  fullEntries.push(...baseEntries);
  
  // Generate remaining entries to reach 100
  for (let i = baseCount; i < 100; i++) {
    const baseEntry = baseEntries[i % baseCount];
    fullEntries.push({
      user_id: `user-${i.toString().padStart(3, '0')}`,
      score: baseEntry.score - ((i - baseCount) * 50),
      wins: Math.floor(Math.random() * 100),
      games_played: Math.floor(Math.random() * 500) + 10,
      timestamp: baseEntry.timestamp - Math.floor(Math.random() * 86400 * 30),
    });
  }
  
  // Sort by score descending
  fullEntries.sort((a, b) => b.score - a.score);
  
  return fullEntries;
}

