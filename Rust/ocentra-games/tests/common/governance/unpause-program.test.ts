/**
 * Test: Can unpause program (treasury multisig only)
 * Category: GOVERNANCE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram, Keypair } from '@solana/web3.js'
import { getConfigAccountPDA, ConfigAccountType } from '@/common'

class UnpauseProgramTest extends BaseTest {
  constructor() {
    super({
      id: 'unpause-program',
      name: 'Can unpause program (treasury multisig only)',
      description:
        'Verifies that only treasury multisig can unpause the program',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
        requiresRegistry: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority } = await import('@/helpers')
    const [configPDA] = await getConfigAccountPDA()

    // Setup: Initialize config if it doesn't exist
    const treasuryMultisig = authority.publicKey // Use authority as multisig for testing
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .initializeConfig(treasuryMultisig)
        .accounts({
          configAccount: configPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()
    } catch (err: unknown) {
      // Config may already exist, that's fine
      const error = err as { message?: string }
      if (
        !error.message?.includes('already in use') &&
        !error.message?.includes('0x0')
      ) {
        throw err
      }
    }

    // Setup: Pause program first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .pauseProgram()
      .accounts({
        configAccount: configPDA,
        authority: treasuryMultisig,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Verify program is paused
    let config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    this.assertTruthy(config, 'Config should exist')
    this.assertEqual(
      config.isPaused ?? config.is_paused,
      true,
      'Config should be paused'
    )

    // Unpause program (treasury multisig)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .unpauseProgram()
      .accounts({
        configAccount: configPDA,
        authority: treasuryMultisig,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Verify program is unpaused
    config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    this.assertEqual(
      config.isPaused ?? config.is_paused,
      false,
      'Config should be unpaused'
    )

    // Test: Unauthorized user cannot unpause
    const unauthorizedUser = Keypair.generate()
    const { airdrop } = await import('@/helpers')
    await airdrop(unauthorizedUser.publicKey, 1)

    // Pause again for test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .pauseProgram()
      .accounts({
        configAccount: configPDA,
        authority: treasuryMultisig,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .unpauseProgram()
        .accounts({
          configAccount: configPDA,
          authority: unauthorizedUser.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([unauthorizedUser])
        .rpc()

      this.assert(false, 'Should have failed with Unauthorized error')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      this.assertEqual(errorCode, 'Unauthorized', 'Expected Unauthorized error')
    }
  }
}

const testInstance = new UnpauseProgramTest()
registerMochaTest(testInstance)
