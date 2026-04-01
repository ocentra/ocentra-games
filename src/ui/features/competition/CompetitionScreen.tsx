import type { ComponentProps } from 'react';
import { CompetitionScreenWeb } from '@/ui/features/competition/CompetitionScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

type CompetitionScreenProps = ComponentProps<typeof CompetitionScreenWeb>;

export const CompetitionScreen = createPlatformScreen<CompetitionScreenProps>(
  CompetitionScreenWeb,
  () => import('@/ui/features/competition/CompetitionScreen.desktop').then((m) => ({ default: m.CompetitionScreenDesktop })),
  () => import('@/ui/features/competition/CompetitionScreen.mobile').then((m) => ({ default: m.CompetitionScreenMobile }))
);
