import type { ComponentProps } from 'react';
import { SocialScreenShared } from '@/ui/features/social/SocialScreen.shared';

type SocialScreenProps = ComponentProps<typeof SocialScreenShared>;

export function SocialScreenWeb(props: SocialScreenProps) {
  return <SocialScreenShared {...props} />;
}
