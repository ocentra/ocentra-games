import type { ComponentProps } from 'react';
import { SocialScreenShared } from '@/ui/features/social/SocialScreen.shared';

type SocialScreenProps = ComponentProps<typeof SocialScreenShared>;

export function SocialScreenMobile(props: SocialScreenProps) {
  return <SocialScreenShared {...props} />;
}
