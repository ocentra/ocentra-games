/**
 * Test: UserDepositAccount PDA derivation
 * Category: STATE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { getUserDepositPDA } from '@/common'
import { Keypair } from '@solana/web3.js'

class UserDepositPDATest extends BaseTest {
  constructor() {
    super({
      id: 'user-deposit-pda',
      name: 'UserDepositAccount PDA derivation',
      description:
        'Verifies UserDepositAccount PDA can be derived correctly from user authority',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    // Create test user authorities
    const user1 = Keypair.generate()
    const user2 = Keypair.generate()

    // Derive UserDepositAccount PDAs
    const [depositPDA1, bump1] = await getUserDepositPDA(user1.publicKey)
    const [depositPDA2, bump2] = await getUserDepositPDA(user2.publicKey)

    // Verify PDA derivation
    this.assertTruthy(depositPDA1, 'User deposit PDA 1 should be derived')
    this.assertTruthy(depositPDA2, 'User deposit PDA 2 should be derived')

    this.assert(
      bump1 >= 0 && bump1 <= 255,
      `User deposit bump 1 should be between 0-255, got ${bump1}`
    )
    this.assert(
      bump2 >= 0 && bump2 <= 255,
      `User deposit bump 2 should be between 0-255, got ${bump2}`
    )

    // Verify PDA is deterministic (derive again should give same result)
    const [depositPDA1Again, bump1Again] = await getUserDepositPDA(
      user1.publicKey
    )
    this.assert(
      depositPDA1.equals(depositPDA1Again),
      'User deposit PDA derivation should be deterministic'
    )
    this.assertEqual(
      bump1,
      bump1Again,
      'User deposit bump should be consistent'
    )

    // Verify PDAs are different for different users
    this.assert(
      !depositPDA1.equals(depositPDA2),
      'User deposit PDAs for different users should be different'
    )

    // Verify same user gets same PDA even if derived multiple times
    const [depositPDA1Third] = await getUserDepositPDA(user1.publicKey)
    this.assert(
      depositPDA1.equals(depositPDA1Third),
      'Same user should always get same deposit PDA'
    )
  }
}

const testInstance = new UserDepositPDATest()
registerMochaTest(testInstance)
