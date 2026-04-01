export interface AuthBridge {
  getAuthToken(): Promise<string | null>;
  getUserId?(): string | null;
}
