import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = AssetEditorLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

export interface R2Config {
  workerUrl: string;
  bucketName: string;
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  uploaded: string;
  httpEtag: string;
}

export interface R2ListResponse {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes?: string[];
}

export class R2Service {
  static {
    log.register(import.meta.url);
  }

  private config: R2Config;
  private readonly MAX_SIZE_BYTES = 10 * 1024 * 1024;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(config: R2Config) {
    this.config = config;
  }

  async uploadMatchRecord(matchId: string, canonicalJSON: string): Promise<string> {
    const sizeBytes = new TextEncoder().encode(canonicalJSON).length;
    if (sizeBytes > this.MAX_SIZE_BYTES) {
      throw new Error(
        `Match record exceeds size limit: ${sizeBytes} bytes (max ${this.MAX_SIZE_BYTES} bytes)`
      );
    }

    const url = `${this.config.workerUrl}${ApiEndpoint.Matches.ById(matchId)}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: canonicalJSON,
        });

        if (!response.ok) {
          const isRateLimit = response.status === 429;

          let errorMsg = `${response.status} ${response.statusText}`;
          try {
            const errorText = await response.text();
            if (errorText && errorText !== '[object Blob]') {
              errorMsg = errorText;
            }
          } catch {
            errorMsg = `${response.status} ${response.statusText}`;
          }

          if (isRateLimit) {
            errorMsg = `Rate limit exceeded: ${errorMsg}`;
          }

          throw new Error(`Failed to upload match record: ${errorMsg}`);
        }

        let result: { success?: boolean; matchId?: string; url?: string };

        try {
          const text = await response.text();

          if (text === '[object Blob]' || text.includes('[object')) {
            throw new Error(
              `Worker returned invalid response: "${text}". ` +
              `Worker must return proper JSON with Content-Type: application/json. ` +
              `Check Worker implementation.`
            );
          }

          if (!text || text.trim().length === 0) {
            throw new Error(
              `Worker returned empty response. ` +
              `Expected JSON with {success, matchId, url}. ` +
              `Check Worker implementation.`
            );
          }

          result = JSON.parse(text);

          if (typeof result !== 'object' || result === null) {
            throw new Error(
              `Worker returned invalid JSON structure. ` +
              `Expected object with {success, matchId, url}, got: ${typeof result}`
            );
          }

        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to parse Worker response: ${errMsg}`);
        }

        return result.url || url;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isRateLimit = error instanceof Error && (
          error.message.includes('Rate limit') ||
          error.message.includes('429') ||
          error.message.includes('Too Many Requests')
        );

        if (error instanceof Error && error.message.includes('40') && !isRateLimit) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES - 1) {
          const backoffDelay = isRateLimit
            ? this.RETRY_DELAY_MS * Math.pow(2, attempt + 1) * 2
            : this.RETRY_DELAY_MS * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    throw new Error(
      `Failed to upload match record after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  async getMatchRecord(matchId: string): Promise<string | null> {
    const url = `${this.config.workerUrl}${ApiEndpoint.Matches.ById(matchId)}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
        });

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new Error(`Failed to get match record: ${response.status} ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof Error && (error.message.includes('404') || error.message.includes('40'))) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw new Error(
      `Failed to get match record after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  async generateSignedUrl(matchId: string, expiresIn: number = 3600): Promise<string> {
    const url = `${this.config.workerUrl}${ApiEndpoint.SignedUrl.ByMatchId(matchId)}?expires=${expiresIn}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Failed to generate signed URL: ${response.statusText}`);
    }

    const result = (await response.json()) as { signedUrl: string };
    return result.signedUrl;
  }

  async deleteMatchRecord(matchId: string): Promise<void> {
    const url = `${this.config.workerUrl}${ApiEndpoint.Matches.ById(matchId)}`;

    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete match record: ${response.statusText}`);
    }
  }

  async uploadAssetByGuid(
    guid: string,
    content: ArrayBuffer | Blob | string,
    contentType?: string,
    adminToken?: string,
    walletId?: string
  ): Promise<string> {
    if (!adminToken || !walletId) {
      throw new Error('Admin token and wallet ID required for asset uploads');
    }

    const getUploadUrl = `${this.config.workerUrl}${ApiEndpoint.Resources.Base}?action=get-upload-url&guid=${encodeURIComponent(guid)}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const uploadUrlResponse = await fetch(getUploadUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'X-Wallet-Id': walletId,
          },
        });

        if (!uploadUrlResponse.ok) {
          const errorText = await uploadUrlResponse.text().catch(() => uploadUrlResponse.statusText);
          throw new Error(`Failed to get upload URL: ${uploadUrlResponse.status} ${errorText}`);
        }

        const { uploadUrl } = await uploadUrlResponse.json() as { uploadUrl: string };

        let body: ArrayBuffer;
        if (typeof content === 'string') {
          body = new TextEncoder().encode(content).buffer as ArrayBuffer;
        } else if (content instanceof Blob) {
          body = await content.arrayBuffer();
        } else {
          body = content;
        }

        if (!contentType) {
          contentType = 'application/json';
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
          },
          body,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => uploadResponse.statusText);
          throw new Error(`Failed to upload asset: ${uploadResponse.status} ${errorText}`);
        }

        const result = await uploadResponse.json() as { success?: boolean; guid?: string; path?: string };
        return result.guid || guid;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw new Error(
      `Failed to upload asset after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /** @deprecated Use uploadAssetByGuid instead. This method exists for backward compatibility. */
  async uploadAsset(
    r2Path: string,
    content: ArrayBuffer | Blob | string,
    contentType?: string
  ): Promise<string> {
    const guidMatch = r2Path.match(/assets\/([a-f0-9-]+)\.asset$/i);
    if (guidMatch) {
      throw new Error('Use uploadAssetByGuid() instead of uploadAsset() with GUID-based paths');
    }

    const url = `${this.config.workerUrl}${ApiEndpoint.Assets.ById(r2Path)}`;

    let body: ArrayBuffer;
    if (typeof content === 'string') {
      body = new TextEncoder().encode(content).buffer as ArrayBuffer;
    } else if (content instanceof Blob) {
      body = await content.arrayBuffer();
    } else {
      body = content;
    }

    if (!contentType) {
      const ext = r2Path.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'asset': 'application/json',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
      };
      contentType = contentTypes[ext || ''] || 'application/octet-stream';
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
          },
          body,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Failed to upload asset: ${response.status} ${errorText}`);
        }

        const result = await response.json() as { path?: string };
        if (!result.path) {
          return url;
        }
        const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.path);
        const isHash = /^[0-9a-f]{64}$/i.test(result.path);
        if (isGuid) {
          return `${this.config.workerUrl}${ApiEndpoint.Resources.Base}?guid=${result.path}`;
        } else if (isHash) {
          return `${this.config.workerUrl}${ApiEndpoint.Resources.Base}?hash=${result.path}`;
        }
        return url;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw new Error(
      `Failed to upload asset after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  async uploadImage(r2Path: string, imageData: ArrayBuffer | Blob): Promise<string> {
    const ext = r2Path.split('.').pop()?.toLowerCase();
    const imageTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
    };
    const contentType = imageTypes[ext || ''] || 'image/png';

    return this.uploadAsset(r2Path, imageData, contentType);
  }

  async listAssets(prefix?: string, limit?: number, cursor?: string): Promise<R2ListResponse> {
    const url = new URL(`${this.config.workerUrl}${ApiEndpoint.Assets.Base}/`);
    if (prefix) url.searchParams.set('prefix', prefix);
    if (limit) url.searchParams.set('limit', limit.toString());
    if (cursor) url.searchParams.set('cursor', cursor);

    logInfo('Listing assets from:', { data: url.toString() });
    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const text = await response.text();
      logError('List failed response:', { data: text });
      throw new Error(`Failed to list assets: ${response.status} ${response.statusText} - ${text}`);
    }

    return (await response.json()) as R2ListResponse;
  }

  async downloadAssetByGuid(guid: string): Promise<ArrayBuffer> {
    const url = `${this.config.workerUrl}${ApiEndpoint.Resources.Base}?guid=${encodeURIComponent(guid)}`;

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  /** @deprecated Use downloadAssetByGuid instead. This method exists for backward compatibility. */
  async downloadAsset(r2Path: string): Promise<ArrayBuffer> {
    const guidMatch = r2Path.match(/assets\/([a-f0-9-]+)\.asset$/i);
    if (guidMatch) {
      return this.downloadAssetByGuid(guidMatch[1]);
    }

    const url = `${this.config.workerUrl}${ApiEndpoint.Assets.ById(r2Path)}`;

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  async deleteAssetByGuid(guid: string, adminToken: string): Promise<void> {
    const url = `${this.config.workerUrl}${ApiEndpoint.Resources.Base}?guid=${encodeURIComponent(guid)}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        });

        if (response.status === 404) {
          return;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Failed to delete asset: ${response.status} ${errorText}`);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof Error && (error.message.includes('404') || error.message.includes('40'))) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw new Error(
      `Failed to delete asset after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /** @deprecated Use deleteAssetByGuid instead. This method exists for backward compatibility. */
  async deleteAsset(r2Path: string): Promise<void> {
    const guidMatch = r2Path.match(/assets\/([a-f0-9-]+)\.asset$/i);
    if (guidMatch) {
      throw new Error('Use deleteAssetByGuid() instead of deleteAsset() with GUID-based paths');
    }

    const url = `${this.config.workerUrl}${ApiEndpoint.Assets.ById(r2Path)}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'DELETE',
        });

        if (response.status === 404) {
          return;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Failed to delete asset: ${response.status} ${errorText}`);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof Error && (error.message.includes('404') || error.message.includes('40'))) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw new Error(
      `Failed to delete asset after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }
}

