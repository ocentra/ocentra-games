import type { ComponentProps } from 'react';
import { SelectedGameScreenWeb } from '@/ui/features/selectedGame/SelectedGameScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

type SelectedGameScreenProps = ComponentProps<typeof SelectedGameScreenWeb>;

export const SelectedGameScreen = createPlatformScreen<SelectedGameScreenProps>(
  SelectedGameScreenWeb,
  () => import('@/ui/features/selectedGame/SelectedGameScreen.desktop').then((m) => ({ default: m.SelectedGameScreenDesktop })),
  () => import('@/ui/features/selectedGame/SelectedGameScreen.mobile').then((m) => ({ default: m.SelectedGameScreenMobile }))
);
