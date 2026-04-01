import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_TOKENIZATION = false;

type TokenizerCallableResult = { input_ids?: unknown } | number[];

type TransformersTokenizer = {
  (text: string, options?: Record<string, unknown>): Promise<TokenizerCallableResult> | TokenizerCallableResult;
  tokenize?: (text: string) => Promise<TokenizerCallableResult> | TokenizerCallableResult;
  encode?: (text: string) => Promise<TokenizerCallableResult> | TokenizerCallableResult;
};

export interface KokoroTokenizationResult {
  phonemes: string[];
  tokenIds: number[];
  text: string;
}

const BASIC_PHONEME_MAP: Record<string, string[]> = {
  hello: ['h', 'ə', 'l', 'oʊ'],
  world: ['w', 'ɜː', 'l', 'd'],
  kokoro: ['k', 'oʊ', 'k', 'oʊ', 'ɹ', 'oʊ']
};

function phonemesToTokenIds(phonemes: string[]): number[] {
  const tokenIds: number[] = [];
  for (const phoneme of phonemes) {
    const tokenId = phoneme.charCodeAt(0) % 1000;
    tokenIds.push(tokenId);
  }
  return tokenIds;
}

function textToPhonemesSimple(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const phonemes: string[] = [];

  for (const word of words) {
    if (BASIC_PHONEME_MAP[word]) {
      phonemes.push(...BASIC_PHONEME_MAP[word]);
    } else {
      for (const char of word) {
        if (/[aeiou]/.test(char)) {
          phonemes.push('ə');
        } else if (/[bcdfghjklmnpqrstvwxyz]/.test(char)) {
          phonemes.push(char);
        }
      }
    }
    phonemes.push(' ');
  }

  return phonemes.filter((p) => p !== '');
}

export type FetchAdapter = (url: string, init?: RequestInit) => Promise<Response>;

export class KokoroTokenizer {
  private tokenizer: TransformersTokenizer | null = null;
  private useBackend: boolean = false;
  private backendUrl?: string;
  private fetchAdapter?: FetchAdapter;

  constructor(options?: { useBackend?: boolean; backendUrl?: string; fetch?: FetchAdapter }) {
    this.useBackend = options?.useBackend ?? false;
    this.backendUrl = options?.backendUrl;
    this.fetchAdapter = options?.fetch;
  }

  async initializeFromTransformers(modelId: string): Promise<void> {
    try {
      const { AutoTokenizer } = await import('@huggingface/transformers');
      const maybeTokenizer = await AutoTokenizer.from_pretrained(modelId);
      if (this.isTransformersTokenizer(maybeTokenizer)) {
        this.tokenizer = maybeTokenizer;
        if (LOG_TOKENIZATION) {
          logInfo('Initialized tokenizer from transformers.js');
        }
      } else {
        logWarn('Loaded tokenizer does not match expected signature.');
        this.tokenizer = null;
      }
    } catch (error) {
      logWarn('Failed to load tokenizer from transformers.js:', error);
      this.tokenizer = null;
    }
  }

  async tokenizeViaBackend(text: string): Promise<KokoroTokenizationResult> {
    if (!this.backendUrl) {
      throw new Error('Backend URL not configured for misaki tokenization');
    }
    if (!this.fetchAdapter) {
      throw new Error('Fetch adapter required for backend tokenization. Pass fetch in KokoroTokenizer options.');
    }

    try {
      const response = await this.fetchAdapter(`${this.backendUrl}/tokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Backend tokenization failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        phonemes: result.phonemes || [],
        tokenIds: result.tokenIds || [],
        text
      };
    } catch (error) {
      logError('Backend tokenization error:', error);
      throw error;
    }
  }

  async tokenizeViaTransformers(text: string): Promise<KokoroTokenizationResult> {
    if (!this.tokenizer) {
      throw new Error('Tokenizer not initialized. Call initializeFromTransformers first.');
    }

    try {
      const tokenizer = this.tokenizer;
      const encoded = await this.callTokenizer(tokenizer, text);
      const tokenIds = this.extractInputIds(encoded);

      return {
        phonemes: [],
        tokenIds,
        text
      };
    } catch (error) {
      logError('Transformers tokenization error:', error);
      throw error;
    }
  }

  async tokenize(text: string): Promise<KokoroTokenizationResult> {
    if (this.tokenizer) {
      try {
        return await this.tokenizeViaTransformers(text);
      } catch (error) {
        logWarn('Transformers tokenization failed, trying fallback:', error);
      }
    }

    if (this.useBackend && this.backendUrl) {
      try {
        return await this.tokenizeViaBackend(text);
      } catch (error) {
        logWarn('Backend tokenization failed, falling back:', error);
      }
    }

    if (LOG_TOKENIZATION) {
      logWarn(
        'Using simple phoneme mapping (not accurate). Transformers.js tokenizer should work automatically if Kokoro includes tokenizer config.'
      );
    }

    const phonemes = textToPhonemesSimple(text);
    const tokenIds = phonemesToTokenIds(phonemes);

    return {
      phonemes,
      tokenIds,
      text
    };
  }

  setTokenizer(tokenizer: unknown): void {
    if (this.isTransformersTokenizer(tokenizer)) {
      this.tokenizer = tokenizer;
    } else {
      throw new Error('Provided tokenizer does not match expected signature');
    }
  }

  getTokenizer(): TransformersTokenizer | null {
    return this.tokenizer;
  }

  private isTransformersTokenizer(value: unknown): value is TransformersTokenizer {
    return typeof value === 'function';
  }

  private async callTokenizer(tokenizer: TransformersTokenizer, text: string): Promise<TokenizerCallableResult> {
    const primary = await Promise.resolve(
      tokenizer(text, {
        return_tensors: 'pt'
      })
    );

    if (this.hasInputIds(primary) || Array.isArray(primary)) {
      return primary;
    }

    if (tokenizer.encode) {
      const encoded = await Promise.resolve(tokenizer.encode(text));
      if (this.hasInputIds(encoded) || Array.isArray(encoded)) {
        return encoded;
      }
    }

    if (tokenizer.tokenize) {
      const tokenized = await Promise.resolve(tokenizer.tokenize(text));
      if (this.hasInputIds(tokenized) || Array.isArray(tokenized)) {
        return tokenized;
      }
    }

    throw new Error('Tokenizer did not return input_ids or token array');
  }

  private hasInputIds(value: unknown): value is { input_ids?: unknown } {
    return typeof value === 'object' && value !== null && 'input_ids' in value;
  }

  private extractInputIds(result: TokenizerCallableResult): number[] {
    if (Array.isArray(result)) {
      return result.map((item) => this.toNumber(item));
    }

    const maybeIds = result.input_ids;
    if (Array.isArray(maybeIds)) {
      const first = maybeIds[0];
      if (Array.isArray(first)) {
        return first.map((item) => this.toNumber(item));
      }
      return maybeIds.map((item) => this.toNumber(item));
    }

    throw new Error('Tokenization result did not contain input_ids');
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    throw new Error(`Unexpected token id value: ${String(value)}`);
  }
}

export function createKokoroTokenizer(options?: {
  useBackend?: boolean;
  backendUrl?: string;
  fetch?: FetchAdapter;
}): KokoroTokenizer {
  return new KokoroTokenizer(options);
}
