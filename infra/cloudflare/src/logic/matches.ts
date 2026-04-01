import { HttpStatus, HttpContentType } from '@ocentra/endpoint-domain/constants/http';

export interface MatchStorage {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, body: string, options?: {
    httpMetadata?: {
      contentType: string;
    };
  }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ValidateMatchInput {
  body: string;
  validateMatchRecord: (data: unknown) => { valid: boolean; error?: string };
}

export interface ValidateMatchResult {
  success: boolean;
  matchData?: unknown;
  error?: string;
}

export function validateMatchLogic(
  input: ValidateMatchInput
): ValidateMatchResult {
  try {
    const data = JSON.parse(input.body);
    const validation = input.validateMatchRecord(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid match record',
      };
    }
    return {
      success: true,
      matchData: data,
    };
  } catch (err) {
    return {
      success: false,
      error: `Invalid JSON payload: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

import type { MatchId } from '@ocentra/endpoint-domain/constants/match';

export interface UploadMatchInput {
  matchId: MatchId;
  body: string;
  matchKey: string;
  maxSizeBytes: number;
}

export interface UploadMatchResult {
  success: boolean;
  sizeBytes?: number;
  error?: string;
}

export async function uploadMatchLogic(
  input: UploadMatchInput,
  storage: MatchStorage
): Promise<UploadMatchResult> {
  try {
    const sizeBytes = new TextEncoder().encode(input.body).length;
    if (sizeBytes > input.maxSizeBytes) {
      return {
        success: false,
        error: `Match record too large (max ${input.maxSizeBytes / (1024 * 1024)}MB)`,
      };
    }

    await storage.put(input.matchKey, input.body, {
      httpMetadata: {
        contentType: HttpContentType.ApplicationJson,
      },
    });

    return {
      success: true,
      sizeBytes,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface GetMatchInput {
  matchId: MatchId;
  matchKey: string;
}

export interface GetMatchResult {
  success: boolean;
  matchData?: unknown;
  error?: string;
  statusCode?: number;
}

export async function getMatchLogic(
  input: GetMatchInput,
  storage: MatchStorage
): Promise<GetMatchResult> {
  try {
    const object = await storage.get(input.matchKey);
    if (!object) {
      return {
        success: false,
        error: `Match not found: ${input.matchId}`,
        statusCode: HttpStatus.NotFound,
      };
    }

    const matchData = JSON.parse(await object.text());
    return {
      success: true,
      matchData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      statusCode: HttpStatus.InternalServerError,
    };
  }
}

export interface DeleteMatchInput {
  matchId: MatchId;
  matchKey: string;
}

export interface DeleteMatchResult {
  success: boolean;
  error?: string;
}

export async function deleteMatchLogic(
  input: DeleteMatchInput,
  storage: MatchStorage
): Promise<DeleteMatchResult> {
  try {
    await storage.delete(input.matchKey);
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface AnonymizeMatchInput {
  matchRecord: Record<string, unknown>;
}

export interface AnonymizeMatchResult {
  success: boolean;
  anonymized?: Record<string, unknown>;
  error?: string;
}

export function anonymizeMatchLogic(
  input: AnonymizeMatchInput
): AnonymizeMatchResult {
  try {
    const anonymized: Record<string, unknown> = { ...input.matchRecord };

    // Build a mapping from original player_id to anonymized player_id
    const playerIdMap = new Map<string, string>();

    if (anonymized.players && Array.isArray(anonymized.players)) {
      anonymized.players = (anonymized.players as Array<Record<string, unknown>>).map((player: Record<string, unknown>, index: number) => {
        const originalPlayerId = player.player_id as string | undefined;
        const anonymizedPlayerId = `Player${index + 1}`;

        // Store mapping for event anonymization
        if (originalPlayerId) {
          playerIdMap.set(originalPlayerId, anonymizedPlayerId);
        }

        const anonymizedPlayer: Record<string, unknown> = {
          player_id: anonymizedPlayerId,
          type: player.type,
        };

        const playerPublicKey = player.public_key as string | undefined;
        const playerPubkey = player.pubkey as string | undefined;
        if (playerPublicKey || playerPubkey) {
          const address = playerPublicKey || playerPubkey || '';
          anonymizedPlayer.public_key = `hashed_${address.substring(0, 8)}...`;
        }

        const playerMetadata = player.metadata as Record<string, unknown> | undefined;
        if (playerMetadata) {
          const anonymizedMetadata: Record<string, unknown> = {};
          if (playerMetadata.model_name) {
            anonymizedMetadata.model_name = '[REDACTED]';
          }
          if (playerMetadata.model_id) {
            anonymizedMetadata.model_id = '[REDACTED]';
          }
          anonymizedPlayer.metadata = anonymizedMetadata;
        }

        return anonymizedPlayer;
      });
    }

    if (anonymized.events && Array.isArray(anonymized.events)) {
      anonymized.events = (anonymized.events as Array<Record<string, unknown>>).map((event: Record<string, unknown>) => {
        const anonymizedEvent: Record<string, unknown> = { ...event };
        if (anonymizedEvent.player_id) {
          const eventPlayerId = anonymizedEvent.player_id as string;
          // Look up in our mapping from original to anonymized
          const anonymizedPlayerId = playerIdMap.get(eventPlayerId);
          if (anonymizedPlayerId) {
            anonymizedEvent.player_id = anonymizedPlayerId;
          }
          // If not found in map, leave as-is (unknown player)
        }
        return anonymizedEvent;
      });
    }

    delete anonymized.winner;
    delete anonymized.final_state;
    delete anonymized.coordination_state;

    return {
      success: true,
      anonymized,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface SaveAnonymizedMatchInput {
  anonymizedKey: string;
  anonymizedData: Record<string, unknown>;
}

export interface SaveAnonymizedMatchResult {
  success: boolean;
  error?: string;
}

export async function saveAnonymizedMatchLogic(
  input: SaveAnonymizedMatchInput,
  storage: MatchStorage
): Promise<SaveAnonymizedMatchResult> {
  try {
    await storage.put(input.anonymizedKey, JSON.stringify(input.anonymizedData), {
      httpMetadata: {
        contentType: HttpContentType.ApplicationJson,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
