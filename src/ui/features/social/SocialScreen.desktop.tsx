import type { ComponentProps } from 'react';
import { SocialScreenShared } from '@/ui/features/social/SocialScreen.shared';

type SocialScreenProps = ComponentProps<typeof SocialScreenShared>;

export function SocialScreenDesktop(props: SocialScreenProps) {
  return <SocialScreenShared {...props} />;
}
