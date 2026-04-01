/**
 * Disputes endpoint request/response types.
 */

import type { MatchId, UserId, DisputeId, Timestamp } from './common';

// ============================================================================
// Request Bodies
// ============================================================================

/**
 * Create dispute request.
 */
export interface CreateDisputeRequest {
  match_id: MatchId;
  reason: 'cheating' | 'bug' | 'disconnection' | 'other';
  description: string;
  reported_player_id?: UserId;
}

/**
 * Submit evidence request.
 */
export interface SubmitEvidenceRequest {
  evidence_type: 'screenshot' | 'replay' | 'log' | 'other';
  description: string;
  attachment_url?: string;
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Evidence item.
 */
export interface EvidenceItem {
  evidence_id: string;
  evidence_type: string;
  description: string;
  submitted_at: Timestamp;
  attachment_url?: string;
}

/**
 * Dispute response.
 */
export interface DisputeResponse {
  dispute_id: DisputeId;
  match_id: MatchId;
  status: 'open' | 'under_review' | 'resolved' | 'rejected';
  reason: string;
  description: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  evidence?: EvidenceItem[];
}

/**
 * Create dispute response.
 */
export interface CreateDisputeResponse {
  success: boolean;
  dispute_id: DisputeId;
  status: string;
  created_at: Timestamp;
}
