/**
 * Test: Program is loaded and accessible
 * Category: SETUP
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'

class ProgramLoadedTest extends BaseTest {
  constructor() {
    super({
      id: 'program-loaded',
      name: 'Program is loaded and accessible',
      description: 'Verifies that the Solana program is loaded and accessible',
      tags: {
        category: TestCategory.SETUP,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program } = await import('@/helpers')
    const expectedProgramId = '7eWx3H8bXMif7SDyPS1j5LZw1yUGDNZY592WzEKNf696'
    const actualProgramId = program.programId.toString()

    this.assertEqual(
      actualProgramId,
      expectedProgramId,
      `Expected program ID ${expectedProgramId}, got ${actualProgramId}`
    )
  }
}

const testInstance = new ProgramLoadedTest()
registerMochaTest(testInstance)
