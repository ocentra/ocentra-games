/**
 * Test: Can check if GameRegistry account exists
 * Category: SETUP
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'

class CheckRegistryExistsTest extends BaseTest {
  constructor() {
    super({
      id: 'check-registry-exists',
      name: 'Can check if GameRegistry account exists',
      description: 'Verifies that we can check if GameRegistry account exists',
      tags: {
        category: TestCategory.SETUP,
        cluster: ClusterRequirement.ANY,
      },
    })
  }

  async run(): Promise<void> {
    const { checkGameRegistryStatus, createTestContext } = await import(
      '@/helpers'
    )
    const ctx = createTestContext('Can check if GameRegistry account exists')
    const status = await checkGameRegistryStatus(ctx)

    // Test passes if we can check status (either exists or not)
    this.assertTruthy(
      status !== undefined,
      'Should be able to check registry status'
    )
    ctx.finish()
  }
}

const testInstance = new CheckRegistryExistsTest()
registerMochaTest(testInstance)
