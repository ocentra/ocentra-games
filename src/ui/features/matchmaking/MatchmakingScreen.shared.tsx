import type { ComponentProps } from 'react';
import { MatchmakingPage } from '@/ui/pages/Matchmaking/MatchmakingPage';

type MatchmakingScreenSharedProps = ComponentProps<typeof MatchmakingPage>;

export function MatchmakingScreenShared(props: MatchmakingScreenSharedProps) {
  return <MatchmakingPage {...props} />;
}
