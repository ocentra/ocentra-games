/**
 * Test: Can initialize ConfigAccount
 * Category: GOVERNANCE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { SystemProgram } from '@solana/web3.js'
import { getConfigAccountPDA, ConfigAccountType } from '@/common'

class InitializeConfigTest extends BaseTest {
  constructor() {
    super({
      id: 'initialize-config',
      name: 'Can initialize ConfigAccount',
      description:
        'Verifies that ConfigAccount can be initialized with treasury multisig',
      tags: {
        category: TestCategory.REGISTRY, // Using REGISTRY category for now
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority } = await import('@/helpers')
    const [configPDA] = await getConfigAccountPDA()

    // Use authority as treasury multisig for testing (in real scenario, this would be a Squads multisig)
    const treasuryMultisig = authority.publicKey

    // Initialize config account (skip if already initialized)
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
      const error = err as { message?: string }
      // If account already exists, that's fine - just verify it's correct
      if (
        !error.message?.includes('already in use') &&
        !error.message?.includes('0x0')
      ) {
        throw err
      }
      // Account already initialized, continue to verification
    }

    // Verify config was initialized
    const config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType
    this.assertTruthy(config, 'Config should exist')
    const treasuryMultisigValue =
      config.treasuryMultisig ?? config.treasury_multisig
    if (
      treasuryMultisigValue &&
      typeof treasuryMultisigValue === 'object' &&
      'equals' in treasuryMultisigValue &&
      typeof treasuryMultisigValue.equals === 'function'
    ) {
      const multisigWithEquals = treasuryMultisigValue as {
        toString(): string
        equals(other: { toString(): string }): boolean
      }
      this.assert(
        multisigWithEquals.equals(treasuryMultisig),
        `Treasury multisig should be ${treasuryMultisig.toString()}, got ${multisigWithEquals.toString()}`
      )
    } else {
      this.assertEqual(
        treasuryMultisigValue?.toString() ?? '',
        treasuryMultisig.toString(),
        'Treasury multisig should match'
      )
    }
    this.assertEqual(
      config.isPaused ?? config.is_paused,
      false,
      'isPaused should be false'
    )
    this.assertEqual(
      config.platformFeeBps ?? config.platform_fee_bps,
      500,
      'platformFeeBps should be 500 (5%)'
    )
    const minEntryFee =
      config.minEntryFee?.toNumber() ?? config.min_entry_fee?.toNumber() ?? 0
    this.assertEqual(minEntryFee, 10000, 'minEntryFee should be 10000 lamports')
    const maxEntryFee =
      config.maxEntryFee?.toNumber() ?? config.max_entry_fee?.toNumber() ?? 0
    this.assertEqual(
      maxEntryFee,
      100_000_000_000,
      'maxEntryFee should be 100 SOL'
    )
  }
}

const testInstance = new InitializeConfigTest()
registerMochaTest(testInstance)
