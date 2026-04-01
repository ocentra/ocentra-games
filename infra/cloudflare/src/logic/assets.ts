import { HttpStatus, CacheControl } from '@ocentra/endpoint-domain/constants/http';

export interface AssetStorage {
  list(options: {
    prefix?: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    objects: Array<{ key: string }>;
    truncated: boolean;
    cursor?: string;
  }>;
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
    httpEtag?: string;
  } | null>;
  head(key: string): Promise<{
    httpMetadata?: { contentType?: string };
    httpEtag?: string;
  } | null>;
  put(key: string, body: ArrayBuffer, options?: {
    httpMetadata?: {
      contentType: string;
      cacheControl?: string;
    };
  }): Promise<void>;
}

export interface ListAssetsInput {
  prefix?: string;
  limit: number;
  cursor?: string;
}

export interface ListAssetsResult {
  success: boolean;
  objects: Array<{ key: string }>;
  truncated: boolean;
  cursor?: string;
  error?: string;
}

export async function listAssetsLogic(
  input: ListAssetsInput,
  storage: AssetStorage
): Promise<ListAssetsResult> {
  try {
    const result = await storage.list({
      prefix: input.prefix,
      limit: input.limit,
      cursor: input.cursor,
    });

    return {
      success: true,
      objects: result.objects,
      truncated: result.truncated,
      cursor: result.cursor,
    };
  } catch (error) {
    return {
      success: false,
      objects: [],
      truncated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface GetAssetInput {
  rawPath: string;
  getContentType: (path: string) => string;
}

export interface GetAssetResult {
  success: boolean;
  asset?: {
    body: ReadableStream;
    contentType: string;
    etag?: string;
  };
  error?: string;
  statusCode?: number;
}

export async function getAssetLogic(
  input: GetAssetInput,
  storage: AssetStorage
): Promise<GetAssetResult> {
  try {
    let object = await storage.get(input.rawPath);

    if (!object && /^[0-9a-f]{64}$/i.test(input.rawPath)) {
      object = await storage.get(input.rawPath);
    }

    if (!object && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.rawPath)) {
      object = await storage.get(input.rawPath);
    }

    if (!object) {
      return {
        success: false,
        error: `Asset not found: ${input.rawPath}`,
        statusCode: HttpStatus.NotFound,
      };
    }

    const contentType = object.httpMetadata?.contentType || input.getContentType(input.rawPath);

    return {
      success: true,
      asset: {
        body: object.body,
        contentType,
        etag: object.httpEtag,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      statusCode: HttpStatus.InternalServerError,
    };
  }
}

export interface UploadAssetInput {
  body: ArrayBuffer;
  contentType: string;
  rawPath: string;
  extractGuid: (text: string) => Promise<string | null>;
  computeChecksum: (data: ArrayBuffer) => Promise<string>;
  isJsonOrAsset: boolean;
}

export interface UploadAssetResult {
  success: boolean;
  storageKey?: string;
  responseIdentifier?: string;
  deduplicated?: boolean;
  error?: string;
}

export async function uploadAssetLogic(
  input: UploadAssetInput,
  storage: AssetStorage
): Promise<UploadAssetResult> {
  try {
    let storageKey: string;
    let responseIdentifier: string;
    let deduplicated = false;

    if (input.isJsonOrAsset) {
      const text = new TextDecoder().decode(input.body);
      const extractedGuid = await input.extractGuid(text);
      if (extractedGuid) {
        storageKey = extractedGuid;
        responseIdentifier = extractedGuid;
        const existing = await storage.head(storageKey);
        if (existing) {
          const existingObj = await storage.get(storageKey);
          if (existingObj) {
            const existingBody = await new Response(existingObj.body).arrayBuffer();
            const existingChecksum = await input.computeChecksum(existingBody);
            const newChecksum = await input.computeChecksum(input.body);
            if (existingChecksum === newChecksum) {
              deduplicated = true;
            }
          }
        }
      } else {
        storageKey = await input.computeChecksum(input.body);
        responseIdentifier = storageKey;
        const existing = await storage.head(storageKey);
        if (existing) {
          deduplicated = true;
        }
      }
    } else {
      storageKey = await input.computeChecksum(input.body);
      responseIdentifier = storageKey;
      const existing = await storage.head(storageKey);
      if (existing) {
        deduplicated = true;
      }
    }

    if (!deduplicated) {
      await storage.put(storageKey, input.body, {
        httpMetadata: {
          contentType: input.contentType,
          cacheControl: CacheControl.PublicImmutable,
        },
      });
    }

    return {
      success: true,
      storageKey,
      responseIdentifier,
      deduplicated,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
