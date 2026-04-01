// Error handling utilities - applies to all games

import { AnchorError, ProgramError } from '@coral-xyz/anchor'
import { SendTransactionError } from '@solana/web3.js'

/**
 * Normalize errors and rethrow as AnchorError if possible
 * Handles SendTransactionError by parsing logs for program errors
 */
export function normalizeAndRethrowAnchorError(
  err: unknown,
  context: string
): never {
  // If it's already an AnchorError, rethrow as-is
  if (err instanceof AnchorError) {
    throw err
  }

  // If it's a SendTransactionError, try to extract Anchor error from logs
  if (err instanceof SendTransactionError && err.logs) {
    const logs = err.logs.join('\n')

    // Look for program error in logs (format: "Program log: AnchorError caused by account: ...")
    // Also try to match with multiline patterns (using [\s\S] instead of . with s flag for ES2018 compatibility)
    const anchorErrorMatch = logs.match(
      /AnchorError caused by account: (\w+)[\s\S]*?Error Code: (\w+)[\s\S]*?Error Number: (\d+)/
    )
    if (anchorErrorMatch) {
      const [, , errorCode] = anchorErrorMatch // Skip account name, extract error code

      // Create a synthetic AnchorError with proper structure
      const syntheticError = {
        error: {
          errorCode: {
            code: errorCode,
          },
        },
        errorCode: {
          code: errorCode,
        },
      } as unknown as AnchorError

      // Copy logs and other properties from original error
      ;(syntheticError as unknown as { logs?: string[] }).logs = err.logs

      throw syntheticError
    }

    // Look for "AnchorError thrown in" format (from error.ts:152)
    // Format: "AnchorError thrown in <file>:<line>. Error Code: <code>. Error Number: <num>. Error Message: <msg>"
    const anchorErrorThrownMatch = logs.match(
      /AnchorError thrown in[^\n]*Error Code: (\w+)/
    )
    if (anchorErrorThrownMatch) {
      const [, errorCode] = anchorErrorThrownMatch

      const syntheticError = {
        error: {
          errorCode: {
            code: errorCode,
          },
        },
        errorCode: {
          code: errorCode,
        },
      } as unknown as AnchorError

      ;(syntheticError as unknown as { logs?: string[] }).logs = err.logs

      throw syntheticError
    }

    // Look for "AnchorError caused by account" format
    // Format: "AnchorError caused by account: <account_name>"
    // Often followed by error details in subsequent logs
    const anchorErrorCausedMatch = logs.match(
      /AnchorError caused by account: (\w+)/
    )
    if (anchorErrorCausedMatch) {
      // Try to extract error code from subsequent log lines
      const errorCodeMatch = logs.match(/Error Code: (\w+)/)
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : 'UnknownError'

      const syntheticError = {
        error: {
          errorCode: {
            code: errorCode,
          },
        },
        errorCode: {
          code: errorCode,
        },
      } as unknown as AnchorError

      ;(syntheticError as unknown as { logs?: string[] }).logs = err.logs

      throw syntheticError
    }

    // Look for custom program error (format: "Program log: custom program error: 0xXXXX")
    const programErrorMatch = logs.match(/custom program error: 0x([0-9a-f]+)/i)
    if (programErrorMatch) {
      const errorCode = Number.parseInt(programErrorMatch[1], 16)

      // Common error codes (from error.rs) - note: these are Anchor error codes, not our GameError codes
      // Anchor converts our GameError enum to error codes automatically
      // Error codes are typically in the format 0xXXXX where XXXX is the enum variant number
      // For now, try to match common patterns
      const errorCodeMap: Record<number, string> = {
        0x1771: 'InvalidPhase',
        0x1773: 'NotPlayerTurn',
        0x1775: 'InvalidPayload',
        0x1776: 'MatchAlreadyEnded',
        0x1777: 'InsufficientPlayers',
        0x1778: 'InvalidNonce',
        0x1779: 'InvalidTimestamp',
        // Try to map based on error code value
        // InvalidPhase is typically 6001 (0x1771)
        // InvalidPayload is typically 6005 (0x1775)
        // NotPlayerTurn is typically 6003 (0x1773)
      }

      const errorName = errorCodeMap[errorCode] || `UnknownError(${errorCode})`

      const syntheticError = {
        error: {
          errorCode: {
            code: errorName,
          },
        },
        errorCode: {
          code: errorName,
        },
      } as unknown as AnchorError

      ;(syntheticError as unknown as { logs?: string[] }).logs = err.logs

      throw syntheticError
    }
  }

  // If it's a ProgramError, convert to AnchorError
  if (err instanceof ProgramError) {
    const errorName = err.msg || `ProgramError(${err.code})`
    // AnchorError constructor: new AnchorError(code, name, message, logs?, origin?)
    const anchorError = new AnchorError(
      errorName as unknown as never, // ErrorCode type (cast for synthetic error)
      errorName, // Error name
      [err.msg || `Program error code: ${err.code}`], // Error message array
      [] // Logs array (empty for ProgramError)
    )
    throw anchorError
  }

  // Unknown error type - try to extract information from error object
  let errorMsg: string
  let errorLogs: string[] = []

  if (err instanceof Error) {
    errorMsg = err.message
    // Check if error has logs property (SendTransactionError)
    if ('logs' in err && Array.isArray((err as { logs?: unknown }).logs)) {
      errorLogs = (err as { logs: string[] }).logs
      // Try one more time to parse from logs if we have them
      if (errorLogs.length > 0) {
        const logs = errorLogs.join('\n')
        const errorCodeMatch = logs.match(/Error Code: (\w+)/)
        if (errorCodeMatch) {
          const errorCode = errorCodeMatch[1]
          const syntheticError = {
            error: {
              errorCode: {
                code: errorCode,
              },
            },
            errorCode: {
              code: errorCode,
            },
          } as unknown as AnchorError
          ;(syntheticError as unknown as { logs?: string[] }).logs = errorLogs
          throw syntheticError
        }
        // Try custom program error one more time
        const programErrorMatch = logs.match(
          /custom program error: 0x([0-9a-f]+)/i
        )
        if (programErrorMatch) {
          const errorCode = Number.parseInt(programErrorMatch[1], 16)
          const errorCodeMap: Record<number, string> = {
            0x1771: 'InvalidPhase',
            0x1773: 'NotPlayerTurn',
            0x1775: 'InvalidPayload',
            0x1776: 'MatchAlreadyEnded',
            0x1777: 'InsufficientPlayers',
            0x1778: 'InvalidNonce',
            0x1779: 'InvalidTimestamp',
          }
          const errorName =
            errorCodeMap[errorCode] || `UnknownError(${errorCode})`
          const syntheticError = {
            error: {
              errorCode: {
                code: errorName,
              },
            },
            errorCode: {
              code: errorName,
            },
          } as unknown as AnchorError
          ;(syntheticError as unknown as { logs?: string[] }).logs = errorLogs
          throw syntheticError
        }
      }
    }
  } else {
    // For non-Error objects, try to serialize intelligently
    try {
      errorMsg = JSON.stringify(err, Object.getOwnPropertyNames(err))
    } catch {
      errorMsg = String(err)
    }
  }

  // Last resort: create a generic Error but include context and logs if available
  const fullMsg =
    errorLogs.length > 0
      ? `[${context}] ${errorMsg}\nLogs:\n${errorLogs.join('\n')}`
      : `[${context}] ${errorMsg}`

  throw new Error(fullMsg)
}

/**
 * Retry helper for "Unsupported sysvar" errors (known localnet validator issue)
 * This error occurs intermittently when the validator is under load, especially with parallel transactions.
 * Uses exponential backoff for retries.
 */
export async function retryOnUnsupportedSysvar<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err

      // Check if this is an "Unsupported sysvar" error
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorLogs =
        err instanceof SendTransactionError ? err.logs || [] : []
      const allLogs = errorLogs.join('\n')

      const isUnsupportedSysvar =
        errorMessage.includes('Unsupported sysvar') ||
        allLogs.includes('Unsupported sysvar')

      if (isUnsupportedSysvar && attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const delayMs = initialDelayMs * Math.pow(2, attempt)
        console.log(
          `[retryOnUnsupportedSysvar] Attempt ${attempt + 1}/${maxRetries + 1} failed with "Unsupported sysvar", retrying in ${delayMs}ms...`
        )
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }

      // Not an unsupported sysvar error, or out of retries - throw
      throw err
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError
}
