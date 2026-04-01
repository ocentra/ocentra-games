declare module 'cloudflare:test' {
  export interface FetchMockOptions {
    method?: string;
    path?: string;
    body?: string | ReadableStream | unknown;
  }

  export interface FetchMockInterceptor {
    intercept(options: { method?: string; path?: string }): {
      reply(status: number, handler?: (opts: FetchMockOptions) => Promise<string> | string): void;
    };
    reply(status: number, handler?: (opts: FetchMockOptions) => Promise<string> | string): void;
  }

  export interface FetchMock {
    activate(): void;
    disableNetConnect(): void;
    get(url: string): FetchMockInterceptor;
    get(url: string, options?: { persist?: boolean }): FetchMockInterceptor;
    assertNoPendingInterceptors(): void;
  }

  export const fetchMock: FetchMock;
  export const SELF: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
  export const env: {
    TEST_RUN_ID?: string;
    FIXTURE_LOADER: {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
    [key: string]: unknown;
  };
}
