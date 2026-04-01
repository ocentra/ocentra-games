import type { ComponentProps } from 'react';
import { MatchmakingScreenShared } from '@/ui/features/matchmaking/MatchmakingScreen.shared';

type MatchmakingScreenProps = ComponentProps<typeof MatchmakingScreenShared>;

export function MatchmakingScreenWeb(props: MatchmakingScreenProps) {
  return <MatchmakingScreenShared {...props} />;
}
