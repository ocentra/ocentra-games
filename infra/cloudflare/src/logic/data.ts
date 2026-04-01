import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';

export interface DataStorage {
  list(options: { prefix: string }): Promise<{
    objects: Array<{ key: string }>;
  }>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  delete(key: string): Promise<void>;
}

export interface ExportDataInput {
  userId: string;
}

export interface ExportDataResult {
  user_id: string;
  matches: unknown[];
  disputes: unknown[];
  exported_at: string;
  error?: string;
}

export async function exportUserDataLogic(
  input: ExportDataInput,
  storage: DataStorage
): Promise<ExportDataResult> {
  try {
    const matches: unknown[] = [];
    const disputes: unknown[] = [];

    const listResult = await storage.list({ prefix: BucketPath.Matches });

    for (const key of listResult.objects) {
      try {
        const object = await storage.get(key.key);
        if (object) {
          const text = await object.text();
          if (!text || text.trim().length === 0) {
            continue;
          }
          try {
            const matchRecord = JSON.parse(text);
            const isPlayer = matchRecord.players?.some((p: { player_id?: string; public_key?: string; pubkey?: string }) =>
              p.player_id === input.userId || p.public_key === input.userId || p.pubkey === input.userId
            );
            if (isPlayer) {
              matches.push(matchRecord);
            }
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    try {
      const disputeListResult = await storage.list({ prefix: BucketPath.Disputes });
      for (const key of disputeListResult.objects) {
        try {
          const object = await storage.get(key.key);
          if (object) {
            const text = await object.text();
            if (!text || text.trim().length === 0) {
              continue;
            }
            try {
              const dispute = JSON.parse(text) as Record<string, unknown>;
              const disputeUserId = dispute.user_id as string | undefined;
              const disputeMatchId = dispute.match_id as string | undefined;
              if (disputeUserId === input.userId || (disputeMatchId && matches.some((m: unknown) => {
                const match = m as { match_id?: string };
                return match.match_id === disputeMatchId;
              }))) {
                disputes.push(dispute);
              }
            } catch {
              continue;
            }
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      throw new Error(`Failed to list disputes: ${String(error)}`);
    }

    return {
      user_id: input.userId,
      matches,
      disputes,
      exported_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      user_id: input.userId,
      matches: [],
      disputes: [],
      exported_at: new Date().toISOString(),
      error: String(error),
    };
  }
}

export interface DeleteDataInput {
  userId: string;
}

export interface DeleteDataResult {
  success: boolean;
  deleted_items: {
    matches: number;
    disputes: number;
    evidence: number;
  };
  deleted_at: string;
  error?: string;
}

export async function deleteUserDataLogic(
  input: DeleteDataInput,
  storage: DataStorage
): Promise<DeleteDataResult> {
  try {
    const deletedMatches: string[] = [];
    const deletedDisputes: string[] = [];
    const deletedEvidence: string[] = [];

    const listResult = await storage.list({ prefix: BucketPath.Matches });
    for (const key of listResult.objects) {
      try {
        const object = await storage.get(key.key);
        if (object) {
          const text = await object.text();
          if (!text || text.trim().length === 0) {
            continue;
          }
          try {
            const matchRecord = JSON.parse(text);
            const isPlayer = matchRecord.players?.some((p: { player_id?: string; public_key?: string; pubkey?: string }) =>
              p.player_id === input.userId || p.public_key === input.userId || p.pubkey === input.userId
            );
            if (isPlayer) {
              try {
                await storage.delete(key.key);
                deletedMatches.push(matchRecord.match_id || matchRecord.matchId || key.key);
              } catch (deleteError) {
                throw new Error(`Failed to delete match ${key.key}: ${String(deleteError)}`);
              }
            }
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message.includes('Failed to delete match')) {
              throw parseError;
            }
            continue;
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Failed to delete match')) {
          throw error;
        }
        continue;
      }
    }

    try {
      const disputeListResult = await storage.list({ prefix: BucketPath.Disputes });
      for (const key of disputeListResult.objects) {
        try {
          const object = await storage.get(key.key);
          if (object) {
            const text = await object.text();
            if (!text || text.trim().length === 0) {
              continue;
            }
            try {
              const dispute = JSON.parse(text);
              if (dispute.user_id === input.userId) {
                try {
                  await storage.delete(key.key);
                  deletedDisputes.push(dispute.dispute_id || key.key);
                } catch (deleteError) {
                  throw new Error(`Failed to delete dispute ${key.key}: ${String(deleteError)}`);
                }
              }
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message.includes('Failed to delete dispute')) {
                throw parseError;
              }
              continue;
            }
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('Failed to delete dispute')) {
            throw error;
          }
          continue;
        }
      }
    } catch (error) {
      throw new Error(`Failed to list disputes: ${String(error)}`);
    }

    try {
      const evidenceListResult = await storage.list({ prefix: BucketPath.DisputesEvidence });
      for (const key of evidenceListResult.objects) {
        if (deletedDisputes.some(d => key.key.includes(d))) {
          try {
            await storage.delete(key.key);
            deletedEvidence.push(key.key);
          } catch (error) {
            throw new Error(`Failed to delete evidence ${key.key}: ${String(error)}`);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to list evidence: ${String(error)}`);
    }

    return {
      success: true,
      deleted_items: {
        matches: deletedMatches.length,
        disputes: deletedDisputes.length,
        evidence: deletedEvidence.length,
      },
      deleted_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      deleted_items: {
        matches: 0,
        disputes: 0,
        evidence: 0,
      },
      deleted_at: new Date().toISOString(),
      error: String(error),
    };
  }
}
