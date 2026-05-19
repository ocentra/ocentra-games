declare module '@pact-foundation/pact' {
  export interface InteractionBuilder {
    headers(headers: Record<string, string | Matcher<string>>): InteractionBuilder;
    jsonBody(body: unknown): InteractionBuilder;
    body(body: unknown): InteractionBuilder;
    body(contentType: string, body: unknown): InteractionBuilder;
    status(status: number): InteractionBuilder;
    query(query: Record<string, string | Matcher<string>>): InteractionBuilder;
  }

  export interface Interaction {
    given(state: string): Interaction;
    uponReceiving(description: string): Interaction;
    withRequest(method: string, path: string, builderFunc?: (builder: InteractionBuilder) => void): Interaction;
    willRespondWith(status: number, builderFunc?: (builder: InteractionBuilder) => void): Interaction;
    executeTest<T>(testFunc: (mockServer: V4InteractionContext) => Promise<T>): Promise<T>;
  }

  export interface V4InteractionContext {
    url: string;
    port: number;
  }

  export interface PactV4Config {
    consumer: string;
    provider: string;
    dir?: string;
    logLevel?: string;
  }

  export class PactV4 {
    constructor(config: PactV4Config);
    addInteraction(): Interaction;
  }

  export interface VerifierOptions {
    provider: string;
    providerBaseUrl: string;
    pactUrls: string[];
    [key: string]: unknown;
  }

  export class Verifier {
    constructor(options: VerifierOptions);
    verifyProvider(): Promise<string>;
  }

  export interface Matcher<T> {
    'pact:matcher:type': string;
    value: T;
  }

  export const Matchers: {
    integer(value: number): Matcher<number>;
    string(value: string): Matcher<string>;
    boolean(value: boolean): Matcher<boolean>;
    like<T>(value: T): Matcher<T>;
    eachLike<T>(value: T, min?: number): Matcher<T[]>;
    uuid(value?: string): Matcher<string>;
    datetime(format: string, example: string): Matcher<string>;
    date(format: string, example: string): Matcher<string>;
    decimal(value?: number): Matcher<number>;
    [key: string]: unknown;
  };
}
