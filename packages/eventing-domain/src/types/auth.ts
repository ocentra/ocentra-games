export interface AuthCredentials {
  username: string
  password: string
}

export interface AuthResult {
  success: boolean
  userId?: string
  displayName?: string
  email?: string
  provider?: 'unity' | 'steam' | 'google' | 'facebook' | 'guest' | 'password' | string
  accessToken?: string
  errorCode?: string
  errorMessage?: string
  metadata?: Record<string, unknown>
}

export interface AuthPlayerData {
  id: string
  displayName: string
  avatarUrl?: string
  email?: string
  lastLoginAt?: string
  metadata?: Record<string, unknown>
}

export interface UserCredentials {
  username: string
  password: string
}

export interface AdditionalUserInfo {
  userName: string
  email: string
}

export interface ConfigManager {
  id: string
  name: string
  version?: string
  payload?: Record<string, unknown>
}

export interface ManagerReference {
  id: string
  type: string
}

