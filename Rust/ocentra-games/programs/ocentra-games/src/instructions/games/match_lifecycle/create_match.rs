use crate::error::GameError;
use crate::state::{ConfigAccount, EscrowAccount, GameRegistry, Match};
use anchor_lang::prelude::*;

pub fn handler(
    ctx: Context<CreateMatch>,
    match_id: String,
    game_type: u8,
    seed: u64,
    entry_fee: Option<u64>,
    payment_method: Option<u8>,
    match_type: Option<u8>,
    tournament_id: Option<[u8; 16]>,
) -> Result<()> {
    let mut match_account = ctx.accounts.match_account.load_init()?;
    let registry = ctx.accounts.registry.load()?;
    let clock = Clock::get()?;

    // Security: Validate match_id length (UUID v4 is exactly 36 chars)
    require!(match_id.len() == 36, GameError::InvalidPayload);

    // Security: Validate authority is signer
    require!(ctx.accounts.authority.is_signer, GameError::Unauthorized);

    // Look up game in registry
    let game_def = registry
        .find_game(game_type)
        .ok_or(GameError::InvalidPayload)?;

    // Security: Validate game is enabled
    require!(game_def.enabled != 0, GameError::InvalidPayload);

    // Convert String to fixed-size array (null-padded)
    let match_id_bytes = match_id.as_bytes();
    let mut match_id_array = [0u8; 36];
    let copy_len = match_id_bytes.len().min(36);
    match_id_array[..copy_len].copy_from_slice(&match_id_bytes[..copy_len]);

    // Get game name from registry (already fixed-size array)
    let game_name_array = game_def.name;

    // Initialize match with optimized struct
    match_account.match_id = match_id_array;

    // Per critique Phase 2.4: Initialize version field (default to "1.0.0")
    let version_str = "1.0.0";
    let version_bytes = version_str.as_bytes();
    let mut version_array = [0u8; 10];
    let version_copy_len = version_bytes.len().min(10);
    version_array[..version_copy_len].copy_from_slice(&version_bytes[..version_copy_len]);
    match_account.version = version_array;

    match_account.game_type = game_type;
    match_account.game_name = game_name_array;
    match_account.seed = seed as u32; // Convert u64 to u32
    match_account.phase = 0; // Dealing
    match_account.current_player = 0;
    match_account.player_ids = [[0u8; 64]; 10]; // Initialize all player_ids to empty
    match_account.player_count = 0;
    match_account.move_count = 0;
    match_account.created_at = clock.unix_timestamp;
    match_account.ended_at = 0; // 0 = not ended
    match_account.match_hash = [0u8; 32]; // All zeros = not set
    match_account.hot_url = [0u8; 200]; // All zeros = not set
    match_account.authority = ctx.accounts.authority.key();
    match_account.declared_suits = [0u8; 5]; // All zeros = no suits declared
    match_account.flags = 0; // All flags false
    match_account.floor_card_hash = [0u8; 32]; // All zeros = no floor card - per critique Issue #1
    match_account.hand_sizes = [0u8; 10]; // All zeros = no hands committed yet - per critique Issue #1
    match_account.committed_hand_hashes = [0u8; 320]; // All zeros = not committed yet
    match_account.last_nonce = [0u64; 10]; // All zeros = no moves yet

    // Phase 04: Paid match fields (backward compatible - defaults to FREE match)
    let entry_fee_lamports = entry_fee.unwrap_or(0);
    let match_type_val = match_type.unwrap_or(crate::state::enums::match_type::FREE);
    let payment_method_val = payment_method.unwrap_or(crate::state::enums::payment_method::WALLET);
    
    // Validate paid match parameters
    if entry_fee_lamports > 0 {
        // Check if program is paused (only for paid matches)
        if let Some(config) = &ctx.accounts.config_account {
            require!(!config.is_paused, GameError::ProgramPaused);
        }

        // If entry fee is set, match must be PAID
        require!(
            match_type_val == crate::state::enums::match_type::PAID,
            GameError::InvalidPayload
        );
        // Payment method must be valid
        require!(
            payment_method_val == crate::state::enums::payment_method::WALLET
                || payment_method_val == crate::state::enums::payment_method::PLATFORM,
            GameError::InvalidPayload
        );
    } else {
        // If no entry fee, match must be FREE
        require!(
            match_type_val == crate::state::enums::match_type::FREE,
            GameError::InvalidPayload
        );
        // For free matches, payment method should default to WALLET (not validated, just set)
        // payment_method_val is already set to default WALLET above
    }

    // Set paid match fields
    match_account.entry_fee_lamports = entry_fee_lamports;
    match_account.match_type = match_type_val;
    match_account.payment_method = payment_method_val;
    
    // Calculate prize pool (entry_fee * max_players, platform fee deducted later)
    let max_players = match_account.get_max_players(&registry)? as u64;
    match_account.prize_pool_lamports = if entry_fee_lamports > 0 {
        entry_fee_lamports
            .checked_mul(max_players)
            .ok_or(GameError::Overflow)?
    } else {
        0
    };

    // Set tournament_id if provided
    if let Some(tournament_id_bytes) = tournament_id {
        match_account.tournament_id = tournament_id_bytes;
    } else {
        match_account.tournament_id = [0u8; 16]; // All zeros = not a tournament match
    }

    // Phase 04: Initialize escrow account for paid matches
    if entry_fee_lamports > 0 {
        if let Some(escrow_loader) = ctx.accounts.escrow_account.as_ref() {
            // With init_if_needed, account may or may not exist
            // Try load_mut first (if exists), otherwise load_init (if just created)
            let mut escrow_account = match escrow_loader.load_mut() {
                Ok(_account) => {
                    // Account already exists - validate it's empty/uninitialized
                    // For create_match, escrow should never exist before match creation
                    // So if it exists, something is wrong
                    return Err(GameError::InvalidPayload.into());
                }
                Err(_) => {
                    // Account doesn't exist - initialize it
                    escrow_loader.load_init()?
                }
            };
            
            escrow_account.match_pda = ctx.accounts.match_account.key();
            // Derive bump manually for optional account
            let (_, bump) = Pubkey::find_program_address(
                &[b"escrow", ctx.accounts.match_account.key().as_ref()],
                ctx.program_id,
            );
            escrow_account.bump = bump;
            escrow_account.total_entry_lamports = 0; // Will be incremented as players join
            escrow_account.platform_fee_lamports = 0; // Calculated when distributing prizes
            escrow_account.treasury_due_lamports = 0;
            escrow_account.player_stakes = [0u64; crate::state::escrow::MAX_PLAYERS];
            escrow_account.status_flags = 0; // Not funded yet
            escrow_account.abandoned_player_index = 255; // None/not applicable
            escrow_account.reserved = [0u8; 32];
            
            msg!("Escrow account initialized for paid match: {}", match_id);
        } else {
            return Err(GameError::InvalidPayload.into());
        }
    }

    msg!("Match created: {} (type: {}, entry_fee: {} lamports)", 
         match_id, 
         if match_type_val == crate::state::enums::match_type::PAID { "PAID" } else { "FREE" },
         entry_fee_lamports);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CreateMatch<'info> {
    #[account(
        init,
        payer = authority,
        space = Match::MAX_SIZE,
        seeds = [b"m", &match_id.as_bytes()[..31.min(match_id.len())]],
        bump
    )]
    pub match_account: AccountLoader<'info, Match>,

    #[account(
        seeds = [b"game_registry"],
        bump
    )]
    pub registry: AccountLoader<'info, GameRegistry>,

    /// Escrow account (only required for paid matches)
    /// CHECK: Validated in handler - only initialized if entry_fee > 0
    #[account(
        init_if_needed,
        payer = authority,
        space = EscrowAccount::MAX_SIZE,
        seeds = [b"escrow", match_account.key().as_ref()],
        bump
    )]
    pub escrow_account: Option<AccountLoader<'info, EscrowAccount>>,

    /// Config account (optional - only needed for paid matches to check is_paused)
    #[account(
        seeds = [b"config_account"],
        bump
    )]
    pub config_account: Option<Account<'info, ConfigAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
