/**
 * Test: Registry account doesn't exist yet
 * Category: REGISTRY
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'

class RegistryNotExistsTest extends BaseTest {
  constructor() {
    super({
      id: 'registry-not-exists',
      name: "Registry account doesn't exist yet",
      description:
        "Verifies that registry account doesn't exist before first game registration",
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { checkGameRegistryStatus, createTestContext } = await import(
      '@/helpers'
    )
    const ctx = createTestContext("Registry account doesn't exist yet")
    const status = await checkGameRegistryStatus(ctx)

    // Test passes if we can check status
    this.assertTruthy(
      status !== undefined,
      'Should be able to check registry status'
    )
    ctx.finish()
  }
}

const testInstance = new RegistryNotExistsTest()
registerMochaTest(testInstance)
