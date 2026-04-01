import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';

export interface ArchiveStorage {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, body: string, options?: { httpMetadata?: { contentType: string } }): Promise<void>;
}

export interface ArchiveInput {
  matchId: MatchId;
  sourceKey: string;
  archiveKey: string;
}

export interface ArchiveResult {
  success: boolean;
  matchId: MatchId;
  archivedAt: string;
  error?: string;
}

export async function archiveMatchLogic(
  input: ArchiveInput,
  storage: ArchiveStorage
): Promise<ArchiveResult> {
  try {
    const object = await storage.get(input.sourceKey);
    if (!object) {
      return {
        success: false,
        matchId: input.matchId,
        archivedAt: new Date().toISOString(),
        error: 'Match not found',
      };
    }

    const body = await object.text();
    await storage.put(input.archiveKey, body, {
      httpMetadata: {
        contentType: HttpContentType.ApplicationJson,
      },
    });

    return {
      success: true,
      matchId: input.matchId,
      archivedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      matchId: input.matchId,
      archivedAt: new Date().toISOString(),
      error: String(error),
    };
  }
}
