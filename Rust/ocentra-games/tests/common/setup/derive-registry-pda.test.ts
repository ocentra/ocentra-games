/**
 * Test: Can derive GameRegistry PDA
 * Category: SETUP
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { PublicKey } from '@solana/web3.js'

class DeriveRegistryPDATest extends BaseTest {
  constructor() {
    super({
      id: 'derive-registry-pda',
      name: 'Can derive GameRegistry PDA',
      description: 'Verifies that GameRegistry PDA can be derived correctly',
      tags: {
        category: TestCategory.SETUP,
        cluster: ClusterRequirement.ANY,
      },
    })
  }

  async run(): Promise<void> {
    const { getRegistryPDA } = await import('@/helpers')
    const [registryPDA, bump] = await getRegistryPDA()

    this.assertTruthy(
      registryPDA instanceof PublicKey,
      'Registry PDA should be a PublicKey'
    )
    this.assert(bump >= 0 && bump <= 255, `Bump should be 0-255, got ${bump}`)
  }
}

const testInstance = new DeriveRegistryPDATest()
registerMochaTest(testInstance)
