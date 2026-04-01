import type { ComponentProps } from 'react';
import { SocialPage } from '@/ui/pages/Social/SocialPage';

type SocialScreenSharedProps = ComponentProps<typeof SocialPage>;

export function SocialScreenShared(props: SocialScreenSharedProps) {
  return <SocialPage {...props} />;
}
