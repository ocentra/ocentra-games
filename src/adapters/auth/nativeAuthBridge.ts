import type { AuthBridge } from '@ocentra/auth-domain/AuthBridge';

type CapacitorFirebaseAuth = {
  getCurrentUser: () => Promise<{ idToken?: string } | null>;
};

export class NativeAuthBridge implements AuthBridge {
  async getAuthToken(): Promise<string | null> {
    const cap = (globalThis as { Capacitor?: { Plugins?: { FirebaseAuthentication?: CapacitorFirebaseAuth } } }).Capacitor;
    if (cap?.Plugins?.FirebaseAuthentication) {
      try {
        const result = await cap.Plugins.FirebaseAuthentication.getCurrentUser();
        return result?.idToken ?? null;
      } catch {
        return null;
      }
    }

    return null;
  }
}
