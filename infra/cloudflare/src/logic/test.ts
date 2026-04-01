export interface TestStorage {
  list(options: {
    prefix: string;
    cursor?: string;
  }): Promise<{
    objects: Array<{ key: string }>;
    truncated: boolean;
    cursor?: string;
  }>;
  delete(key: string): Promise<void>;
}

export interface ClearBucketInput {
  prefixes: string[];
}

export interface ClearBucketResult {
  success: boolean;
  deletedCount: number;
  errorCount: number;
  error?: string;
}

export async function clearBucketLogic(
  input: ClearBucketInput,
  storage: TestStorage
): Promise<ClearBucketResult> {
  let deletedCount = 0;
  let errorCount = 0;

  for (const prefix of input.prefixes) {
    try {
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const listResult = await storage.list({
          prefix,
          ...(cursor ? { cursor } : {}),
        });

        const deletePromises = listResult.objects.map(async (obj) => {
          try {
            await storage.delete(obj.key);
            deletedCount++;
            return true;
          } catch {
            errorCount++;
            return false;
          }
        });

        await Promise.all(deletePromises);

        hasMore = listResult.truncated;
        if (hasMore && 'cursor' in listResult) {
          cursor = listResult.cursor;
        } else {
          hasMore = false;
        }
      }
    } catch {
      errorCount++;
    }
  }

  return {
    success: true,
    deletedCount,
    errorCount,
  };
}
