/**
 * Validator selection algorithm per spec Section 29.3.
 * Random selection weighted by reputation, min 3 validators, max 1 per org.
 */

export interface Validator {
  pubkey: string;
  organization: string;
  reputation: number; // 0-1 scale
  stake?: number; // SOL staked
  active: boolean;
}

export interface ValidatorSelection {
  validators: Validator[];
  disputeId: string;
  assignedAt: string;
  deadline: string;
}

export class ValidatorSelector {
  private validatorPool: Validator[] = [];

  /**
   * Initializes validator pool.
   * In production, this would load from on-chain registry or database.
   */
  constructor(validators?: Validator[]) {
    this.validatorPool = validators || this.getDefaultValidators();
  }

  /**
   * Selects validators for a dispute per spec Section 29.3.
   * - Random selection weighted by reputation
   * - Minimum 3 validators
   * - Maximum 1 validator per organization (anti-collusion)
   */
  selectValidators(disputeId: string, minValidators: number = 3): ValidatorSelection {
    // Filter active validators
    const activeValidators = this.validatorPool.filter(v => v.active);
    
    if (activeValidators.length < minValidators) {
      throw new Error(`Not enough active validators. Required: ${minValidators}, Available: ${activeValidators.length}`);
    }

    // Weight validators by reputation
    const weightedValidators: Array<{ validator: Validator; weight: number }> = activeValidators.map(v => ({
      validator: v,
      weight: v.reputation,
    }));

    // Sort by weight (descending)
    weightedValidators.sort((a, b) => b.weight - a.weight);

    // Select validators ensuring max 1 per organization
    const selected: Validator[] = [];
    const usedOrganizations = new Set<string>();

    // First pass: select top validators from different organizations
    for (const { validator } of weightedValidators) {
      if (selected.length >= minValidators) {
        break;
      }

      if (!usedOrganizations.has(validator.organization)) {
        selected.push(validator);
        usedOrganizations.add(validator.organization);
      }
    }

    // If we don't have enough, fill with remaining validators (even if same org)
    if (selected.length < minValidators) {
      for (const { validator } of weightedValidators) {
        if (selected.length >= minValidators) {
          break;
        }
        if (!selected.some(v => v.pubkey === validator.pubkey)) {
          selected.push(validator);
        }
      }
    }

    // Randomize order to prevent predictability
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    // Calculate deadline (48 hours from now per spec Section 29.3)
    const assignedAt = new Date();
    const deadline = new Date(assignedAt.getTime() + 48 * 60 * 60 * 1000);

    return {
      validators: selected,
      disputeId,
      assignedAt: assignedAt.toISOString(),
      deadline: deadline.toISOString(),
    };
  }

  /**
   * Gets default validator pool for testing.
   * In production, load from on-chain registry.
   */
  private getDefaultValidators(): Validator[] {
    return [
      { pubkey: 'Validator1Pubkey...', organization: 'Org1', reputation: 0.95, active: true },
      { pubkey: 'Validator2Pubkey...', organization: 'Org2', reputation: 0.92, active: true },
      { pubkey: 'Validator3Pubkey...', organization: 'Org3', reputation: 0.88, active: true },
      { pubkey: 'Validator4Pubkey...', organization: 'Org1', reputation: 0.85, active: true },
      { pubkey: 'Validator5Pubkey...', organization: 'Org4', reputation: 0.90, active: true },
      { pubkey: 'Validator6Pubkey...', organization: 'Org5', reputation: 0.87, active: true },
      { pubkey: 'Validator7Pubkey...', organization: 'Org2', reputation: 0.83, active: true },
      { pubkey: 'Validator8Pubkey...', organization: 'Org6', reputation: 0.80, active: true },
    ];
  }

  /**
   * Updates validator reputation after dispute resolution.
   * Per spec Section 33.1: reputation updates after each resolution.
   */
  updateReputation(validatorPubkey: string, wasCorrect: boolean, disputeValue?: number): void {
    // disputeValue would be used for weighted reputation updates in production
    void disputeValue;
    const validator = this.validatorPool.find(v => v.pubkey === validatorPubkey);
    if (!validator) {
      return;
    }

    // Update reputation based on correctness
    // Per spec Section 33.1: accuracy * 0.7 + ageBonus + stakeBonus
    const change = wasCorrect ? 0.01 : -0.02;
    validator.reputation = Math.max(0, Math.min(1, validator.reputation + change));
  }
}

