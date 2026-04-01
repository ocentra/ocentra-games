import type { ComponentProps } from 'react';
import { MatchmakingScreenShared } from '@/ui/features/matchmaking/MatchmakingScreen.shared';

type MatchmakingScreenProps = ComponentProps<typeof MatchmakingScreenShared>;

export function MatchmakingScreenMobile(props: MatchmakingScreenProps) {
  return (
    <div data-platform-feature="matchmaking-mobile" data-platform-screen="matchmaking">
      <MatchmakingScreenShared {...props} />
    </div>
  );
}
