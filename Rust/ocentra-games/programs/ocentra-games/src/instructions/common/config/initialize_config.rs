use crate::state::ConfigAccount;
use anchor_lang::prelude::*;

/// Initializes the ConfigAccount with default values.
/// Per Phase 01: Config account initialization.
/// Must be called once before using config-dependent instructions.
pub fn handler(ctx: Context<InitializeConfig>, treasury_multisig: Pubkey) -> Result<()> {
    let clock = Clock::get()?;

    // Initialize config account
    let config = &mut ctx.accounts.config_account;

    // Set authority (treasury multisig)
    config.authority = ctx.accounts.authority.key();

    // Initialize existing fields with defaults (if not already set)
    // Note: These may have been set by previous initialization, but we ensure they exist
    config.set_ac_price_usd(0.01); // $0.01 per AC
    config.ac_price_lamports = 1000; // 1000 lamports per AC
    config.gp_daily_amount = 1000;
    config.gp_cost_per_game = 10;
    config.gp_per_ad = 5;
    config.max_daily_ads = 10;
    config.max_gp_balance = 100000;
    config.ad_cooldown_seconds = 300;
    config.pro_gp_multiplier = 2;
    config.dispute_deposit_gp = 100;
    config.ai_model_costs = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    config.current_season_id = (clock.unix_timestamp / 604800) as u64; // 7 days in seconds
    config.season_duration_seconds = 604800; // 7 days

    // Initialize Phase 01 fields
    config.treasury_multisig = treasury_multisig;
    config.platform_fee_bps = 500; // 5% default
    config.withdrawal_fee_lamports = 5000; // 0.000005 SOL default
    config.min_entry_fee = 10000; // 0.00001 SOL default
    config.max_entry_fee = 100_000_000_000; // 100 SOL default
    config.is_paused = false; // Not paused by default

    // Initialize Phase 02 fields (KYC and payment methods)
    config.kyc_tier_wallet = crate::state::enums::kyc_tier::NONE; // No KYC required by default
    config.kyc_tier_platform = crate::state::enums::kyc_tier::NONE; // No KYC required by default
    config.supported_payment_methods = 0x03; // Enable both WALLET (0x01) and PLATFORM (0x02) by default
    config.cancellation_fee_bps = 250; // 2.5% default cancellation fee

    // Set timestamps
    config.created_at = clock.unix_timestamp;
    config.last_updated = clock.unix_timestamp;

    msg!(
        "ConfigAccount initialized with treasury_multisig: {}",
        treasury_multisig
    );
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = ConfigAccount::MAX_SIZE,
        seeds = [b"config_account"],
        bump
    )]
    pub config_account: Account<'info, ConfigAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
