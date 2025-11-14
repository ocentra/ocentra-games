use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub mod state;
pub mod instructions;
pub mod error;
pub mod validation;

use state::*;
use instructions::*;
use error::*;

#[program]
pub mod solana_games_program {
    use super::*;

    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: String,
        game_type: u8,
        seed: u64,
    ) -> Result<()> {
        instructions::create_match::handler(ctx, match_id, game_type, seed)
    }

    pub fn join_match(ctx: Context<JoinMatch>, match_id: String, user_id: String) -> Result<()> {
        instructions::join_match::handler(ctx, match_id, user_id)
    }

    pub fn start_match(ctx: Context<StartMatch>, match_id: String) -> Result<()> {
        instructions::start_match::handler(ctx, match_id)
    }

    pub fn commit_hand(
        ctx: Context<CommitHand>,
        match_id: String,
        user_id: String,
        hand_hash: [u8; 32],
        hand_size: u8, // Per critique Issue #1: Hand size for validation
    ) -> Result<()> {
        instructions::commit_hand::handler(ctx, match_id, user_id, hand_hash, hand_size)
    }

    pub fn submit_move(
        ctx: Context<SubmitMove>,
        match_id: String,
        user_id: String,
        action_type: u8,
        payload: Vec<u8>,
        nonce: u64,
    ) -> Result<()> {
        instructions::submit_move::handler(ctx, match_id, user_id, action_type, payload, nonce)
    }

    pub fn end_match(
        ctx: Context<EndMatch>,
        match_id: String,
        match_hash: Option<[u8; 32]>,
        hot_url: Option<String>,
    ) -> Result<()> {
        instructions::end_match::handler(ctx, match_id, match_hash, hot_url)
    }

    pub fn anchor_match_record(
        ctx: Context<AnchorMatchRecord>,
        match_id: String,
        match_hash: [u8; 32],
        hot_url: Option<String>,
    ) -> Result<()> {
        instructions::anchor_match_record::handler(ctx, match_id, match_hash, hot_url)
    }

    pub fn register_signer(
        ctx: Context<RegisterSigner>,
        pubkey: Pubkey,
        role: u8,
    ) -> Result<()> {
        instructions::register_signer::handler(ctx, pubkey, role)
    }

    pub fn anchor_batch(
        ctx: Context<AnchorBatch>,
        batch_id: String,
        merkle_root: [u8; 32],
        count: u64,
        first_match_id: String,
        last_match_id: String,
    ) -> Result<()> {
        instructions::anchor_batch::handler(ctx, batch_id, merkle_root, count, first_match_id, last_match_id)
    }

    pub fn flag_dispute(
        ctx: Context<FlagDispute>,
        match_id: String,
        user_id: String,
        reason: u8,
        evidence_hash: [u8; 32],
        gp_deposit: u32,
    ) -> Result<()> {
        instructions::flag_dispute::handler(ctx, match_id, user_id, reason, evidence_hash, gp_deposit)
    }

    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        dispute_id: String,
        resolution: u8,
    ) -> Result<()> {
        instructions::resolve_dispute::handler(ctx, dispute_id, resolution)
    }

    // Per critique Issue #3: Add missing instructions
    pub fn close_match_account(
        ctx: Context<CloseMatchAccount>,
        match_id: String,
    ) -> Result<()> {
        instructions::close_match_account::handler(ctx, match_id)
    }

    pub fn slash_validator(
        ctx: Context<SlashValidator>,
        validator_pubkey: Pubkey,
        amount: u64,
        reason: u8,
    ) -> Result<()> {
        instructions::slash_validator::handler(ctx, validator_pubkey, amount, reason)
    }

    // Economic model instructions (Section 20)
    pub fn claim_daily_login(
        ctx: Context<ClaimDailyLogin>,
        user_id: String,
    ) -> Result<()> {
        instructions::daily_login::handler(ctx, user_id)
    }

    pub fn start_game_with_gp(
        ctx: Context<StartGameWithGP>,
        match_id: String,
        user_id: String,
    ) -> Result<()> {
        instructions::game_payment::handler(ctx, match_id, user_id)
    }

    pub fn claim_ad_reward(
        ctx: Context<ClaimAdReward>,
        user_id: String,
        ad_verification_signature: Vec<u8>,
    ) -> Result<()> {
        instructions::ad_reward::handler(ctx, user_id, ad_verification_signature)
    }

    pub fn purchase_subscription(
        ctx: Context<PurchaseSubscription>,
        user_id: String,
        tier: u8,
        duration_days: u8,
    ) -> Result<()> {
        instructions::pro_subscription::handler(ctx, user_id, tier, duration_days)
    }

    pub fn purchase_ai_credits(
        ctx: Context<PurchaseAICredits>,
        user_id: String,
        ac_amount: u64,
    ) -> Result<()> {
        instructions::ai_credit_purchase::handler(ctx, user_id, ac_amount)
    }

    pub fn consume_ai_credits(
        ctx: Context<ConsumeAICredits>,
        user_id: String,
        model_id: u8,
        tokens_used: u32,
    ) -> Result<()> {
        instructions::ai_credit_consume::handler(ctx, user_id, model_id, tokens_used)
    }

    // Game registry instructions (Section 16.5)
    pub fn register_game(
        ctx: Context<RegisterGame>,
        game_id: u8,
        name: String,
        min_players: u8,
        max_players: u8,
        rule_engine_url: String,
        version: u8,
    ) -> Result<()> {
        instructions::register_game::handler(ctx, game_id, name, min_players, max_players, rule_engine_url, version)
    }

    pub fn update_game(
        ctx: Context<UpdateGame>,
        game_id: u8,
        name: Option<String>,
        min_players: Option<u8>,
        max_players: Option<u8>,
        rule_engine_url: Option<String>,
        version: Option<u8>,
        enabled: Option<bool>,
    ) -> Result<()> {
        instructions::update_game::handler(ctx, game_id, name, min_players, max_players, rule_engine_url, version, enabled)
    }

    // Move batching (Section 16.6)
    pub fn submit_batch_moves(
        ctx: Context<SubmitBatchMoves>,
        match_id: String,
        user_id: String,
        moves: Vec<BatchMove>,
    ) -> Result<()> {
        instructions::submit_batch_moves::handler(ctx, match_id, user_id, moves)
    }
}

