import type { ComponentProps } from 'react';
import { SocialScreenWeb } from '@/ui/features/social/SocialScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

type SocialScreenProps = ComponentProps<typeof SocialScreenWeb>;

export const SocialScreen = createPlatformScreen<SocialScreenProps>(
  SocialScreenWeb,
  () => import('@/ui/features/social/SocialScreen.desktop').then((m) => ({ default: m.SocialScreenDesktop })),
  () => import('@/ui/features/social/SocialScreen.mobile').then((m) => ({ default: m.SocialScreenMobile }))
);
