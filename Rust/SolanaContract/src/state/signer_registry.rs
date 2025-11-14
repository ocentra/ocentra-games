use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Debug)]
pub enum SignerRole {
    Coordinator = 0,
    Validator = 1,
    Authority = 2,
}

#[account]
pub struct SignerRegistry {
    pub signers: Vec<Pubkey>,
    pub roles: Vec<SignerRole>,
    pub authority: Pubkey,
}

impl SignerRegistry {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        4 +                              // signers length prefix
        (32 * 100) +                     // signers (max 100 signers, each 32 bytes)
        4 +                              // roles length prefix
        (1 * 100) +                      // roles (max 100 roles, each 1 byte)
        32;                              // authority

    pub fn is_authorized(&self, pubkey: &Pubkey) -> bool {
        self.signers.contains(pubkey)
    }

    pub fn get_role(&self, pubkey: &Pubkey) -> Option<SignerRole> {
        self.signers
            .iter()
            .position(|&p| p == *pubkey)
            .and_then(|index| self.roles.get(index).cloned())
    }

    pub fn add_signer(&mut self, pubkey: Pubkey, role: SignerRole) -> Result<()> {
        if self.signers.contains(&pubkey) {
            return Err(anchor_lang::error!(crate::error::GameError::SignerAlreadyExists));
        }
        if self.signers.len() >= 100 {
            return Err(anchor_lang::error!(crate::error::GameError::SignerRegistryFull));
        }
        self.signers.push(pubkey);
        self.roles.push(role);
        Ok(())
    }

    pub fn remove_signer(&mut self, pubkey: &Pubkey) -> Result<()> {
        if let Some(index) = self.signers.iter().position(|&p| p == *pubkey) {
            self.signers.remove(index);
            self.roles.remove(index);
            Ok(())
        } else {
            Err(anchor_lang::error!(crate::error::GameError::SignerNotFound))
        }
    }
}

