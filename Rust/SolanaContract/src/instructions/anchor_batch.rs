use anchor_lang::prelude::*;
use crate::state::BatchAnchor;
use crate::error::GameError;

pub fn handler(
    ctx: Context<AnchorBatch>,
    batch_id: String,
    merkle_root: [u8; 32],
    count: u64,
    first_match_id: String,
    last_match_id: String,
) -> Result<()> {
    let batch_anchor = &mut ctx.accounts.batch_anchor;
    let clock = Clock::get()?;

    // Security: Validate authority is signer
    require!(
        ctx.accounts.authority.is_signer,
        GameError::Unauthorized
    );

    // Security: Validate batch_id format and bounds
    require!(
        !batch_id.is_empty() && batch_id.len() <= 50,
        GameError::InvalidBatchId
    );

    // Security: Validate count bounds (u32 max)
    require!(
        count <= u32::MAX as u64,
        GameError::InvalidPayload
    );

    // Security: Validate match IDs are valid UUIDs (36 bytes)
    require!(
        first_match_id.len() == 36 && last_match_id.len() == 36,
        GameError::InvalidPayload
    );

    // Convert strings to fixed-size arrays
    let batch_id_bytes = batch_id.as_bytes();
    let mut batch_id_array = [0u8; 50];
    let batch_copy_len = batch_id_bytes.len().min(50);
    batch_id_array[..batch_copy_len].copy_from_slice(&batch_id_bytes[..batch_copy_len]);

    let first_match_bytes = first_match_id.as_bytes();
    let mut first_match_array = [0u8; 36];
    first_match_array[..36].copy_from_slice(&first_match_bytes[..36.min(first_match_bytes.len())]);

    let last_match_bytes = last_match_id.as_bytes();
    let mut last_match_array = [0u8; 36];
    last_match_array[..36].copy_from_slice(&last_match_bytes[..36.min(last_match_bytes.len())]);

    // Initialize batch anchor
    batch_anchor.batch_id = batch_id_array;
    batch_anchor.merkle_root = merkle_root;
    batch_anchor.count = count as u32; // Safe cast after validation
    batch_anchor.first_match_id = first_match_array;
    batch_anchor.last_match_id = last_match_array;
    batch_anchor.timestamp = clock.unix_timestamp;
    batch_anchor.authority = ctx.accounts.authority.key();

    msg!("Batch anchored: {} with {} matches, merkle root: {:?}", 
         batch_id, count, merkle_root);
    Ok(())
}

#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct AnchorBatch<'info> {
    #[account(
        init,
        payer = authority,
        space = BatchAnchor::MAX_SIZE,
        seeds = [b"batch_anchor", batch_id.as_bytes()],
        bump
    )]
    pub batch_anchor: Account<'info, BatchAnchor>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

