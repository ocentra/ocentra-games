/**
 * Test: Fails to register game with invalid authority
 * Category: REGISTRY
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import type { AnchorError } from '@/helpers'

class FailRegisterInvalidAuthorityTest extends BaseTest {
  constructor() {
    super({
      id: 'fail-register-invalid-authority',
      name: 'Fails to register game with invalid authority',
      description:
        'Verifies that registering a game with invalid authority fails',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, unauthorizedPlayer, getRegistryPDA } = await import(
      '@/helpers'
    )
    const [registryPDA] = await getRegistryPDA()

    try {
      await program.methods
        .registerGame(2, 'TestGame', 2, 4, 'https://rules.example.com/test', 1)
        .accounts({
          registry: registryPDA,
          authority: unauthorizedPlayer.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([unauthorizedPlayer])
        .rpc()

      this.assert(false, 'Should have thrown Unauthorized error')
    } catch (err: unknown) {
      const error = err as AnchorError
      this.assertEqual(
        error.error?.errorCode?.code,
        'Unauthorized',
        'Expected Unauthorized error'
      )
    }
  }
}

const testInstance = new FailRegisterInvalidAuthorityTest()
registerMochaTest(testInstance)
