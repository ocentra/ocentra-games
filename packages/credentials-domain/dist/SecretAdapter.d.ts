export interface SecretAdapter {
    getSecret(providerId: string, key: string): Promise<string | null>;
    storeSecret?(providerId: string, key: string, value: string): Promise<void>;
}
