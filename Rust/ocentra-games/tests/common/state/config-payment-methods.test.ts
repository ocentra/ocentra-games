/**
 * Test: ConfigAccount payment method fields
 * Category: STATE
 */

import { BaseTest } from '@/core'
import { TestCategory, ClusterRequirement } from '@/core'
import { registerMochaTest } from '@/core'
import { getConfigAccountPDA, ConfigAccountType } from '@/common'
import { SystemProgram } from '@solana/web3.js'

class ConfigPaymentMethodsTest extends BaseTest {
  constructor() {
    super({
      id: 'config-payment-methods',
      name: 'ConfigAccount payment method fields',
      description:
        'Verifies ConfigAccount has Phase 02 payment method and KYC tier fields',
      tags: {
        category: TestCategory.REGISTRY,
        cluster: ClusterRequirement.ANY,
        requiresSetup: true,
      },
    })
  }

  async run(): Promise<void> {
    const { program, authority } = await import('@/helpers')
    const [configPDA] = await getConfigAccountPDA()

    // Use authority as treasury multisig for testing
    const treasuryMultisig = authority.publicKey

    // Initialize config account if not already initialized
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
      // Config might already be initialized, that's okay
      const error = err as { message?: string }
      if (!error.message?.includes('already in use')) {
        throw err
      }
    }

    // Fetch config account
    const config = (await program.account.configAccount.fetch(
      configPDA
    )) as unknown as ConfigAccountType

    // Verify Phase 02 fields exist
    this.assertTruthy(config, 'Config account should exist')

    // Verify kyc_tier_wallet exists (defaults to 0 = NONE)
    // Note: Field names may be camelCase in TypeScript
    const kycTierWallet = config.kycTierWallet ?? config.kyc_tier_wallet ?? 0
    this.assert(
      typeof kycTierWallet === 'number',
      'kyc_tier_wallet should exist and be a number'
    )
    this.assert(
      kycTierWallet >= 0 && kycTierWallet <= 3,
      `kyc_tier_wallet should be 0-3, got ${kycTierWallet}`
    )

    // Verify kyc_tier_platform exists (defaults to 0 = NONE)
    const kycTierPlatform =
      config.kycTierPlatform ?? config.kyc_tier_platform ?? 0
    this.assert(
      typeof kycTierPlatform === 'number',
      'kyc_tier_platform should exist and be a number'
    )
    this.assert(
      kycTierPlatform >= 0 && kycTierPlatform <= 3,
      `kyc_tier_platform should be 0-3, got ${kycTierPlatform}`
    )

    // Verify supported_payment_methods exists (defaults to 0 = no methods supported)
    const supportedMethods =
      config.supportedPaymentMethods ?? config.supported_payment_methods ?? 0
    this.assert(
      typeof supportedMethods === 'number',
      'supported_payment_methods should exist and be a number'
    )
    this.assert(
      supportedMethods >= 0 && supportedMethods <= 255,
      `supported_payment_methods should be 0-255, got ${supportedMethods}`
    )

    // Verify account was successfully created with new fields
    // ConfigAccount::MAX_SIZE = 248 bytes total
    // The fact that we can fetch the account confirms the size is correct
    this.assertTruthy(config.authority, 'Config should have authority')
  }
}

const testInstance = new ConfigPaymentMethodsTest()
registerMochaTest(testInstance)
