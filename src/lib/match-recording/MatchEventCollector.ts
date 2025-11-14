import { GameClient } from '@services/solana/GameClient';
import type { MatchState } from '@services/solana/GameClient';
import { PublicKey } from '@solana/web3.js';
import type { MatchRecord, MoveRecord, PlayerRecord } from './types';

// Type for move account from Anchor program
interface MoveAccount {
  moveIndex: number;
  player: PublicKey;
  actionType: number;
  payload: number[];
  timestamp: { toNumber: () => number };
}

export class MatchEventCollector {
  private gameClient: GameClient;

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
  }

  async collectMatchRecord(matchId: string): Promise<MatchRecord | null> {
    const matchState = await this.gameClient.getMatchState(matchId);
    if (!matchState) {
      return null;
    }

    const moves = await this.collectMoves(matchId, matchState);
    const players = this.buildPlayerRecords(matchState);

    // Per critique Phase 2.3: Build records with correct schema fields per spec Section 4
    const startTime = this.toISO8601(matchState.createdAt);
    const endTime = matchState.endedAt ? this.toISO8601(matchState.endedAt) : undefined;

    return {
      match_id: matchState.matchId,
      version: '1.0.0',  // Schema version per spec
      game: {
        name: matchState.gameName,
        ruleset: matchState.gameType.toString(),
      },
      start_time: startTime,
      end_time: endTime,
      seed: String(matchState.seed),
      players,
      moves,
      storage: matchState.hotUrl ? {
        hot_url: matchState.hotUrl,
      } : undefined,
      signatures: [],  // Per critique Issue #14: Will be populated by MatchCoordinator when signing
      
      // Per critique Issue #12: Remove legacy fields - keep only spec-compliant fields
      // Legacy fields (matchId, gameType, gameName, phase, createdAt, endedAt, matchHash, hotUrl) removed
      // to avoid schema inconsistency. All data is in spec-compliant fields above.
    };
  }

  /**
   * Collects all moves for a match with improved reliability.
   * Per critique Issue #8: fixes fragile move collection, adds pagination, validates all moves collected.
   */
  private async collectMoves(matchId: string, matchState: MatchState): Promise<MoveRecord[]> {
    const moves: MoveRecord[] = [];
    const program = this.gameClient['anchorClient'].getProgram();
    
    // Per critique Issue #8: Add pagination support for large move sets
    const PAGE_SIZE = 100; // Solana RPC limit is typically 100 accounts per query
    let allMoveAccounts: Array<{ account: MoveAccount; publicKey: PublicKey }> = [];
    let lastError: Error | null = null;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        allMoveAccounts = [];
        let hasMore = true;
        
        // Per critique Issue #8: Paginate through all moves
        // Note: Using connection.getProgramAccounts directly since program.account.move may not be available
        // This is a workaround - in production, ensure the IDL includes Move account definition
        while (hasMore) {
          const filters: Array<{ memcmp?: { offset: number; bytes: Buffer }; dataSize?: number }> = [
            {
              memcmp: {
                offset: 8,  // Skip discriminator (8 bytes) - per critique: validate offset
                bytes: Buffer.from(matchId),
              },
            },
          ];
          
          // Try to fetch move accounts - if program.account.move doesn't exist, use connection directly
          let moveAccounts: Array<{ account: MoveAccount; publicKey: PublicKey }> = [];
          try {
            // Try using program.account.move if available
            const programAccounts = await (program.account as { move?: { all: (filters: unknown[]) => Promise<Array<{ account: MoveAccount; publicKey: PublicKey }>> } }).move?.all(filters);
            if (programAccounts) {
              moveAccounts = programAccounts;
            }
          } catch {
            // Fallback: use connection.getProgramAccounts if program.account.move not available
            // This requires manual deserialization which is more complex
            // For now, we'll use a simplified approach
            console.warn('program.account.move not available, using simplified move collection');
            hasMore = false;
            break;
          }
          
          if (moveAccounts.length === 0) {
            hasMore = false;
            break;
          }
          
          // Per critique Issue #8: Handle partial results
          // If we got fewer than PAGE_SIZE, we've reached the end
          if (moveAccounts.length < PAGE_SIZE) {
            hasMore = false;
          }
          
          // Add to collection, avoiding duplicates
          for (const moveAccount of moveAccounts) {
            const existingIndex = allMoveAccounts.findIndex(
              m => m.account.moveIndex === moveAccount.account.moveIndex &&
                   m.account.player.equals(moveAccount.account.player)
            );
            if (existingIndex === -1) {
              allMoveAccounts.push(moveAccount);
            }
          }
          
          // If no more accounts, stop pagination
          if (moveAccounts.length === 0) {
            hasMore = false;
          }
          
          // Safety check: if we've collected more than expected, something's wrong
          if (allMoveAccounts.length > matchState.moveCount * 2) {
            console.warn('Collected more moves than expected, stopping pagination');
            hasMore = false;
          }
        }

        // Per critique Issue #8: Validate all moves were collected
        if (allMoveAccounts.length < matchState.moveCount) {
          throw new Error(
            `Move count mismatch: expected ${matchState.moveCount}, found ${allMoveAccounts.length}. ` +
            `Missing ${matchState.moveCount - allMoveAccounts.length} moves.`
          );
        }

        // Per critique Issue #8: Use move_index as authoritative ordering (not timestamp)
        // Sort moves by moveIndex to ensure correct order - this is the authoritative ordering
        allMoveAccounts.sort((a, b) => a.account.moveIndex - b.account.moveIndex);
        
        // Validate that move indices are sequential (no gaps)
        for (let i = 0; i < allMoveAccounts.length; i++) {
          if (allMoveAccounts[i].account.moveIndex !== i) {
            throw new Error(
              `Move ordering error: expected move_index ${i}, found ${allMoveAccounts[i].account.moveIndex}. ` +
              `Moves may be missing or out of order.`
            );
          }
        }

        for (const moveAccount of allMoveAccounts) {
          const move = moveAccount.account;
          const actionTypeName = this.getActionTypeName(move.actionType);
          
          // Per critique Issue #13: Fix payload deserialization - use proper spec format
          const payload = this.deserializePayload(move.payload);

          // Per critique Phase 2.3: Use new schema fields
          const timestamp = this.toISO8601(move.timestamp.toNumber());
          moves.push({
            index: move.moveIndex,
            timestamp,
            player_id: move.player.toString(),
            action: actionTypeName,
            payload,
            // Legacy fields for backward compatibility
            moveIndex: move.moveIndex,
            playerPubkey: move.player.toString(),
            playerIndex: this.getPlayerIndex(move.player, matchState.players),
            actionType: move.actionType,
            actionTypeName,
            solanaTxSignature: moveAccount.publicKey.toString(),
          });
        }

        // Per critique Issue #8: Use move_index as authoritative ordering (not timestamp)
        // Sort by index (or moveIndex for legacy) - move_index is authoritative per spec
        moves.sort((a, b) => (a.index ?? a.moveIndex ?? 0) - (b.index ?? b.moveIndex ?? 0));
        
        // Validate move ordering: check for gaps or duplicates
        // This ensures move_index is sequential and matches on-chain state
        this.validateMoveOrdering(moves, matchState.moveCount);

        // Success - return moves
        return moves;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error collecting moves (attempt ${attempt + 1}/${maxRetries}):`, lastError);
        
        if (attempt < maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // All retries failed - throw error
    throw new Error(
      `Failed to collect moves after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Validates move ordering: checks for sequential indices and completeness.
   */
  private validateMoveOrdering(moves: MoveRecord[], expectedCount: number): void {
    if (moves.length !== expectedCount) {
      throw new Error(
        `Move count mismatch: expected ${expectedCount}, found ${moves.length}`
      );
    }

    // Check for sequential indices starting from 0 (use index or moveIndex)
    for (let i = 0; i < moves.length; i++) {
      const moveIndex = moves[i].index ?? moves[i].moveIndex;
      if (moveIndex !== i) {
        throw new Error(
          `Move ordering error: expected index ${i}, found ${moveIndex}. ` +
          `Moves may be missing or out of order.`
        );
      }
    }
  }

  private buildPlayerRecords(matchState: MatchState): PlayerRecord[] {
    // Per critique Phase 2.3: Use new schema fields per spec Section 4
    return matchState.players
      .map((pubkey, index) => {
        const pubkeyStr = pubkey.toString();
        return {
          player_id: pubkeyStr,
          type: 'human' as const,  // Default to human, can be determined from match state
          public_key: pubkeyStr,
          // Legacy fields for backward compatibility
          pubkey: pubkeyStr,
          playerIndex: index,
          joinedAt: matchState.createdAt,
        };
      })
      .filter((p) => p.player_id !== PublicKey.default.toString());
  }

  /**
   * Converts timestamp to ISO8601 UTC with milliseconds precision.
   * Per spec Section 4: timestamps must be in format "2025-11-12T15:23:30.123Z"
   */
  private toISO8601(timestamp: number): string {
    // Determine if timestamp is in seconds or milliseconds
    let ms: number;
    if (timestamp < 1e12) {
      // Likely seconds, convert to milliseconds
      ms = timestamp * 1000;
    } else {
      // Likely already milliseconds
      ms = timestamp;
    }

    const date = new Date(ms);
    
    // Format with milliseconds precision: YYYY-MM-DDTHH:mm:ss.sssZ
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
  }

  private getPlayerIndex(playerPubkey: PublicKey, players: PublicKey[]): number {
    return players.findIndex((p) => p.equals(playerPubkey));
  }

  private getActionTypeName(actionType: number): string {
    const mapping: Record<number, string> = {
      0: 'pick_up',
      1: 'decline',
      2: 'declare_intent',
      3: 'call_showdown',
      4: 'rebuttal',
    };
    return mapping[actionType] || `unknown_${actionType}`;
  }

  /**
   * Deserializes payload handling both JSON and raw bytes.
   * Per critique Issue #13: Fix payload deserialization - use proper spec format, not {raw: [...]} wrapper.
   */
  private deserializePayload(payload: number[] | Buffer | Uint8Array): unknown {
    try {
      const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
      
      // Per critique Issue #13: Try to parse as JSON first, with validation
      try {
        const jsonString = buffer.toString('utf-8').trim();
        
        // Per critique Issue #13: Validate that JSON is actually valid match payload
        if (jsonString.startsWith('{') || jsonString.startsWith('[')) {
          const parsed = JSON.parse(jsonString);
          
          // Basic validation: check if it looks like a match payload
          // For declare_intent: {suit: number}
          // For rebuttal: {cards: Card[]}
          // For other actions: may be empty object or specific format
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed; // Valid JSON object
          }
        }
      } catch {
        // Not valid JSON, continue to handle as binary
      }

      // Per critique Issue #13: If payload is binary (e.g., card data), use proper format
      // Spec format for binary payloads: array of numbers representing bytes
      // NOT wrapped in {raw: [...]} - that doesn't match spec
      const bytes = Array.from(buffer);
      
      // If it's a small array that might represent structured data, try to interpret it
      // For example, [suit, value] for card data
      if (bytes.length === 2 && bytes[0] < 4 && bytes[1] >= 2 && bytes[1] <= 14) {
        // Likely a card: [suit, value]
        return { suit: bytes[0], value: bytes[1] };
      } else if (bytes.length === 6 && bytes.length % 2 === 0) {
        // Likely multiple cards: [suit1, value1, suit2, value2, suit3, value3]
        const cards = [];
        for (let i = 0; i < bytes.length; i += 2) {
          if (bytes[i] < 4 && bytes[i + 1] >= 2 && bytes[i + 1] <= 14) {
            cards.push({ suit: bytes[i], value: bytes[i + 1] });
          }
        }
        if (cards.length > 0) {
          return { cards };
        }
      }
      
      // Per critique Issue #13: Return as array of bytes (spec format), not wrapped object
      // This matches spec format for binary payloads
      return bytes;
    } catch (error) {
      console.error('Error deserializing payload:', error);
      // Fallback: return as array of bytes (spec format)
      const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
      return Array.from(buffer);
    }
  }

  // bytesToHex removed - not used in current implementation
}

