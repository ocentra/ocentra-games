export interface R2Config {
  workerUrl: string;
  bucketName: string;
}

export class R2Service {
  private config: R2Config;
  private readonly MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per spec line 4314
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(config: R2Config) {
    this.config = config;
  }

  /**
   * Uploads a match record with retry logic and size validation.
   * Per critique Phase 6.2: Add error handling, retry logic, size validation.
   */
  async uploadMatchRecord(matchId: string, canonicalJSON: string): Promise<string> {
    // Per critique Phase 6.2: Size validation (10MB limit per spec)
    const sizeBytes = new TextEncoder().encode(canonicalJSON).length;
    if (sizeBytes > this.MAX_SIZE_BYTES) {
      throw new Error(
        `Match record exceeds size limit: ${sizeBytes} bytes (max ${this.MAX_SIZE_BYTES} bytes)`
      );
    }

    const url = `${this.config.workerUrl}/api/matches/${matchId}`;
    
    // Per critique Phase 6.2: Retry logic
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
          throw new Error(`Failed to upload match record: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result.url || url;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('40')) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw new Error(
      `Failed to upload match record after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Gets a match record with retry logic.
   * Per critique Phase 6.2: Add error handling and retry logic.
   */
  async getMatchRecord(matchId: string): Promise<string | null> {
    const url = `${this.config.workerUrl}/api/matches/${matchId}`;
    
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
        });

        if (response.status === 404) {
          return null; // Match not found - return null instead of throwing
        }

        if (!response.ok) {
          throw new Error(`Failed to get match record: ${response.status} ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on 404 or client errors
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
    const url = `${this.config.workerUrl}/api/signed-url/${matchId}?expires=${expiresIn}`;
    const response = await fetch(url, { method: 'GET' });
    
    if (!response.ok) {
      throw new Error(`Failed to generate signed URL: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.signedUrl;
  }

  async deleteMatchRecord(matchId: string): Promise<void> {
    const url = `${this.config.workerUrl}/api/matches/${matchId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete match record: ${response.statusText}`);
    }
  }
}

