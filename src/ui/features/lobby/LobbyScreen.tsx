import type { ComponentProps } from 'react';
import { LobbyScreenWeb } from '@/ui/features/lobby/LobbyScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

type LobbyScreenProps = ComponentProps<typeof LobbyScreenWeb>;

export const LobbyScreen = createPlatformScreen<LobbyScreenProps>(
  LobbyScreenWeb,
  () => import('@/ui/features/lobby/LobbyScreen.desktop').then((m) => ({ default: m.LobbyScreenDesktop })),
  () => import('@/ui/features/lobby/LobbyScreen.mobile').then((m) => ({ default: m.LobbyScreenMobile }))
);
