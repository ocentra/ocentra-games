import type { ComponentProps } from 'react';
import { MatchmakingScreenWeb } from '@/ui/features/matchmaking/MatchmakingScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

type MatchmakingScreenProps = ComponentProps<typeof MatchmakingScreenWeb>;

export const MatchmakingScreen = createPlatformScreen<MatchmakingScreenProps>(
  MatchmakingScreenWeb,
  () => import('@/ui/features/matchmaking/MatchmakingScreen.desktop').then((m) => ({ default: m.MatchmakingScreenDesktop })),
  () => import('@/ui/features/matchmaking/MatchmakingScreen.mobile').then((m) => ({ default: m.MatchmakingScreenMobile }))
);
