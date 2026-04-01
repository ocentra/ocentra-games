/**
 * Test: Can update config (treasury multisig only)
 * Category: GOVERNANCE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram, Keypair } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { getConfigAccountPDA, ConfigAccountType } from '@/common'

class UpdateConfigTest extends BaseTest {
  constructor() {
    super({
      id: 'update-config',
      name: 'Can update config (treasury multisig only)',
      description:
        'Verifies that only treasury multisig can update config parameters',
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

    // Get initial config
    let config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    const initialPlatformFeeBps =
      config.platformFeeBps ?? config.platform_fee_bps ?? 500

    // Update platform fee (treasury multisig)
    const newPlatformFeeBps = 600 // 6%
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .updateConfig(newPlatformFeeBps, null, null, null, null, null)
      .accounts({
        configAccount: configPDA,
        authority: treasuryMultisig,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Verify platform fee was updated
    config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    this.assertTruthy(config, 'Config should exist')
    this.assertEqual(
      config.platformFeeBps ?? config.platform_fee_bps,
      newPlatformFeeBps,
      'Platform fee should be updated'
    )

    // Update min entry fee
    const newMinEntryFee = 20000 // 0.00002 SOL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .updateConfig(null, null, new anchor.BN(newMinEntryFee), null, null, null)
      .accounts({
        configAccount: configPDA,
        authority: treasuryMultisig,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()

    // Verify min entry fee was updated
    config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    const minEntryFee =
      config.minEntryFee?.toNumber() ?? config.min_entry_fee?.toNumber() ?? 0
    this.assertEqual(
      minEntryFee,
      newMinEntryFee,
      'Min entry fee should be updated'
    )

    // Test: Invalid fee parameter (platform_fee_bps > 10000)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .updateConfig(10001, null, null, null, null, null)
        .accounts({
          configAccount: configPDA,
          authority: treasuryMultisig,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()

      this.assert(false, 'Should have failed with InvalidFeeParameter error')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      this.assertEqual(
        errorCode,
        'InvalidFeeParameter',
        'Expected InvalidFeeParameter error'
      )
    }

    // Test: Invalid fee parameter (min_entry_fee > max_entry_fee)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .updateConfig(
          null,
          null,
          new anchor.BN(200_000_000_000),
          null,
          null,
          null
        )
        .accounts({
          configAccount: configPDA,
          authority: treasuryMultisig,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc()

      this.assert(false, 'Should have failed with InvalidFeeParameter error')
    } catch (err: unknown) {
      const errorCode = this.getErrorCode(err)
      this.assertEqual(
        errorCode,
        'InvalidFeeParameter',
        'Expected InvalidFeeParameter error'
      )
    }

    // Test: Unauthorized user cannot update config
    const unauthorizedUser = Keypair.generate()
    const { airdrop } = await import('@/helpers')
    await airdrop(unauthorizedUser.publicKey, 1)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .updateConfig(700, null, null, null, null, null)
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

    // Restore original platform fee
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (program.methods as any)
      .updateConfig(initialPlatformFeeBps, null, null, null, null, null)
      .accounts({
        configAccount: configPDA,
        authority: treasuryMultisig,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc()
  }
}

const testInstance = new UpdateConfigTest()
registerMochaTest(testInstance)
