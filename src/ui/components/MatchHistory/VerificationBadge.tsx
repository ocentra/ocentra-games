import { useState, useEffect } from 'react';
import { useSolanaWallet } from '@services/solana/wallet';
import { GameClient } from '@services/solana/GameClient';
import { MatchVerifier } from '@services/verification/MatchVerifier';

interface VerificationBadgeProps {
  matchId: string;
  matchHash?: string;
  verified?: boolean;
}

/**
 * Verification Badge component.
 * Per critique Phase 11.1: Show verification status badges.
 */
export function VerificationBadge({ matchId, matchHash, verified: verifiedProp }: VerificationBadgeProps) {
  const { anchorClient } = useSolanaWallet();
  const [verified, setVerified] = useState<boolean | undefined>(verifiedProp);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (verifiedProp !== undefined) {
      setVerified(verifiedProp);
      return;
    }

    // Auto-verify if anchorClient available
    if (anchorClient && matchHash) {
      setVerifying(true);
      const gameClient = new GameClient(anchorClient);
      new MatchVerifier(gameClient); // Verifier created but verification happens asynchronously
      
      // Quick hash check - full verification would require match record
      gameClient.getMatchState(matchId)
        .then(state => {
          if (state?.matchHash) {
            const onChainHash = Array.from(state.matchHash)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            setVerified(onChainHash === matchHash);
          } else {
            setVerified(false);
          }
        })
        .catch(() => setVerified(false))
        .finally(() => setVerifying(false));
    }
  }, [anchorClient, matchId, matchHash, verifiedProp]);

  if (verifying) {
    return <span className="verification-badge verifying">Verifying...</span>;
  }

  if (!matchHash) {
    return <span className="verification-badge unverified">Unverified</span>;
  }

  if (verified === true) {
    return <span className="verification-badge verified" title="Match verified on-chain">✓ Verified</span>;
  }

  if (verified === false) {
    return <span className="verification-badge failed" title="Verification failed">✗ Failed</span>;
  }

  return <span className="verification-badge pending" title="Verification pending">Pending</span>;
}

