import type { ComponentProps } from 'react';
import { PlayerHubScreenWeb } from '@/ui/features/playerHub/PlayerHubScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

type PlayerHubScreenProps = ComponentProps<typeof PlayerHubScreenWeb>;

export const PlayerHubScreen = createPlatformScreen<PlayerHubScreenProps>(
  PlayerHubScreenWeb,
  () => import('@/ui/features/playerHub/PlayerHubScreen.desktop').then((m) => ({ default: m.PlayerHubScreenDesktop })),
  () => import('@/ui/features/playerHub/PlayerHubScreen.mobile').then((m) => ({ default: m.PlayerHubScreenMobile }))
);
