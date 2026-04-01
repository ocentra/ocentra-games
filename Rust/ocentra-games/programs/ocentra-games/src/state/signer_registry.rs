use anchor_lang::prelude::*;

/// Signer role constants (replaces SignerRole enum to reduce program size)
pub mod signer_role {
    pub const COORDINATOR: u8 = 0;
    pub const VALIDATOR: u8 = 1;
    pub const AUTHORITY: u8 = 2;
}

/// SignerRegistry - uses zero-copy for efficiency (~3,341 bytes).
/// Also uses fixed arrays instead of Vec to avoid allocation overhead.
#[repr(C)]
#[account(zero_copy)]
pub struct SignerRegistry {
    pub signers: [Pubkey; 100], // Fixed array (max 100 signers)
    pub roles: [u8; 100],       // SignerRole as u8 (for zero-copy compatibility)
    pub signer_count: u8,       // Actual number of signers (0-100)
    pub authority: Pubkey,
}

impl SignerRegistry {
    // MAX_SIZE needed for account initialization (space parameter)
    // With #[repr(C)], includes padding - manual calculation with padding estimate
    pub const MAX_SIZE: usize = 8 +      // discriminator
        (32 * 100) +                     // signers (max 100 signers, each 32 bytes = 3200 bytes)
        (1 * 100) +                      // roles (max 100 roles, each 1 byte = 100 bytes)
        1 +                              // signer_count (u8)
        32 +                             // authority (Pubkey)
        7; // padding (estimated for #[repr(C)] alignment)

    // Total: 8 + 3200 + 100 + 1 + 32 = 3,341 bytes

    pub fn is_authorized(&self, pubkey: &Pubkey) -> bool {
        for i in 0..self.signer_count as usize {
            if self.signers[i] == *pubkey {
                return true;
            }
        }
        false
    }

    /// Get signer role as u8 (0=Coordinator, 1=Validator, 2=Authority)
    pub fn get_role(&self, pubkey: &Pubkey) -> Option<u8> {
        for i in 0..self.signer_count as usize {
            if self.signers[i] == *pubkey {
                let role = self.roles[i];
                if role <= 2 {
                    return Some(role);
                }
                return None;
            }
        }
        None
    }

    /// Add signer with role (0=Coordinator, 1=Validator, 2=Authority)
    pub fn add_signer(&mut self, pubkey: Pubkey, role: u8) -> Result<()> {
        use crate::error::GameError;

        require!(role <= 2, GameError::InvalidPayload);

        if self.is_authorized(&pubkey) {
            return Err(anchor_lang::error!(GameError::SignerAlreadyExists));
        }
        if self.signer_count >= 100 {
            return Err(anchor_lang::error!(GameError::SignerRegistryFull));
        }

        let index = self.signer_count as usize;
        self.signers[index] = pubkey;
        self.roles[index] = role;
        self.signer_count += 1;
        Ok(())
    }

    pub fn remove_signer(&mut self, pubkey: &Pubkey) -> Result<()> {
        use crate::error::GameError;

        let mut found_index = None;
        for i in 0..self.signer_count as usize {
            if self.signers[i] == *pubkey {
                found_index = Some(i);
                break;
            }
        }

        if let Some(index) = found_index {
            // Shift remaining signers down
            for i in index..((self.signer_count as usize).saturating_sub(1)) {
                self.signers[i] = self.signers[i + 1];
                self.roles[i] = self.roles[i + 1];
            }
            // Clear last entry
            if self.signer_count > 0 {
                let last_index = (self.signer_count - 1) as usize;
                self.signers[last_index] = Pubkey::default();
                self.roles[last_index] = 0;
                self.signer_count -= 1;
            }
            Ok(())
        } else {
            Err(anchor_lang::error!(GameError::SignerNotFound))
        }
    }
}
