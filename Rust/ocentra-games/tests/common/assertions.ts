// Test assertions - applies to all games

import { AnchorError } from '@coral-xyz/anchor'
import { TestContext } from './test-context'

/**
 * Expect an AnchorError with specific error code
 */
export const expectAnchorError = (
  ctx: TestContext | undefined,
  error: unknown,
  expectedCode: string
): void => {
  if (!(error instanceof AnchorError)) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (ctx) {
      ctx.error(
        `Expected AnchorError with code '${expectedCode}', got ${error?.constructor?.name}: ${errorMsg}`,
        error
      )
      return
    } else {
      throw new Error(
        `Expected AnchorError with code '${expectedCode}', got ${error?.constructor?.name}: ${errorMsg}`
      )
    }
  }

  const errorCode = error.error?.errorCode?.code
  if (errorCode !== expectedCode) {
    const errorMsg = `Expected error code '${expectedCode}', got '${errorCode}'`
    if (ctx) {
      ctx.error(errorMsg, error)
    } else {
      throw new Error(errorMsg)
    }
  }

  if (ctx) {
    ctx.log(`✓ Got expected error: ${expectedCode}`)
  }
}
