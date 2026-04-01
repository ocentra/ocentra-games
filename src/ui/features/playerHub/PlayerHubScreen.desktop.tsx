import type { ComponentProps } from 'react';
import { PlayerHubScreenShared } from '@/ui/features/playerHub/PlayerHubScreen.shared';

type PlayerHubScreenProps = ComponentProps<typeof PlayerHubScreenShared>;

export function PlayerHubScreenDesktop(props: PlayerHubScreenProps) {
  return <PlayerHubScreenShared {...props} />;
}
