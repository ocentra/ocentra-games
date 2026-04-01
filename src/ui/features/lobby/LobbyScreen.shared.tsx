import type { ComponentProps } from 'react';
import { LobbyPage } from '@/ui/pages/Lobby/LobbyPage';

type LobbyScreenSharedProps = ComponentProps<typeof LobbyPage>;

export function LobbyScreenShared(props: LobbyScreenSharedProps) {
  return <LobbyPage {...props} />;
}
