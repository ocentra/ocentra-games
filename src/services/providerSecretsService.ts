// Provider Secrets Service
// Stores API keys and secrets securely in Firebase Firestore (per player)

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@config/firebase'
import { auth } from '@config/firebase'
import type { ProviderSecrets, ProviderType } from '@/ai/providers/types'

const prefix = '[ProviderSecretsService]'
const LOG_GENERAL = false
const LOG_ERROR = true

/**
 * Get provider secrets for current user
 */
export async function getProviderSecrets(): Promise<ProviderSecrets | null> {
  try {
    const user = auth.currentUser
    if (!user) {
      if (LOG_ERROR) console.error(prefix, 'No authenticated user')
      return null
    }

    const secretsRef = doc(db, 'providerSecrets', user.uid)
    const secretsDoc = await getDoc(secretsRef)

    if (secretsDoc.exists()) {
      const data = secretsDoc.data() as ProviderSecrets
      if (LOG_GENERAL) {
        console.log(prefix, '✅ Loaded provider secrets for user:', user.uid)
      }
      return data
    }

    // Return empty secrets structure
    return {
      userId: user.uid,
      providers: {},
      updatedAt: Date.now(),
    }
  } catch (error) {
    if (LOG_ERROR) {
      console.error(prefix, '❌ Failed to get provider secrets:', error)
    }
    return null
  }
}

/**
 * Save provider secret for current user
 */
export async function saveProviderSecret(
  providerType: ProviderType,
  secretKey: string,
  secretValue: string
): Promise<boolean> {
  try {
    const user = auth.currentUser
    if (!user) {
      if (LOG_ERROR) console.error(prefix, 'No authenticated user')
      return false
    }

    const secretsRef = doc(db, 'providerSecrets', user.uid)
    const currentSecrets = await getProviderSecrets()

    const updatedSecrets: ProviderSecrets = {
      userId: user.uid,
      providers: {
        ...(currentSecrets?.providers || {}),
        [providerType]: {
          ...(currentSecrets?.providers[providerType] || {}),
          [secretKey]: secretValue,
        },
      },
      updatedAt: Date.now(),
    }

    await setDoc(secretsRef, updatedSecrets, { merge: true })

    if (LOG_GENERAL) {
      console.log(prefix, `✅ Saved secret for ${providerType}.${secretKey}`)
    }
    return true
  } catch (error) {
    if (LOG_ERROR) {
      console.error(prefix, '❌ Failed to save provider secret:', error)
    }
    return false
  }
}

/**
 * Delete provider secret for current user
 */
export async function deleteProviderSecret(
  providerType: ProviderType,
  secretKey: string
): Promise<boolean> {
  try {
    const user = auth.currentUser
    if (!user) {
      if (LOG_ERROR) console.error(prefix, 'No authenticated user')
      return false
    }

    const secretsRef = doc(db, 'providerSecrets', user.uid)
    const currentSecrets = await getProviderSecrets()

    if (!currentSecrets?.providers[providerType]) {
      return true // Already deleted
    }

    const updatedProvider = { ...currentSecrets.providers[providerType] }
    delete updatedProvider[secretKey]

    const updatedSecrets: ProviderSecrets = {
      userId: user.uid,
      providers: {
        ...currentSecrets.providers,
        [providerType]: Object.keys(updatedProvider).length > 0 ? updatedProvider : undefined,
      },
      updatedAt: Date.now(),
    }

    await setDoc(secretsRef, updatedSecrets, { merge: true })

    if (LOG_GENERAL) {
      console.log(prefix, `✅ Deleted secret for ${providerType}.${secretKey}`)
    }
    return true
  } catch (error) {
    if (LOG_ERROR) {
      console.error(prefix, '❌ Failed to delete provider secret:', error)
    }
    return false
  }
}

/**
 * Get specific provider secret value
 */
export async function getProviderSecret(
  providerType: ProviderType,
  secretKey: string
): Promise<string | null> {
  try {
    const secrets = await getProviderSecrets()
    if (!secrets) return null

    return secrets.providers[providerType]?.[secretKey] || null
  } catch (error) {
    if (LOG_ERROR) {
      console.error(prefix, '❌ Failed to get provider secret:', error)
    }
    return null
  }
}

/**
 * Save entire provider config (multiple secrets at once)
 */
export async function saveProviderConfig(
  providerType: ProviderType,
  config: Record<string, string>
): Promise<boolean> {
  try {
    const user = auth.currentUser
    if (!user) {
      if (LOG_ERROR) console.error(prefix, 'No authenticated user')
      return false
    }

    const secretsRef = doc(db, 'providerSecrets', user.uid)
    const currentSecrets = await getProviderSecrets()

    const updatedSecrets: ProviderSecrets = {
      userId: user.uid,
      providers: {
        ...(currentSecrets?.providers || {}),
        [providerType]: {
          ...(currentSecrets?.providers[providerType] || {}),
          ...config,
        },
      },
      updatedAt: Date.now(),
    }

    await setDoc(secretsRef, updatedSecrets, { merge: true })

    if (LOG_GENERAL) {
      console.log(prefix, `✅ Saved config for ${providerType}`)
    }
    return true
  } catch (error) {
    if (LOG_ERROR) {
      console.error(prefix, '❌ Failed to save provider config:', error)
    }
    return false
  }
}

