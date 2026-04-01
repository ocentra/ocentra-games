/**
 * Test: Can fetch GameRegistry data after creation
 * Category: REGISTRY
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'

class FetchRegistryDataTest extends BaseTest {
  constructor() {
    super({
      id: 'fetch-registry-data',
      name: 'Can fetch GameRegistry data after creation',
      description:
        'Verifies that GameRegistry data can be fetched after creation',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, checkGameRegistryStatus, createTestContext } =
      await import('@/helpers')
    const ctx = createTestContext('Can fetch GameRegistry data after creation')
    const status = await checkGameRegistryStatus(ctx)

    this.assertTruthy(status.exists, 'Registry should exist')

    if (status.exists) {
      const registry = await program.account.gameRegistry.fetch(
        status.registryPDA
      )
      this.assert(
        registry.gameCount > 0,
        `Registry should have games, got ${registry.gameCount}`
      )
    }
    ctx.finish()
  }
}

const testInstance = new FetchRegistryDataTest()
registerMochaTest(testInstance)
