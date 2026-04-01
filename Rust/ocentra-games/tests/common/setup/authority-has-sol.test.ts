/**
 * Test: Authority account has SOL
 * Category: SETUP
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'

class AuthorityHasSOLTest extends BaseTest {
  constructor() {
    super({
      id: 'authority-has-sol',
      name: 'Authority account has SOL',
      description: 'Verifies that the authority account has SOL balance',
      tags: {
        category: TestCategory.SETUP,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority } = await import('@/helpers')
    const balance = await program.provider.connection.getBalance(
      authority.publicKey
    )

    this.assert(
      balance > 0,
      `Authority should have SOL balance, got ${balance}`
    )
  }
}

const testInstance = new AuthorityHasSOLTest()
registerMochaTest(testInstance)
