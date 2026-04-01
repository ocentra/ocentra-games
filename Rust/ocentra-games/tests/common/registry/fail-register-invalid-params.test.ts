/**
 * Test: Fails to register game with invalid parameters
 * Category: REGISTRY
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import type { AnchorError } from '@/helpers'

class FailRegisterInvalidParamsTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-register-invalid-params',
      name: 'Fails to register game with invalid parameters',
      description:
        'Verifies that registering a game with invalid parameters (min > max) fails',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority, getRegistryPDA } = await import('@/helpers')
    const [registryPDA] = await getRegistryPDA()

    try {
      await program.methods
        .registerGame(
          3,
          'InvalidGame',
          5,
          2,
          'https://rules.example.com/invalid',
          1
        )
        .accounts({
          registry: registryPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()

      this.assert(false, 'Should have thrown InvalidPayload error')
    } catch (err: unknown) {
      const error = err as AnchorError
      this.assertEqual(
        error.error?.errorCode?.code,
        'InvalidPayload',
        'Expected InvalidPayload error'
      )
    }
  }
}

const testInstance = new FailRegisterInvalidParamsTest()
registerMochaTest(testInstance)
