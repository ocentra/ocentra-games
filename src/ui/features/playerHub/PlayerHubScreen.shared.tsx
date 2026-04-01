import type { ComponentProps } from 'react';
import { PlayerHubPage } from '@/ui/pages/PlayerHub/PlayerHubPage';

type PlayerHubScreenSharedProps = ComponentProps<typeof PlayerHubPage>;

export function PlayerHubScreenShared(props: PlayerHubScreenSharedProps) {
  return <PlayerHubPage {...props} />;
}
