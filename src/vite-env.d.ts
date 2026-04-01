/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY?: string
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string
    readonly VITE_FIREBASE_PROJECT_ID?: string
    readonly VITE_FIREBASE_STORAGE_BUCKET?: string
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
    readonly VITE_FIREBASE_APP_ID?: string
    readonly VITE_R2_WORKER_URL?: string
    readonly VITE_R2_BUCKET_NAME?: string
    readonly VITE_R2_ASSETS_BUCKET?: string
    readonly VITE_USE_R2_ASSETS?: string
    readonly VITE_AI_WORKER_URL?: string
    readonly VITE_STORAGE_FALLBACK_FIREBASE?: string
    readonly VITE_PROFILE?: string
    readonly VITE_APP_VERSION?: string
    readonly MODE: string
    readonly DEV: boolean
    readonly PROD: boolean
    readonly SSR: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}

